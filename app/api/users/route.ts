import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { getAuthUser } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getAuthUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (currentUser.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Solo Super Admin" }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        lastName: true,
        role: true,
        mustChangePassword: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json(users, { status: 200 });
  } catch (error) {
    console.error("Error listando usuarios:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getAuthUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (currentUser.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Solo Super Admin" }, { status: 403 });
    }

    const payload = (await request.json()) as Record<string, unknown>;
    const email = String(payload.email || "").trim().toLowerCase();
    const name = String(payload.name || "").trim();
    const lastName = String(payload.lastName || "").trim() || null;
    const temporaryPassword = String(payload.temporaryPassword || "");
    const roleInput = String(payload.role || "USER");
    const role = roleInput === "TENANT_ADMIN" ? roleInput : "USER";

    if (!email || !name || !temporaryPassword) {
      return NextResponse.json(
        { error: "Email, nombre y contrasena temporal son requeridos" },
        { status: 400 }
      );
    }

    if (temporaryPassword.length < 6) {
      return NextResponse.json(
        { error: "La contrasena temporal debe tener al menos 6 caracteres" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "El email ya existe" }, { status: 400 });
    }

    const password = await hashPassword(temporaryPassword);

    const created = await prisma.user.create({
      data: {
        email,
        name,
        lastName,
        password,
        role,
        mustChangePassword: true,
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
        lastLoginAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Error creando usuario:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
