import { createHash, randomBytes } from "node:crypto";
import { PDFDocument, PDFPage, StandardFonts, rgb } from "pdf-lib";

type ContractConsentSnapshotInput = {
  contractId: string;
  contractNumber: string;
  clientName: string;
  clientLastName?: string | null;
  clientDNI?: string | null;
  clientPhone?: string | null;
  clientEmail?: string | null;
  address?: string | null;
  municipality?: string | null;
  province?: string | null;
  zipCode?: string | null;
  cups?: string | null;
  commercializer?: string | null;
  tariff?: string | null;
  user?: {
    name?: string | null;
    lastName?: string | null;
    email?: string | null;
  } | null;
};

export type ConsentSnapshot = {
  contractId: string;
  contractNumber: string;
  clientFullName: string;
  clientDni: string;
  clientEmail: string;
  clientPhone: string;
  supplyAddress: string;
  cups: string;
  commercializer: string;
  requestedTariff: string;
  collaboratorName: string;
  collaboratorDocumentId: string;
  collaboratorEmail: string;
  companyName: string;
  companyCif: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  recordNumber: string;
  issuedAtLabel: string;
  legalTextVersion: string;
  legalTextHash: string;
};

export type ConsentEvidence = {
  token?: string;
  recipientEmail?: string | null;
  requestedAt?: string | Date | null;
  requestedIp?: string | null;
  requestedUserAgent?: string | null;
  requestedBrowser?: string | null;
  requestedOs?: string | null;
  approvedAt?: string | Date | null;
  approvedIp?: string | null;
  approvedUserAgent?: string | null;
  approvedBrowser?: string | null;
  approvedOs?: string | null;
  legalTextVersion?: string | null;
  legalTextHash?: string | null;
};

export type ConsentDocumentData = {
  snapshot: ConsentSnapshot;
  signerName?: string | null;
  approvedAt?: string | Date | null;
  status?: "PENDING" | "APPROVED" | "SUPERSEDED";
  evidence?: ConsentEvidence;
};

export const CONSENT_STATUS_LABELS = {
  NOT_SENT: "Solicitud no enviada",
  PENDING: "Enviada a la espera",
  APPROVED: "Consentimiento aprobado",
  SUPERSEDED: "Enlace invalidado por una solicitud mas reciente",
} as const;

const CONFIRMATION_PARAGRAPHS = [
  "Usted ha mantenido una conversacion con el colaborador identificado anteriormente, de forma presencial o telefonica, durante la cual ha manifestado su interes en recibir informacion y, en su caso, contratar un suministro energetico.",
  "Como consecuencia de dicha solicitud, ha facilitado voluntariamente la informacion necesaria para preparar una propuesta adaptada a sus necesidades.",
  "Mediante la aceptacion del presente documento confirma expresamente que desea que el colaborador continue con las actuaciones precontractuales necesarias relacionadas con la gestion iniciada.",
];

const DECLARATION_ITEMS = [
  "He facilitado voluntariamente mis datos al colaborador.",
  "Deseo continuar con el proceso iniciado.",
  "Solicito que el colaborador pueda contactar conmigo para completar la gestion solicitada.",
  "He leido y comprendido el contenido del presente documento.",
  "Entiendo que podre decidir libremente si formalizo o no la contratacion propuesta.",
];

export function generateConsentToken() {
  return randomBytes(32).toString("hex");
}

export function getConsentLegalTextVersion() {
  return process.env.CONSENT_LEGAL_TEXT_VERSION || "2026-07";
}

function formatSpanishDate(value: Date) {
  return value.toLocaleDateString("es-ES");
}

