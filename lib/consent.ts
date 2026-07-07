import { randomBytes } from "node:crypto";

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
  collaboratorName: string;
  collaboratorEmail: string;
  companyName: string;
  companyCif: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  locationLabel: string;
  requestedDateLabel: string;
  allowedPurposes: string[];
};

export type ConsentDocumentData = {
  snapshot: ConsentSnapshot;
  signerName?: string | null;
  approvedAt?: string | Date | null;
  status?: "PENDING" | "APPROVED";
};

export const CONSENT_STATUS_LABELS = {
  NOT_SENT: "Solicitud no enviada",
  PENDING: "Enviada a la espera",
  APPROVED: "Consentimiento aprobado",
} as const;

export function generateConsentToken() {
  return randomBytes(32).toString("hex");
}

function getConsentOwnerDefaults() {
  return {
    name:
      process.env.CONSENT_OWNER_NAME ||
      process.env.CONSENT_COMPANY_NAME ||
      "Titular autorizado",
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
      "",
    location: process.env.CONSENT_SIGNATURE_LOCATION || "Murcia",
  };
}

export function buildConsentSnapshot(contract: ContractConsentSnapshotInput): ConsentSnapshot {
  const owner = getConsentOwnerDefaults();
  const collaboratorName = `${contract.user?.name || ""} ${contract.user?.lastName || ""}`.trim() || "Equipo comercial";
  const fullName = `${contract.clientName || ""} ${contract.clientLastName || ""}`.trim();
  const addressParts = [
    contract.address,
    contract.zipCode,
    contract.municipality,
    contract.province,
  ].filter(Boolean);
  const now = new Date();

  return {
    contractId: contract.contractId,
    contractNumber: contract.contractNumber,
    clientFullName: fullName || "Cliente",
    clientDni: contract.clientDNI || "-",
    clientEmail: contract.clientEmail || "",
    clientPhone: contract.clientPhone || "-",
    supplyAddress: addressParts.join(", ") || "-",
    cups: contract.cups || "-",
    collaboratorName,
    collaboratorEmail: contract.user?.email || "",
    companyName: owner.name,
    companyCif: owner.documentId,
    companyAddress: owner.address,
    companyPhone: owner.phone,
    companyEmail: owner.email,
    locationLabel: owner.location,
    requestedDateLabel: now.toLocaleDateString("es-ES"),
    allowedPurposes: [
      "Solicitar, comparar y tramitar ofertas de suministro electrico o de gas en mi nombre.",
      "Gestionar altas, renovaciones, modificaciones, cambios de comercializadora y seguimiento del contrato asociado.",
      "Contactar conmigo y conservar la documentacion necesaria para acreditar este consentimiento y las gestiones realizadas.",
    ],
  };
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

function formatApprovalDate(value?: string | Date | null) {
  if (!value) return "";
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleString("es-ES");
}

export function renderConsentDocumentHtml({
  snapshot,
  signerName,
  approvedAt,
  status,
}: ConsentDocumentData) {
  const owner = getConsentOwnerDefaults();
  const ownerName = snapshot.companyName || owner.name;
  const ownerDocumentId = snapshot.companyCif || owner.documentId;
  const ownerAddress = snapshot.companyAddress || owner.address;
  const ownerPhone = snapshot.companyPhone || owner.phone;
  const ownerEmail = snapshot.companyEmail || owner.email;
  const approvalLabel = formatApprovalDate(approvedAt);
  const signerBlock = signerName
    ? `<div class="signature-box">
        <p class="muted">Firma digital del cliente</p>
        <p class="signature-name">${escapeHtml(signerName)}</p>
        ${
          approvalLabel
            ? `<p class="signature-date">Aceptado el ${escapeHtml(approvalLabel)}</p>`
            : ""
        }
      </div>`
    : `<div class="signature-box pending">
        <p class="muted">Pendiente de firma digital</p>
      </div>`;

  const statusLabel =
    status === "APPROVED" ? "Consentimiento aprobado" : "Solicitud pendiente de aprobacion";

  return `<!DOCTYPE html>
  <html lang="es">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Consentimiento ${escapeHtml(snapshot.contractNumber)}</title>
      <style>
        body { font-family: Arial, sans-serif; background: #eef2f7; color: #0f172a; margin: 0; padding: 24px; }
        .sheet { max-width: 940px; margin: 0 auto; background: #fff; border: 1px solid #dbe3ee; border-radius: 24px; padding: 32px; box-shadow: 0 18px 48px rgba(15, 23, 42, 0.08); }
        .title { text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 24px; }
        .title h1 { margin: 8px 0 0; font-size: 24px; }
        .title p { margin: 6px 0 0; color: #475569; }
        .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; }
        .card { background: #f8fafc; border: 1px solid #dbe3ee; border-radius: 18px; padding: 18px; }
        .card h2 { margin: 0 0 14px; font-size: 18px; }
        .row { margin-bottom: 10px; }
        .label { font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; margin-bottom: 3px; }
        .value { font-weight: 700; word-break: break-word; }
        .section { margin-top: 22px; border: 1px solid #dbe3ee; border-radius: 18px; padding: 18px; }
        .section h2 { margin: 0 0 12px; font-size: 18px; }
        .checklist { list-style: none; padding: 0; margin: 0; display: grid; gap: 10px; }
        .checklist li { display: flex; gap: 10px; align-items: flex-start; }
        .check { min-width: 22px; height: 22px; border: 1px solid #334155; border-radius: 4px; display: inline-flex; align-items: center; justify-content: center; font-weight: 700; }
        .status { display: inline-flex; margin-top: 10px; padding: 7px 12px; border-radius: 999px; background: ${status === "APPROVED" ? "#dcfce7" : "#fef3c7"}; color: ${status === "APPROVED" ? "#166534" : "#92400e"}; font-size: 13px; font-weight: 700; }
        .signature-box { margin-top: 20px; min-height: 96px; border: 1px dashed #94a3b8; border-radius: 16px; padding: 16px; background: #f8fafc; }
        .signature-box.pending { display: flex; align-items: center; justify-content: center; }
        .signature-name { font-size: 24px; font-family: "Segoe Script", "Brush Script MT", cursive; margin: 8px 0 0; }
        .signature-date, .muted { color: #475569; font-size: 13px; }
        .intro { margin: 0; font-size: 15px; line-height: 1.7; }
        .legal { margin: 12px 0 0; line-height: 1.7; }
        .summary { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; margin-top: 18px; }
        .summary-item { border-radius: 14px; border: 1px solid #dbe3ee; background: #fff; padding: 14px; }
        .summary-item span { display: block; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; margin-bottom: 6px; }
        @media print { body { background: #fff; padding: 0; } .sheet { box-shadow: none; border: none; border-radius: 0; max-width: none; } }
        @media (max-width: 720px) { .grid, .summary { grid-template-columns: 1fr; } .sheet { padding: 20px; } }
      </style>
    </head>
    <body>
      <main class="sheet">
        <header class="title">
          <p>AUTORIZACION Y CONSENTIMIENTO EXPRESO</p>
          <h1>Gestiones comerciales y contratacion de suministro</h1>
          <p>Documento asociado al contrato ${escapeHtml(snapshot.contractNumber)}</p>
          <span class="status">${escapeHtml(statusLabel)}</span>
        </header>

        <section class="grid">
          <div class="card">
            <h2>Datos del gestor autorizado</h2>
            <div class="row"><div class="label">Nombre</div><div class="value">${escapeHtml(ownerName)}</div></div>
            <div class="row"><div class="label">NIF / DNI</div><div class="value">${escapeHtml(ownerDocumentId)}</div></div>
            <div class="row"><div class="label">Domicilio</div><div class="value">${escapeHtml(ownerAddress)}</div></div>
            <div class="row"><div class="label">Telefono</div><div class="value">${escapeHtml(ownerPhone)}</div></div>
            <div class="row"><div class="label">Email</div><div class="value">${escapeHtml(ownerEmail || "-")}</div></div>
          </div>
          <div class="card">
            <h2>Datos del titular del suministro</h2>
            <div class="row"><div class="label">Nombre / razon social</div><div class="value">${escapeHtml(snapshot.clientFullName)}</div></div>
            <div class="row"><div class="label">DNI / CIF</div><div class="value">${escapeHtml(snapshot.clientDni)}</div></div>
            <div class="row"><div class="label">Telefono</div><div class="value">${escapeHtml(snapshot.clientPhone)}</div></div>
            <div class="row"><div class="label">Email</div><div class="value">${escapeHtml(snapshot.clientEmail || "-")}</div></div>
            <div class="row"><div class="label">Direccion del suministro</div><div class="value">${escapeHtml(snapshot.supplyAddress)}</div></div>
            <div class="row"><div class="label">CUPS</div><div class="value">${escapeHtml(snapshot.cups)}</div></div>
          </div>
        </section>

        <section class="section">
          <h2>Declaracion de consentimiento</h2>
          <p class="intro">
            Yo, <strong>${escapeHtml(snapshot.clientFullName)}</strong>, con DNI/CIF
            <strong> ${escapeHtml(snapshot.clientDni)}</strong>, como titular o representante
            autorizado del punto de suministro asociado al contrato
            <strong> ${escapeHtml(snapshot.contractNumber)}</strong>, otorgo mi consentimiento
            expreso a <strong>${escapeHtml(ownerName)}</strong>, con NIF/DNI
            <strong> ${escapeHtml(ownerDocumentId)}</strong>, para que pueda gestionar en mi
            nombre las actuaciones comerciales y administrativas necesarias relacionadas con dicho suministro.
          </p>

          <div class="summary">
            <div class="summary-item">
              <span>Contrato</span>
              <strong>${escapeHtml(snapshot.contractNumber)}</strong>
            </div>
            <div class="summary-item">
              <span>Fecha de solicitud</span>
              <strong>${escapeHtml(snapshot.requestedDateLabel)}</strong>
            </div>
            <div class="summary-item">
              <span>Colaborador CRM</span>
              <strong>${escapeHtml(snapshot.collaboratorName)}</strong>
            </div>
          </div>

          <ul class="checklist">
            ${snapshot.allowedPurposes
              .map(
                (purpose) =>
                  `<li><span class="check">X</span><span>${escapeHtml(purpose)}</span></li>`
              )
              .join("")}
          </ul>
        </section>

        <section class="section">
          <h2>Informacion basica de proteccion de datos</h2>
          <p class="legal">Finalidad: gestionar solicitudes de oferta, contratacion, modificacion, seguimiento y atencion del suministro energetico solicitado por el cliente.</p>
          <p class="legal">Legitimacion: consentimiento expreso del interesado, ejecucion de actuaciones precontractuales o contractuales y cumplimiento de obligaciones legales aplicables.</p>
          <p class="legal">Conservacion: la evidencia del consentimiento y la documentacion vinculada se conservaran mientras resulte necesaria para justificar la gestion realizada y atender obligaciones legales.</p>
          <p class="legal">Derechos: el interesado puede solicitar acceso, rectificacion, supresion y demas derechos aplicables dirigiendose al gestor autorizado a traves de los datos de contacto que figuran en este documento.</p>
        </section>

        <section class="section">
          <h2>Declaracion y firma</h2>
          <p>El firmante declara que los datos facilitados son veraces, que actua como titular del suministro o representante autorizado y que ha comprendido el alcance de este consentimiento.</p>
          <p>En ${escapeHtml(snapshot.locationLabel)}, a ${escapeHtml(snapshot.requestedDateLabel)}</p>
          ${signerBlock}
        </section>
      </main>
    </body>
  </html>`;
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
      subject: `Solicitud de consentimiento - contrato ${params.contractNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
          <h2 style="margin-bottom: 12px;">Solicitud de consentimiento</h2>
          <p>Hola ${params.customerName || "cliente"},</p>
          <p>Te hemos enviado esta solicitud para que revises y aceptes el consentimiento asociado a tu contrato <strong>${params.contractNumber}</strong>.</p>
          <p>En el documento veras los datos del titular del suministro y del gestor autorizado para realizar las gestiones comerciales y administrativas relacionadas con el contrato.</p>
          <p>
            <a href="${params.consentLink}" style="display:inline-block;background:#0f766e;color:#ffffff;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:600;">
              Revisar y aceptar consentimiento
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
