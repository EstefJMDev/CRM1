import { prisma } from "@/lib/db";
import { hashPassword, generateToken } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json();
    const normalizedEmail = String(email || "").trim().toLowerCase();

    if (!normalizedEmail || !password || !name) {
      return NextResponse.json(
        { error: "Email, nombre y contraseña son requeridos" },
        { status: 400 }
      );
    }

    // Validar que el email no exista
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "El usuario ya existe" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Crear usuario
    const usersCount = await prisma.user.count();

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        name,
        // Primer usuario del sistema será ADMIN, resto USER
        role: usersCount === 0 ? "ADMIN" : "USER",
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    const token = generateToken(user.id, user.email);

    return NextResponse.json(
      {
        message: "Usuario creado exitosamente",
        user,
        token,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error en registro:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
