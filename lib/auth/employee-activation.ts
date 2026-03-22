import "server-only";
import { SignJWT, jwtVerify } from "jose";

const ACTIVATION_TOKEN_TYPE = "employee-activation";
const JWT_SECRET = process.env.JWT_SIGNING_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SIGNING_SECRET must be set in environment variables");
}

function getSecretKey() {
  return new TextEncoder().encode(JWT_SECRET);
}

export interface EmployeeActivationPayload {
  employeeId: string;
  email: string;
}

export async function createEmployeeActivationToken(payload: EmployeeActivationPayload) {
  return new SignJWT({
    type: ACTIVATION_TOKEN_TYPE,
    email: payload.email,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.employeeId)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecretKey());
}

export async function verifyEmployeeActivationToken(token: string) {
  const { payload } = await jwtVerify(token, getSecretKey());

  if (payload.type !== ACTIVATION_TOKEN_TYPE) {
    throw new Error("Invalid activation token");
  }

  if (!payload.sub || typeof payload.sub !== "string") {
    throw new Error("Invalid activation token subject");
  }

  if (!payload.email || typeof payload.email !== "string") {
    throw new Error("Invalid activation token email");
  }

  return {
    employeeId: payload.sub,
    email: payload.email,
  };
}
