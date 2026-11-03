import "server-only";

import { createHash } from "node:crypto";

const CLOUDINARY_FOLDER = "hk-casquette-shop/products";

type CloudinaryConfig = {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
};

export type CloudinaryImage = {
  publicId: string;
  url: string;
};

export class CloudinaryUploadError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status = 502) {
    super(message);
    this.name = "CloudinaryUploadError";
    this.code = code;
    this.status = status;
  }
}

export function getCloudinaryCloudName() {
  return process.env.CLOUDINARY_CLOUD_NAME?.trim() ?? "";
}

function getCloudinaryConfig(): CloudinaryConfig {
  const cloudName = getCloudinaryCloudName();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim() ?? "";
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim() ?? "";
  if (!cloudName || !apiKey || !apiSecret) {
    throw new CloudinaryUploadError(
      "CLOUDINARY_NOT_CONFIGURED",
      "Cloudinary upload credentials are not configured.",
      503,
    );
  }

  return { cloudName, apiKey, apiSecret };
}

function signParameters(parameters: Record<string, string>, apiSecret: string) {
  const payload = Object.entries(parameters)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  return createHash("sha1").update(`${payload}${apiSecret}`).digest("hex");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function postCloudinaryForm(
  config: CloudinaryConfig,
  endpoint: "upload" | "destroy",
  formData: FormData,
) {
  let response: Response;
  try {
    response = await fetch(
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(config.cloudName)}/image/${endpoint}`,
      {
        method: "POST",
        body: formData,
        signal: AbortSignal.timeout(45_000),
      },
    );
  } catch {
    throw new CloudinaryUploadError(
      "CLOUDINARY_UNAVAILABLE",
      "Cloudinary could not be reached.",
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new CloudinaryUploadError(
      "CLOUDINARY_INVALID_RESPONSE",
      "Cloudinary returned an invalid response.",
    );
  }

  if (!response.ok) {
    throw new CloudinaryUploadError(
      "CLOUDINARY_UPLOAD_FAILED",
      `Cloudinary rejected the image request (HTTP ${response.status}).`,
    );
  }
  return payload;
}

export async function uploadImageToCloudinary(
  filename: string,
  mimeType: string,
  bytes: Buffer,
): Promise<CloudinaryImage> {
  const config = getCloudinaryConfig();
  const publicId = filename.replace(/\.[^.]+$/, "");
  const parameters = {
    folder: CLOUDINARY_FOLDER,
    public_id: publicId,
    timestamp: String(Math.floor(Date.now() / 1000)),
  };
  const formData = new FormData();
  formData.set("api_key", config.apiKey);
  formData.set("folder", parameters.folder);
  formData.set("public_id", parameters.public_id);
  formData.set("timestamp", parameters.timestamp);
  formData.set("signature", signParameters(parameters, config.apiSecret));
  formData.set("file", new Blob([Uint8Array.from(bytes)], { type: mimeType }), filename);

  const payload = await postCloudinaryForm(config, "upload", formData);
  if (!isRecord(payload) || typeof payload.public_id !== "string" || typeof payload.secure_url !== "string") {
    throw new CloudinaryUploadError(
      "CLOUDINARY_INVALID_RESPONSE",
      "Cloudinary did not return a valid image URL.",
    );
  }

  let imageUrl: URL;
  try {
    imageUrl = new URL(payload.secure_url);
  } catch {
    throw new CloudinaryUploadError(
      "CLOUDINARY_INVALID_RESPONSE",
      "Cloudinary returned an invalid image URL.",
    );
  }
  if (
    imageUrl.protocol !== "https:" ||
    imageUrl.hostname !== "res.cloudinary.com" ||
    imageUrl.pathname.split("/")[1] !== config.cloudName
  ) {
    throw new CloudinaryUploadError(
      "CLOUDINARY_INVALID_RESPONSE",
      "Cloudinary returned an unexpected image host.",
    );
  }

  return { publicId: payload.public_id, url: imageUrl.toString() };
}

export async function deleteCloudinaryImage(publicId: string) {
  const config = getCloudinaryConfig();
  const parameters = {
    public_id: publicId,
    timestamp: String(Math.floor(Date.now() / 1000)),
  };
  const formData = new FormData();
  formData.set("api_key", config.apiKey);
  formData.set("public_id", parameters.public_id);
  formData.set("timestamp", parameters.timestamp);
  formData.set("signature", signParameters(parameters, config.apiSecret));

  const payload = await postCloudinaryForm(config, "destroy", formData);
  if (!isRecord(payload) || payload.result !== "ok" && payload.result !== "not found") {
    throw new CloudinaryUploadError(
      "CLOUDINARY_DELETE_FAILED",
      "Cloudinary could not remove a partially uploaded image.",
    );
  }
}
