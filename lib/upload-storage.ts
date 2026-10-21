import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, stat, unlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

/** Every uploaded product image is served from this URL prefix. */
export const UPLOAD_URL_PREFIX = "/uploads";

/** Images committed to the repository live here and are served statically by Next.js. */
export const PUBLIC_UPLOAD_DIRECTORY = path.join(process.cwd(), "public", "uploads");

/** The server generates the file names, so they always match this safe pattern. */
const SAFE_FILE_NAME = /^[a-zA-Z0-9-]+\.(jpg|jpeg|png|webp|avif)$/;

/** Where the runtime uploads are written. */
export type UploadDirectorySource = "env" | "public" | "tmp";

export type UploadDirectoryInfo = {
  directory: string;
  source: UploadDirectorySource;
  /** `false` when the files are lost on the next deployment (serverless temporary disk). */
  persistent: boolean;
};

/** Error raised when the server cannot store a file, carrying a code the route can forward. */
export class UploadStorageError extends Error {
  readonly code: string;

  constructor(code: string, message: string, cause?: unknown) {
    super(message);
    this.name = "UploadStorageError";
    this.code = code;
    if (cause !== undefined) {
      (this as { cause?: unknown }).cause = cause;
    }
  }
}

let cachedDirectory: UploadDirectoryInfo | null = null;

function candidateDirectories(): { directory: string; source: UploadDirectorySource }[] {
  const candidates: { directory: string; source: UploadDirectorySource }[] = [];
  const configured = process.env.UPLOAD_DIR?.trim();
  if (configured) candidates.push({ directory: path.resolve(configured), source: "env" });
  candidates.push({ directory: PUBLIC_UPLOAD_DIRECTORY, source: "public" });
  candidates.push({ directory: path.join(os.tmpdir(), "nora-store-uploads"), source: "tmp" });
  return candidates;
}

/**
 * Proves the folder can really be written to.
 *
 * `access(W_OK)` is not enough: the project folder of a serverless deployment is
 * mounted read only, and the permission bits still look writable. Writing a
 * temporary probe file is the only reliable test.
 */
async function assertWritable(directory: string) {
  await mkdir(/*turbopackIgnore: true*/ directory, { recursive: true });
  const probeFile = path.join(/*turbopackIgnore: true*/ directory, `.write-probe-${randomUUID()}.tmp`);
  await writeFile(/*turbopackIgnore: true*/ probeFile, "ok");
  await unlink(/*turbopackIgnore: true*/ probeFile);
}

/**
 * Returns the first writable upload directory.
 *
 * Serverless platforms (Vercel, ...) ship a read-only project directory, so the
 * temporary directory is used as a fallback there. Set `UPLOAD_DIR` to a mounted
 * volume to keep the images between deployments.
 */
export async function resolveUploadDirectoryInfo(): Promise<UploadDirectoryInfo> {
  if (cachedDirectory) return cachedDirectory;

  const failures: string[] = [];
  for (const candidate of candidateDirectories()) {
    try {
      await assertWritable(candidate.directory);
      cachedDirectory = {
        directory: candidate.directory,
        source: candidate.source,
        persistent: candidate.source !== "tmp",
      };
      return cachedDirectory;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code ?? "unknown";
      failures.push(`${candidate.directory} (${code})`);
    }
  }

  throw new UploadStorageError(
    "NO_WRITABLE_UPLOAD_DIRECTORY",
    `Aucun dossier d’envoi inscriptible : ${failures.join(", ")}.`,
  );
}

export async function resolveUploadDirectory(): Promise<string> {
  return (await resolveUploadDirectoryInfo()).directory;
}

export function isSafeUploadName(name: string): boolean {
  return SAFE_FILE_NAME.test(name);
}

/** Finds an uploaded image in the runtime directory first, then in the committed folder. */
export async function findUploadFile(name: string): Promise<string | null> {
  if (!isSafeUploadName(name)) return null;
  const directories = [await resolveUploadDirectory(), PUBLIC_UPLOAD_DIRECTORY];
  for (const directory of directories) {
    // The path is built at runtime, so Turbopack must not trace the whole project.
    const candidate = path.join(/*turbopackIgnore: true*/ directory, name);
    try {
      const stats = await stat(/*turbopackIgnore: true*/ candidate);
      if (stats.isFile()) return candidate;
    } catch {
      continue;
    }
  }
  return null;
}

/** Writes an uploaded image and returns its absolute path. */
export async function writeUploadFile(name: string, bytes: Buffer): Promise<string> {
  if (!isSafeUploadName(name)) {
    throw new UploadStorageError(
      "INVALID_FILE_NAME",
      `Nom de fichier non autorisé : « ${name} ».`,
    );
  }

  const { directory } = await resolveUploadDirectoryInfo();
  const destination = path.join(/*turbopackIgnore: true*/ directory, name);
  try {
    await writeFile(/*turbopackIgnore: true*/ destination, bytes, { flag: "wx" });
    return destination;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code ?? "unknown";
    if (code === "EROFS" || code === "EACCES" || code === "EPERM" || code === "ENOSPC") {
      throw new UploadStorageError(
        "UPLOAD_DIRECTORY_NOT_WRITABLE",
        `Le dossier d’envoi « ${directory} » n’a pas pu être écrit (${code}).`,
        error,
      );
    }
    throw error;
  }
}

/** Removes a file that was written before a later file failed. */
export async function removeUploadFile(destination: string): Promise<void> {
  await unlink(destination).catch(() => undefined);
}
