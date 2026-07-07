"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuthSession } from "@/hooks/use-auth-session";

type ConsentRequestItem = {
  id: string;
  status: "PENDING" | "APPROVED";
  recipientEmail: string;
  requestedBy: string;
  requestedAt: string;
  approvedAt?: string | null;
  contract: {
    id: string;
    contractNumber: string;
    clientName: string;
    clientLastName?: string | null;
    clientEmail?: string | null;
  };
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Enviada a la espera",
  APPROVED: "Consentimiento aprobado",
};

function formatDate(date?: string | null) {
  if (!date) return "-";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString("es-ES");
}

export default function ConsentimientosHistoricoPage() {
  const { loading: authLoading } = useAuthSession({
    redirectTo: "/auth/login",
    requirePasswordChangeRedirect: "/dashboard/user-management",
  });
  const [items, setItems] = useState<ConsentRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) return;

    void (async () => {
      try {
        const response = await fetch("/api/consent-requests", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("No se pudo cargar el historico");
        }

        const data = (await response.json()) as { items: ConsentRequestItem[] };
        setItems(Array.isArray(data.items) ? data.items : []);
      } catch (fetchError) {
        console.error(fetchError);
        setError("No se pudo cargar el historico de consentimientos.");
      } finally {
        setLoading(false);
      }
    })();
  }, [authLoading]);

  return (
    <div className="app-shell app-main">
      <div className="app-card p-6">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Consentimientos Historico</h1>
            <p className="mt-1 text-sm text-gray-500">Seguimiento de solicitudes enviadas y aprobadas.</p>
          </div>
          <Link href="/dashboard" className="btn-secondary text-sm">Volver a Contratos</Link>
        </div>

        {loading ? (
          <p className="text-gray-600">Cargando historico...</p>
        ) : error ? (
          <div className="alert alert-error">{error}</div>
        ) : items.length === 0 ? (
          <p className="text-gray-600">Todavia no se ha enviado ningun consentimiento.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">Contrato</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">Cliente</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">Estado</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">Enviado</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">Aprobado</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">Documento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 text-sm text-slate-800">
                      <Link href={`/dashboard/contracts/${item.contract.id}`} className="font-semibold text-teal-700 hover:text-teal-900">
                        {item.contract.contractNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {`${item.contract.clientName} ${item.contract.clientLastName || ""}`.trim()}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${item.status === "APPROVED" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                        {STATUS_LABELS[item.status] || item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">{item.recipientEmail}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{formatDate(item.requestedAt)}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{formatDate(item.approvedAt)}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      <a
                        href={`/api/consent-requests/${item.id}/document`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-secondary px-3 py-2 text-xs"
                      >
                        Descargar
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
