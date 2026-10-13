import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "subtext_admin";
export const SESSION_MAX_AGE = 60 * 60 * 12;

export function adminConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.length >= 8 && sessionSecret());
}

function sessionSecret(): string | null {
  const secret = process.env.SESSION_SECRET;
  return secret && secret.length >= 24 ? secret : null;
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function safeEqual(first: string, second: string): boolean {
  const a = Buffer.from(first);
  const b = Buffer.from(second);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function verifyPassword(candidate: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  const secret = sessionSecret();
  if (!expected || !secret) return false;
  return safeEqual(sign(`password:${candidate}`, secret), sign(`password:${expected}`, secret));
}

export function createSessionToken(now = Date.now()): string | null {
  const secret = sessionSecret();
  if (!secret) return null;
  const payload = `${now + SESSION_MAX_AGE * 1000}.${randomBytes(12).toString("base64url")}`;
  return `${payload}.${sign(payload, secret)}`;
}

export function verifySessionToken(token: string | undefined | null, now = Date.now()): boolean {
  const secret = sessionSecret();
  if (!token || !secret) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const payload = `${parts[0]}.${parts[1]}`;
  if (!safeEqual(sign(payload, secret), parts[2])) return false;
  const expiresAt = Number(parts[0]);
  return Number.isFinite(expiresAt) && expiresAt > now;
}
