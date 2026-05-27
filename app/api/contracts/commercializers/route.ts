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
    const rows = await prisma.contract.groupBy({
      by: ["commercializer"],
      where,
      orderBy: { commercializer: "asc" },
    });

    const items = rows
      .map((row) => String(row.commercializer || "").trim())
      .filter(Boolean);

    return NextResponse.json({ items }, { status: 200 });
  } catch (error) {
    console.error("Error obteniendo comercializadoras:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
