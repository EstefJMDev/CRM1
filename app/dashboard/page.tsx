"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { logoutAndRedirect, useAuthSession } from "@/hooks/use-auth-session";
import {
  ContractsSummaryFields,
  DateFormatPreference,
  readDashboardPreferences,
  SortPreference,
} from "@/lib/dashboard-preferences";

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
  paymentStatus: "PAID" | "UNPAID";
  paidAt?: string;
  createdAt: string;
  user: { name: string; lastName?: string | null; email: string };
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

function formatDateByPreference(date: string | undefined, format: DateFormatPreference) {
  if (!date) return "-";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "-";
  if (format === "long") {
    return parsed.toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" });
  }
  return parsed.toLocaleDateString("es-ES");
}

interface ContractsResponse {
  items: Contract[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface CommercializersResponse {
  items: string[];
}

interface AgentsResponse {
  items: Array<{ id: string; fullName: string }>;
}

interface ConsentNotification {
  id: string;
  approvedAt: string;
  contract: {
    id: string;
    contractNumber: string;
    clientName: string;
    clientLastName?: string | null;
    userId: string;
  };
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

function toSpanishMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-");
  const y = Number(year);
  const m = Number(month);
  if (!y || !m) return monthKey;
  const date = new Date(Date.UTC(y, m - 1, 1));
  return date.toLocaleDateString("es-ES", { month: "long", year: "numeric", timeZone: "UTC" });
}

function toSpanishWeekLabel(weekKey: string) {
  const match = weekKey.match(/^(\d{4})-W(\d{2})$/);
  if (!match) return weekKey;
  return `Semana ${Number(match[2])} de ${match[1]}`;
}

function normalizeCommercializer(value: string) {
  return value.replace(/^\s*\d+\s*[-.)]?\s*/, "").trim();
}

export default function DashboardPage() {
  const preferences = readDashboardPreferences();
  const initialDefaultFilters = preferences.defaultFilters;
  const router = useRouter();
  const { user, loading: authLoading } = useAuthSession({
    redirectTo: "/auth/login",
    requirePasswordChangeRedirect: "/dashboard/user-management",
  });
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [totalContracts, setTotalContracts] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(preferences.pageSize);
  const [summaryFields, setSummaryFields] = useState<ContractsSummaryFields>(preferences.summaryFields);
  const [exportMonthFilter, setExportMonthFilter] = useState("all");
  const [exportWeekFilter, setExportWeekFilter] = useState("all");
  const [exportAgentFilter, setExportAgentFilter] = useState("all");
  const [exportCommercializerFilter, setExportCommercializerFilter] = useState("all");
  const [exportClientFilter, setExportClientFilter] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState(initialDefaultFilters.status);
  const [agentFilter, setAgentFilter] = useState(initialDefaultFilters.agentId);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [fromActivationDate, setFromActivationDate] = useState(initialDefaultFilters.fromActivationDate);
  const [toActivationDate, setToActivationDate] = useState(initialDefaultFilters.toActivationDate);
  const [fromInactiveDate, setFromInactiveDate] = useState(initialDefaultFilters.fromInactiveDate);
  const [toInactiveDate, setToInactiveDate] = useState(initialDefaultFilters.toInactiveDate);
  const [fromCreatedDate, setFromCreatedDate] = useState(initialDefaultFilters.fromCreatedDate);
  const [toCreatedDate, setToCreatedDate] = useState(initialDefaultFilters.toCreatedDate);
  const [commercializerFilters, setCommercializerFilters] = useState<string[]>(initialDefaultFilters.commercializers);
  const [commercializerOptions, setCommercializerOptions] = useState<string[]>([]);
  const [agentOptions, setAgentOptions] = useState<Array<{ id: string; fullName: string }>>([]);
  const [sortPreference, setSortPreference] = useState<SortPreference>(preferences.sortPreference);
  const [dateFormatPreference, setDateFormatPreference] = useState<DateFormatPreference>(preferences.dateFormat);
  const [consentNotifications, setConsentNotifications] = useState<ConsentNotification[]>([]);
  const [unreadConsentNotifications, setUnreadConsentNotifications] = useState(0);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement | null>(null);
  const canViewExport = user?.role === "SUPER_ADMIN";
  const notificationsStorageKey = user ? `consentNotificationsSeenAt:${user.id}` : "";

  const fetchContracts = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        pageSize: String(itemsPerPage),
        search: searchTerm,
        status: statusFilter,
        agentId: agentFilter,
        fromActivationDate,
        toActivationDate,
        fromInactiveDate,
        toInactiveDate,
        fromCreatedDate,
        toCreatedDate,
        sortBy: sortPreference.field,
        sortDirection: sortPreference.direction,
      });
      if (commercializerFilters.length === 1) {
        params.set("commercializer", commercializerFilters[0]);
      }

      const response = await fetch(`/api/contracts?${params.toString()}`);

      if (!response.ok) {
        if (response.status === 401) {
          await logoutAndRedirect(router);
          return;
        }
        throw new Error("Error al obtener contratos");
      }

      const data = (await response.json()) as ContractsResponse;
      setContracts(data.items);
      setTotalContracts(data.total);
      setTotalPages(data.totalPages);
    } catch (err) {
      setError("Error al cargar los contratos");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [
    router,
    currentPage,
    itemsPerPage,
    searchTerm,
    statusFilter,
    agentFilter,
    fromActivationDate,
    toActivationDate,
    fromInactiveDate,
    toInactiveDate,
    fromCreatedDate,
    toCreatedDate,
    commercializerFilters,
    sortPreference,
  ]);

  useEffect(() => {
    const onStorageChange = (event: StorageEvent) => {
      if (event.key === "contractsPageSize") {
        const next = readDashboardPreferences();
        setCurrentPage(1);
        setItemsPerPage(next.pageSize);
      }
      if (event.key === "contractsSummaryFields") {
        const next = readDashboardPreferences();
        setSummaryFields(next.summaryFields);
      }
      if (event.key === "contractsDefaultFilters") {
        const next = readDashboardPreferences().defaultFilters;
        setStatusFilter(next.status);
        setAgentFilter(next.agentId);
        setCommercializerFilters(next.commercializers);
        setFromActivationDate(next.fromActivationDate);
        setToActivationDate(next.toActivationDate);
        setFromInactiveDate(next.fromInactiveDate);
        setToInactiveDate(next.toInactiveDate);
        setFromCreatedDate(next.fromCreatedDate);
        setToCreatedDate(next.toCreatedDate);
        setCurrentPage(1);
      }
      if (event.key === "contractsSortPreference") {
        const next = readDashboardPreferences().sortPreference;
        setSortPreference(next);
        setCurrentPage(1);
      }
      if (event.key === "contractsDateFormat") {
        const next = readDashboardPreferences();
        setDateFormatPreference(next.dateFormat);
      }
    };

    window.addEventListener("storage", onStorageChange);
    return () => window.removeEventListener("storage", onStorageChange);
  }, []);

  useEffect(() => {
    if (!isNotificationsOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!notificationsRef.current?.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isNotificationsOpen]);

  useEffect(() => {
    if (authLoading || !user) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchContracts();
    void (async () => {
      try {
        const [commercializersResponse, agentsResponse] = await Promise.all([
          fetch("/api/contracts/commercializers"),
          fetch("/api/contracts/agents"),
        ]);

        if (commercializersResponse.ok) {
          const data = (await commercializersResponse.json()) as CommercializersResponse;
          setCommercializerOptions(Array.isArray(data.items) ? data.items : []);
        }

        if (agentsResponse.ok) {
          const data = (await agentsResponse.json()) as AgentsResponse;
          setAgentOptions(Array.isArray(data.items) ? data.items : []);
        }
      } catch (error) {
        console.error(error);
      }
    })();
  }, [authLoading, fetchContracts, user]);

  const fetchConsentNotifications = useCallback(async () => {
    try {
      const response = await fetch("/api/consent-notifications?limit=12", {
        cache: "no-store",
      });

      if (!response.ok) {
        if (response.status === 401) {
          await logoutAndRedirect(router);
          return;
        }
        throw new Error("Error al obtener notificaciones");
      }

      const data = (await response.json()) as { items: ConsentNotification[] };
      const items = Array.isArray(data.items) ? data.items : [];
      setConsentNotifications(items);

      if (typeof window === "undefined" || !notificationsStorageKey) {
        setUnreadConsentNotifications(0);
        return;
      }

      const seenAt = window.localStorage.getItem(notificationsStorageKey);
      const seenTimestamp = seenAt ? new Date(seenAt).getTime() : 0;
      const unread = items.filter((item) => {
        const approvedTimestamp = new Date(item.approvedAt).getTime();
        return !Number.isNaN(approvedTimestamp) && approvedTimestamp > seenTimestamp;
      }).length;
      setUnreadConsentNotifications(unread);
    } catch (err) {
      console.error(err);
    }
  }, [notificationsStorageKey, router]);

  useEffect(() => {
    if (authLoading || !user) return;

    const timeoutId = window.setTimeout(() => {
      void fetchConsentNotifications();
    }, 0);
    const intervalId = window.setInterval(() => {
      void fetchConsentNotifications();
    }, 60000);

    return () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(intervalId);
    };
  }, [authLoading, fetchConsentNotifications, user]);

  const handleLogout = () => {
    void logoutAndRedirect(router);
  };

  const markNotificationsAsSeen = useCallback(() => {
    if (typeof window === "undefined" || !notificationsStorageKey) return;

    const latestApprovedAt = consentNotifications[0]?.approvedAt || new Date().toISOString();
    window.localStorage.setItem(notificationsStorageKey, latestApprovedAt);
    setUnreadConsentNotifications(0);
  }, [consentNotifications, notificationsStorageKey]);

  const toggleNotifications = () => {
    setIsNotificationsOpen((prev) => {
      const next = !prev;
      if (next) {
        markNotificationsAsSeen();
      }
      return next;
    });
  };

  const handleExport = async () => {
    if (!canViewExport) return;

    setIsExporting(true);
    setError("");

    try {
      const response = await fetch("/api/contracts/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filters: {
            search: exportClientFilter,
            status: statusFilter,
            agentId: exportAgentFilter,
            commercializer: exportCommercializerFilter,
            fromActivationDate,
            toActivationDate,
            fromInactiveDate,
            toInactiveDate,
            fromCreatedDate,
            toCreatedDate,
            exportMonth: exportMonthFilter,
            exportWeek: exportWeekFilter,
          },
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

  const exportCommercializerOptions = useMemo(
    () =>
      Array.from(new Set(commercializerOptions.map((c) => normalizeCommercializer(c))))
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, "es")),
    [commercializerOptions]
  );

  const commercializerDisplayOptions = useMemo(
    () => commercializerOptions.map((value) => ({ value, label: normalizeCommercializer(value) || value })),
    [commercializerOptions]
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
    setCurrentPage(1);
    setCommercializerFilters((prev) =>
      prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name]
    );
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter(initialDefaultFilters.status);
    setAgentFilter(initialDefaultFilters.agentId);
    setFromActivationDate(initialDefaultFilters.fromActivationDate);
    setToActivationDate(initialDefaultFilters.toActivationDate);
    setFromInactiveDate(initialDefaultFilters.fromInactiveDate);
    setToInactiveDate(initialDefaultFilters.toInactiveDate);
    setFromCreatedDate(initialDefaultFilters.fromCreatedDate);
    setToCreatedDate(initialDefaultFilters.toCreatedDate);
    setCommercializerFilters(initialDefaultFilters.commercializers);
    setCurrentPage(1);
  };

  const updateSearchTerm = (value: string) => {
    setCurrentPage(1);
    setSearchTerm(value);
  };

  const updateStatusFilter = (value: string) => {
    setCurrentPage(1);
    setStatusFilter(value);
  };

  const updateAgentFilter = (value: string) => {
    setCurrentPage(1);
    setAgentFilter(value);
  };

  const updateFromActivationDate = (value: string) => { setCurrentPage(1); setFromActivationDate(value); };
  const updateToActivationDate = (value: string) => { setCurrentPage(1); setToActivationDate(value); };
  const updateFromInactiveDate = (value: string) => { setCurrentPage(1); setFromInactiveDate(value); };
  const updateToInactiveDate = (value: string) => { setCurrentPage(1); setToInactiveDate(value); };
  const updateFromCreatedDate = (value: string) => { setCurrentPage(1); setFromCreatedDate(value); };
  const updateToCreatedDate = (value: string) => { setCurrentPage(1); setToCreatedDate(value); };

  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const paginatedContracts = contracts;
  const consentNotificationCountLabel =
    unreadConsentNotifications > 99 ? "99+" : String(unreadConsentNotifications);

  if (authLoading || loading) {
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
      <aside className={`${isSidebarCollapsed ? "w-[78px]" : "w-[320px]"} hidden border-r border-slate-200/90 bg-white/90 p-3 transition-all duration-300 md:block`}>
        <div className={`mb-4 flex items-center ${isSidebarCollapsed ? "justify-center" : "justify-between"}`}>
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
          <Link
            href="/dashboard"
            title="Contratos"
            className={`block rounded-lg py-2 text-sm font-semibold text-teal-800 ${isSidebarCollapsed ? "px-0 text-center" : "bg-teal-50 px-3"}`}
          >
            {isSidebarCollapsed ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M4 7.75A1.75 1.75 0 0 1 5.75 6h12.5A1.75 1.75 0 0 1 20 7.75v8.5A1.75 1.75 0 0 1 18.25 18H5.75A1.75 1.75 0 0 1 4 16.25v-8.5Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M8 10h8M8 14h5" /></svg>
            ) : "Contratos"}
          </Link>
          <Link
            href="/dashboard/consentimientos-historico"
            title="Consentimientos Histórico"
            className={`block rounded-lg py-2 text-sm text-slate-700 hover:bg-slate-100 ${isSidebarCollapsed ? "px-0 text-center" : "px-3"}`}
          >
            {isSidebarCollapsed ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 12c0 4.5-3.5 8-9 10-5.5-2-9-5.5-9-10V7l9-3 9 3v5Z" /></svg>
            ) : "Consentimientos Histórico"}
          </Link>
          <Link
            href="/dashboard/documentos"
            title="Documentos"
            className={`block rounded-lg py-2 text-sm text-slate-700 hover:bg-slate-100 ${isSidebarCollapsed ? "px-0 text-center" : "px-3"}`}
          >
            {isSidebarCollapsed ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 3.75h6.879c.464 0 .909.184 1.237.513l2.121 2.12c.328.329.513.774.513 1.238V19.5A1.5 1.5 0 0 1 16.75 21h-9.5a1.5 1.5 0 0 1-1.5-1.5v-14A1.75 1.75 0 0 1 7.5 3.75Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 3h6m-6-6h3" /></svg>
            ) : "Documentos"}
          </Link>
          <Link
            href="/dashboard/settings"
            title="Ajustes"
            className={`block rounded-lg py-2 text-sm text-slate-700 hover:bg-slate-100 ${isSidebarCollapsed ? "px-0 text-center" : "px-3"}`}
          >
            {isSidebarCollapsed ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h3m-7.5 6h12m-10.5 6h9" /></svg>
            ) : "Ajustes"}
          </Link>
        </nav>

        {!isSidebarCollapsed && canViewExport && (
          <div className="mt-5 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Exportacion</p>
            <select value={exportMonthFilter} onChange={(e) => setExportMonthFilter(e.target.value)} className="field-input text-sm">
              <option value="all">Mes de importación</option>
              {monthOptions.map((month) => <option key={month} value={month}>{toSpanishMonthLabel(month)}</option>)}
            </select>
            <select value={exportWeekFilter} onChange={(e) => setExportWeekFilter(e.target.value)} className="field-input text-sm">
              <option value="all">Semana</option>
              {weekOptions.map((week) => <option key={week} value={week}>{toSpanishWeekLabel(week)}</option>)}
            </select>
            <select value={exportAgentFilter} onChange={(e) => setExportAgentFilter(e.target.value)} className="field-input text-sm">
              <option value="all">Nombre de agente</option>
              {agentOptions.map((agent) => <option key={agent.id} value={agent.id}>{agent.fullName}</option>)}
            </select>
            <select value={exportCommercializerFilter} onChange={(e) => setExportCommercializerFilter(e.target.value)} className="field-input text-sm">
              <option value="all">Comercializadora</option>
              {exportCommercializerOptions.map((com) => <option key={com} value={com}>{com}</option>)}
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
              disabled={isExporting}
              className="btn-soft w-full text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isExporting ? "Exportando..." : "Exportar"}
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
          <Link href="/dashboard/consentimientos-historico" onClick={() => setIsMobileMenuOpen(false)} className="block rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">Consentimientos Histórico</Link>
          <Link href="/dashboard/documentos" onClick={() => setIsMobileMenuOpen(false)} className="block rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">Documentos</Link>
          <Link href="/dashboard/settings" onClick={() => setIsMobileMenuOpen(false)} className="block rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">Ajustes</Link>
        </nav>
        {canViewExport && (
        <div className="mt-5 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Exportacion</p>
          <select value={exportMonthFilter} onChange={(e) => setExportMonthFilter(e.target.value)} className="field-input text-sm">
            <option value="all">Mes de importación</option>
            {monthOptions.map((month) => <option key={month} value={month}>{toSpanishMonthLabel(month)}</option>)}
          </select>
          <select value={exportWeekFilter} onChange={(e) => setExportWeekFilter(e.target.value)} className="field-input text-sm">
            <option value="all">Semana</option>
            {weekOptions.map((week) => <option key={week} value={week}>{toSpanishWeekLabel(week)}</option>)}
          </select>
          <select value={exportAgentFilter} onChange={(e) => setExportAgentFilter(e.target.value)} className="field-input text-sm">
            <option value="all">Nombre de agente</option>
            {agentOptions.map((agent) => <option key={agent.id} value={agent.id}>{agent.fullName}</option>)}
          </select>
          <select value={exportCommercializerFilter} onChange={(e) => setExportCommercializerFilter(e.target.value)} className="field-input text-sm">
            <option value="all">Comercializadora</option>
            {exportCommercializerOptions.map((com) => <option key={com} value={com}>{com}</option>)}
          </select>
          <input type="text" value={exportClientFilter} onChange={(e) => setExportClientFilter(e.target.value)} placeholder="Cliente" className="field-input text-sm" />
          <button type="button" onClick={handleExport} disabled={isExporting} className="btn-soft w-full text-sm disabled:cursor-not-allowed disabled:opacity-50">
            {isExporting ? "Exportando..." : "Exportar"}
          </button>
        </div>
        )}
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
                <span className="text-base leading-none">=</span> Menu
              </button>
              <h1 className="text-3xl font-bold text-gray-900">CRM Contratos</h1>
              <p className="text-gray-600 text-sm mt-1">Bienvenido, {user?.name}</p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="relative" ref={notificationsRef}>
                <button
                  type="button"
                  onClick={toggleNotifications}
                  title="Notificaciones de consentimientos"
                  aria-label="Notificaciones de consentimientos"
                  className="relative inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-700 transition hover:bg-slate-100"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 1-5.714 0A2 2 0 0 1 7.4 15.094V10a4.6 4.6 0 1 1 9.2 0v5.094a2 2 0 0 1-1.743 1.988Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 18.5a2.25 2.25 0 0 0 4.5 0" />
                  </svg>
                  {unreadConsentNotifications > 0 && (
                    <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {consentNotificationCountLabel}
                    </span>
                  )}
                </button>

                {isNotificationsOpen && (
                  <div className="absolute right-0 z-20 mt-2 w-[360px] max-w-[88vw] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                    <div className="border-b border-slate-200 px-4 py-3">
                      <p className="text-sm font-semibold text-slate-900">Consentimientos aceptados</p>
                      <p className="mt-1 text-xs text-slate-500">Avisos recientes cuando un cliente acepta su consentimiento.</p>
                    </div>
                    {consentNotifications.length > 0 ? (
                      <div className="max-h-[420px] overflow-y-auto">
                        {consentNotifications.map((notification) => {
                          const clientFullName = `${notification.contract.clientName} ${notification.contract.clientLastName || ""}`.trim();
                          return (
                            <Link
                              key={notification.id}
                              href={`/dashboard/contracts/${notification.contract.id}`}
                              onClick={() => setIsNotificationsOpen(false)}
                              className="block border-b border-slate-100 px-4 py-3 transition hover:bg-slate-50 last:border-b-0"
                            >
                              <p className="text-sm font-semibold text-slate-900">
                                Talm {notification.contract.contractNumber}
                              </p>
                              <p className="mt-1 text-sm text-slate-700">{clientFullName}</p>
                              <p className="mt-1 text-xs text-slate-500">
                                Aceptado el {new Date(notification.approvedAt).toLocaleString("es-ES")}
                              </p>
                            </Link>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="px-4 py-6 text-sm text-slate-500">
                        No hay consentimientos aceptados recientes.
                      </div>
                    )}
                  </div>
                )}
              </div>
              <Link href="/dashboard/settings" className="btn-secondary text-sm">Ajustes</Link>
              <button
                onClick={handleLogout}
                title="Cerrar sesión"
                aria-label="Cerrar sesión"
                className="btn-danger inline-flex items-center justify-center px-3 py-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 7V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-2" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 12h10m0 0-3-3m3 3-3 3" />
                </svg>
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
                onChange={(e) => updateSearchTerm(e.target.value)}
                className="field-input"
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Agente</label>
              <select value={agentFilter} onChange={(e) => updateAgentFilter(e.target.value)} className="field-input">
                <option value="all">Todos los agentes</option>
                {agentOptions.map((agent) => (
                  <option key={agent.id} value={agent.id}>{agent.fullName}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Estado</label>
              <select value={statusFilter} onChange={(e) => updateStatusFilter(e.target.value)} className="field-input">
                <option value="all">Todos</option>
                <option value="PENDING">Pendiente</option>
                <option value="ACTIVE">Activo</option>
                <option value="INACTIVE">Inactivo</option>
                <option value="CANCELLED">Cancelado</option>
                <option value="PAID">Pagado</option>
                <option value="UNPAID">No pagado</option>
              </select>
            </div>
            <div className="md:col-span-2 flex items-end justify-start md:justify-end gap-2">
              <button
                onClick={() => setShowAdvancedFilters((v) => !v)}
                className="btn-outline px-3 py-2 text-sm"
              >
                {showAdvancedFilters ? "Ocultar filtros" : "Más filtros"}
              </button>
              <button
                onClick={clearFilters}
                className="btn-soft px-3 py-2 text-sm"
              >
                Limpiar
              </button>
            </div>
          </div>

          {showAdvancedFilters && (
            <div className="border-t pt-3 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Desde Activación</label><input type="date" value={fromActivationDate} onChange={(e) => updateFromActivationDate(e.target.value)} className="field-input" /></div>
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Hasta Activación</label><input type="date" value={toActivationDate} onChange={(e) => updateToActivationDate(e.target.value)} className="field-input" /></div>
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Desde Alta</label><input type="date" value={fromCreatedDate} onChange={(e) => updateFromCreatedDate(e.target.value)} className="field-input" /></div>
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Hasta Alta</label><input type="date" value={toCreatedDate} onChange={(e) => updateToCreatedDate(e.target.value)} className="field-input" /></div>
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Desde Baja</label><input type="date" value={fromInactiveDate} onChange={(e) => updateFromInactiveDate(e.target.value)} className="field-input" /></div>
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Hasta Baja</label><input type="date" value={toInactiveDate} onChange={(e) => updateToInactiveDate(e.target.value)} className="field-input" /></div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {commercializerDisplayOptions.map((com) => (
                  <label key={com.value} className="inline-flex items-center gap-2 text-xs text-gray-700">
                    <input type="checkbox" checked={commercializerFilters.includes(com.value)} onChange={() => toggleCommercializer(com.value)} />
                    {com.label}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
            Total de Registros: {totalContracts}
            {totalContracts > 0 && (
              <span className="text-gray-500">
                |
              </span>
            )}
            {totalContracts > 0 && (
              <span className="text-gray-500">
                Mostrando {startIndex + 1}-{Math.min(startIndex + itemsPerPage, totalContracts)}
              </span>
            )}
          </div>
        </div>

        {error && (
          <div className="alert alert-error mb-4">
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
          {contracts.length > 0 ? (
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
                        ? "badge-ok"
                        : contract.status === "PENDING"
                        ? "badge-warn"
                        : contract.status === "INACTIVE"
                        ? "badge-neutral"
                        : "badge-danger"
                    }`}>
                      {STATUS_LABELS[contract.status] || contract.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {summaryFields.agent && <div><p className="text-gray-500">Agente</p><p className="text-gray-800 font-medium">{`${contract.user.name} ${contract.user.lastName || ""}`.trim()}</p></div>}
                    {summaryFields.commercializer && <div><p className="text-gray-500">Comercializadora</p><p className="text-gray-800 font-medium">{contract.commercializer}</p></div>}
                    {summaryFields.cups && <div><p className="text-gray-500">CUPS</p><p className="text-gray-800">{contract.cups || "-"}</p></div>}
                    {summaryFields.attachments && <div><p className="text-gray-500">Adjuntos</p><p className="text-gray-800">{contract.documents?.length || 0}</p></div>}
                  </div>

                  {summaryFields.client && <div className="text-sm">
                    <p className="text-gray-500">Cliente</p>
                    <p className="font-medium text-gray-800">{contract.clientName} {contract.clientLastName || ""}</p>
                    <p className="text-xs text-gray-500">{contract.clientDNI || "-"}</p>
                  </div>}

                  {summaryFields.contact && <div className="text-sm">
                    <p className="text-gray-500">Contacto</p>
                    <p className="text-gray-700">{contract.address || "-"}</p>
                    <p className="text-xs text-gray-500">{contract.clientPhone || "-"}</p>
                  </div>}

                  <div className="grid grid-cols-3 gap-2 text-xs text-gray-600">
                    {summaryFields.createdAt && <div><p className="text-gray-500">Alta</p><p>{formatDateByPreference(contract.createdAt, dateFormatPreference)}</p></div>}
                    {summaryFields.activationDate && <div><p className="text-gray-500">Activación</p><p>{formatDateByPreference(contract.activationDate, dateFormatPreference)}</p></div>}
                    {summaryFields.inactiveDate && <div><p className="text-gray-500">Baja</p><p>{formatDateByPreference(contract.inactiveDate, dateFormatPreference)}</p></div>}
                  </div>
                  {summaryFields.payment && <div className="text-xs text-gray-600">
                    <p className="text-gray-500">Pago</p>
                    <p>{contract.paymentStatus === "PAID" ? `Pagado (${formatDateByPreference(contract.paidAt, dateFormatPreference)})` : "No pagado"}</p>
                  </div>}

                  <div className="flex items-center gap-2 pt-1">
                    <Link
                      href={`/dashboard/contracts/${contract.id}`}
                      className="btn-soft inline-flex flex-1 items-center justify-center gap-2 px-3 py-2 text-center text-sm"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="3.2" /></svg>
                      Ver
                    </Link>
                    <Link
                      href={`/dashboard/contracts/${contract.id}/edit`}
                      className="btn-soft inline-flex flex-1 items-center justify-center gap-2 px-3 py-2 text-center text-sm"
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
                  {summaryFields.agent && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agente</th>}
                  {summaryFields.cups && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CUPS</th>}
                  {summaryFields.commercializer && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Comercializadora</th>}
                  {summaryFields.client && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>}
                  {summaryFields.contact && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contacto</th>}
                  {summaryFields.attachments && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Archivos</th>}
                  {summaryFields.createdAt && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha Alta</th>}
                  {summaryFields.activationDate && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Activación</th>}
                  {summaryFields.inactiveDate && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Baja</th>}
                  {summaryFields.status && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>}
                  {summaryFields.payment && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pago</th>}
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
                          className="btn-soft-icon"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="3.2" /></svg>
                        </Link>
                        <Link
                          href={`/dashboard/contracts/${contract.id}/edit`}
                          title="Editar contrato"
                          aria-label="Editar contrato"
                          className="btn-soft-icon"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="m15.232 5.232 3.536 3.536M9 18l-4 1 1-4L15.5 5.5a2.121 2.121 0 1 1 3 3L9 18Z" /></svg>
                        </Link>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{contract.contractNumber}</td>
                    {summaryFields.agent && <td className="px-6 py-4 text-sm text-gray-600">{`${contract.user.name} ${contract.user.lastName || ""}`.trim()}</td>}
                    {summaryFields.cups && <td className="px-6 py-4 text-sm text-gray-600">{contract.cups || "-"}</td>}
                    {summaryFields.commercializer && <td className="px-6 py-4 text-sm text-gray-600">{contract.commercializer}</td>}
                    {summaryFields.client && <td className="px-6 py-4 text-sm text-gray-600">
                      <div className="font-medium text-gray-800">{contract.clientName} {contract.clientLastName || ""}</div>
                      <div className="text-xs text-gray-500">{contract.clientDNI || "-"}</div>
                    </td>}
                    {summaryFields.contact && <td className="px-6 py-4 text-sm text-gray-600">
                      <div>{contract.address || "-"}</div>
                      <div className="text-xs text-gray-500">{contract.clientPhone || "-"}</div>
                    </td>}
                    {summaryFields.attachments && <td className="px-6 py-4 text-sm text-gray-600">{contract.documents?.length || 0} adjuntos</td>}
                    {summaryFields.createdAt && <td className="px-6 py-4 text-sm text-gray-600">{formatDateByPreference(contract.createdAt, dateFormatPreference)}</td>}
                    {summaryFields.activationDate && <td className="px-6 py-4 text-sm text-gray-600">{formatDateByPreference(contract.activationDate, dateFormatPreference)}</td>}
                    {summaryFields.inactiveDate && <td className="px-6 py-4 text-sm text-gray-600">{formatDateByPreference(contract.inactiveDate, dateFormatPreference)}</td>}
                    {summaryFields.status && <td className="px-6 py-4 text-sm">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        contract.status === "ACTIVE"
                          ? "badge-ok"
                          : contract.status === "PENDING"
                          ? "badge-warn"
                          : contract.status === "INACTIVE"
                          ? "badge-neutral"
                          : "badge-danger"
                      }`}>
                        {STATUS_LABELS[contract.status] || contract.status}
                      </span>
                    </td>}
                    {summaryFields.payment && <td className="px-6 py-4 text-sm text-gray-600">
                      {contract.paymentStatus === "PAID" ? `Pagado (${formatDateByPreference(contract.paidAt, dateFormatPreference)})` : "No pagado"}
                    </td>}
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








