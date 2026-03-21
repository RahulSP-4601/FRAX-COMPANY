import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "frax_company_session";
const JWT_SECRET = process.env.JWT_SIGNING_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SIGNING_SECRET must be set in environment variables");
}

function getSecretKey() {
  return new TextEncoder().encode(JWT_SECRET);
}

export interface SessionData {
  employeeId: string;
  role: string;
  email: string;
  isApproved: boolean;
}

export async function createSession(data: SessionData) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const token = await new SignJWT({
    employeeId: data.employeeId,
    role: data.role,
    email: data.email,
    isApproved: data.isApproved,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecretKey());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });

  return token;
}

export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return {
      employeeId: payload.employeeId as string,
      role: payload.role as string,
      email: payload.email as string,
      isApproved: payload.isApproved as boolean,
    };
  } catch {
    return null;
  }
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
