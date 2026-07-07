import { prisma } from "@/lib/db";
import { canViewAllContracts } from "@/lib/contracts";
import { getAuthUser } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const items = await prisma.consentRequest.findMany({
      where: canViewAllContracts(user.role) ? {} : { contract: { userId: user.id } },
      orderBy: { createdAt: "desc" },
      include: {
        contract: {
          select: {
            id: true,
            contractNumber: true,
            clientName: true,
            clientLastName: true,
            clientEmail: true,
          },
        },
      },
    });

    return NextResponse.json({ items }, { status: 200 });
  } catch (error) {
    console.error("Error obteniendo historial de consentimientos:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
