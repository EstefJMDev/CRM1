"use client";

import { useState } from "react";

export function ConsentAcceptForm({
  token,
  alreadyApproved,
  defaultSignerName,
}: {
  token: string;
  alreadyApproved: boolean;
  defaultSignerName: string;
}) {
  const [signerName, setSignerName] = useState(defaultSignerName);
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [approved, setApproved] = useState(alreadyApproved);

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

      const data = (await response.json()) as { error?: string; message?: string };

      if (!response.ok) {
        setMessage(data.error || "No se pudo registrar el consentimiento.");
        return;
      }

      setApproved(true);
      setMessage("Consentimiento registrado correctamente.");
    } catch (error) {
      console.error(error);
      setMessage("No se pudo registrar el consentimiento.");
    } finally {
      setSubmitting(false);
    }
  };

  if (approved) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-900">
        Consentimiento aprobado correctamente.
      </div>
    );
  }

  return (
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
  );
}
