import { randomUUID } from "node:crypto";
import { hasAdminSession } from "@/lib/admin-auth";
import {
  removeUploadFile,
  resolveUploadDirectoryInfo,
  UPLOAD_URL_PREFIX,
  UploadStorageError,
  writeUploadFile,
} from "@/lib/upload-storage";

// The Node.js runtime is the default, and it cannot be declared explicitly
// while `cacheComponents` is enabled in `next.config.ts`.

/** Name of the multipart field carrying the images. */
const IMAGE_FIELD = "images";
/** Maximum size of a single image (12 MB). */
const MAX_FILE_SIZE = 12 * 1024 * 1024;
/** Maximum number of images accepted in a single request. */
const MAX_FILES = 8;
/** Maximum size of a whole multipart request (16 MB). */
const MAX_REQUEST_SIZE = 16 * 1024 * 1024;
/** Prefix of every log line so the traces can be filtered easily. */
const LOG_PREFIX = "[product-image-upload]";

type ImageFormat = { extension: string; mimeType: string; label: string };

type LogPayload = Record<string, unknown>;

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG_END_MARKER = Buffer.from([0xff, 0xd9]);
const PNG_END_CHUNK = Buffer.from("IEND", "ascii");

/** Content types the browser is allowed to announce for an image. */
const ACCEPTED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/pjpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

/** Helpful message for the formats people pick by mistake. */
const REJECTED_MIME_HINTS: Record<string, string> = {
  "image/heic": "Les photos HEIC (iPhone) doivent être converties en JPEG ou PNG avant l’envoi.",
  "image/heif": "Les photos HEIF doivent être converties en JPEG ou PNG avant l’envoi.",
  "image/gif": "Le format GIF n’est pas accepté. Convertissez l’image en PNG ou WebP.",
  "image/bmp": "Le format BMP n’est pas accepté. Convertissez l’image en PNG ou WebP.",
  "image/tiff": "Le format TIFF n’est pas accepté. Convertissez l’image en PNG ou WebP.",
  "image/svg+xml": "Les images SVG ne sont pas acceptées. Utilisez une image JPG, PNG ou WebP.",
  "application/pdf": "Les documents PDF ne sont pas acceptés. Envoyez une image JPG, PNG ou WebP.",
};

/** Detects the real format from the file signature, never from the name sent by the browser. */
function detectImageFormat(bytes: Buffer): ImageFormat | null {
  // JPEG, covers the .jpg and .jpeg extensions.
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return { extension: "jpg", mimeType: "image/jpeg", label: "JPEG" };
  }
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(PNG_SIGNATURE)) {
    return { extension: "png", mimeType: "image/png", label: "PNG" };
  }
  if (
    bytes.length >= 12 &&
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP"
  ) {
    return { extension: "webp", mimeType: "image/webp", label: "WebP" };
  }
  if (
    bytes.length >= 12 &&
    bytes.toString("ascii", 4, 8) === "ftyp" &&
    ["avif", "avis"].includes(bytes.toString("ascii", 8, 12))
  ) {
    return { extension: "avif", mimeType: "image/avif", label: "AVIF" };
  }
  return null;
}

/**
 * Detects a file that was cut while it was copied.
 *
 * The signature is present but the closing marker of the image is missing, which
 * means the file is broken and would render as a grey box in the catalog.
 */
function looksTruncated(format: ImageFormat, bytes: Buffer): boolean {
  if (format.extension === "jpg") {
    return !bytes.subarray(Math.max(0, bytes.length - 4096)).includes(JPEG_END_MARKER);
  }
  if (format.extension === "png") {
    return !bytes.subarray(Math.max(0, bytes.length - 64)).includes(PNG_END_CHUNK);
  }
  return false;
}

/** Keeps the file name readable in the error messages without trusting it. */
function safeLabel(name: string) {
  return name.replace(/[^\w. -]+/g, "").slice(0, 60) || "image";
}

/** Writes one line of JSON so the traces stay easy to read and to filter. */
function logEvent(requestId: string, event: string, payload: LogPayload = {}) {
  console.log(`${LOG_PREFIX} ${event} ${JSON.stringify({ requestId, ...payload })}`);
}

/** Turns any thrown value into a loggable object (never logs a cookie or a secret). */
function describeError(error: unknown): LogPayload {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      code: (error as NodeJS.ErrnoException).code,
    };
  }
  return { name: "UnknownError", message: String(error) };
}

