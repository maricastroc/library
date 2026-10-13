import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySessionToken } from "./session";

export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}

export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) redirect("/admin/login");
}

export class NotAuthorizedError extends Error {
  constructor() {
    super("Session expired. Sign in to the counter again.");
    this.name = "NotAuthorizedError";
  }
}

export async function assertAdmin(): Promise<void> {
  if (!(await isAdmin())) throw new NotAuthorizedError();
}
