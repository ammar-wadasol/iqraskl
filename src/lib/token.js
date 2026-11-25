import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "iqra_session";
export const ROLES = ["admin", "user"];

function getKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be set to at least 32 characters.");
  }
  return new TextEncoder().encode(secret);
}

export function signToken(expiresAt, role = "admin") {
  if (!ROLES.includes(role)) {
    throw new Error(`Invalid role: ${role}`);
  }
  return new SignJWT({ role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(getKey());
}

export async function verifyToken(token) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getKey(), {
      algorithms: ["HS256"],
    });
    return ROLES.includes(payload.role) ? payload : null;
  } catch {
    return null;
  }
}
