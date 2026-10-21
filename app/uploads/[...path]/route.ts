import { readFile } from "node:fs/promises";
import { findUploadFile } from "@/lib/upload-storage";

// The Node.js runtime is the default, and it cannot be declared explicitly
// while `cacheComponents` is enabled in `next.config.ts`.

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
};

function notFound() {
  return new Response("Not found", {
    status: 404,
    headers: { "Cache-Control": "no-store" },
  });
}

/**
 * Serves the product images.
 *
 * The files uploaded at runtime live outside of `public` when the deployment has a
 * read-only project folder, so they are streamed from the disk. The images
 * committed to the repository are read from `public/uploads` as a fallback.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await context.params;
  const name = segments.length === 1 ? segments[0] : "";
  if (!name) return notFound();

  const filePath = await findUploadFile(name);
  if (!filePath) {
    console.warn(`[product-image-upload] file_not_found ${name}`);
    return notFound();
  }

  const extension = name.split(".").pop()?.toLowerCase() ?? "";
  const contentType = CONTENT_TYPES[extension] ?? "application/octet-stream";
  try {
    const file = await readFile(filePath);
    const headers = {
      "Content-Type": contentType,
      "Content-Length": String(file.byteLength),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    };
    if (request.method === "HEAD") return new Response(null, { headers });
    return new Response(new Uint8Array(file), { headers });
  } catch (error) {
    console.error(
      `[product-image-upload] file_read_failed ${name} ${error instanceof Error ? error.message : String(error)}`,
    );
    return notFound();
  }
}
