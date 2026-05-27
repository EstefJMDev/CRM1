import { ContractStatus, PaymentStatus } from "@prisma/client";

type ContractPayload = Record<string, unknown>;

export function canViewAllContracts(role: string) {
  return role === "SUPER_ADMIN" || role === "TENANT_ADMIN";
}

export function parseOptionalDate(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function parseContractStatus(status?: string): ContractStatus {
  const allowed = ["ACTIVE", "PENDING", "INACTIVE", "CANCELLED"] as const;
  if (allowed.includes(status as ContractStatus)) {
    return status as ContractStatus;
  }
  return "ACTIVE";
}

export function parsePaymentStatus(status?: string): PaymentStatus {
  return status === "PAID" ? "PAID" : "UNPAID";
}

export function normalizeContractPayload(data: ContractPayload) {
  const paymentStatus = parsePaymentStatus(String(data.paymentStatus || "UNPAID"));

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
    commercializer: String(data.commercializer || "").trim(),
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
    activationDate: parseOptionalDate(String(data.activationDate || "")),
    inactiveDate: parseOptionalDate(String(data.inactiveDate || "")),
    scheduledCallDate: parseOptionalDate(String(data.scheduledCallDate || "")),
    status: parseContractStatus(String(data.status || "ACTIVE")),
    paymentStatus,
    paidAt:
      paymentStatus === "PAID"
        ? parseOptionalDate(String(data.paidAt || "")) || new Date()
        : null,
  };
}
