import jwt, { JwtPayload } from "jsonwebtoken";

const EXPIRES_IN = "2h";

function getJwtSecret() {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET debe estar configurado y tener al menos 32 caracteres");
  }
  return secret;
}

export function generateToken(payload: JwtPayload) {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: EXPIRES_IN });
}

export function verifyToken(token: string) {
  return jwt.verify(token, getJwtSecret());
}
