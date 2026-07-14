"use client";

import { useState } from "react";

export function ConsentAcceptForm({
  token,
  status,
  defaultSignerName,
}: {
  token: string;
  status: "PENDING" | "APPROVED" | "SUPERSEDED";
  defaultSignerName: string;
}) {
  const [signerName, setSignerName] = useState(defaultSignerName);
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [approved, setApproved] = useState(status === "APPROVED");
  const [superseded, setSuperseded] = useState(status === "SUPERSEDED");
  const [downloadUrl, setDownloadUrl] = useState(
    status === "APPROVED" ? `/api/consent/${token}/document` : ""
  );
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const handleSubmit = async () => {
    if (!signerName.trim() || !accepted) {
      setMessage("Debes indicar el nombre del firmante y aceptar el consentimiento.");
      return;
    }

    setSubmitting(true);
    setMessage("");

    try {
      const response = await fetch(`/api/consent/${token}/accept`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          signerName,
          accepted: true,
        }),
      });

      const data = (await response.json()) as {
        error?: string;
        message?: string;
        downloadUrl?: string;
      };

      if (!response.ok) {
        setMessage(data.error || "No se pudo registrar el consentimiento.");
        if (response.status === 409) {
          setSuperseded(true);
        }
        return;
      }

      setApproved(true);
      setDownloadUrl(data.downloadUrl || `/api/consent/${token}/document`);
      setShowSuccessModal(true);
    } catch (error) {
      console.error(error);
      setMessage("No se pudo registrar el consentimiento.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {showSuccessModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4">
          <div className="w-full max-w-md rounded-[28px] border border-emerald-200 bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-slate-900">
              Tu consentimiento ha sido aceptado correctamente
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Ya puedes descargar el documento firmado.
            </p>
            <div className="mt-5 flex flex-col gap-3">
              <a
                href={downloadUrl}
                className="btn-primary block w-full text-center"
              >
                Descargar PDF
              </a>
              <button
                type="button"
                onClick={() => setShowSuccessModal(false)}
                className="btn-secondary w-full"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {approved ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-900">
          Consentimiento aceptado correctamente.
        </div>
      ) : superseded ? (
        <div className="rounded-2xl border border-slate-300 bg-slate-100 px-5 py-4 text-sm text-slate-800">
          Este enlace ya no es valido porque existe una solicitud mas reciente. Si lo necesitas, pide que te reenvien el ultimo email.
        </div>
      ) : (
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Nombre completo del firmante
            </label>
            <input
              value={signerName}
              onChange={(event) => setSignerName(event.target.value)}
              className="field-input"
              placeholder="Nombre y apellidos"
            />
          </div>

          <label className="flex items-start gap-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(event) => setAccepted(event.target.checked)}
              className="mt-1 h-4 w-4"
            />
            <span>
              He revisado este consentimiento y autorizo el tratamiento y las gestiones descritas en el documento.
            </span>
          </label>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="btn-primary w-full disabled:bg-slate-400"
          >
            {submitting ? "Registrando..." : "Aceptar consentimiento"}
          </button>

          {message ? <p className="text-sm text-slate-600">{message}</p> : null}
        </div>
      )}
    </>
  );
}
