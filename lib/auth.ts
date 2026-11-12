import "server-only";
import { compare, hash } from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { unstable_rethrow } from "next/navigation";

const COOKIE = "te_session";
const MAX_AGE = 60 * 60 * 24 * 30;

export type Session = {
  id: string;
  name: string;
};

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("AUTH_SECRET debe existir y tener al menos 16 caracteres.");
  }
  return new TextEncoder().encode(secret);
}

export function hashPassword(password: string) {
  return hash(password, 12);
}

export function verifyPassword(password: string, passwordHash: string) {
  return compare(password, passwordHash);
}

export async function createSession(workshop: Session) {
  const token = await new SignJWT({ name: workshop.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(workshop.id)
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secretKey());

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;

  const key = secretKey();
  try {
    const { payload } = await jwtVerify(token, key);
    if (!payload.sub || typeof payload.name !== "string" || !payload.name) return null;
    return { id: payload.sub, name: payload.name };
  } catch (error) {
    unstable_rethrow(error);
    return null;
  }
}
