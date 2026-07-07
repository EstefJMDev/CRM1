"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuthSession } from "@/hooks/use-auth-session";

type AgentOption = {
  id: string;
  fullName: string;
};

type ConsentRequestItem = {
  id: string;
  status: "PENDING" | "APPROVED" | "SUPERSEDED";
  recipientEmail: string;
  requestedBy: string;
  requestedAt: string;
  approvedAt?: string | null;
  contract: {
    id: string;
    contractNumber: string;
    clientName: string;
    clientLastName?: string | null;
    clientDNI?: string | null;
    clientPhone?: string | null;
    clientEmail?: string | null;
    userId: string;
    user: {
      id: string;
      name: string;
      lastName?: string | null;
    };
  };
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Enviada a la espera",
  APPROVED: "Consentimiento aprobado",
  SUPERSEDED: "Enlace invalidado",
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
  const [agentOptions, setAgentOptions] = useState<AgentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [agentFilter, setAgentFilter] = useState("all");

  useEffect(() => {
    if (authLoading) return;

    void (async () => {
      try {
        setLoading(true);
        setError("");

        const params = new URLSearchParams({
          search: searchTerm,
          status: statusFilter,
          agentId: agentFilter,
        });

        const [response, agentsResponse] = await Promise.all([
          fetch(`/api/consent-requests?${params.toString()}`, { cache: "no-store" }),
          fetch("/api/contracts/agents", { cache: "no-store" }),
        ]);

        if (!response.ok) {
          throw new Error("No se pudo cargar el histórico");
        }

        const data = (await response.json()) as { items: ConsentRequestItem[] };
        setItems(Array.isArray(data.items) ? data.items : []);

        if (agentsResponse.ok) {
          const agentsData = (await agentsResponse.json()) as { items: AgentOption[] };
          setAgentOptions(Array.isArray(agentsData.items) ? agentsData.items : []);
        }
      } catch (fetchError) {
        console.error(fetchError);
        setError("No se pudo cargar el histórico de consentimientos.");
      } finally {
        setLoading(false);
      }
    })();
  }, [agentFilter, authLoading, searchTerm, statusFilter]);

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setAgentFilter("all");
  };

  return (
    <div className="app-shell app-main">
      <div className="app-card p-6">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Consentimientos Histórico</h1>
            <p className="mt-1 text-sm text-gray-500">Seguimiento de solicitudes enviadas y aprobadas.</p>
          </div>
          <Link href="/dashboard" className="btn-secondary text-sm">Volver a Contratos</Link>
        </div>

        <div className="mb-6 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-12">
            <div className="md:col-span-5">
              <label className="mb-1 block text-xs font-semibold text-gray-600">Buscar</label>
              <input
                type="text"
                placeholder="Buscar cliente, DNI, teléfono, email o contrato"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="field-input"
              />
            </div>
            <div className="md:col-span-3">
              <label className="mb-1 block text-xs font-semibold text-gray-600">Agente</label>
              <select
                value={agentFilter}
                onChange={(e) => setAgentFilter(e.target.value)}
                className="field-input"
              >
                <option value="all">Todos los agentes</option>
                {agentOptions.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.fullName}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-gray-600">Estado</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="field-input"
              >
                <option value="all">Todos</option>
                <option value="PENDING">Enviada a la espera</option>
                <option value="APPROVED">Consentimiento aprobado</option>
                <option value="SUPERSEDED">Enlace invalidado</option>
              </select>
            </div>
            <div className="flex items-end justify-start md:col-span-2 md:justify-end">
              <button onClick={clearFilters} className="btn-soft px-3 py-2 text-sm">
                Limpiar
              </button>
            </div>
          </div>

          <div className="text-sm text-gray-600">
            Total de registros: {items.length}
          </div>
        </div>

        {loading ? (
          <p className="text-gray-600">Cargando histórico...</p>
        ) : error ? (
          <div className="alert alert-error">{error}</div>
        ) : items.length === 0 ? (
          <p className="text-gray-600">Todavía no se ha enviado ningún consentimiento.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">Contrato</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">Cliente</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">Enviado por</th>
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
                    <td className="px-4 py-3 text-sm text-slate-700">{item.requestedBy || "-"}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${item.status === "APPROVED" ? "bg-emerald-100 text-emerald-800" : item.status === "SUPERSEDED" ? "bg-slate-200 text-slate-700" : "bg-amber-100 text-amber-800"}`}>
                        {STATUS_LABELS[item.status] || item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">{item.recipientEmail}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{formatDate(item.requestedAt)}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{formatDate(item.approvedAt)}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {item.status === "APPROVED" ? (
                        <a
                          href={`/api/consent-requests/${item.id}/document`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-secondary px-3 py-2 text-xs"
                        >
                          Descargar
                        </a>
                      ) : (
                        <span className="inline-flex cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-medium text-slate-400">
                          Descargar
                        </span>
                      )}
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
