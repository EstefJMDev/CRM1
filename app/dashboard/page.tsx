"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Contract {
  id: string;
  contractNumber: string;
  clientName: string;
  clientLastName?: string;
  clientDNI?: string;
  clientPhone?: string;
  commercializer: string;
  cups?: string;
  address?: string;
  activationDate?: string;
  inactiveDate?: string;
  documents: Array<{ id: string }>;
  status: string;
  createdAt: string;
  user: { name: string; email: string };
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  ACTIVE: "Activo",
  INACTIVE: "Inactivo",
  CANCELLED: "Cancelado",
  TRAMITE: "Trámite",
};

function toDateOnly(date?: string) {
  if (!date) return "";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

export default function DashboardPage() {
  const router = useRouter();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [agentFilter, setAgentFilter] = useState("all");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [fromActivationDate, setFromActivationDate] = useState("");
  const [toActivationDate, setToActivationDate] = useState("");
  const [fromInactiveDate, setFromInactiveDate] = useState("");
  const [toInactiveDate, setToInactiveDate] = useState("");
  const [fromCreatedDate, setFromCreatedDate] = useState("");
  const [toCreatedDate, setToCreatedDate] = useState("");
  const [commercializerFilters, setCommercializerFilters] = useState<string[]>([]);

  const fetchContracts = useCallback(async (token: string) => {
    try {
      const response = await fetch("/api/contracts", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          router.push("/auth/login");
          return;
        }
        throw new Error("Error al obtener contratos");
      }

      const data = await response.json();
      setContracts(data);
    } catch (err) {
      setError("Error al cargar los contratos");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem("token");
      const userData = localStorage.getItem("user");

      if (!token || !userData) {
        router.push("/auth/login");
        return;
      }

      setUser(JSON.parse(userData));
      fetchContracts(token);
    };

    checkAuth();
  }, [fetchContracts, router]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/auth/login");
  };

  const agentOptions = useMemo(
    () => Array.from(new Set(contracts.map((c) => c.user.name))).sort(),
    [contracts]
  );

  const commercializerOptions = useMemo(
    () => Array.from(new Set(contracts.map((c) => c.commercializer))).sort(),
    [contracts]
  );

  const toggleCommercializer = (name: string) => {
    setCommercializerFilters((prev) =>
      prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name]
    );
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setAgentFilter("all");
    setFromActivationDate("");
    setToActivationDate("");
    setFromInactiveDate("");
    setToInactiveDate("");
    setFromCreatedDate("");
    setToCreatedDate("");
    setCommercializerFilters([]);
  };

  const filteredContracts = contracts.filter((contract) => {
    const clientFullName = `${contract.clientName || ""} ${contract.clientLastName || ""}`.trim();
    const contactText = `${contract.address || ""} ${contract.clientPhone || ""}`.trim();
    const search = searchTerm.toLowerCase();

    const matchesSearch =
      clientFullName.toLowerCase().includes(search) ||
      contract.contractNumber.toLowerCase().includes(search) ||
      contract.commercializer.toLowerCase().includes(search) ||
      (contract.cups || "").toLowerCase().includes(search) ||
      contract.user.name.toLowerCase().includes(search) ||
      contactText.toLowerCase().includes(search);

    const matchesStatus = statusFilter === "all" || contract.status === statusFilter;
    const matchesAgent = agentFilter === "all" || contract.user.name === agentFilter;
    const matchesCommercializer =
      commercializerFilters.length === 0 || commercializerFilters.includes(contract.commercializer);

    const activation = toDateOnly(contract.activationDate);
    const inactive = toDateOnly(contract.inactiveDate);
    const created = toDateOnly(contract.createdAt);

    const matchesFromActivation = !fromActivationDate || (activation && activation >= fromActivationDate);
    const matchesToActivation = !toActivationDate || (activation && activation <= toActivationDate);
    const matchesFromInactive = !fromInactiveDate || (inactive && inactive >= fromInactiveDate);
    const matchesToInactive = !toInactiveDate || (inactive && inactive <= toInactiveDate);
    const matchesFromCreated = !fromCreatedDate || created >= fromCreatedDate;
    const matchesToCreated = !toCreatedDate || created <= toCreatedDate;

    return (
      matchesSearch &&
      matchesStatus &&
      matchesAgent &&
      matchesCommercializer &&
      matchesFromActivation &&
      matchesToActivation &&
      matchesFromInactive &&
      matchesToInactive &&
      matchesFromCreated &&
      matchesToCreated
    );
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-600">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-[96vw] mx-auto px-3 sm:px-4 lg:px-5 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">CRM Contratos</h1>
            <p className="text-gray-600 text-sm mt-1">
              Bienvenido, {user?.name}
              {user?.role === "ADMIN" && " (Admin)"}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg"
          >
            Cerrar Sesión
          </button>
        </div>
      </header>

      <main className="max-w-[96vw] mx-auto px-3 sm:px-4 lg:px-5 py-8">
        <div className="bg-white rounded-lg shadow p-4 mb-6 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-5">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Buscar</label>
              <input
                type="text"
                placeholder="Buscar agente, cliente, contacto, CUPS"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Agente</label>
              <select value={agentFilter} onChange={(e) => setAgentFilter(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                <option value="all">Todos los agentes</option>
                {agentOptions.map((agent) => (
                  <option key={agent} value={agent}>{agent}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Estado</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                <option value="all">Todos</option>
                <option value="PENDING">Pendiente</option>
                <option value="ACTIVE">Activo</option>
                <option value="INACTIVE">Inactivo</option>
                <option value="CANCELLED">Cancelado</option>
              </select>
            </div>
            <div className="md:col-span-2 flex md:justify-end gap-3 text-sm">
              <button onClick={() => setShowAdvancedFilters((v) => !v)} className="text-gray-700 hover:text-gray-900">
                {showAdvancedFilters ? "Ocultar filtros" : "Más filtros"}
              </button>
              <button onClick={clearFilters} className="text-blue-600 hover:text-blue-800">Limpiar</button>
            </div>
          </div>

          {showAdvancedFilters && (
            <div className="border-t pt-3 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Desde Activación</label><input type="date" value={fromActivationDate} onChange={(e) => setFromActivationDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Hasta Activación</label><input type="date" value={toActivationDate} onChange={(e) => setToActivationDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Desde Alta</label><input type="date" value={fromCreatedDate} onChange={(e) => setFromCreatedDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Hasta Alta</label><input type="date" value={toCreatedDate} onChange={(e) => setToCreatedDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Desde Baja</label><input type="date" value={fromInactiveDate} onChange={(e) => setFromInactiveDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Hasta Baja</label><input type="date" value={toInactiveDate} onChange={(e) => setToInactiveDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {commercializerOptions.map((com) => (
                  <label key={com} className="inline-flex items-center gap-2 text-xs text-gray-700">
                    <input type="checkbox" checked={commercializerFilters.includes(com)} onChange={() => toggleCommercializer(com)} />
                    {com}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="text-sm text-gray-600">Total de Registros: {filteredContracts.length}</div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <div className="flex justify-end mb-4">
          <Link
            href="/dashboard/new-contract"
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg"
          >
            + Nuevo Contrato
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          {filteredContracts.length > 0 ? (
            <table className="w-full table-fixed divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">N°</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agente</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CUPS</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Comercializadora</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contacto</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Archivos</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha Alta</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Activación</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Baja</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredContracts.map((contract) => (
                  <tr key={contract.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/dashboard/contracts/${contract.id}`}
                          title="Ver contrato"
                          aria-label="Ver contrato"
                          className="inline-flex items-center px-2 py-1 rounded border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M10 3C5 3 1.73 7.11.46 9.5a1 1 0 000 .99C1.73 12.89 5 17 10 17s8.27-4.11 9.54-6.51a1 1 0 000-.99C18.27 7.11 15 3 10 3zm0 11a4.5 4.5 0 110-9 4.5 4.5 0 010 9zm0-7a2.5 2.5 0 100 5 2.5 2.5 0 000-5z" /></svg>
                        </Link>
                        <Link
                          href={`/dashboard/contracts/${contract.id}/edit`}
                          title="Editar contrato"
                          aria-label="Editar contrato"
                          className="inline-flex items-center px-2 py-1 rounded border border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M13.59 3.59a2 2 0 112.82 2.82l-8.3 8.3a1 1 0 01-.46.26l-3 1a1 1 0 01-1.26-1.26l1-3a1 1 0 01.26-.46l8.3-8.3zM3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" /></svg>
                        </Link>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{contract.contractNumber}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{contract.user.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{contract.cups || "-"}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{contract.commercializer}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div className="font-medium text-gray-800">{contract.clientName} {contract.clientLastName || ""}</div>
                      <div className="text-xs text-gray-500">{contract.clientDNI || "-"}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div>{contract.address || "-"}</div>
                      <div className="text-xs text-gray-500">{contract.clientPhone || "-"}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{contract.documents?.length || 0} adjuntos</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{new Date(contract.createdAt).toLocaleDateString("es-ES")}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{contract.activationDate ? new Date(contract.activationDate).toLocaleDateString("es-ES") : "-"}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{contract.inactiveDate ? new Date(contract.inactiveDate).toLocaleDateString("es-ES") : "-"}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        contract.status === "ACTIVE"
                          ? "bg-green-100 text-green-800"
                          : contract.status === "PENDING"
                          ? "bg-yellow-100 text-yellow-800"
                          : contract.status === "INACTIVE"
                          ? "bg-gray-100 text-gray-800"
                          : "bg-red-100 text-red-800"
                      }`}>
                        {STATUS_LABELS[contract.status] || contract.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-12"><p className="text-gray-600">No hay contratos para mostrar</p></div>
          )}
        </div>
      </main>
    </div>
  );
}

