/**
 * Client side helpers for the product image upload.
 *
 * The browser compresses every image before sending it so the request stays small
 * enough for the hosting platform, then the files are uploaded in small batches.
 */

/** Value used for the `accept` attribute of the file inputs. */
export const ACCEPTED_IMAGE_INPUT =
  "image/jpeg,image/png,image/webp,image/avif,.jpg,.jpeg,.png,.webp,.avif";

/** Maximum number of images kept for a product or for a single color. */
export const MAX_UPLOAD_IMAGES = 8;

/** Maximum size accepted by the server for a single image. */
export const MAX_IMAGE_BYTES = 12 * 1024 * 1024;

/** Size targeted after compression (~0.9 MB keeps a whole batch below the body limit). */
const TARGET_BYTES = 900 * 1024;

/** Longest edge kept after compression. */
const MAX_EDGE = 1800;

/** Quality steps tried before the image is shrunk again. */
const QUALITY_STEPS = [0.85, 0.72, 0.6, 0.5];

/** Maximum size of a single multipart request. */
const MAX_BATCH_BYTES = 3 * 1024 * 1024;

/** Maximum number of files sent in a single multipart request. */
const MAX_BATCH_FILES = 8;

const ACCEPTED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/pjpeg",
  "image/png",
  "image/webp",
  "image/avif",
];

const ACCEPTED_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "avif"];

type DecodedImage = {
  width: number;
  height: number;
  source: CanvasImageSource;
  release: () => void;
};

function getExtension(name: string) {
  const match = /\.([a-z0-9]+)$/i.exec(name.trim());
  return match ? match[1].toLowerCase() : "";
}

export function isSupportedImage(file: File) {
  const type = file.type.toLowerCase();
  if (ACCEPTED_MIME_TYPES.includes(type)) return true;
  if (ACCEPTED_EXTENSIONS.includes(getExtension(file.name))) return true;
  // Some browsers report a generic type for images coming from another application.
  return type === "" || type === "application/octet-stream";
}

async function decodeImage(file: File): Promise<DecodedImage> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      return {
        width: bitmap.width,
        height: bitmap.height,
        source: bitmap,
        release: () => bitmap.close(),
      };
    } catch {
      // Fall back to the <img> decoder below.
    }
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("decode-failed"));
      element.src = objectUrl;
    });
    return {
      width: image.naturalWidth,
      height: image.naturalHeight,
      source: image,
      release: () => URL.revokeObjectURL(objectUrl),
    };
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  }
}

function supportsWebpEncoding() {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL("image/webp").startsWith("data:image/webp");
  } catch {
    return false;
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("encoding-failed"));
      },
      type,
      quality,
    );
  });
}

/** Re-encodes the image so the uploaded file stays small and web friendly. */
async function compressImage(file: File): Promise<File> {
  const decoded = await decodeImage(file);
  try {
    const isPng = file.type.toLowerCase() === "image/png" || getExtension(file.name) === "png";
    const outputType = supportsWebpEncoding() ? "image/webp" : isPng ? "image/png" : "image/jpeg";
    const outputExtension =
      outputType === "image/webp" ? "webp" : outputType === "image/png" ? "png" : "jpg";
    let scale = Math.min(1, MAX_EDGE / Math.max(decoded.width, decoded.height));

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const width = Math.max(1, Math.round(decoded.width * scale));
      const height = Math.max(1, Math.round(decoded.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) break;
      if (outputType === "image/jpeg") {
        // JPEG has no alpha channel, so the transparent areas are flattened on white.
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, width, height);
      }
      context.drawImage(decoded.source, 0, 0, width, height);

      let blob: Blob | null = null;
      for (const quality of QUALITY_STEPS) {
        blob = await canvasToBlob(
          canvas,
          outputType,
          outputType === "image/png" ? undefined : quality,
        );
        if (blob.size <= TARGET_BYTES) break;
      }
      if (blob && blob.size <= TARGET_BYTES) {
        const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
        return new File([blob], `${baseName}.${outputExtension}`, {
          type: outputType,
          lastModified: Date.now(),
        });
      }
      scale *= 0.7;
    }
    return file;
  } finally {
    decoded.release();
  }
}

/** Validates the file and compresses it when it is heavier than the target size. */
export async function prepareImageForUpload(file: File): Promise<File> {
  if (!isSupportedImage(file)) {
    throw new Error(`الملف « ${file.name} » ليس صورة مدعومة. استعملوا JPG أو PNG أو WebP.`);
  }

  let prepared = file;
  if (file.size > TARGET_BYTES) {
    try {
      const compressed = await compressImage(file);
      prepared = compressed.size < file.size ? compressed : file;
    } catch {
      throw new Error(
        `تعذّر قراءة الصورة « ${file.name} ». استعملوا JPG أو PNG أو WebP (الصور بصيغة HEIC يجب تحويلها أولاً).`,
      );
    }
  }

  if (prepared.size > MAX_IMAGE_BYTES) {
    throw new Error(`الصورة « ${file.name} » تتجاوز الحد الأقصى (12 ميغابايت).`);
  }
  return prepared;
}

