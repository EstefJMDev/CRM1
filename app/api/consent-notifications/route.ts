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

    const { searchParams } = new URL(request.url);
    const requestedLimit = Number(searchParams.get("limit") || "8");
    const take = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), 20)
      : 8;

    const items = await prisma.consentRequest.findMany({
      where: {
        status: "APPROVED",
        approvedAt: { not: null },
        ...(canViewAllContracts(user.role) ? {} : { contract: { userId: user.id } }),
      },
      orderBy: { approvedAt: "desc" },
      take,
      select: {
        id: true,
        approvedAt: true,
        contract: {
          select: {
            id: true,
            contractNumber: true,
            clientName: true,
            clientLastName: true,
            userId: true,
          },
        },
      },
    });

    return NextResponse.json({ items }, { status: 200 });
  } catch (error) {
    console.error("Error obteniendo notificaciones de consentimientos:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
