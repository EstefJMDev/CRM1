import { prisma } from "@/lib/db";
import { canViewAllContracts } from "@/lib/contracts";
import { getAuthUser } from "@/lib/session";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

function buildPhoneSearchVariants(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 6) return [];

  const compact = digits;
  const grouped3 = digits.replace(/(\d{3})(?=\d)/g, "$1 ").trim();
  const grouped3Hyphen = grouped3.replaceAll(" ", "-");
  const grouped3Dot = grouped3.replaceAll(" ", ".");
  const grouped2 = digits.replace(/(\d{2})(?=\d)/g, "$1 ").trim();

  return Array.from(new Set([compact, grouped3, grouped3Hyphen, grouped3Dot, grouped2]));
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = (searchParams.get("search") || "").trim();
    const status = (searchParams.get("status") || "all").trim();
    const agentId = (searchParams.get("agentId") || "all").trim();
    const phoneVariants = buildPhoneSearchVariants(search);

    const where: Prisma.ConsentRequestWhereInput = {
      ...(canViewAllContracts(user.role) ? {} : { contract: { is: { userId: user.id } } }),
    };

    if (status !== "all") {
      where.status =
        status === "APPROVED"
          ? "APPROVED"
          : status === "SUPERSEDED"
            ? "SUPERSEDED"
            : "PENDING";
    }

    if (agentId !== "all" && canViewAllContracts(user.role)) {
      where.contract = {
        is: {
          userId: agentId,
        },
      };
    }

    if (search) {
      where.OR = [
        { recipientEmail: { contains: search, mode: "insensitive" } },
        { requestedBy: { contains: search, mode: "insensitive" } },
        { signerName: { contains: search, mode: "insensitive" } },
        { contract: { contractNumber: { contains: search, mode: "insensitive" } } },
        { contract: { clientName: { contains: search, mode: "insensitive" } } },
        { contract: { clientLastName: { contains: search, mode: "insensitive" } } },
        { contract: { clientDNI: { contains: search, mode: "insensitive" } } },
        { contract: { clientPhone: { contains: search, mode: "insensitive" } } },
        { contract: { clientSMS: { contains: search, mode: "insensitive" } } },
        { contract: { clientEmail: { contains: search, mode: "insensitive" } } },
        { contract: { user: { name: { contains: search, mode: "insensitive" } } } },
        { contract: { user: { lastName: { contains: search, mode: "insensitive" } } } },
        ...phoneVariants.map((variant) => ({
          contract: { clientPhone: { contains: variant, mode: "insensitive" as const } },
        })),
        ...phoneVariants.map((variant) => ({
          contract: { clientSMS: { contains: variant, mode: "insensitive" as const } },
        })),
      ];
    }

    const items = await prisma.consentRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        contract: {
          select: {
            id: true,
            contractNumber: true,
            clientName: true,
            clientLastName: true,
            clientDNI: true,
            clientPhone: true,
            clientEmail: true,
            userId: true,
            user: {
              select: {
                id: true,
                name: true,
                lastName: true,
              },
            },
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