/** Splits the files into requests small enough for the platform body limit. */
function splitIntoBatches(files: File[]) {
  const batches: File[][] = [];
  let current: File[] = [];
  let currentBytes = 0;
  for (const file of files) {
    const wouldOverflow =
      current.length > 0 &&
      (current.length >= MAX_BATCH_FILES || currentBytes + file.size > MAX_BATCH_BYTES);
    if (wouldOverflow) {
      batches.push(current);
      current = [];
      currentBytes = 0;
    }
    current.push(file);
    currentBytes += file.size;
  }
  if (current.length > 0) batches.push(current);
  return batches;
}

async function readUploadResponse(response: Response) {
  const text = await response.text();
  let payload: { imageUrls?: string[]; error?: string; code?: string } = {};
  if (text) {
    try {
      payload = JSON.parse(text) as { imageUrls?: string[]; error?: string; code?: string };
    } catch {
      payload = {};
    }
  }
  if (!response.ok && !payload.error) {
    payload.code = payload.code ?? `HTTP_${response.status}`;
  }
  return payload;
}

/** Arabic message shown for each error code returned by the server. */
const ERROR_MESSAGES: Record<string, string> = {
  INVALID_ORIGIN: "انتهت جلسة الإدارة أو تم رفض الطلب. سجّلوا الدخول من جديد.",
  NOT_AUTHENTICATED: "انتهت جلسة الإدارة. سجّلوا الدخول من جديد ثم أعادوا الرفع.",
  INVALID_CONTENT_TYPE: "تعذّر قراءة الملفات المرسلة. أعدوا اختيار الصور.",
  INVALID_MULTIPART_BODY: "تعذّر قراءة الملفات المرسلة. أعدوا اختيار الصور.",
  REQUEST_TOO_LARGE: "حجم الصور كبير جداً. ارفعوا صوراً أقل في المرة الواحدة.",
  NO_IMAGES: "لم يتم اختيار أي صورة.",
  TOO_MANY_IMAGES: "يمكن رفع 8 صور كحد أقصى في المرة الواحدة.",
  INVALID_IMAGE_FIELD: "تعذّر قراءة الملفات المرسلة. أعدوا اختيار الصور.",
  EMPTY_FILE: "إحدى الصور فارغة. اختاروا صورة أخرى.",
  FILE_TOO_LARGE: "إحدى الصور تتجاوز 12 ميغابايت. صغّروها ثم أعدوا الرفع.",
  UNSUPPORTED_MEDIA_TYPE: "صيغة إحدى الصور غير مدعومة. استعملوا JPG أو PNG أو WebP.",
  UNSUPPORTED_FORMAT: "صيغة إحدى الصور غير مدعومة. استعملوا JPG أو PNG أو WebP.",
  TRUNCATED_FILE: "إحدى الصور ناقصة أو تالفة. أعدوا اختيارها.",
  NO_WRITABLE_UPLOAD_DIRECTORY: "الخادم لا يستطيع حفظ الصور حالياً. حاولوا لاحقاً.",
  UPLOAD_DIRECTORY_NOT_WRITABLE: "الخادم لا يستطيع حفظ الصور حالياً. حاولوا لاحقاً.",
  UPLOAD_FAILED: "تعذّر رفع الصور. حاولوا مجدداً.",
  UNEXPECTED_ERROR: "تعذّر رفع الصور. حاولوا مجدداً.",
};

/** Turns a server answer into a message the admin can act on. */
function toUploadError(payload: { error?: string; code?: string }) {
  if (payload.code && ERROR_MESSAGES[payload.code]) {
    return new Error(ERROR_MESSAGES[payload.code]);
  }
  if (payload.error) return new Error(payload.error);
  return new Error(ERROR_MESSAGES.UNEXPECTED_ERROR);
}

/**
 * Compresses then uploads the images and returns their public URLs.
 */
export async function uploadProductImages(
  files: File[],
  onProgress?: (message: string) => void,
) {
  if (files.length === 0) {
    throw new Error(ERROR_MESSAGES.NO_IMAGES);
  }
  if (files.length > MAX_UPLOAD_IMAGES) {
    throw new Error(ERROR_MESSAGES.TOO_MANY_IMAGES);
  }

  const prepared: File[] = [];
  for (const [index, file] of files.entries()) {
    onProgress?.(`جارٍ تجهيز الصورة ${index + 1} من ${files.length}…`);
    prepared.push(await prepareImageForUpload(file));
  }

  const batches = splitIntoBatches(prepared);
  const imageUrls: string[] = [];
  for (const [index, batch] of batches.entries()) {
    onProgress?.(
      batches.length > 1 ? `جارٍ رفع الصور (${index + 1} من ${batches.length})…` : "جارٍ رفع الصور…",
    );
    const body = new FormData();
    for (const file of batch) body.append("images", file, file.name);
    const response = await fetch("/admin/products/upload", { method: "POST", body });
    const payload = await readUploadResponse(response);
    if (!response.ok || !payload.imageUrls) {
      throw toUploadError(payload);
    }
    imageUrls.push(...payload.imageUrls);
  }
  return imageUrls;
}
