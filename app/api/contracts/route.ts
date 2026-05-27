import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/session";
import {
  normalizeContractPayload,
  parseContractStatus,
} from "@/lib/contracts";
import { buildContractsWhere } from "@/lib/contracts-query";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

async function generateContractNumber(tx: Prisma.TransactionClient) {
  const latest = await tx.contract.findFirst({
    orderBy: { contractNumber: "desc" },
    select: { contractNumber: true },
  });

  const numericPart = latest?.contractNumber
    ? Number.parseInt(latest.contractNumber.replace(/^0+/, "") || "0", 10)
    : 0;

  return String(numericPart + 1).padStart(4, "0");
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const params = request.nextUrl.searchParams;
    const page = Math.max(1, Number.parseInt(params.get("page") || "1", 10) || 1);
    const pageSize = Math.min(50, Math.max(1, Number.parseInt(params.get("pageSize") || "10", 10) || 10));
    const sortBy = params.get("sortBy") === "contractNumber" ? "contractNumber" : "createdAt";
    const sortDirection = params.get("sortDirection") === "asc" ? "asc" : "desc";
    const where = buildContractsWhere(user, params);

    const [total, contracts] = await Promise.all([
      prisma.contract.count({ where }),
      prisma.contract.findMany({
        where,
        select: {
          id: true,
          contractNumber: true,
          clientName: true,
          clientLastName: true,
          clientDNI: true,
          clientPhone: true,
          commercializer: true,
          cups: true,
          address: true,
          activationDate: true,
          inactiveDate: true,
          status: true,
          paymentStatus: true,
          paidAt: true,
          createdAt: true,
          user: {
            select: { name: true, lastName: true, email: true },
          },
          documents: {
            select: { id: true },
          },
        },
        orderBy: { [sortBy]: sortDirection },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return NextResponse.json(
      {
        items: contracts,
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "private, s-maxage=20, stale-while-revalidate=60",
        },
      }
    );
  } catch (error) {
    console.error("Error obteniendo contratos:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const payload = (await request.json()) as Record<string, unknown>;
    const normalizedPayload = normalizeContractPayload(payload);

    if (!normalizedPayload.clientName || !normalizedPayload.commercializer) {
      return NextResponse.json(
        { error: "Cliente y comercializadora son obligatorios" },
        { status: 400 }
      );
    }

    const contract = await prisma.$transaction(async (tx) => {
      const contractNumber = await generateContractNumber(tx);

      return tx.contract.create({
        data: {
          contractNumber,
          ...normalizedPayload,
          userId: user.id,
          statusHistory: {
            create: {
              status: parseContractStatus(String(payload.status || "ACTIVE")),
              observations: normalizedPayload.observations,
              changedBy: user.name,
            },
          },
        },
        include: {
          interactions: true,
          documents: true,
          statusHistory: {
            orderBy: { createdAt: "desc" },
          },
        },
      });
    });

    return NextResponse.json(contract, { status: 201 });
  } catch (error) {
    console.error("Error creando contrato:", error);
    return NextResponse.json(
      { error: "Error al crear el contrato" },
      { status: 500 }
    );
  }
}
