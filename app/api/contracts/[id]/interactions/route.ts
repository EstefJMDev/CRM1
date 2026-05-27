import { prisma } from "@/lib/db";
import { canViewAllContracts } from "@/lib/contracts";
import { getAuthUser } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const { type, notes, date } = await request.json();

    // Verificar que el usuario es el propietario o es admin
    const contract = await prisma.contract.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!contract || (!canViewAllContracts(user.role) && contract.userId !== user.id)) {
      return NextResponse.json(
        { error: "No tienes permiso para agregar interacciones" },
        { status: 403 }
      );
    }

    const interaction = await prisma.interaction.create({
      data: {
        type,
        notes,
        date: new Date(date),
        contractId: id,
      },
    });

    return NextResponse.json(interaction, { status: 201 });
  } catch (error) {
    console.error("Error creando interacción:", error);
    return NextResponse.json(
      { error: "Error al crear la interacción" },
      { status: 500 }
    );
  }
}

