import { createHash, randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

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
  if (status === "APPROVED") return "Confirmado";
  if (status === "SUPERSEDED") return "Invalidado";
  return "Pendiente";
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

function getStatusTheme(status?: ConsentDocumentData["status"]) {
  if (status === "APPROVED") {
    return {
      background: "#dcfce7",
      foreground: "#166534",
      border: "#86efac",
    };
  }

  if (status === "SUPERSEDED") {
    return {
      background: "#e2e8f0",
      foreground: "#334155",
      border: "#cbd5e1",
    };
  }

  return {
    background: "#fef3c7",
    foreground: "#92400e",
    border: "#fcd34d",
  };
}

function getCompanyInitials(companyName: string) {
  const letters = companyName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() || "")
    .join("");

  return letters || "CRM";
}

function renderFieldList(rows: Array<[string, string]>) {
  return rows
    .map(
      ([label, value]) => `
        <div class="field">
          <div class="field-label">${escapeHtml(label)}</div>
          <div class="field-value">${escapeHtml(value)}</div>
        </div>
      `
    )
    .join("");
}

function renderEvidenceCards(rows: Array<[string, string]>) {
  const icons = [
    "clock",
    "mail",
    "globe",
    "browser",
    "monitor",
    "device",
    "shield",
    "folder",
  ] as const;

  return rows
    .map(
      ([label, value], index) => `
        <article class="evidence-item">
          <div class="evidence-icon">${renderInlineIcon(icons[index] || "shield")}</div>
          <div>
            <div class="field-label">${escapeHtml(label)}</div>
            <div class="field-value">${escapeHtml(value)}</div>
          </div>
        </article>
      `
    )
    .join("");
}

function renderInlineIcon(
  icon:
    | "check"
    | "shield"
    | "clock"
    | "mail"
    | "globe"
    | "browser"
    | "monitor"
    | "device"
    | "folder"
) {
  const pathByIcon = {
    check:
      '<path d="M5 12.5 9.2 16.7 19 7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
    shield:
      '<path d="M12 3.5 18 6v5.6c0 4.2-2.6 7.1-6 8.9-3.4-1.8-6-4.7-6-8.9V6l6-2.5Z" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linejoin="round"/>',
    clock:
      '<circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="1.6" fill="none"/><path d="M12 7.8v4.7l3.2 1.8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
    mail:
      '<rect x="4" y="6" width="16" height="12" rx="2.2" stroke="currentColor" stroke-width="1.6" fill="none"/><path d="m5.5 8 6.5 5 6.5-5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
    globe:
      '<circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="1.6" fill="none"/><path d="M4.5 12h15M12 4.2c2.1 2 3.4 4.8 3.4 7.8S14.1 17.8 12 19.8M12 4.2C9.9 6.2 8.6 9 8.6 12s1.3 5.8 3.4 7.8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>',
    browser:
      '<rect x="4" y="5" width="16" height="14" rx="2.4" stroke="currentColor" stroke-width="1.6" fill="none"/><path d="M4 9h16M7 7h.01M10 7h.01M13 7h.01" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
    monitor:
      '<rect x="4" y="5" width="16" height="11" rx="2.2" stroke="currentColor" stroke-width="1.6" fill="none"/><path d="M9 19h6M12 16v3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
    device:
      '<rect x="8" y="4.5" width="8" height="15" rx="2.1" stroke="currentColor" stroke-width="1.6" fill="none"/><path d="M11 16.5h2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
    folder:
      '<path d="M4 8.5h5l1.6 2H20v6.3A2.2 2.2 0 0 1 17.8 19H6.2A2.2 2.2 0 0 1 4 16.8V8.5Z" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linejoin="round"/><path d="M4 8.5V7.2A2.2 2.2 0 0 1 6.2 5h2.6L10.4 7H17.8A2.2 2.2 0 0 1 20 9.2v1.3" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linejoin="round"/>',
  } as const;

  return `<svg viewBox="0 0 24 24" aria-hidden="true">${pathByIcon[icon]}</svg>`;
}

async function getChromiumExecutablePath() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }

  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return chromium.executablePath();
  }

  const localChromePaths = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
  ];

  return localChromePaths.find((path) => existsSync(path));
}

