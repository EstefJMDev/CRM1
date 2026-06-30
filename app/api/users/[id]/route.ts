import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getAuthUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (currentUser.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Solo Super Admin" }, { status: 403 });
    }

    const { id } = await params;
    const payload = (await request.json()) as Record<string, unknown>;

    const name = String(payload.name || "").trim();
    const lastName = String(payload.lastName || "").trim() || null;
    const email = String(payload.email || "").trim().toLowerCase();
    const isActive = Boolean(payload.isActive);
    const roleInput = String(payload.role || "USER");
    const role =
      roleInput === "TENANT_ADMIN" || roleInput === "USER" ? roleInput : "USER";

    if (!name || !email) {
      return NextResponse.json({ error: "Nombre y email son obligatorios" }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, email: true, isActive: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    if (targetUser.role === "SUPER_ADMIN") {
      return NextResponse.json({ error: "No se puede editar otro Super Admin desde este flujo" }, { status: 400 });
    }

    const existingEmail = await prisma.user.findFirst({
      where: {
        email,
        id: { not: id },
      },
      select: { id: true },
    });

    if (existingEmail) {
      return NextResponse.json({ error: "Ese email ya esta en uso" }, { status: 400 });
    }

    const shouldRotateSession =
      targetUser.role !== role ||
      targetUser.isActive !== isActive;

    const updated = await prisma.user.update({
      where: { id },
      data: {
        name,
        lastName,
        email,
        role,
        isActive,
        ...(shouldRotateSession ? { sessionVersion: { increment: 1 } } : {}),
      },
      select: {
        id: true,
        name: true,
        lastName: true,
        email: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error("Error actualizando usuario:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
