import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

const JWT_SECRET = process.env.NEXTAUTH_SECRET;
export const SESSION_COOKIE_NAME = "crm_session";

type SessionTokenPayload = {
  userId: string;
  email: string;
  sessionVersion: number;
};

function getJwtSecret() {
  if (!JWT_SECRET) {
    throw new Error("NEXTAUTH_SECRET no está configurado");
  }

  return JWT_SECRET;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export function generateToken(
  userId: string,
  email: string,
  sessionVersion: number
): string {
  return jwt.sign(
    { userId, email, sessionVersion },
    getJwtSecret(),
    { expiresIn: "24h" }
  );
}

export function verifyToken(token: string): SessionTokenPayload | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as Partial<SessionTokenPayload>;
    if (!decoded.userId || !decoded.email) {
      return null;
    }

    return {
      userId: decoded.userId,
      email: decoded.email,
      sessionVersion:
        typeof decoded.sessionVersion === "number" ? decoded.sessionVersion : 0,
    };
  } catch {
    return null;
  }
}

export function attachSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}
