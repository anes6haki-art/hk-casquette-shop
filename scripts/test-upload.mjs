/**
 * Manual check of the product image upload route.
 *
 * Usage:
 *   node scripts/test-upload.mjs [path/to/image]
 *
 * The admin secret is read from the environment or from the `.env` file of the
 * project, it is never stored in this script.
 */
import { createHmac } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const base = process.env.BASE_URL ?? "http://127.0.0.1:3000";

/** Reads the variables of the `.env` file without adding a dependency. */
function readEnvFile() {
  const envPath = path.join(process.cwd(), ".env");
  if (!existsSync(envPath)) return {};
  const values = {};
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (!match) continue;
    values[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
  return values;
}

const env = { ...readEnvFile(), ...process.env };
const secret = env.ADMIN_SESSION_SECRET;
if (!secret) {
  console.error("ADMIN_SESSION_SECRET is missing: set it in .env or in the environment.");
  process.exit(2);
}

function createToken(expiresAt) {
  const signature = createHmac("sha256", secret).update(String(expiresAt)).digest("hex");
  return `${expiresAt}.${signature}`;
}

const validToken = createToken(Date.now() + 60 * 60 * 1000);
const expiredToken = createToken(Date.now() - 60 * 1000);

async function waitForServer() {
  for (let attempt = 0; attempt < 90; attempt += 1) {
    try {
      // A static file answers without compiling any React server component.
      const response = await fetch(`${base}/nora-one.svg`, { method: "HEAD" });
      if (response.status > 0) return true;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  return false;
}

if (!(await waitForServer())) {
  console.log("SERVER_NOT_READY");
  process.exit(2);
}
console.log("server ready:", base);

const fileArgument = process.argv[2];
const imagePath = fileArgument
  ? path.resolve(fileArgument)
  : path.join(process.cwd(), "public", "uploads", "sample-casquette-01.png");
if (!existsSync(imagePath)) {
  console.log("MISSING_FIXTURE", imagePath);
  process.exit(2);
}
const bytes = readFileSync(imagePath);
console.log("fixture", imagePath, bytes.length, "bytes");

let failures = 0;

/**
 * Retries the request when the connection is reset.
 *
 * The development server closes the connection while it compiles the route for
 * the first time, so the same call has to be sent again.
 */
async function fetchWithRetry(url, options, attempts = 4) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await fetch(url, options);
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
  throw lastError;
}

/** Sends a multipart request and prints the answer. */
async function postUpload({ files, token = validToken, origin = base, contentType } = {}) {
  const body = new FormData();
  for (const file of files) {
    body.append("images", new Blob([file.bytes], { type: file.type }), file.name);
  }
  const headers = { cookie: `nora_admin_session=${token}` };
  if (origin) headers.origin = origin;
  if (contentType) headers["content-type"] = contentType;

  const response = await fetchWithRetry(`${base}/admin/products/upload`, {
    method: "POST",
    headers,
    body: contentType ? contentType : body,
  });
  const text = await response.text();
  let payload = {};
  try {
    payload = JSON.parse(text);
  } catch {
    payload = { raw: text.slice(0, 200) };
  }
  return { status: response.status, payload };
}

function report(name, result, expectedStatus) {
  const ok = result.status === expectedStatus;
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"} ${name}: status=${result.status} (expected ${expectedStatus})`, result.payload);
}

// 1. A valid PNG must be stored and served back.
const uploaded = await postUpload({
  files: [{ bytes, type: "image/png", name: "test.png" }],
});
report("valid png", uploaded, 200);
if (uploaded.status === 200 && Array.isArray(uploaded.payload.imageUrls)) {
  const url = uploaded.payload.imageUrls[0];
  const fetched = await fetchWithRetry(`${base}${url}`);
  const sameSize = fetched.status === 200 && (await fetched.arrayBuffer()).byteLength === bytes.length;
  if (!sameSize) failures += 1;
  console.log(
    `${sameSize ? "PASS" : "FAIL"} stored file is served back: ${url} status=${fetched.status} type=${fetched.headers.get("content-type")}`,
  );
}

// 2. Several images in a single request.
const several = await postUpload({
  files: [
    { bytes, type: "image/png", name: "one.png" },
    { bytes, type: "image/png", name: "two.png" },
  ],
});
report("two images", several, 200);

// 3. A file that is not an image must be refused.
const notAnImage = await postUpload({
  files: [{ bytes: Buffer.from("this is not an image"), type: "text/plain", name: "note.txt" }],
});
report("text file refused", notAnImage, 400);

// 4. A truncated PNG must be refused.
const truncated = await postUpload({
  files: [{ bytes: bytes.subarray(0, Math.floor(bytes.length / 2)), type: "image/png", name: "cut.png" }],
});
report("truncated png refused", truncated, 400);

// 5. More than eight images must be refused.
const tooMany = await postUpload({
  files: Array.from({ length: 9 }, (_, index) => ({
    bytes,
    type: "image/png",
    name: `image-${index}.png`,
  })),
});
report("nine images refused", tooMany, 400);

// 6. An expired session must be refused.
const expired = await postUpload({
  files: [{ bytes, type: "image/png", name: "expired.png" }],
  token: expiredToken,
});
report("expired session refused", expired, 401);

// 7. A request coming from another origin must be refused.
const crossOrigin = await postUpload({
  files: [{ bytes, type: "image/png", name: "cross.png" }],
  origin: "https://example.com",
});
report("cross origin refused", crossOrigin, 403);

// 8. A body that is not a multipart form must be refused.
const notMultipart = await postUpload({
  files: [{ bytes, type: "image/png", name: "raw.png" }],
  contentType: "application/json",
});
report("non multipart refused", notMultipart, 415);

console.log(failures === 0 ? "ALL_TESTS_PASSED" : `${failures} TEST(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
