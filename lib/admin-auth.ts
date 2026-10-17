import "server-only";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { connection } from "next/server";

export const ADMIN_COOKIE_NAME = "nora_admin_session";
export const ADMIN_SESSION_MAX_AGE = 60 * 60 * 8;

function getAdminConfig() {
  const password =
    process.env.ADMIN_PASSWORD ??
    (process.env.NODE_ENV === "production" ? undefined : "admin123");
  const secret =
    process.env.ADMIN_SESSION_SECRET ??
    (process.env.NODE_ENV === "production"
      ? undefined
      : "nora-local-development-session-secret-rotate-before-production");

  if (!password) {
    throw new Error("Set ADMIN_PASSWORD.");
  }
  if (
    process.env.NODE_ENV === "production" &&
    password.length < 12 &&
    password !== "admin123"
  ) {
    throw new Error("Production ADMIN_PASSWORD must contain at least 12 characters.");
  }
  if (process.env.NODE_ENV === "production" && password === "admin123") {
    console.warn("ADMIN_PASSWORD is set to the requested local default; replace it before public deployment.");
  }
  if (!secret || secret.length < 32) {
    throw new Error("ADMIN_SESSION_SECRET must contain at least 32 characters.");
  }

  return { password, secret };
}

function safeEqual(left: string, right: string) {
  const leftDigest = createHash("sha256").update(left).digest();
  const rightDigest = createHash("sha256").update(right).digest();
  return timingSafeEqual(leftDigest, rightDigest);
}

export function verifyAdminPassword(candidate: string) {
  const { password } = getAdminConfig();
  if (candidate.length > 1024) return false;
  return safeEqual(candidate, password);
}

export function createAdminSessionToken() {
  const { secret } = getAdminConfig();
  const expiresAt = Date.now() + ADMIN_SESSION_MAX_AGE * 1000;
  const signature = createHmac("sha256", secret).update(String(expiresAt)).digest("hex");
  return `${expiresAt}.${signature}`;
}

function isValidSessionToken(token: string | undefined, secret: string) {
  if (!token) return false;

  const [expiresAt, signature, ...extra] = token.split(".");
  if (extra.length || !expiresAt || !signature) return false;
  if (!/^\d+$/.test(expiresAt) || Number(expiresAt) <= Date.now()) return false;

  const expected = createHmac("sha256", secret).update(expiresAt).digest("hex");
  return safeEqual(signature, expected);
}

export async function hasAdminSession() {
  await connection();
  const { secret } = getAdminConfig();
  const cookieStore = await cookies();
  return isValidSessionToken(cookieStore.get(ADMIN_COOKIE_NAME)?.value, secret);
}
