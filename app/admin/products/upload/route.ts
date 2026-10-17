import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { hasAdminSession } from "@/lib/admin-auth";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_FILES = 8;
const MAX_REQUEST_SIZE = MAX_FILES * MAX_FILE_SIZE + 1024 * 1024;

type ImageFormat = { extension: string };

function identifyImage(bytes: Buffer): ImageFormat | null {
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return { extension: "jpg" };
  }
  if (
    bytes.length >= 8 &&
    bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return { extension: "png" };
  }
  if (
    bytes.length >= 12 &&
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP"
  ) {
    return { extension: "webp" };
  }
  if (
    bytes.length >= 12 &&
    bytes.toString("ascii", 4, 8) === "ftyp" &&
    ["avif", "avis"].includes(bytes.toString("ascii", 8, 12))
  ) {
    return { extension: "avif" };
  }
  return null;
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const protocol = request.headers.get("x-forwarded-proto") ?? new URL(request.url).protocol.slice(0, -1);
  const fetchSite = request.headers.get("sec-fetch-site");
  if (!origin || !host || origin !== `${protocol}://${host}` || (fetchSite && fetchSite !== "same-origin")) {
    return Response.json({ error: "Requête d’envoi invalide." }, { status: 403 });
  }

  try {
    if (!(await hasAdminSession())) {
      return Response.json({ error: "Connectez-vous pour envoyer des images." }, { status: 401 });
    }

    const contentLength = Number(request.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_SIZE) {
      return Response.json({ error: "La taille totale des images dépasse la limite autorisée." }, { status: 413 });
    }

    const formData = await request.formData();
    const entries = formData.getAll("images");
    const files = entries.filter((entry): entry is File => typeof entry !== "string");
    if (files.length === 0 || files.length !== entries.length) {
      return Response.json({ error: "Sélectionnez au moins une image valide." }, { status: 400 });
    }
    if (files.length > MAX_FILES) {
      return Response.json({ error: `Vous pouvez envoyer ${MAX_FILES} images maximum à la fois.` }, { status: 400 });
    }

    const validatedFiles: { bytes: Buffer; format: ImageFormat; filename: string }[] = [];
    for (const file of files) {
      if (file.size === 0 || file.size > MAX_FILE_SIZE) {
        return Response.json({ error: "Chaque image doit peser au maximum 5 Mo." }, { status: 400 });
      }

      const bytes = Buffer.from(await file.arrayBuffer());
      const format = identifyImage(bytes);
      if (!format) {
        return Response.json({ error: "Format non accepté. Utilisez une image JPEG, PNG, WebP ou AVIF." }, { status: 400 });
      }
      validatedFiles.push({ bytes, format, filename: `${randomUUID()}.${format.extension}` });
    }

    const uploadDirectory = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDirectory, { recursive: true });
    const savedPaths: string[] = [];
    try {
      for (const file of validatedFiles) {
        const destination = path.join(uploadDirectory, file.filename);
        await writeFile(destination, file.bytes, { flag: "wx" });
        savedPaths.push(destination);
      }
    } catch (error) {
      await Promise.all(savedPaths.map((savedPath) => unlink(savedPath)));
      throw error;
    }

    return Response.json({
      imageUrls: validatedFiles.map((file) => `/uploads/${file.filename}`),
    });
  } catch (error) {
    console.error("Unable to upload product images:", error);
    return Response.json({ error: "Une erreur est survenue pendant l’envoi des images." }, { status: 500 });
  }
}
