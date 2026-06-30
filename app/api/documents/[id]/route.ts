import { prisma } from "@/lib/db";
import { canViewAllContracts } from "@/lib/contracts";
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
    const document = await prisma.document.findUnique({
      where: { id },
      select: {
        url: true,
        contract: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!document) {
      return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
    }

    if (!canViewAllContracts(user.role) && document.contract.userId !== user.id) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    return NextResponse.redirect(document.url, {
      status: 307,
      headers: {
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Error descargando documento:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
