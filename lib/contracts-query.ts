import { ContractStatus, Prisma } from "@prisma/client";

type QueryValue = string | null;

function parseDate(value: QueryValue) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

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

export function buildContractsWhere(
  user: { id: string; role: string },
  params: URLSearchParams,
  canViewAllContracts: (role: string) => boolean
): Prisma.ContractWhereInput {
  const search = (params.get("search") || "").trim();
  const status = (params.get("status") || "all").trim();
  const agentId = (params.get("agentId") || params.get("agent") || "all").trim();
  const commercializer = (params.get("commercializer") || "all").trim();
  const fromActivationDate = parseDate(params.get("fromActivationDate"));
  const toActivationDate = parseDate(params.get("toActivationDate"));
  const fromInactiveDate = parseDate(params.get("fromInactiveDate"));
  const toInactiveDate = parseDate(params.get("toInactiveDate"));
  const fromCreatedDate = parseDate(params.get("fromCreatedDate"));
  const toCreatedDate = parseDate(params.get("toCreatedDate"));

  const where: Prisma.ContractWhereInput = {
    ...(canViewAllContracts(user.role) ? {} : { userId: user.id }),
  };

  if (search) {
    const phoneVariants = buildPhoneSearchVariants(search);
    where.OR = [
      { clientName: { contains: search, mode: "insensitive" } },
      { clientLastName: { contains: search, mode: "insensitive" } },
      { clientDNI: { contains: search, mode: "insensitive" } },
      { contractNumber: { contains: search, mode: "insensitive" } },
      { commercializer: { contains: search, mode: "insensitive" } },
      { cups: { contains: search, mode: "insensitive" } },
      { address: { contains: search, mode: "insensitive" } },
      { clientPhone: { contains: search, mode: "insensitive" } },
      { clientSMS: { contains: search, mode: "insensitive" } },
      { user: { name: { contains: search, mode: "insensitive" } } },
      { user: { lastName: { contains: search, mode: "insensitive" } } },
      ...phoneVariants.map((variant) => ({
        clientPhone: { contains: variant, mode: "insensitive" as const },
      })),
      ...phoneVariants.map((variant) => ({
        clientSMS: { contains: variant, mode: "insensitive" as const },
      })),
    ];
  }

  if (status !== "all") {
    if (status === "PAID" || status === "UNPAID") {
      where.paymentStatus = status;
    } else {
      where.status = status as ContractStatus;
    }
  }

  if (agentId !== "all") {
    where.userId = agentId;
  }

  if (commercializer !== "all") {
    where.commercializer = commercializer;
  }

  if (fromActivationDate || toActivationDate) {
    where.activationDate = {
      ...(fromActivationDate ? { gte: fromActivationDate } : {}),
      ...(toActivationDate ? { lte: toActivationDate } : {}),
    };
  }

  if (fromInactiveDate || toInactiveDate) {
    where.inactiveDate = {
      ...(fromInactiveDate ? { gte: fromInactiveDate } : {}),
      ...(toInactiveDate ? { lte: toInactiveDate } : {}),
    };
  }

  if (fromCreatedDate || toCreatedDate) {
    where.createdAt = {
      ...(fromCreatedDate ? { gte: fromCreatedDate } : {}),
      ...(toCreatedDate ? { lte: toCreatedDate } : {}),
    };
  }

  return where;
}
