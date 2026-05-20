import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/session";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(request: NextRequest) {
  try {
    const currentUser = await getAuthUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const payload = (await request.json()) as Record<string, unknown>;
    const currentPassword = String(payload.currentPassword || "");
    const newPassword = String(payload.newPassword || "");

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { error: "La nueva contrasena debe tener al menos 6 caracteres" },
        { status: 400 }
      );
    }

    const userWithPassword = await prisma.user.findUnique({
      where: { id: currentUser.id },
      select: { password: true, mustChangePassword: true },
    });

    if (!userWithPassword) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    if (!userWithPassword.mustChangePassword && !currentPassword) {
      return NextResponse.json(
        { error: "Debes indicar la contrasena actual" },
        { status: 400 }
      );
    }

    if (currentPassword) {
      const isValid = await verifyPassword(currentPassword, userWithPassword.password);
      if (!isValid) {
        return NextResponse.json({ error: "Contrasena actual incorrecta" }, { status: 400 });
      }
    }

    const password = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: currentUser.id },
      data: {
        password,
        mustChangePassword: false,
      },
    });

    return NextResponse.json({ message: "Contrasena actualizada" }, { status: 200 });
  } catch (error) {
    console.error("Error cambiando contrasena:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
