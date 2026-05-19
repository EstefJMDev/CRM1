import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;

    let contract;

    if (user.role === "ADMIN") {
      contract = await prisma.contract.findUnique({
        where: { id },
        include: {
          interactions: {
            orderBy: { createdAt: "desc" },
          },
          documents: {
            orderBy: { createdAt: "desc" },
          },
          statusHistory: {
            orderBy: { createdAt: "desc" },
          },
          user: {
            select: { name: true, email: true },
          },
        },
      });
    } else {
      contract = await prisma.contract.findFirst({
        where: { id, userId: user.id },
        include: {
          interactions: {
            orderBy: { createdAt: "desc" },
          },
          documents: {
            orderBy: { createdAt: "desc" },
          },
          statusHistory: {
            orderBy: { createdAt: "desc" },
          },
          user: {
            select: { name: true, email: true },
          },
        },
      });
    }

    if (!contract) {
      return NextResponse.json(
        { error: "Contrato no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(contract, { status: 200 });
  } catch (error) {
    console.error("Error obteniendo contrato:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const data = await request.json();

    // Verificar que el usuario es el propietario o es admin
    const contract = await prisma.contract.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!contract || (user.role !== "ADMIN" && contract.userId !== user.id)) {
      return NextResponse.json(
        { error: "No tienes permiso para actualizar este contrato" },
        { status: 403 }
      );
    }

    const currentContract = await prisma.contract.findUnique({
      where: { id },
      select: { status: true, observations: true },
    });

    const nextStatus = String(data.status ?? currentContract?.status ?? "");
    const nextObservations =
      String(data.observations ?? currentContract?.observations ?? "").trim() || null;
    const previousObservations =
      String(currentContract?.observations ?? "").trim() || null;
    const didStatusChange = Boolean(currentContract && nextStatus !== currentContract.status);
    const didObservationChange = nextObservations !== previousObservations;

    const updatedContract = await prisma.$transaction(async (tx) => {
      await tx.contract.update({
        where: { id },
        data: {
          ...data,
        },
        include: {
          interactions: true,
          documents: true,
          statusHistory: {
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (didStatusChange || didObservationChange) {
        await tx.contractStatusHistory.create({
          data: {
            contractId: id,
            status: nextStatus,
            observations: nextObservations,
            changedBy: user.name,
          },
        });
      }

      return tx.contract.findUniqueOrThrow({
        where: { id },
        include: {
          interactions: true,
          documents: true,
          statusHistory: {
            orderBy: { createdAt: "desc" },
          },
        },
      });
    });

    return NextResponse.json(updatedContract, { status: 200 });
  } catch (error) {
    console.error("Error actualizando contrato:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;

    // Verificar que el usuario es el propietario o es admin
    const contract = await prisma.contract.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!contract || (user.role !== "ADMIN" && contract.userId !== user.id)) {
      return NextResponse.json(
        { error: "No tienes permiso para eliminar este contrato" },
        { status: 403 }
      );
    }

    await prisma.contract.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: "Contrato eliminado" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error eliminando contrato:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