function formatSpanishDateTime(value?: string | Date | null) {
  if (!value) return "-";
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";

  return parsed.toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function getConsentOwnerDefaults() {
  return {
    name:
      process.env.CONSENT_OWNER_NAME ||
      process.env.CONSENT_COMPANY_NAME ||
      "Empresa",
    documentId:
      process.env.CONSENT_OWNER_DOCUMENT_ID ||
      process.env.CONSENT_COMPANY_CIF ||
      "-",
    address:
      process.env.CONSENT_OWNER_ADDRESS ||
      process.env.CONSENT_COMPANY_ADDRESS ||
      "-",
    phone: process.env.CONSENT_OWNER_PHONE || "-",
    email:
      process.env.CONSENT_OWNER_EMAIL ||
      process.env.CONSENT_FROM_EMAIL ||
      "-",
  };
}

function getCollaboratorDocumentId() {
  return (
    process.env.CONSENT_COLLABORATOR_DOCUMENT_ID ||
    process.env.CONSENT_MANAGER_DOCUMENT_ID ||
    "-"
  );
}

export function buildConsentSnapshot(contract: ContractConsentSnapshotInput): ConsentSnapshot {
  const owner = getConsentOwnerDefaults();
  const collaboratorName =
    `${contract.user?.name || ""} ${contract.user?.lastName || ""}`.trim() ||
    "Equipo comercial";
  const fullName = `${contract.clientName || ""} ${contract.clientLastName || ""}`.trim();
  const addressParts = [
    contract.address,
    contract.zipCode,
    contract.municipality,
    contract.province,
  ].filter(Boolean);
  const now = new Date();

  const snapshot: ConsentSnapshot = {
    contractId: contract.contractId,
    contractNumber: contract.contractNumber,
    clientFullName: fullName || "Cliente",
    clientDni: contract.clientDNI || "-",
    clientEmail: contract.clientEmail || "-",
    clientPhone: contract.clientPhone || "-",
    supplyAddress: addressParts.join(", ") || "-",
    cups: contract.cups || "-",
    commercializer: contract.commercializer || "-",
    requestedTariff: contract.tariff || "-",
    collaboratorName,
    collaboratorDocumentId: getCollaboratorDocumentId(),
    collaboratorEmail: contract.user?.email || "-",
    companyName: owner.name,
    companyCif: owner.documentId,
    companyAddress: owner.address,
    companyPhone: owner.phone,
    companyEmail: owner.email,
    recordNumber: contract.contractNumber,
    issuedAtLabel: formatSpanishDate(now),
    legalTextVersion: getConsentLegalTextVersion(),
    legalTextHash: "",
  };

  snapshot.legalTextHash = buildConsentLegalTextHash(snapshot);

  return snapshot;
}

export function getAppBaseUrl(origin?: string | null) {
  return (
    origin ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

export function buildConsentLink(token: string, origin?: string | null) {
  return `${getAppBaseUrl(origin)}/consent/${token}`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildConsentLegalParagraphs() {
  return [
    "Responsable del tratamiento: [Empresa]",
    "Finalidad: Gestionar la solicitud realizada por el interesado y continuar las actuaciones precontractuales necesarias.",
    "Base juridica: Consentimiento del interesado y aplicacion de medidas precontractuales solicitadas por el propio interesado.",
    "Conservacion: La evidencia de esta confirmacion sera conservada durante el tiempo legalmente necesario.",
    "Derechos: Puede ejercer los derechos de acceso, rectificacion, supresion, oposicion, limitacion y portabilidad a traves de los canales habilitados por el responsable del tratamiento.",
  ];
}

function buildConsentLegalTextHash(snapshot: ConsentSnapshot) {
  const source = [
    snapshot.legalTextVersion,
    snapshot.recordNumber,
    CONFIRMATION_PARAGRAPHS.join("\n"),
    DECLARATION_ITEMS.join("\n"),
    buildConsentLegalParagraphs().join("\n"),
    "La aceptacion de este documento no supone la formalizacion de un contrato de suministro energetico ni la aceptacion definitiva de una oferta comercial.",
  ].join("\n\n");

  return createHash("sha256").update(source).digest("hex");
}

function getDeviceLabel(userAgent?: string | null) {
  const normalized = String(userAgent || "").toLowerCase();
  if (!normalized) return "-";
  if (
    normalized.includes("mobile") ||
    normalized.includes("iphone") ||
    normalized.includes("android")
  ) {
    return "Movil";
  }
  if (normalized.includes("ipad") || normalized.includes("tablet")) {
    return "Tablet";
  }

  return "Ordenador";
}

function buildStatusLabel(status?: ConsentDocumentData["status"]) {
  if (status === "APPROVED") return "Consentimiento aprobado";
  if (status === "SUPERSEDED") return "Enlace invalidado por una solicitud mas reciente";
  return "Solicitud pendiente de aprobacion";
}

function buildDocumentSections(snapshot: ConsentSnapshot, evidence?: ConsentEvidence) {
  const collaboratorRows: Array<[string, string]> = [
    ["Empresa", ""],
    ["Razon Social", snapshot.companyName],
    ["CIF", snapshot.companyCif],
    ["Direccion", snapshot.companyAddress],
    ["Telefono", snapshot.companyPhone],
    ["Correo electronico", snapshot.companyEmail || "-"],
    ["Gestor responsable", ""],
    ["Nombre y apellidos", snapshot.collaboratorName],
    ["NIF", snapshot.collaboratorDocumentId],
  ];

  const interestedRows: Array<[string, string]> = [
    ["Nombre y apellidos", snapshot.clientFullName],
    ["DNI / NIE", snapshot.clientDni],
    ["Telefono", snapshot.clientPhone],
    ["Correo electronico", snapshot.clientEmail || "-"],
  ];

  const requestRows: Array<[string, string]> = [
    ["Direccion del suministro", snapshot.supplyAddress],
    ["CUPS", snapshot.cups],
    ["Comercializadora", snapshot.commercializer],
    ["Tarifa solicitada", snapshot.requestedTariff],
  ];

  const evidenceRows: Array<[string, string]> = [
    ["Fecha y hora de aceptacion", formatSpanishDateTime(evidence?.approvedAt)],
    ["Canal", "Correo electronico"],
    ["Direccion IP", evidence?.approvedIp || "-"],
    ["Navegador", evidence?.approvedBrowser || "-"],
    ["Sistema operativo", evidence?.approvedOs || "-"],
    ["Dispositivo", getDeviceLabel(evidence?.approvedUserAgent)],
    ["Correo de validacion", evidence?.recipientEmail || snapshot.clientEmail || "-"],
    ["Expediente", snapshot.recordNumber],
  ];

  return { collaboratorRows, interestedRows, requestRows, evidenceRows };
}

export function renderConsentDocumentHtml({
  snapshot,
  status,
  evidence,
}: ConsentDocumentData) {
  const statusLabel = buildStatusLabel(status);
  const { collaboratorRows, interestedRows, requestRows, evidenceRows } =
    buildDocumentSections(snapshot, evidence);

  const renderRows = (rows: Array<[string, string]>) =>
    rows
      .map(([label, value]) => {
        if (!value) {
          return `<div class="row row-heading">${escapeHtml(label)}</div>`;
        }

        return `<div class="row"><div class="label">${escapeHtml(label)}</div><div class="value">${escapeHtml(value)}</div></div>`;
      })
      .join("");

  return `<!DOCTYPE html>
  <html lang="es">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Consentimiento ${escapeHtml(snapshot.recordNumber)}</title>
      <style>
        body { font-family: Arial, sans-serif; background: #eef2f7; color: #0f172a; margin: 0; padding: 24px; }
        .sheet { max-width: 940px; margin: 0 auto; background: #fff; border: 1px solid #dbe3ee; border-radius: 24px; padding: 32px; box-shadow: 0 18px 48px rgba(15, 23, 42, 0.08); }
        .eyebrow { font-size: 13px; font-weight: 700; letter-spacing: 0.08em; color: #0f766e; text-transform: uppercase; }
        h1 { margin: 8px 0 4px; font-size: 30px; line-height: 1.15; }
        .meta { margin: 16px 0 0; display: grid; gap: 10px; }
        .meta-item { display: grid; grid-template-columns: 180px 1fr; gap: 12px; }
        .meta-label { font-weight: 700; }
        .status { display: inline-flex; margin-top: 14px; padding: 7px 12px; border-radius: 999px; background: ${status === "APPROVED" ? "#dcfce7" : status === "SUPERSEDED" ? "#e2e8f0" : "#fef3c7"}; color: ${status === "APPROVED" ? "#166534" : status === "SUPERSEDED" ? "#334155" : "#92400e"}; font-size: 13px; font-weight: 700; }
        .section { margin-top: 24px; border: 1px solid #dbe3ee; border-radius: 18px; padding: 18px; }
        .section h2 { margin: 0 0 14px; font-size: 19px; }
        .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; }
        .card { background: #f8fafc; border: 1px solid #dbe3ee; border-radius: 18px; padding: 18px; }
        .card h3 { margin: 0 0 14px; font-size: 17px; }
        .row { margin-bottom: 12px; }
        .row-heading { margin: 6px 0 12px; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #0f172a; }
        .label { font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; margin-bottom: 4px; }
        .value { font-weight: 700; word-break: break-word; }
        p { margin: 0; line-height: 1.7; }
        .spaced p + p { margin-top: 14px; }
        .note { margin-top: 16px; font-weight: 700; }
        .checklist { list-style: none; padding: 0; margin: 0; display: grid; gap: 10px; }
        .checklist li { display: flex; gap: 10px; align-items: flex-start; }
        .check { min-width: 22px; height: 22px; border: 1px solid #334155; border-radius: 4px; display: inline-flex; align-items: center; justify-content: center; font-weight: 700; }
        .table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        .table td { border-top: 1px solid #e2e8f0; padding: 10px 0; vertical-align: top; }
        .table td:first-child { width: 230px; font-weight: 700; color: #334155; padding-right: 16px; }
        @media print { body { background: #fff; padding: 0; } .sheet { box-shadow: none; border: none; border-radius: 0; max-width: none; } }
        @media (max-width: 720px) { .grid, .meta-item { grid-template-columns: 1fr; } .sheet { padding: 20px; } .table td, .table td:first-child { display: block; width: auto; padding-right: 0; } }
      </style>
    </head>
    <body>
      <main class="sheet">
        <header>
          <div class="eyebrow">Cliente</div>
          <h1>Confirmacion de actuaciones precontractuales</h1>
          <div class="meta">
            <div class="meta-item"><div class="meta-label">Expediente:</div><div>${escapeHtml(snapshot.recordNumber)}</div></div>
            <div class="meta-item"><div class="meta-label">Fecha de emision:</div><div>${escapeHtml(snapshot.issuedAtLabel)}</div></div>
          </div>
          <span class="status">${escapeHtml(statusLabel)}</span>
        </header>

        <section class="section">
          <h2>Datos del colaborador</h2>
          <div class="grid">
            <div class="card">
              <h3>Empresa</h3>
              ${renderRows(collaboratorRows.slice(0, 6))}
            </div>
            <div class="card">
              <h3>Gestor responsable</h3>
              ${renderRows(collaboratorRows.slice(7))}
            </div>
          </div>
        </section>

        <section class="section">
          <h2>Datos del interesado</h2>
          <div class="grid">
            <div class="card">
              ${renderRows(interestedRows)}
            </div>
            <div class="card">
              <h3>Datos de la solicitud</h3>
              ${renderRows(requestRows)}
            </div>
          </div>
        </section>

        <section class="section spaced">
          <h2>Confirmacion de la solicitud</h2>
          ${CONFIRMATION_PARAGRAPHS.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}
          <p class="note">La aceptacion de este documento no supone la formalizacion de un contrato de suministro energetico ni la aceptacion definitiva de una oferta comercial.</p>
        </section>

        <section class="section">
          <h2>Declaracion del interesado</h2>
          <ul class="checklist">
            ${DECLARATION_ITEMS.map((item) => `<li><span class="check">X</span><span>${escapeHtml(item)}</span></li>`).join("")}
          </ul>
        </section>

        <section class="section spaced">
          <h2>Informacion sobre proteccion de datos</h2>
          ${buildConsentLegalParagraphs().map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}
        </section>

        <section class="section">
          <h2>Evidencia electronica de aceptacion</h2>
          <table class="table">
            <tbody>
              ${evidenceRows
                .map(
                  ([label, value]) =>
                    `<tr><td>${escapeHtml(label)}</td><td>${escapeHtml(value)}</td></tr>`
                )
                .join("")}
            </tbody>
          </table>
        </section>
      </main>
    </body>
  </html>`;
}

function wrapTextLines(params: {
  text: string;
  maxWidth: number;
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>;
  size: number;
}) {
  const { text, maxWidth, font, size } = params;
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      currentLine = candidate;
      continue;
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    currentLine = word;
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.length > 0 ? lines : [""];
}

function drawWrappedText(params: {
  page: PDFPage;
  text: string;
  x: number;
  y: number;
  maxWidth: number;
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>;
  size: number;
  color?: ReturnType<typeof rgb>;
  lineHeight?: number;
}) {
  const {
    page,
    text,
    x,
    y,
    maxWidth,
    font,
    size,
    color = rgb(0.15, 0.23, 0.32),
    lineHeight = size + 4,
  } = params;
  const lines = wrapTextLines({ text, maxWidth, font, size });

  let cursorY = y;
  for (const line of lines) {
    page.drawText(line, { x, y: cursorY, size, font, color });
    cursorY -= lineHeight;
  }

  return cursorY;
}

function measureWrappedTextHeight(params: {
  text: string;
  maxWidth: number;
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>;
  size: number;
  lineHeight?: number;
}) {
  const { text, maxWidth, font, size, lineHeight = size + 4 } = params;
  return wrapTextLines({ text, maxWidth, font, size }).length * lineHeight;
}

function drawKeyValueRows(params: {
  page: PDFPage;
  rows: Array<[string, string]>;
  x: number;
  y: number;
  width: number;
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>;
  boldFont: Awaited<ReturnType<PDFDocument["embedFont"]>>;
  labelSize?: number;
  valueSize?: number;
}) {
  const {
    page,
    rows,
    x,
    y,
    width,
    font,
    boldFont,
    labelSize = 8,
    valueSize = 9,
  } = params;

  let cursorY = y;
  for (const [label, value] of rows) {
    page.drawText(label, {
      x,
      y: cursorY,
      size: labelSize,
      font: boldFont,
      color: rgb(0.39, 0.45, 0.52),
    });

    cursorY = drawWrappedText({
      page,
      text: value,
      x,
      y: cursorY - 12,
      maxWidth: width,
      font,
      size: valueSize,
      lineHeight: valueSize + 3,
      color: rgb(0.09, 0.11, 0.16),
    }) - 8;
  }

  return cursorY;
}

function measureKeyValueRowsHeight(params: {
  rows: Array<[string, string]>;
  width: number;
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>;
  size?: number;
  lineHeight?: number;
}) {
  const { rows, width, font, size = 9, lineHeight = size + 3 } = params;
  return rows.reduce((total, [, value]) => {
    return total + 12 + measureWrappedTextHeight({ text: value, maxWidth: width, font, size, lineHeight }) + 8;
  }, 0);
}

function drawSectionBox(params: {
  page: PDFPage;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  boldFont: Awaited<ReturnType<PDFDocument["embedFont"]>>;
}) {
  const { page, title, x, y, width, height, boldFont } = params;
  page.drawRectangle({
    x,
    y: y - height,
    width,
    height,
    color: rgb(1, 1, 1),
    borderColor: rgb(0.86, 0.89, 0.93),
    borderWidth: 1,
  });
  page.drawText(title, {
    x: x + 14,
    y: y - 20,
    size: 12,
    font: boldFont,
    color: rgb(0.09, 0.11, 0.16),
  });
}

export async function renderConsentDocumentPdf({
  snapshot,
  signerName,
  approvedAt,
  status,
  evidence,
}: ConsentDocumentData) {
  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([595.28, 841.89]);
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const margin = 42;
  const contentWidth = page.getWidth() - margin * 2;
  const columnGap = 16;
  const columnWidth = (contentWidth - columnGap) / 2;
  const dark = rgb(0.09, 0.11, 0.16);
  const muted = rgb(0.39, 0.45, 0.52);
  const accent = rgb(0.06, 0.46, 0.43);
  const statusLabel = buildStatusLabel(status);
  const {
    collaboratorRows,
    interestedRows,
    requestRows,
    evidenceRows,
  } = buildDocumentSections(snapshot, {
    ...evidence,
    approvedAt: evidence?.approvedAt || approvedAt,
  });

  const ensurePage = (requiredHeight: number, currentY: number) => {
    if (currentY - requiredHeight >= 56) {
      return { page, y: currentY };
    }

    page = pdfDoc.addPage([595.28, 841.89]);
    return { page, y: page.getHeight() - 72 };
  };

  let y = page.getHeight() - 72;

  page.drawText("CLIENTE", {
    x: margin,
    y,
    size: 11,
    font: boldFont,
    color: accent,
  });
  y -= 24;

  page.drawText("CONFIRMACION DE ACTUACIONES PRECONTRACTUALES", {
    x: margin,
    y,
    size: 17,
    font: boldFont,
    color: dark,
  });
  y -= 26;

  page.drawText(`Expediente: ${snapshot.recordNumber}`, {
    x: margin,
    y,
    size: 10,
    font: boldFont,
    color: dark,
  });
  y -= 16;

  page.drawText(`Fecha de emision: ${snapshot.issuedAtLabel}`, {
    x: margin,
    y,
    size: 10,
    font: regularFont,
    color: muted,
  });

  const statusWidth = boldFont.widthOfTextAtSize(statusLabel, 10) + 18;
  page.drawRectangle({
    x: page.getWidth() - margin - statusWidth,
    y: y - 5,
    width: statusWidth,
    height: 20,
    color: status === "APPROVED" ? rgb(0.86, 0.97, 0.9) : status === "SUPERSEDED" ? rgb(0.89, 0.91, 0.94) : rgb(1, 0.95, 0.79),
  });
  page.drawText(statusLabel, {
    x: page.getWidth() - margin - statusWidth + 9,
    y,
    size: 10,
    font: boldFont,
    color: status === "APPROVED" ? rgb(0.09, 0.4, 0.21) : status === "SUPERSEDED" ? rgb(0.2, 0.25, 0.32) : rgb(0.58, 0.25, 0.05),
  });

  y -= 34;

  const companyRows = collaboratorRows.slice(1, 6);
  const managerRows = collaboratorRows.slice(7);
  const companyHeight = 46 + measureKeyValueRowsHeight({
    rows: companyRows,
    width: columnWidth - 28,
    font: regularFont,
  });
  const managerHeight = 46 + measureKeyValueRowsHeight({
    rows: managerRows,
    width: columnWidth - 28,
    font: regularFont,
  });
  const collaboratorHeight = Math.max(companyHeight, managerHeight, 170);
  ({ page, y } = ensurePage(collaboratorHeight, y));

  drawSectionBox({
    page,
    title: "Datos del colaborador",
    x: margin,
    y,
    width: contentWidth,
    height: collaboratorHeight,
    boldFont,
  });

  const innerTop = y - 40;
  for (const [x, title, rows] of [
    [margin + 14, "Empresa", companyRows],
    [margin + 14 + columnWidth + columnGap, "Gestor responsable", managerRows],
  ] as const) {
    page.drawRectangle({
      x,
      y: y - collaboratorHeight + 14,
      width: columnWidth - 14,
      height: collaboratorHeight - 54,
      color: rgb(0.97, 0.98, 0.99),
      borderColor: rgb(0.86, 0.89, 0.93),
      borderWidth: 1,
    });
    page.drawText(title, {
      x: x + 12,
      y: innerTop,
      size: 11,
      font: boldFont,
      color: dark,
    });
    drawKeyValueRows({
      page,
      rows,
      x: x + 12,
      y: innerTop - 20,
      width: columnWidth - 38,
      font: regularFont,
      boldFont,
    });
  }

  y -= collaboratorHeight + 14;

  const interestedHeight = 46 + measureKeyValueRowsHeight({
    rows: interestedRows,
    width: columnWidth - 28,
    font: regularFont,
  });
  const requestHeight = 46 + measureKeyValueRowsHeight({
    rows: requestRows,
    width: columnWidth - 28,
    font: regularFont,
  });
  const dataHeight = Math.max(interestedHeight, requestHeight, 160);
  ({ page, y } = ensurePage(dataHeight, y));

  drawSectionBox({
    page,
    title: "Datos del interesado y de la solicitud",
    x: margin,
    y,
    width: contentWidth,
    height: dataHeight,
    boldFont,
  });

  for (const [x, title, rows] of [
    [margin + 14, "Datos del interesado", interestedRows],
    [margin + 14 + columnWidth + columnGap, "Datos de la solicitud", requestRows],
  ] as const) {
    page.drawRectangle({
      x,
      y: y - dataHeight + 14,
      width: columnWidth - 14,
      height: dataHeight - 54,
      color: rgb(0.97, 0.98, 0.99),
      borderColor: rgb(0.86, 0.89, 0.93),
      borderWidth: 1,
    });
    page.drawText(title, {
      x: x + 12,
      y: y - 40,
      size: 11,
      font: boldFont,
      color: dark,
    });
    drawKeyValueRows({
      page,
      rows,
      x: x + 12,
      y: y - 60,
      width: columnWidth - 38,
      font: regularFont,
      boldFont,
    });
  }

  y -= dataHeight + 14;

  const confirmationHeight =
    28 +
    CONFIRMATION_PARAGRAPHS.reduce((total, paragraph) => {
      return (
        total +
        measureWrappedTextHeight({
          text: paragraph,
          maxWidth: contentWidth - 28,
          font: regularFont,
          size: 9.5,
          lineHeight: 13,
        }) +
        8
      );
    }, 0) +
    measureWrappedTextHeight({
      text: "La aceptacion de este documento no supone la formalizacion de un contrato de suministro energetico ni la aceptacion definitiva de una oferta comercial.",
      maxWidth: contentWidth - 28,
      font: boldFont,
      size: 9.5,
      lineHeight: 13,
    }) +
    24;
  ({ page, y } = ensurePage(confirmationHeight, y));

  drawSectionBox({
    page,
    title: "Confirmacion de la solicitud",
    x: margin,
    y,
    width: contentWidth,
    height: confirmationHeight,
    boldFont,
  });

  let textY = y - 40;
  for (const paragraph of CONFIRMATION_PARAGRAPHS) {
    textY =
      drawWrappedText({
        page,
        text: paragraph,
        x: margin + 14,
        y: textY,
        maxWidth: contentWidth - 28,
        font: regularFont,
        size: 9.5,
        lineHeight: 13,
      }) - 8;
  }
  drawWrappedText({
    page,
    text: "La aceptacion de este documento no supone la formalizacion de un contrato de suministro energetico ni la aceptacion definitiva de una oferta comercial.",
    x: margin + 14,
    y: textY,
    maxWidth: contentWidth - 28,
    font: boldFont,
    size: 9.5,
    lineHeight: 13,
    color: dark,
  });

  y -= confirmationHeight + 14;

  const declarationHeight =
    28 +
    DECLARATION_ITEMS.reduce((total, item) => {
      return (
        total +
        measureWrappedTextHeight({
          text: item,
          maxWidth: contentWidth - 52,
          font: regularFont,
          size: 9,
          lineHeight: 12,
        }) +
        8
      );
    }, 0) +
    16;
  ({ page, y } = ensurePage(declarationHeight, y));

  drawSectionBox({
    page,
    title: "Declaracion del interesado",
    x: margin,
    y,
    width: contentWidth,
    height: declarationHeight,
    boldFont,
  });

  let checklistY = y - 40;
  for (const item of DECLARATION_ITEMS) {
    page.drawRectangle({
      x: margin + 14,
      y: checklistY - 2,
      width: 10,
      height: 10,
      borderColor: rgb(0.2, 0.25, 0.32),
      borderWidth: 1,
    });
    page.drawText("X", {
      x: margin + 16.5,
      y: checklistY - 0.5,
      size: 8,
      font: boldFont,
      color: dark,
    });
    checklistY =
      drawWrappedText({
        page,
        text: item,
        x: margin + 32,
        y: checklistY,
        maxWidth: contentWidth - 52,
        font: regularFont,
        size: 9,
        lineHeight: 12,
      }) - 8;
  }

  y -= declarationHeight + 14;

  const legalParagraphs = buildConsentLegalParagraphs();
  const legalHeight =
    28 +
    legalParagraphs.reduce((total, paragraph) => {
      return (
        total +
        measureWrappedTextHeight({
          text: paragraph,
          maxWidth: contentWidth - 28,
          font: regularFont,
          size: 9,
          lineHeight: 12,
        }) +
        8
      );
    }, 0) +
    12;
  ({ page, y } = ensurePage(legalHeight, y));

  drawSectionBox({
    page,
    title: "Informacion sobre proteccion de datos",
    x: margin,
    y,
    width: contentWidth,
    height: legalHeight,
    boldFont,
  });

  let legalY = y - 40;
  for (const paragraph of legalParagraphs) {
    legalY =
      drawWrappedText({
        page,
        text: paragraph,
        x: margin + 14,
        y: legalY,
        maxWidth: contentWidth - 28,
        font: regularFont,
        size: 9,
        lineHeight: 12,
      }) - 8;
  }

  y -= legalHeight + 14;

  const evidenceHeight =
    28 +
    evidenceRows.reduce((total, [label, value]) => {
      return (
        total +
        Math.max(
          measureWrappedTextHeight({
            text: label,
            maxWidth: 160,
            font: boldFont,
            size: 8.5,
            lineHeight: 11,
          }),
          measureWrappedTextHeight({
            text: value,
            maxWidth: contentWidth - 190,
            font: regularFont,
            size: 8.5,
            lineHeight: 11,
          })
        ) +
        10
      );
    }, 0) +
    12;
  ({ page, y } = ensurePage(evidenceHeight, y));

  drawSectionBox({
    page,
    title: "Evidencia electronica de aceptacion",
    x: margin,
    y,
    width: contentWidth,
    height: evidenceHeight,
    boldFont,
  });

  let evidenceY = y - 40;
  for (const [label, value] of evidenceRows) {
    page.drawText(label, {
      x: margin + 14,
      y: evidenceY,
      size: 8.5,
      font: boldFont,
      color: muted,
    });
    evidenceY =
      drawWrappedText({
        page,
        text: value,
        x: margin + 180,
        y: evidenceY,
        maxWidth: contentWidth - 194,
        font: regularFont,
        size: 8.5,
        lineHeight: 11,
      }) - 10;
  }

  if (status === "APPROVED") {
    const acceptanceText = `Aceptacion registrada${signerName ? ` por ${signerName}` : ""}${approvedAt ? ` el ${formatSpanishDateTime(approvedAt)}` : ""}.`;
    ({ page, y } = ensurePage(54, y - evidenceHeight - 14));
    page.drawText(acceptanceText, {
      x: margin,
      y: y - 24,
      size: 8.5,
      font: regularFont,
      color: muted,
    });
  }

  return pdfDoc.save();
}

export async function sendConsentEmail(params: {
  to: string;
  consentLink: string;
  customerName: string;
  contractNumber: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.CONSENT_FROM_EMAIL;

  if (!apiKey || !fromEmail) {
    throw new Error("El correo de consentimientos no esta configurado");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [params.to],
      subject: `Solicitud de confirmacion precontractual - expediente ${params.contractNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
          <h2 style="margin-bottom: 12px;">Confirmacion de actuaciones precontractuales</h2>
          <p>Hola ${params.customerName || "cliente"},</p>
          <p>Te hemos enviado este enlace para que revises y aceptes la confirmacion de actuaciones precontractuales asociada al expediente <strong>${params.contractNumber}</strong>.</p>
          <p>En el documento veras los datos del colaborador, del interesado, de la solicitud y la informacion legal correspondiente.</p>
          <p>
            <a href="${params.consentLink}" style="display:inline-block;background:#0f766e;color:#ffffff;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:600;">
              Revisar y aceptar documento
            </a>
          </p>
          <p>Si el boton no funciona, copia y pega este enlace en tu navegador:</p>
          <p><a href="${params.consentLink}">${params.consentLink}</a></p>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`No se pudo enviar el correo: ${errorText}`);
  }
}