export function renderConsentDocumentHtml({
  snapshot,
  signerName,
  approvedAt,
  status,
  evidence,
}: ConsentDocumentData) {
  const statusLabel = buildStatusLabel(status);
  const statusTheme = getStatusTheme(status);
  const { collaboratorRows, interestedRows, requestRows, evidenceRows } =
    buildDocumentSections(snapshot, evidence);
  const generationDate = formatSpanishDateTime(new Date());
  const companyInitials = getCompanyInitials(snapshot.companyName);
  const acceptanceSummary =
    status === "APPROVED"
      ? `Aceptacion registrada${signerName ? ` por ${signerName}` : ""}${approvedAt ? ` el ${formatSpanishDateTime(approvedAt)}` : ""}.`
      : "";

  return `<!DOCTYPE html>
  <html lang="es">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Confirmacion ${escapeHtml(snapshot.recordNumber)}</title>
      <style>
        :root {
          --bg: #eef3f8;
          --paper: #ffffff;
          --ink: #0f172a;
          --muted: #5b6b82;
          --line: #dbe4ef;
          --line-strong: #c7d5e4;
          --card: #f8fbfe;
          --accent: #184a8c;
          --accent-soft: #edf4ff;
          --success-bg: ${statusTheme.background};
          --success-fg: ${statusTheme.foreground};
          --success-line: ${statusTheme.border};
        }
        * { box-sizing: border-box; }
        @page {
          size: A4;
          margin: 18mm 16mm 22mm;
        }
        html, body {
          margin: 0;
          padding: 0;
          background: var(--bg);
          color: var(--ink);
          font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
        }
        body {
          padding: 28px 0;
        }
        .page-shell {
          width: min(100%, 980px);
          margin: 0 auto;
          background: linear-gradient(180deg, #f8fbff 0%, #ffffff 24%);
          border: 1px solid var(--line);
          border-radius: 30px;
          box-shadow: 0 24px 60px rgba(15, 23, 42, 0.08);
          overflow: hidden;
        }
        .top-accent {
          height: 8px;
          background: linear-gradient(90deg, #143d75 0%, #295ea7 45%, #8baedb 100%);
        }
        .document {
          padding: 34px 34px 96px;
        }
        .hero {
          display: grid;
          grid-template-columns: 1.4fr 1fr;
          gap: 28px;
          align-items: start;
          padding-bottom: 28px;
          border-bottom: 1px solid var(--line);
        }
        .brand {
          display: flex;
          gap: 18px;
          align-items: flex-start;
        }
        .brand-mark {
          width: 62px;
          height: 62px;
          border-radius: 20px;
          background: linear-gradient(135deg, #163d72 0%, #2e69b6 100%);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          font-weight: 700;
          letter-spacing: 0.08em;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.22);
        }
        .eyebrow {
          margin: 0 0 10px;
          color: var(--accent);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }
        h1 {
          margin: 0;
          font-size: 33px;
          line-height: 1.08;
          letter-spacing: -0.03em;
        }
        .subtitle {
          margin: 12px 0 0;
          color: var(--muted);
          font-size: 14px;
          line-height: 1.7;
          max-width: 58ch;
        }
        .hero-side {
          display: grid;
          gap: 14px;
          justify-items: stretch;
        }
        .summary-card {
          background: rgba(255, 255, 255, 0.9);
          border: 1px solid var(--line);
          border-radius: 24px;
          padding: 18px 20px;
        }
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px 18px;
        }
        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          justify-self: start;
          padding: 8px 14px;
          border-radius: 999px;
          border: 1px solid var(--success-line);
          background: var(--success-bg);
          color: var(--success-fg);
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }
        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: currentColor;
        }
        .section {
          padding-top: 28px;
          margin-top: 28px;
          border-top: 1px solid var(--line);
        }
        .section:first-of-type {
          margin-top: 30px;
        }
        .section-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          margin-bottom: 18px;
        }
        .section-label {
          margin: 0 0 8px;
          color: var(--accent);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }
        .section h2 {
          margin: 0;
          font-size: 25px;
          line-height: 1.14;
          letter-spacing: -0.02em;
        }
        .section-note {
          color: var(--muted);
          font-size: 13px;
          line-height: 1.6;
          max-width: 48ch;
        }
        .cards-2 {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px;
        }
        .card {
          background: var(--card);
          border: 1px solid var(--line);
          border-radius: 24px;
          padding: 22px;
        }
        .card-title {
          margin: 0 0 18px;
          font-size: 17px;
          font-weight: 700;
          letter-spacing: -0.01em;
        }
        .field-grid {
          display: grid;
          gap: 14px;
        }
        .field {
          padding-top: 14px;
          border-top: 1px solid rgba(199, 213, 228, 0.65);
        }
        .field:first-child {
          padding-top: 0;
          border-top: 0;
        }
        .field-label {
          margin-bottom: 5px;
          color: var(--muted);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }
        .field-value {
          font-size: 15px;
          line-height: 1.55;
          font-weight: 600;
          word-break: break-word;
        }
        .prose {
          display: grid;
          gap: 16px;
          color: #233248;
          font-size: 14px;
          line-height: 1.9;
        }
        .callout {
          background: linear-gradient(180deg, #f5f9ff 0%, #eef5ff 100%);
          border: 1px solid #d7e5fb;
          border-radius: 24px;
          padding: 18px 20px;
          color: #173b6b;
          font-size: 13px;
          line-height: 1.7;
          font-weight: 600;
        }
        .declaration-list {
          display: grid;
          gap: 14px;
        }
        .declaration-item {
          display: grid;
          grid-template-columns: 42px 1fr;
          gap: 14px;
          align-items: start;
          padding: 16px 18px;
          border: 1px solid var(--line);
          border-radius: 20px;
          background: linear-gradient(180deg, #ffffff 0%, #f9fbfd 100%);
        }
        .check-badge {
          width: 42px;
          height: 42px;
          border-radius: 14px;
          background: #edf4ff;
          border: 1px solid #cfe0f7;
          color: var(--accent);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .check-badge svg,
        .evidence-icon svg {
          width: 20px;
          height: 20px;
          display: block;
        }
        .data-box {
          background: linear-gradient(180deg, #f7fafc 0%, #eef4fa 100%);
          border: 1px solid var(--line-strong);
          border-radius: 24px;
          padding: 22px;
        }
        .data-box .prose {
          gap: 12px;
          font-size: 13px;
        }
        .evidence-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }
        .evidence-item {
          display: grid;
          grid-template-columns: 40px 1fr;
          gap: 14px;
          align-items: start;
          min-height: 98px;
          padding: 18px;
          border: 1px solid var(--line);
          border-radius: 20px;
          background: linear-gradient(180deg, #ffffff 0%, #f8fbfe 100%);
        }
        .evidence-icon {
          width: 40px;
          height: 40px;
          border-radius: 14px;
          background: #eff5ff;
          border: 1px solid #d9e6f8;
          color: var(--accent);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .footer-note {
          position: fixed;
          left: 16mm;
          right: 16mm;
          bottom: 8mm;
          display: flex;
          justify-content: space-between;
          gap: 14px;
          align-items: center;
          color: #516174;
          font-size: 10px;
          line-height: 1.4;
        }
        .footer-note strong {
          color: #213247;
        }
        .page-counter::after {
          content: "Pagina " counter(page) " de " counter(pages);
        }
        @media print {
          html, body {
            background: #ffffff;
            padding: 0;
          }
          .page-shell {
            width: auto;
            margin: 0;
            border: 0;
            border-radius: 0;
            box-shadow: none;
            overflow: visible;
          }
          .document {
            padding: 0 0 22mm;
          }
        }
        @media (max-width: 840px) {
          body {
            padding: 16px;
          }
          .page-shell {
            width: 100%;
          }
          .document {
            padding: 24px 22px 80px;
          }
          .hero,
          .cards-2,
          .evidence-grid,
          .summary-grid {
            grid-template-columns: 1fr;
          }
        }
      </style>
    </head>
    <body>
      <div class="page-shell">
        <div class="top-accent"></div>
        <main class="document">
          <header class="hero">
            <div class="brand">
              <div class="brand-mark">${escapeHtml(companyInitials)}</div>
              <div>
                <p class="eyebrow">${escapeHtml(snapshot.companyName)}</p>
                <h1>Confirmacion de actuaciones precontractuales</h1>
                <p class="subtitle">
                  Evidencia documental de la confirmacion realizada por el interesado para continuar con las actuaciones precontractuales vinculadas al expediente indicado.
                </p>
              </div>
            </div>
            <div class="hero-side">
              <div class="status-badge"><span class="status-dot"></span>${escapeHtml(statusLabel)}</div>
              <div class="summary-card">
                <div class="summary-grid">
                  <div>
                    <div class="field-label">Expediente</div>
                    <div class="field-value">${escapeHtml(snapshot.recordNumber)}</div>
                  </div>
                  <div>
                    <div class="field-label">Fecha</div>
                    <div class="field-value">${escapeHtml(snapshot.issuedAtLabel)}</div>
                  </div>
                  <div>
                    <div class="field-label">Titular</div>
                    <div class="field-value">${escapeHtml(snapshot.clientFullName)}</div>
                  </div>
                  <div>
                    <div class="field-label">Canal</div>
                    <div class="field-value">Correo electronico</div>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <section class="section">
            <div class="section-heading">
              <div>
                <p class="section-label">Identificacion</p>
                <h2>Datos del interesado</h2>
              </div>
              <div class="section-note">Ficha identificativa del titular que confirma la continuidad del proceso.</div>
            </div>
            <div class="card">
              <div class="field-grid">${renderFieldList(interestedRows)}</div>
            </div>
          </section>

          <section class="section">
            <div class="section-heading">
              <div>
                <p class="section-label">Colaboracion</p>
                <h2>Datos del colaborador</h2>
              </div>
              <div class="section-note">Entidad responsable y gestor asociado a la solicitud registrada.</div>
            </div>
            <div class="cards-2">
              <article class="card">
                <h3 class="card-title">Entidad</h3>
                <div class="field-grid">${renderFieldList(collaboratorRows.slice(1, 6))}</div>
              </article>
              <article class="card">
                <h3 class="card-title">Gestor responsable</h3>
                <div class="field-grid">${renderFieldList(collaboratorRows.slice(7))}</div>
              </article>
            </div>
          </section>

          <section class="section">
            <div class="section-heading">
              <div>
                <p class="section-label">Solicitud</p>
                <h2>Datos de la solicitud</h2>
              </div>
              <div class="section-note">Resumen operativo de la gestion precontractual asociada al suministro.</div>
            </div>
            <div class="card">
              <div class="field-grid">${renderFieldList(requestRows)}</div>
            </div>
          </section>

          <section class="section">
            <div class="section-heading">
              <div>
                <p class="section-label">Confirmacion</p>
                <h2>Confirmacion de la solicitud</h2>
              </div>
            </div>
            <div class="prose">
              ${CONFIRMATION_PARAGRAPHS.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}
            </div>
            <div class="callout" style="margin-top: 18px;">
              La aceptacion de este documento no supone la formalizacion de un contrato de suministro energetico ni la aceptacion definitiva de una oferta comercial.
            </div>
          </section>

          <section class="section">
            <div class="section-heading">
              <div>
                <p class="section-label">Declaracion</p>
                <h2>Declaracion del interesado</h2>
              </div>
              <div class="section-note">Cada afirmacion queda validada junto con la evidencia electronica del consentimiento.</div>
            </div>
            <div class="declaration-list">
              ${DECLARATION_ITEMS.map(
                (item) => `
                  <article class="declaration-item">
                    <div class="check-badge">${renderInlineIcon("check")}</div>
                    <div class="field-value">${escapeHtml(item)}</div>
                  </article>
                `
              ).join("")}
            </div>
          </section>

          <section class="section">
            <div class="section-heading">
              <div>
                <p class="section-label">Privacidad</p>
                <h2>Proteccion de datos</h2>
              </div>
            </div>
            <div class="data-box">
              <div class="prose">
                ${buildConsentLegalParagraphs().map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}
              </div>
            </div>
          </section>

          <section class="section">
            <div class="section-heading">
              <div>
                <p class="section-label">Trazabilidad</p>
                <h2>Evidencia electronica</h2>
              </div>
              <div class="section-note">Metadatos tecnicos asociados al acto de aceptacion registrado por el sistema.</div>
            </div>
            <div class="evidence-grid">
              ${renderEvidenceCards(evidenceRows)}
            </div>
            ${acceptanceSummary ? `<div class="callout" style="margin-top: 18px;">${escapeHtml(acceptanceSummary)}</div>` : ""}
          </section>
        </main>
      </div>
      <footer class="footer-note">
        <div><strong>Documento generado automaticamente por el sistema CRM como evidencia electronica de la confirmacion realizada por el interesado.</strong></div>
        <div>Generado: ${escapeHtml(generationDate)} · <span class="page-counter"></span></div>
      </footer>
    </body>
  </html>`;
}

export async function renderConsentDocumentPdf({
  snapshot,
  signerName,
  approvedAt,
  status,
  evidence,
}: ConsentDocumentData) {
  const html = renderConsentDocumentHtml({
    snapshot,
    signerName,
    approvedAt,
    status,
    evidence: {
      ...evidence,
      approvedAt: evidence?.approvedAt || approvedAt,
    },
  });

  const executablePath = await getChromiumExecutablePath();
  if (!executablePath) {
    throw new Error(
      "No se encontro un ejecutable de Chromium. Configura PUPPETEER_EXECUTABLE_PATH para generar PDFs en este entorno."
    );
  }

  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: { width: 1440, height: 2200 },
    executablePath,
    headless: "shell",
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 2200, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: "domcontentloaded" });
    await page.waitForNetworkIdle();
    await page.emulateMediaType("print");

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: "0",
        right: "0",
        bottom: "0",
        left: "0",
      },
    });

    return new Uint8Array(pdfBuffer);
  } finally {
    await browser.close();
  }
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
