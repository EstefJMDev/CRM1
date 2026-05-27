import { prisma } from "@/lib/db";
import { attachSessionCookie, generateToken, hashPassword } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, lastName } = await request.json();
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const normalizedName = String(name || "").trim();
    const normalizedLastName = String(lastName || "").trim() || null;

    if (!normalizedEmail || !password || !normalizedName) {
      return NextResponse.json(
        { error: "Email, nombre y contrasena son requeridos" },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "El usuario ya existe" },
        { status: 400 }
      );
    }

    const usersCount = await prisma.user.count();
    if (usersCount > 0) {
      return NextResponse.json(
        { error: "El registro directo esta deshabilitado. Contacta con Super Admin." },
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
      },
    });

    const token = generateToken(user.id, user.email);

    const response = NextResponse.json(
      {
        message: "Usuario creado exitosamente",
        user,
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