/** Every failure answers with the same JSON shape so the client can rely on it. */
function jsonError(status: number, code: string, error: string) {
  return Response.json({ error, code }, { status });
}

/** The upload is only allowed from the admin panel itself. */
function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin") return false;
  const protocol =
    request.headers.get("x-forwarded-proto") ?? new URL(request.url).protocol.replace(":", "");
  const hosts = [request.headers.get("x-forwarded-host"), request.headers.get("host")].filter(
    (host): host is string => Boolean(host),
  );
  return hosts.some((host) => origin === `${protocol}://${host}`);
}

/**
 * Reads the body while enforcing the size limit.
 *
 * The `content-length` header is only a hint, so the body is really streamed and
 * stopped as soon as it becomes too big.
 */
async function readBodyWithLimit(
  request: Request,
  limit: number,
): Promise<{ ok: true; body: ArrayBuffer } | { ok: false; received: number }> {
  if (!request.body) return { ok: true, body: new ArrayBuffer(0) };

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    received += value.byteLength;
    if (received > limit) {
      await reader.cancel().catch(() => undefined);
      return { ok: false, received };
    }
    chunks.push(value);
  }

  const merged = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { ok: true, body: merged.buffer };
}

export async function POST(request: Request) {
  const requestId = randomUUID();
  const startedAt = Date.now();

  if (!isSameOrigin(request)) {
    logEvent(requestId, "rejected", { reason: "origin_mismatch" });
    return jsonError(403, "INVALID_ORIGIN", "Requête d’envoi invalide.");
  }

  const contentType = request.headers.get("content-type") ?? "";
  const mediaType = contentType.split(";")[0]?.trim().toLowerCase() ?? "";
  const declaredLength = Number(request.headers.get("content-length"));

  logEvent(requestId, "received", {
    contentType: mediaType || null,
    contentLength: Number.isFinite(declaredLength) ? declaredLength : null,
  });

  try {
    if (!(await hasAdminSession())) {
      logEvent(requestId, "rejected", { reason: "not_authenticated" });
      return jsonError(401, "NOT_AUTHENTICATED", "Connectez-vous pour envoyer des images.");
    }

    if (mediaType !== "multipart/form-data") {
      logEvent(requestId, "rejected", {
        reason: "invalid_content_type",
        contentType: mediaType || null,
      });
      return jsonError(
        415,
        "INVALID_CONTENT_TYPE",
        "L’envoi doit être un formulaire multipart/form-data.",
      );
    }

    if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_SIZE) {
      logEvent(requestId, "rejected", { reason: "request_too_large", contentLength: declaredLength });
      return jsonError(
        413,
        "REQUEST_TOO_LARGE",
        "La taille totale des images dépasse la limite autorisée (16 Mo par envoi).",
      );
    }

    const bodyResult = await readBodyWithLimit(request, MAX_REQUEST_SIZE);
    if (!bodyResult.ok) {
      logEvent(requestId, "rejected", { reason: "request_too_large", received: bodyResult.received });
      return jsonError(
        413,
        "REQUEST_TOO_LARGE",
        "La taille totale des images dépasse la limite autorisée (16 Mo par envoi).",
      );
    }

    let formData: FormData;
    try {
      formData = await new Response(bodyResult.body, {
        headers: { "content-type": contentType },
      }).formData();
    } catch (error) {
      logEvent(requestId, "rejected", { reason: "invalid_multipart", error: describeError(error) });
      return jsonError(
        400,
        "INVALID_MULTIPART_BODY",
        "Le corps de la requête n’est pas un formulaire multipart valide.",
      );
    }

    const fieldNames = [...new Set(Array.from(formData.keys()))];
    const entries = formData.getAll(IMAGE_FIELD);
    const files = entries.filter((entry): entry is File => typeof entry !== "string");

    logEvent(requestId, "parsed", {
      fieldNames,
      imageFieldCount: entries.length,
      fileCount: files.length,
    });

    if (entries.length !== files.length) {
      logEvent(requestId, "rejected", { reason: "text_value_in_image_field" });
      return jsonError(
        400,
        "INVALID_IMAGE_FIELD",
        `Le champ « ${IMAGE_FIELD} » doit contenir uniquement des fichiers.`,
      );
    }
    if (files.length === 0) {
      logEvent(requestId, "rejected", { reason: "no_images" });
      return jsonError(
        400,
        "NO_IMAGES",
        `Aucune image reçue. Envoyez vos fichiers dans le champ « ${IMAGE_FIELD} ».`,
      );
    }
    if (files.length > MAX_FILES) {
      logEvent(requestId, "rejected", { reason: "too_many_files", fileCount: files.length });
      return jsonError(
        400,
        "TOO_MANY_IMAGES",
        `Vous pouvez envoyer ${MAX_FILES} images maximum à la fois.`,
      );
    }

    const validatedFiles: { bytes: Buffer; format: ImageFormat; filename: string }[] = [];
    for (const file of files) {
      const label = safeLabel(file.name);
      const declaredType = (file.type || "").toLowerCase();

      if (file.size === 0) {
        logEvent(requestId, "rejected", { reason: "empty_file", file: label });
        return jsonError(400, "EMPTY_FILE", `L’image « ${label} » est vide.`);
      }
      if (file.size > MAX_FILE_SIZE) {
        logEvent(requestId, "rejected", { reason: "file_too_large", file: label, size: file.size });
        return jsonError(
          400,
          "FILE_TOO_LARGE",
          `L’image « ${label} » dépasse la limite de 12 Mo.`,
        );
      }
      if (
        declaredType &&
        declaredType !== "application/octet-stream" &&
        !ACCEPTED_MIME_TYPES.has(declaredType)
      ) {
        logEvent(requestId, "rejected", {
          reason: "unsupported_media_type",
          file: label,
          type: declaredType,
        });
        return jsonError(
          400,
          "UNSUPPORTED_MEDIA_TYPE",
          REJECTED_MIME_HINTS[declaredType] ??
            `Le format « ${declaredType} » de « ${label} » n’est pas accepté. Utilisez une image JPEG, PNG, WebP ou AVIF.`,
        );
      }

      const bytes = Buffer.from(await file.arrayBuffer());
      const format = detectImageFormat(bytes);
      if (!format) {
        logEvent(requestId, "rejected", {
          reason: "unsupported_format",
          file: label,
          size: bytes.length,
        });
        return jsonError(
          400,
          "UNSUPPORTED_FORMAT",
          `Format non accepté pour « ${label} ». Utilisez une image JPEG (.jpg ou .jpeg), PNG, WebP ou AVIF.`,
        );
      }
      if (looksTruncated(format, bytes)) {
        logEvent(requestId, "rejected", { reason: "truncated_file", file: label, format: format.label });
        return jsonError(
          400,
          "TRUNCATED_FILE",
          `L’image « ${label} » semble incomplète (fichier tronqué). Rechargez-la puis réessayez.`,
        );
      }

      validatedFiles.push({ bytes, format, filename: `${randomUUID()}.${format.extension}` });
    }

    logEvent(requestId, "validated", {
      files: validatedFiles.map((file) => ({
        name: file.filename,
        format: file.format.label,
        bytes: file.bytes.length,
      })),
    });

    let storage;
    try {
      storage = await resolveUploadDirectoryInfo();
    } catch (error) {
      logEvent(requestId, "failed", { reason: "no_storage", error: describeError(error) });
      return jsonError(
        500,
        "NO_WRITABLE_UPLOAD_DIRECTORY",
        "Le serveur ne peut pas enregistrer les images pour le moment. Réessayez plus tard.",
      );
    }

    logEvent(requestId, "storage", {
      directory: storage.directory,
      source: storage.source,
      persistent: storage.persistent,
    });

    const savedPaths: string[] = [];
    try {
      for (const file of validatedFiles) {
        savedPaths.push(await writeUploadFile(file.filename, file.bytes));
      }
    } catch (error) {
      await Promise.all(savedPaths.map((savedPath) => removeUploadFile(savedPath)));
      logEvent(requestId, "failed", { reason: "write_failed", error: describeError(error) });
      const code = error instanceof UploadStorageError ? error.code : "UPLOAD_FAILED";
      return jsonError(
        500,
        code,
        "Le serveur n’a pas pu enregistrer les images. Réessayez plus tard.",
      );
    }

    const imageUrls = validatedFiles.map((file) => `${UPLOAD_URL_PREFIX}/${file.filename}`);
    logEvent(requestId, "success", {
      count: imageUrls.length,
      durationMs: Date.now() - startedAt,
    });
    return Response.json({ imageUrls });
  } catch (error) {
    console.error(
      `${LOG_PREFIX} unexpected_error ${JSON.stringify({ requestId, error: describeError(error) })}`,
    );
    return jsonError(
      500,
      "UNEXPECTED_ERROR",
      "Une erreur est survenue pendant l’envoi des images.",
    );
  }
}
