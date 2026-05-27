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

    const where = canViewAllContracts(user.role) ? {} : { userId: user.id };
    const rows = await prisma.contract.findMany({
      where,
      distinct: ["userId"],
      select: {
        userId: true,
        user: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const fullUsers = await prisma.user.findMany({
      where: { id: { in: rows.map((row) => row.userId) } },
      select: { id: true, name: true, lastName: true },
      orderBy: { name: "asc" },
    });

    const items = fullUsers
      .map((u) => ({
        id: u.id,
        fullName: `${u.name} ${u.lastName || ""}`.trim(),
      }))
      .sort((a, b) => a.fullName.localeCompare(b.fullName, "es"));

    return NextResponse.json({ items }, { status: 200 });
  } catch (error) {
    console.error("Error obteniendo agentes:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
