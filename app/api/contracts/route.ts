import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/session";
import { buildContractsWhere } from "@/lib/contracts-query";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

function canViewAllContracts(role: string) {
  return role === "SUPER_ADMIN" || role === "TENANT_ADMIN";
}

function parseDate(date?: string | null) {
  if (!date) return null;
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseStatus(status?: string): "ACTIVE" | "PENDING" | "INACTIVE" | "CANCELLED" {
  const allowed = ["ACTIVE", "PENDING", "INACTIVE", "CANCELLED"] as const;
  if (allowed.includes(status as (typeof allowed)[number])) {
    return status as (typeof allowed)[number];
  }
  return "ACTIVE";
}

function parsePaymentStatus(status?: string): "PAID" | "UNPAID" {
  return status === "PAID" ? "PAID" : "UNPAID";
}

function mapContractPayload(data: Record<string, unknown>) {
  return {
    clientName: String(data.clientName || "").trim(),
    clientLastName: String(data.clientLastName || "").trim() || null,
    clientType: String(data.clientType || "DOMESTICO"),
    clientDNI: String(data.clientDNI || "").trim() || null,
    clientPhone: String(data.clientPhone || "").trim() || null,
    clientSMS: String(data.clientSMS || "").trim() || null,
    clientEmail: String(data.clientEmail || "").trim() || null,
    clientIBAN: String(data.clientIBAN || "").trim() || null,
    supplyType: String(data.supplyType || "LUZ"),
    commercializer: String(data.commercializer || ""),
    requestType: String(data.requestType || "").trim() || null,
    cups: String(data.cups || "").trim() || null,
    cupsGas: String(data.cupsGas || "").trim() || null,
    tariff: String(data.tariff || "").trim() || null,
    lightTariff: String(data.lightTariff || "").trim() || null,
    gasTariff: String(data.gasTariff || "").trim() || null,
    products: Array.isArray(data.products)
      ? data.products.map((item) => String(item)).filter(Boolean)
      : [],
    address: String(data.address || "").trim() || null,
    municipality: String(data.municipality || "").trim() || null,
    province: String(data.province || "").trim() || null,
    zipCode: String(data.zipCode || "").trim() || null,
    roadType: String(data.roadType || "").trim() || null,
    roadName: String(data.roadName || "").trim() || null,
    roadNumber: String(data.roadNumber || "").trim() || null,
    secondaryZipCode: String(data.secondaryZipCode || "").trim() || null,
    secondaryMunicipality: String(data.secondaryMunicipality || "").trim() || null,
    secondaryProvince: String(data.secondaryProvince || "").trim() || null,
    secondaryRoadType: String(data.secondaryRoadType || "").trim() || null,
    secondaryRoadName: String(data.secondaryRoadName || "").trim() || null,
    secondaryRoadNumber: String(data.secondaryRoadNumber || "").trim() || null,
    pdv: String(data.pdv || "").trim() || null,
    observations: String(data.observations || "").trim() || null,
    activationDate: parseDate(String(data.activationDate || "")),
    inactiveDate: parseDate(String(data.inactiveDate || "")),
    scheduledCallDate: parseDate(String(data.scheduledCallDate || "")),
    status: parseStatus(String(data.status || "ACTIVE")),
    paymentStatus: parsePaymentStatus(String(data.paymentStatus || "UNPAID")),
    paidAt:
      parsePaymentStatus(String(data.paymentStatus || "UNPAID")) === "PAID"
        ? parseDate(String(data.paidAt || "")) || new Date()
        : null,
  };
}

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
    const where = buildContractsWhere(user, params, canViewAllContracts);

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

    const contract = await prisma.$transaction(async (tx) => {
      const contractNumber = await generateContractNumber(tx);

      return tx.contract.create({
        data: {
          contractNumber,
          ...mapContractPayload(payload),
          userId: user.id,
          statusHistory: {
            create: {
              status: parseStatus(String(payload.status || "ACTIVE")),
              observations: String(payload.observations || "").trim() || null,
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
