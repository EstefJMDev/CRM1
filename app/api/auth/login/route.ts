import { prisma } from "@/lib/db";
import { attachSessionCookie, generateToken, verifyPassword } from "@/lib/auth";
import { buildRateLimitKey } from "@/lib/request-security";
import {
  clearRateLimitFailures,
  getRateLimitState,
  registerRateLimitFailure,
} from "@/lib/rate-limit";
import { NextRequest, NextResponse } from "next/server";

const LOGIN_RATE_LIMIT = {
  maxAttempts: 5,
  windowMs: 10 * 60 * 1000,
  blockMs: 15 * 60 * 1000,
};

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const rateLimitKey = buildRateLimitKey("login", request, normalizedEmail);

    if (!normalizedEmail || !password) {
      return NextResponse.json(
        { error: "Email y contrase\u00f1a son obligatorios" },
        { status: 400 }
      );
    }

    const rateLimitState = getRateLimitState(rateLimitKey, LOGIN_RATE_LIMIT);
    if (rateLimitState.blocked) {
      return NextResponse.json(
        { error: "Demasiados intentos. Int\u00e9ntalo de nuevo m\u00e1s tarde." },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimitState.retryAfterSeconds),
          },
        }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        name: true,
        lastName: true,
        role: true,
        mustChangePassword: true,
        isActive: true,
        password: true,
        sessionVersion: true,
      },
    });

    if (!user) {
      registerRateLimitFailure(rateLimitKey, LOGIN_RATE_LIMIT);
      return NextResponse.json(
        { error: "Credenciales inv\u00e1lidas" },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: "Usuario desactivado. Contacta con el Super Admin." },
        { status: 403 }
      );
    }

    const isPasswordValid = await verifyPassword(password, user.password);

    if (!isPasswordValid) {
      registerRateLimitFailure(rateLimitKey, LOGIN_RATE_LIMIT);
      return NextResponse.json(
        { error: "Credenciales inv\u00e1lidas" },
        { status: 401 }
      );
    }

    clearRateLimitFailures(rateLimitKey);

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const token = generateToken(user.id, user.email, user.sessionVersion);

    const response = NextResponse.json(
      {
        message: "Inicio de sesi\u00f3n correcto",
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          lastName: user.lastName,
          role: user.role,
          mustChangePassword: user.mustChangePassword,
          isActive: user.isActive,
        },
      },
      { status: 200 }
    );

    attachSessionCookie(response, token);

    return response;
  } catch (error) {
    console.error("Error en login:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
