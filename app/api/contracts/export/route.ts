import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/session";
import { buildContractsWhere } from "@/lib/contracts-query";
import { NextRequest, NextResponse } from "next/server";

function canViewAllContracts(role: string) {
  return role === "SUPER_ADMIN" || role === "TENANT_ADMIN";
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function formatDate(value?: string | Date | null) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("es-ES");
}

function formatList(values?: string[] | null) {
  return values && values.length > 0 ? values.join(", ") : "";
}

function toDateOnly(value?: Date | string | null) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function getIsoWeekLabel(dateInput?: Date | string | null) {
  if (!dateInput) return "";
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(date.getTime())) return "";
  const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil((((utc.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${utc.getUTCFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

function normalizeCommercializer(value: string) {
  return value.replace(/^\s*\d+\s*[-.)]?\s*/, "").trim();
}

type ExportField = {
  key: string;
  label: string;
  description: string;
  getValue: (contract: ExportContract) => string;
};

type ExportContract = {
  contractNumber: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  clientName: string;
  clientLastName: string | null;
  clientType: string;
  clientDNI: string | null;
  clientPhone: string | null;
  clientSMS: string | null;
  clientEmail: string | null;
  clientIBAN: string | null;
  supplyType: string;
  commercializer: string;
  requestType: string | null;
  cups: string | null;
  cupsGas: string | null;
  tariff: string | null;
  lightTariff: string | null;
  gasTariff: string | null;
  products: string[];
  address: string | null;
  municipality: string | null;
  province: string | null;
  zipCode: string | null;
  roadType: string | null;
  roadName: string | null;
  roadNumber: string | null;
  secondaryZipCode: string | null;
  secondaryMunicipality: string | null;
  secondaryProvince: string | null;
  secondaryRoadType: string | null;
  secondaryRoadName: string | null;
  secondaryRoadNumber: string | null;
  pdv: string | null;
  scheduledCallDate: Date | null;
  activationDate: Date | null;
  inactiveDate: Date | null;
  observations: string | null;
  documents: Array<{ name: string }>;
  interactions: Array<{ type: string; date: Date; notes: string }>;
  user: { name: string; email: string };
};

const EXPORT_FIELDS: ExportField[] = [
  { key: "contractNumber", label: "Numero de contrato", description: "Identificador interno del contrato.", getValue: (c) => c.contractNumber },
  { key: "status", label: "Estado", description: "Estado actual del contrato.", getValue: (c) => c.status },
  { key: "createdAt", label: "Fecha de alta", description: "Fecha y hora de creacion del contrato.", getValue: (c) => formatDate(c.createdAt) },
  { key: "updatedAt", label: "Ultima actualizacion", description: "Fecha y hora de la ultima modificacion.", getValue: (c) => formatDate(c.updatedAt) },
  { key: "createdByName", label: "Creado por", description: "Nombre del usuario propietario del contrato.", getValue: (c) => c.user.name },
  { key: "createdByEmail", label: "Email del creador", description: "Correo del usuario propietario del contrato.", getValue: (c) => c.user.email },
  { key: "clientName", label: "Nombre del cliente", description: "Nombre del titular o cliente.", getValue: (c) => c.clientName },
  { key: "clientLastName", label: "Apellidos del cliente", description: "Apellidos del titular o cliente.", getValue: (c) => c.clientLastName || "" },
  { key: "clientType", label: "Tipo de cliente", description: "Clasificacion del cliente.", getValue: (c) => c.clientType },
  { key: "clientDNI", label: "DNI/NIF", description: "Documento identificativo del cliente.", getValue: (c) => c.clientDNI || "" },
  { key: "clientPhone", label: "Telefono", description: "Telefono principal del cliente.", getValue: (c) => c.clientPhone || "" },
  { key: "clientSMS", label: "Telefono SMS", description: "Telefono habilitado para SMS.", getValue: (c) => c.clientSMS || "" },
  { key: "clientEmail", label: "Email del cliente", description: "Correo electronico del cliente.", getValue: (c) => c.clientEmail || "" },
  { key: "clientIBAN", label: "IBAN", description: "Cuenta bancaria asociada.", getValue: (c) => c.clientIBAN || "" },
  { key: "supplyType", label: "Tipo de suministro", description: "Tipo de servicio contratado.", getValue: (c) => c.supplyType },
  { key: "commercializer", label: "Comercializadora", description: "Empresa comercializadora asociada.", getValue: (c) => c.commercializer },
  { key: "requestType", label: "Tipo de solicitud", description: "Modalidad o motivo de la solicitud.", getValue: (c) => c.requestType || "" },
  { key: "cups", label: "CUPS luz", description: "Codigo universal del punto de suministro electrico.", getValue: (c) => c.cups || "" },
  { key: "cupsGas", label: "CUPS gas", description: "Codigo universal del punto de suministro de gas.", getValue: (c) => c.cupsGas || "" },
  { key: "tariff", label: "Tarifa general", description: "Tarifa general del contrato.", getValue: (c) => c.tariff || "" },
  { key: "lightTariff", label: "Tarifa luz", description: "Tarifa especifica de luz.", getValue: (c) => c.lightTariff || "" },
  { key: "gasTariff", label: "Tarifa gas", description: "Tarifa especifica de gas.", getValue: (c) => c.gasTariff || "" },
  { key: "products", label: "Productos", description: "Listado de productos o extras contratados.", getValue: (c) => formatList(c.products) },
  { key: "address", label: "Direccion principal", description: "Direccion completa principal.", getValue: (c) => c.address || "" },
  { key: "municipality", label: "Municipio principal", description: "Municipio de la direccion principal.", getValue: (c) => c.municipality || "" },
  { key: "province", label: "Provincia principal", description: "Provincia de la direccion principal.", getValue: (c) => c.province || "" },
  { key: "zipCode", label: "Codigo postal principal", description: "Codigo postal de la direccion principal.", getValue: (c) => c.zipCode || "" },
  { key: "roadType", label: "Tipo de via principal", description: "Tipo de via de la direccion principal.", getValue: (c) => c.roadType || "" },
  { key: "roadName", label: "Nombre de via principal", description: "Nombre de la via principal.", getValue: (c) => c.roadName || "" },
  { key: "roadNumber", label: "Numero de via principal", description: "Numero de la via principal.", getValue: (c) => c.roadNumber || "" },
  { key: "secondaryZipCode", label: "Codigo postal secundario", description: "Codigo postal de la direccion secundaria.", getValue: (c) => c.secondaryZipCode || "" },
  { key: "secondaryMunicipality", label: "Municipio secundario", description: "Municipio de la direccion secundaria.", getValue: (c) => c.secondaryMunicipality || "" },
  { key: "secondaryProvince", label: "Provincia secundaria", description: "Provincia de la direccion secundaria.", getValue: (c) => c.secondaryProvince || "" },
  { key: "secondaryRoadType", label: "Tipo de via secundaria", description: "Tipo de via de la direccion secundaria.", getValue: (c) => c.secondaryRoadType || "" },
  { key: "secondaryRoadName", label: "Nombre de via secundaria", description: "Nombre de la via secundaria.", getValue: (c) => c.secondaryRoadName || "" },
  { key: "secondaryRoadNumber", label: "Numero de via secundaria", description: "Numero de la via secundaria.", getValue: (c) => c.secondaryRoadNumber || "" },
  { key: "pdv", label: "PDV", description: "Punto de venta o referencia comercial.", getValue: (c) => c.pdv || "" },
  { key: "scheduledCallDate", label: "Fecha llamada programada", description: "Fecha prevista de seguimiento.", getValue: (c) => formatDate(c.scheduledCallDate) },
  { key: "activationDate", label: "Fecha de activacion", description: "Fecha de activacion del contrato.", getValue: (c) => formatDate(c.activationDate) },
  { key: "inactiveDate", label: "Fecha de baja", description: "Fecha de baja o inactividad.", getValue: (c) => formatDate(c.inactiveDate) },
  { key: "observations", label: "Observaciones", description: "Notas u observaciones del contrato.", getValue: (c) => c.observations || "" },
  { key: "documentsCount", label: "Numero de documentos", description: "Cantidad de documentos adjuntos.", getValue: (c) => String(c.documents.length) },
  { key: "documentsList", label: "Documentos", description: "Nombres de los documentos adjuntos.", getValue: (c) => c.documents.map((doc) => doc.name).join(", ") },
  { key: "interactionsCount", label: "Numero de interacciones", description: "Cantidad de interacciones registradas.", getValue: (c) => String(c.interactions.length) },
  { key: "lastInteraction", label: "Ultima interaccion", description: "Resumen de la interaccion mas reciente.", getValue: (c) => {
      const interaction = [...c.interactions].sort((a, b) => +new Date(b.date) - +new Date(a.date))[0];
      return interaction ? `${formatDate(interaction.date)} - ${interaction.type}: ${interaction.notes}` : "";
    } },
];

function buildRows(cells: string[][]) {
  return cells
    .map((row) => {
      const columns = row
        .map((cell) => `<Cell><Data ss:Type="String">${escapeXml(cell)}</Data></Cell>`)
        .join("");
      return `<Row>${columns}</Row>`;
    })
    .join("");
}

function buildWorkbook(contracts: ExportContract[]) {
  const contractRows = [
    EXPORT_FIELDS.map((field) => field.label),
    ...contracts.map((contract) => EXPORT_FIELDS.map((field) => field.getValue(contract))),
  ];

  const dictionaryRows = [
    ["Campo", "Descripcion"],
    ...EXPORT_FIELDS.map((field) => [field.label, field.description]),
  ];

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
  <Worksheet ss:Name="Contratos">
    <Table>
      ${buildRows(contractRows)}
    </Table>
  </Worksheet>
  <Worksheet ss:Name="Campos">
    <Table>
      ${buildRows(dictionaryRows)}
    </Table>
  </Worksheet>
</Workbook>`;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const payload = (await request.json()) as { ids?: string[]; filters?: Record<string, string> };
    const ids = Array.isArray(payload.ids)
      ? payload.ids.map((id) => String(id).trim()).filter(Boolean)
      : [];
    const params = new URLSearchParams(payload.filters || {});
    const exportMonth = (params.get("exportMonth") || "all").trim();
    const exportWeek = (params.get("exportWeek") || "all").trim();
    const exportCommercializer = (params.get("commercializer") || "all").trim();
    const baseWhere = buildContractsWhere(user, params, canViewAllContracts);

    const where = ids.length > 0
      ? { ...baseWhere, id: { in: ids } }
      : baseWhere;

    let contracts = await prisma.contract.findMany({
      where,
      include: {
        documents: {
          select: { name: true },
        },
        interactions: {
          select: { type: true, date: true, notes: true },
        },
        user: {
          select: { name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    contracts = contracts.filter((contract) => {
      const month = toDateOnly(contract.createdAt).slice(0, 7);
      const week = getIsoWeekLabel(contract.createdAt);
      const monthOk = exportMonth === "all" || month === exportMonth;
      const weekOk = exportWeek === "all" || week === exportWeek;
      const commercializerOk =
        exportCommercializer === "all" ||
        normalizeCommercializer(contract.commercializer) === exportCommercializer;
      return monthOk && weekOk && commercializerOk;
    });

    const workbook = buildWorkbook(contracts);
    const now = new Date().toISOString().slice(0, 10);

    return new NextResponse(workbook, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.ms-excel; charset=utf-8",
        "Content-Disposition": `attachment; filename="contratos-${now}.xls"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Error exportando contratos:", error);
    return NextResponse.json(
      { error: "Error al exportar los contratos" },
      { status: 500 }
    );
  }
}
