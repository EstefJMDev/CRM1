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
  lastName?: string;
  email: string;
  role: string;
  mustChangePassword?: boolean;
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

function getIsoWeekLabel(dateInput?: string) {
  if (!dateInput) return "";
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return "";
  const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil((((utc.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${utc.getUTCFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

export default function DashboardPage() {
  const ITEMS_PER_PAGE = 10;
  const router = useRouter();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [exportMonthFilter, setExportMonthFilter] = useState("all");
  const [exportWeekFilter, setExportWeekFilter] = useState("all");
  const [exportAgentFilter, setExportAgentFilter] = useState("all");
  const [exportCommercializerFilter, setExportCommercializerFilter] = useState("all");
  const [exportClientFilter, setExportClientFilter] = useState("");

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

      const parsedUser = JSON.parse(userData) as User;
      if (parsedUser.mustChangePassword) {
        router.push("/dashboard/user-management");
        return;
      }

      setUser(parsedUser);
      fetchContracts(token);
    };

    checkAuth();
  }, [fetchContracts, router]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/auth/login");
  };

  const handleExport = async () => {
    const token = localStorage.getItem("token");
    if (!token || exportableContracts.length === 0) return;

    setIsExporting(true);
    setError("");

    try {
      const response = await fetch("/api/contracts/export", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ids: exportableContracts.map((contract) => contract.id),
        }),
      });

      if (!response.ok) {
        throw new Error("No se pudo exportar el listado");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      const date = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.download = `contratos-${date}.xls`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setError("No se pudo generar el Excel");
    } finally {
      setIsExporting(false);
    }
  };

  const agentOptions = useMemo(
    () => Array.from(new Set(contracts.map((c) => c.user.name))).sort(),
    [contracts]
  );

  const commercializerOptions = useMemo(
    () => Array.from(new Set(contracts.map((c) => c.commercializer))).sort(),
    [contracts]
  );

  const monthOptions = useMemo(
    () =>
      Array.from(
        new Set(
          contracts
            .map((contract) => toDateOnly(contract.createdAt).slice(0, 7))
            .filter(Boolean)
        )
      ).sort((a, b) => b.localeCompare(a)),
    [contracts]
  );

  const weekOptions = useMemo(
    () =>
      Array.from(
        new Set(
          contracts
            .map((contract) => getIsoWeekLabel(contract.createdAt))
            .filter(Boolean)
        )
      ).sort((a, b) => b.localeCompare(a)),
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
    setCurrentPage(1);
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

  const exportableContracts = filteredContracts.filter((contract) => {
    const month = toDateOnly(contract.createdAt).slice(0, 7);
    const week = getIsoWeekLabel(contract.createdAt);
    const fullName = `${contract.clientName || ""} ${contract.clientLastName || ""}`.trim().toLowerCase();
    const matchesMonth = exportMonthFilter === "all" || month === exportMonthFilter;
    const matchesWeek = exportWeekFilter === "all" || week === exportWeekFilter;
    const matchesAgent = exportAgentFilter === "all" || contract.user.name === exportAgentFilter;
    const matchesCommercializer =
      exportCommercializerFilter === "all" || contract.commercializer === exportCommercializerFilter;
    const matchesClient = !exportClientFilter.trim() || fullName.includes(exportClientFilter.toLowerCase());
    return matchesMonth && matchesWeek && matchesAgent && matchesCommercializer && matchesClient;
  });

  const totalPages = Math.max(1, Math.ceil(filteredContracts.length / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * ITEMS_PER_PAGE;
  const paginatedContracts = filteredContracts.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  if (loading) {
    return (
      <div className="app-shell app-main">
        <div className="app-card p-5 space-y-4 fade-in">
          <div className="skeleton h-7 w-56" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="skeleton h-11" />
            <div className="skeleton h-11" />
            <div className="skeleton h-11" />
          </div>
          <div className="skeleton h-72 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell flex min-h-screen">
      {isMobileMenuOpen && (
        <button
          type="button"
          aria-label="Cerrar menu"
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 z-30 bg-slate-900/35 md:hidden"
        />
      )}
      <aside className={`${isSidebarCollapsed ? "w-[88px]" : "w-[320px]"} hidden border-r border-slate-200/90 bg-white/90 p-4 transition-all duration-300 md:block`}>
        <div className="mb-4 flex items-center justify-between">
          {!isSidebarCollapsed && <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">Menu</h2>}
          <button
            type="button"
            onClick={() => setIsSidebarCollapsed((prev) => !prev)}
            className="rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
          >
            {isSidebarCollapsed ? ">" : "<"}
          </button>
        </div>

        <nav className="space-y-2">
          <Link href="/dashboard" className="block rounded-lg bg-teal-50 px-3 py-2 text-sm font-semibold text-teal-800">
            {isSidebarCollapsed ? "C" : "Contratos"}
          </Link>
          <Link href="/dashboard/consentimientos-historico" className="block rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">
            {isSidebarCollapsed ? "CH" : "Consentimientos Historico"}
          </Link>
          <Link href="/dashboard/documentos" className="block rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">
            {isSidebarCollapsed ? "D" : "Documentos"}
          </Link>
        </nav>

        {!isSidebarCollapsed && (
          <div className="mt-5 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Exportacion</p>
            <select value={exportMonthFilter} onChange={(e) => setExportMonthFilter(e.target.value)} className="field-input text-sm">
              <option value="all">Mes de importacion</option>
              {monthOptions.map((month) => <option key={month} value={month}>{month}</option>)}
            </select>
            <select value={exportWeekFilter} onChange={(e) => setExportWeekFilter(e.target.value)} className="field-input text-sm">
              <option value="all">Semana</option>
              {weekOptions.map((week) => <option key={week} value={week}>{week}</option>)}
            </select>
            <select value={exportAgentFilter} onChange={(e) => setExportAgentFilter(e.target.value)} className="field-input text-sm">
              <option value="all">Nombre de agente</option>
              {agentOptions.map((agent) => <option key={agent} value={agent}>{agent}</option>)}
            </select>
            <select value={exportCommercializerFilter} onChange={(e) => setExportCommercializerFilter(e.target.value)} className="field-input text-sm">
              <option value="all">Comercializadora</option>
              {commercializerOptions.map((com) => <option key={com} value={com}>{com}</option>)}
            </select>
            <input
              type="text"
              value={exportClientFilter}
              onChange={(e) => setExportClientFilter(e.target.value)}
              placeholder="Cliente"
              className="field-input text-sm"
            />
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting || exportableContracts.length === 0}
              className="w-full rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isExporting ? "Exportando..." : `Exportar (${exportableContracts.length})`}
            </button>
          </div>
        )}
      </aside>

      <aside className={`fixed left-0 top-0 z-40 h-full w-[88vw] max-w-[330px] overflow-y-auto border-r border-slate-200/90 bg-white p-4 shadow-xl transition-transform duration-300 md:hidden ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">Menu</h2>
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(false)}
            className="rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
          >
            X
          </button>
        </div>
        <nav className="space-y-2">
          <Link href="/dashboard" onClick={() => setIsMobileMenuOpen(false)} className="block rounded-lg bg-teal-50 px-3 py-2 text-sm font-semibold text-teal-800">Contratos</Link>
          <Link href="/dashboard/consentimientos-historico" onClick={() => setIsMobileMenuOpen(false)} className="block rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">Consentimientos Historico</Link>
          <Link href="/dashboard/documentos" onClick={() => setIsMobileMenuOpen(false)} className="block rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">Documentos</Link>
        </nav>
        <div className="mt-5 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Exportacion</p>
          <select value={exportMonthFilter} onChange={(e) => setExportMonthFilter(e.target.value)} className="field-input text-sm">
            <option value="all">Mes de importacion</option>
            {monthOptions.map((month) => <option key={month} value={month}>{month}</option>)}
          </select>
          <select value={exportWeekFilter} onChange={(e) => setExportWeekFilter(e.target.value)} className="field-input text-sm">
            <option value="all">Semana</option>
            {weekOptions.map((week) => <option key={week} value={week}>{week}</option>)}
          </select>
          <select value={exportAgentFilter} onChange={(e) => setExportAgentFilter(e.target.value)} className="field-input text-sm">
            <option value="all">Nombre de agente</option>
            {agentOptions.map((agent) => <option key={agent} value={agent}>{agent}</option>)}
          </select>
          <select value={exportCommercializerFilter} onChange={(e) => setExportCommercializerFilter(e.target.value)} className="field-input text-sm">
            <option value="all">Comercializadora</option>
            {commercializerOptions.map((com) => <option key={com} value={com}>{com}</option>)}
          </select>
          <input type="text" value={exportClientFilter} onChange={(e) => setExportClientFilter(e.target.value)} placeholder="Cliente" className="field-input text-sm" />
          <button type="button" onClick={handleExport} disabled={isExporting || exportableContracts.length === 0} className="w-full rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50">
            {isExporting ? "Exportando..." : `Exportar (${exportableContracts.length})`}
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="app-header">
          <div className="app-header-inner">
            <div>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(true)}
                className="mb-2 inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 md:hidden"
              >
                <span className="text-base leading-none">≡</span> Menu
              </button>
              <h1 className="text-3xl font-bold text-gray-900">CRM Contratos</h1>
              <p className="text-gray-600 text-sm mt-1">Bienvenido, {user?.name}</p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <Link href="/dashboard/user-management" className="btn-secondary text-sm">Gestion de usuario</Link>
              <button onClick={handleLogout} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">
                Cerrar Sesion
              </button>
            </div>
          </div>
        </header>

      <main className="app-main">
        <div className="app-card mb-6 space-y-3 p-4 slide-up">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-5">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Buscar</label>
              <input
                type="text"
                placeholder="Buscar agente, cliente, contacto, CUPS"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="field-input"
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Agente</label>
              <select value={agentFilter} onChange={(e) => setAgentFilter(e.target.value)} className="field-input">
                <option value="all">Todos los agentes</option>
                {agentOptions.map((agent) => (
                  <option key={agent} value={agent}>{agent}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Estado</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="field-input">
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
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Desde Activación</label><input type="date" value={fromActivationDate} onChange={(e) => setFromActivationDate(e.target.value)} className="field-input" /></div>
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Hasta Activación</label><input type="date" value={toActivationDate} onChange={(e) => setToActivationDate(e.target.value)} className="field-input" /></div>
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Desde Alta</label><input type="date" value={fromCreatedDate} onChange={(e) => setFromCreatedDate(e.target.value)} className="field-input" /></div>
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Hasta Alta</label><input type="date" value={toCreatedDate} onChange={(e) => setToCreatedDate(e.target.value)} className="field-input" /></div>
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Desde Baja</label><input type="date" value={fromInactiveDate} onChange={(e) => setFromInactiveDate(e.target.value)} className="field-input" /></div>
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Hasta Baja</label><input type="date" value={toInactiveDate} onChange={(e) => setToInactiveDate(e.target.value)} className="field-input" /></div>
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

          <div className="text-sm text-gray-600">
            Total de Registros: {filteredContracts.length}
            {filteredContracts.length > 0 && (
              <span className="ml-2 text-gray-500">
                Mostrando {startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, filteredContracts.length)}
              </span>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <div className="mb-4 flex justify-end items-center gap-3">
          <Link
            href="/dashboard/new-contract"
            className="btn-primary"
          >
            + Nuevo Contrato
          </Link>
        </div>

        <div className="app-card overflow-hidden slide-up" style={{ animationDelay: "90ms" }}>
          {filteredContracts.length > 0 ? (
            <>
            <div className="divide-y divide-gray-200 md:hidden">
              {paginatedContracts.map((contract) => (
                <article key={contract.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-500">Contrato</p>
                      <p className="text-base font-semibold text-gray-900">{contract.contractNumber}</p>
                    </div>
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
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><p className="text-gray-500">Agente</p><p className="text-gray-800 font-medium">{contract.user.name}</p></div>
                    <div><p className="text-gray-500">Comercializadora</p><p className="text-gray-800 font-medium">{contract.commercializer}</p></div>
                    <div><p className="text-gray-500">CUPS</p><p className="text-gray-800">{contract.cups || "-"}</p></div>
                    <div><p className="text-gray-500">Adjuntos</p><p className="text-gray-800">{contract.documents?.length || 0}</p></div>
                  </div>

                  <div className="text-sm">
                    <p className="text-gray-500">Cliente</p>
                    <p className="font-medium text-gray-800">{contract.clientName} {contract.clientLastName || ""}</p>
                    <p className="text-xs text-gray-500">{contract.clientDNI || "-"}</p>
                  </div>

                  <div className="text-sm">
                    <p className="text-gray-500">Contacto</p>
                    <p className="text-gray-700">{contract.address || "-"}</p>
                    <p className="text-xs text-gray-500">{contract.clientPhone || "-"}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs text-gray-600">
                    <div><p className="text-gray-500">Alta</p><p>{new Date(contract.createdAt).toLocaleDateString("es-ES")}</p></div>
                    <div><p className="text-gray-500">Activación</p><p>{contract.activationDate ? new Date(contract.activationDate).toLocaleDateString("es-ES") : "-"}</p></div>
                    <div><p className="text-gray-500">Baja</p><p>{contract.inactiveDate ? new Date(contract.inactiveDate).toLocaleDateString("es-ES") : "-"}</p></div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <Link
                      href={`/dashboard/contracts/${contract.id}`}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-center text-sm font-medium text-blue-700"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="3.2" /></svg>
                      Ver
                    </Link>
                    <Link
                      href={`/dashboard/contracts/${contract.id}/edit`}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-center text-sm font-medium text-green-700"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="m15.232 5.232 3.536 3.536M9 18l-4 1 1-4L15.5 5.5a2.121 2.121 0 1 1 3 3L9 18Z" /></svg>
                      Editar
                    </Link>
                  </div>
                </article>
              ))}
            </div>
            <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[1120px] divide-y divide-gray-200">
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
                {paginatedContracts.map((contract) => (
                  <tr key={contract.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/dashboard/contracts/${contract.id}`}
                          title="Ver contrato"
                          aria-label="Ver contrato"
                          className="inline-flex items-center justify-center rounded-lg border border-blue-200 bg-blue-50 p-2 text-blue-700 hover:bg-blue-100"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="3.2" /></svg>
                        </Link>
                        <Link
                          href={`/dashboard/contracts/${contract.id}/edit`}
                          title="Editar contrato"
                          aria-label="Editar contrato"
                          className="inline-flex items-center justify-center rounded-lg border border-green-200 bg-green-50 p-2 text-green-700 hover:bg-green-100"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="m15.232 5.232 3.536 3.536M9 18l-4 1 1-4L15.5 5.5a2.121 2.121 0 1 1 3 3L9 18Z" /></svg>
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
            </div>
            <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-6 py-4">
              <div className="text-sm text-gray-600">
                Pagina {safeCurrentPage} de {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={safeCurrentPage === 1}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Anterior
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={safeCurrentPage === totalPages}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Siguiente
                </button>
              </div>
            </div>
            </>
          ) : (
            <div className="text-center py-12"><p className="text-gray-600">No hay contratos para mostrar</p></div>
          )}
        </div>
      </main>
      </div>
    </div>
  );
}




