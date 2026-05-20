import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getAuthUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    return NextResponse.json(currentUser, { status: 200 });
  } catch (error) {
    console.error("Error obteniendo perfil:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const currentUser = await getAuthUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const payload = (await request.json()) as Record<string, unknown>;
    const name = String(payload.name || "").trim();
    const lastName = String(payload.lastName || "").trim() || null;
    const email = String(payload.email || "").trim().toLowerCase();

    if (!name || !email) {
      return NextResponse.json({ error: "Nombre y email son obligatorios" }, { status: 400 });
    }

    const emailInUse = await prisma.user.findFirst({
      where: {
        email,
        id: { not: currentUser.id },
      },
      select: { id: true },
    });

    if (emailInUse) {
      return NextResponse.json({ error: "Ese email ya esta en uso" }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: currentUser.id },
      data: {
        name,
        lastName,
        email,
      },
      select: {
        id: true,
        name: true,
        lastName: true,
        email: true,
        role: true,
        mustChangePassword: true,
        isActive: true,
      },
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error("Error actualizando perfil:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
