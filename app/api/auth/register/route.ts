import { prisma } from "@/lib/db";
import { attachSessionCookie, generateToken, hashPassword } from "@/lib/auth";
import { buildRateLimitKey } from "@/lib/request-security";
import {
  clearRateLimitFailures,
  getRateLimitState,
  registerRateLimitFailure,
} from "@/lib/rate-limit";
import { NextRequest, NextResponse } from "next/server";

const REGISTER_RATE_LIMIT = {
  maxAttempts: 3,
  windowMs: 10 * 60 * 1000,
  blockMs: 30 * 60 * 1000,
};

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, lastName, setupToken } = await request.json();
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const normalizedName = String(name || "").trim();
    const normalizedLastName = String(lastName || "").trim() || null;
    const rateLimitKey = buildRateLimitKey("register", request, normalizedEmail);

    if (!normalizedEmail || !password || !normalizedName) {
      return NextResponse.json(
        { error: "Email, nombre y contrase\u00f1a son obligatorios" },
        { status: 400 }
      );
    }

    const rateLimitState = getRateLimitState(rateLimitKey, REGISTER_RATE_LIMIT);
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

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      registerRateLimitFailure(rateLimitKey, REGISTER_RATE_LIMIT);
      return NextResponse.json(
        { error: "El usuario ya existe" },
        { status: 400 }
      );
    }

    const usersCount = await prisma.user.count();
    if (usersCount > 0) {
      return NextResponse.json(
        { error: "El registro directo est\u00e1 deshabilitado. Contacta con Super Admin." },
        { status: 403 }
      );
    }

    const bootstrapToken = process.env.INITIAL_SUPER_ADMIN_SETUP_TOKEN;
    if (bootstrapToken && String(setupToken || "") !== bootstrapToken) {
      registerRateLimitFailure(rateLimitKey, REGISTER_RATE_LIMIT);
      return NextResponse.json(
        { error: "Token de configuraci\u00f3n inicial inv\u00e1lido" },
        { status: 403 }
      );
    }

    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        name: normalizedName,
        lastName: normalizedLastName,
        role: "SUPER_ADMIN",
        mustChangePassword: false,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        lastName: true,
        role: true,
        mustChangePassword: true,
        isActive: true,
        sessionVersion: true,
      },
    });

    clearRateLimitFailures(rateLimitKey);

    const token = generateToken(user.id, user.email, user.sessionVersion);

    const response = NextResponse.json(
      {
        message: "Usuario creado correctamente",
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
      { status: 201 }
    );

    attachSessionCookie(response, token);

    return response;
  } catch (error) {
    console.error("Error en registro:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
