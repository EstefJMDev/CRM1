import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/session";
import { hashPassword } from "@/lib/auth";
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
    const temporaryPassword = String(payload.temporaryPassword || "");

    if (!temporaryPassword || temporaryPassword.length < 6) {
      return NextResponse.json(
        { error: "La contrasena temporal debe tener al menos 6 caracteres" },
        { status: 400 }
      );
    }

    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    if (targetUser.role === "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "No se puede resetear la contrasena de otro Super Admin desde este flujo" },
        { status: 400 }
      );
    }

    const password = await hashPassword(temporaryPassword);

    await prisma.user.update({
      where: { id },
      data: {
        password,
        mustChangePassword: true,
        sessionVersion: { increment: 1 },
      },
    });

    return NextResponse.json({ message: "Contrasena reseteada" }, { status: 200 });
  } catch (error) {
    console.error("Error reseteando contrasena:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
