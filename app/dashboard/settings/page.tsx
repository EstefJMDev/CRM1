"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type AppUser = {
  id: string;
  name: string;
  lastName?: string | null;
  email: string;
  role: "SUPER_ADMIN" | "TENANT_ADMIN" | "USER";
  mustChangePassword?: boolean;
};

type ContractsSummaryFields = {
  agent: boolean;
  cups: boolean;
  commercializer: boolean;
  client: boolean;
  contact: boolean;
  attachments: boolean;
  createdAt: boolean;
  activationDate: boolean;
  inactiveDate: boolean;
  status: boolean;
  payment: boolean;
};

type DefaultFilters = {
  status: string;
  agentId: string;
  commercializers: string[];
  fromActivationDate: string;
  toActivationDate: string;
  fromInactiveDate: string;
  toInactiveDate: string;
  fromCreatedDate: string;
  toCreatedDate: string;
};

type SortPreference = {
  field: "createdAt" | "contractNumber";
  direction: "asc" | "desc";
};

type DateFormatPreference = "short" | "long";

type SettingsBundle = {
  contractsPageSize: number;
  contractsSummaryFields: ContractsSummaryFields;
  contractsDefaultFilters: DefaultFilters;
  contractsSortPreference: SortPreference;
  contractsDateFormat: DateFormatPreference;
};

const PAGE_SIZE_OPTIONS = [5, 10, 20, 30, 50];

const DEFAULT_SUMMARY_FIELDS: ContractsSummaryFields = {
  agent: true,
  cups: true,
  commercializer: true,
  client: true,
  contact: true,
  attachments: true,
  createdAt: true,
  activationDate: true,
  inactiveDate: true,
  status: true,
  payment: true,
};

const DEFAULT_FILTERS: DefaultFilters = {
  status: "all",
  agentId: "all",
  commercializers: [],
  fromActivationDate: "",
  toActivationDate: "",
  fromInactiveDate: "",
  toInactiveDate: "",
  fromCreatedDate: "",
  toCreatedDate: "",
};

const DEFAULT_SORT: SortPreference = {
  field: "createdAt",
  direction: "desc",
};

function normalizeCommercializer(value: string) {
  return value.replace(/^\s*\d+\s*[-.)]?\s*/, "").trim();
}

function readBootstrap() {
  if (typeof window === "undefined") {
    return {
      token: "",
      user: null as AppUser | null,
      pageSize: 10,
      summaryFields: DEFAULT_SUMMARY_FIELDS,
      defaultFilters: DEFAULT_FILTERS,
      sortPreference: DEFAULT_SORT,
      dateFormat: "short" as DateFormatPreference,
    };
  }

  const token = localStorage.getItem("token") || "";
  const userRaw = localStorage.getItem("user");
  const storedSize = Number.parseInt(localStorage.getItem("contractsPageSize") || "", 10);

  let summaryFields = DEFAULT_SUMMARY_FIELDS;
  let defaultFilters = DEFAULT_FILTERS;
  let sortPreference = DEFAULT_SORT;
  const dateFormat: DateFormatPreference = localStorage.getItem("contractsDateFormat") === "long" ? "long" : "short";

  try {
    const raw = localStorage.getItem("contractsSummaryFields");
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ContractsSummaryFields>;
      summaryFields = { ...DEFAULT_SUMMARY_FIELDS, ...parsed };
    }
  } catch {
    summaryFields = DEFAULT_SUMMARY_FIELDS;
  }

  try {
    const raw = localStorage.getItem("contractsDefaultFilters");
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<DefaultFilters>;
      defaultFilters = {
        ...DEFAULT_FILTERS,
        ...parsed,
        commercializers: Array.isArray(parsed.commercializers) ? parsed.commercializers : [],
      };
    }
  } catch {
    defaultFilters = DEFAULT_FILTERS;
  }

  try {
    const raw = localStorage.getItem("contractsSortPreference");
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SortPreference>;
      if ((parsed.field === "createdAt" || parsed.field === "contractNumber") && (parsed.direction === "asc" || parsed.direction === "desc")) {
        sortPreference = { field: parsed.field, direction: parsed.direction };
      }
    }
  } catch {
    sortPreference = DEFAULT_SORT;
  }

  return {
    token,
    user: userRaw ? (JSON.parse(userRaw) as AppUser) : null,
    pageSize: PAGE_SIZE_OPTIONS.includes(storedSize) ? storedSize : 10,
    summaryFields,
    defaultFilters,
    sortPreference,
    dateFormat,
  };
}

export default function SettingsPage() {
  const router = useRouter();
  const bootstrap = readBootstrap();
  const [user] = useState<AppUser | null>(bootstrap.user);
  const [pageSize, setPageSize] = useState(bootstrap.pageSize);
  const [summaryFields, setSummaryFields] = useState<ContractsSummaryFields>(bootstrap.summaryFields);
  const [defaultFilters, setDefaultFilters] = useState<DefaultFilters>(bootstrap.defaultFilters);
  const [sortPreference, setSortPreference] = useState<SortPreference>(bootstrap.sortPreference);
  const [dateFormat, setDateFormat] = useState<DateFormatPreference>(bootstrap.dateFormat);
  const [agents, setAgents] = useState<Array<{ id: string; fullName: string }>>([]);
  const [commercializers, setCommercializers] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const { token, user: bootstrapUser } = readBootstrap();
    if (!token || !bootstrapUser) {
      router.push("/auth/login");
      return;
    }

    void (async () => {
      try {
        const [agentsResponse, commercializersResponse] = await Promise.all([
          fetch("/api/contracts/agents", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/contracts/commercializers", { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        if (agentsResponse.ok) {
          const data = (await agentsResponse.json()) as { items: Array<{ id: string; fullName: string }> };
          setAgents(Array.isArray(data.items) ? data.items : []);
        }

        if (commercializersResponse.ok) {
          const data = (await commercializersResponse.json()) as { items: string[] };
          setCommercializers(Array.isArray(data.items) ? data.items : []);
        }
      } catch (error) {
        console.error(error);
      }
    })();
  }, [router]);

  const commercializerDisplayOptions = useMemo(
    () => commercializers.map((value) => ({ value, label: normalizeCommercializer(value) || value })),
    [commercializers]
  );

  const saveAll = () => {
    localStorage.setItem("contractsPageSize", String(pageSize));
    localStorage.setItem("contractsSummaryFields", JSON.stringify(summaryFields));
    localStorage.setItem("contractsDefaultFilters", JSON.stringify(defaultFilters));
    localStorage.setItem("contractsSortPreference", JSON.stringify(sortPreference));
    localStorage.setItem("contractsDateFormat", dateFormat);
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  };

  const restoreDefaults = () => {
    setPageSize(10);
    setSummaryFields(DEFAULT_SUMMARY_FIELDS);
    setDefaultFilters(DEFAULT_FILTERS);
    setSortPreference(DEFAULT_SORT);
    setDateFormat("short");
    localStorage.setItem("contractsPageSize", "10");
    localStorage.setItem("contractsSummaryFields", JSON.stringify(DEFAULT_SUMMARY_FIELDS));
    localStorage.setItem("contractsDefaultFilters", JSON.stringify(DEFAULT_FILTERS));
    localStorage.setItem("contractsSortPreference", JSON.stringify(DEFAULT_SORT));
    localStorage.setItem("contractsDateFormat", "short");
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  };

  const exportSettings = async () => {
    const bundle: SettingsBundle = {
      contractsPageSize: pageSize,
      contractsSummaryFields: summaryFields,
      contractsDefaultFilters: defaultFilters,
      contractsSortPreference: sortPreference,
      contractsDateFormat: dateFormat,
    };
    await navigator.clipboard.writeText(JSON.stringify(bundle, null, 2));
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  };

  const importSettings = () => {
    const raw = window.prompt("Pega aquí la configuración exportada (JSON):");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as Partial<SettingsBundle>;
      if (typeof parsed.contractsPageSize === "number" && PAGE_SIZE_OPTIONS.includes(parsed.contractsPageSize)) {
        setPageSize(parsed.contractsPageSize);
      }
      if (parsed.contractsSummaryFields) {
        setSummaryFields({ ...DEFAULT_SUMMARY_FIELDS, ...parsed.contractsSummaryFields });
      }
      if (parsed.contractsDefaultFilters) {
        setDefaultFilters({
          ...DEFAULT_FILTERS,
          ...parsed.contractsDefaultFilters,
          commercializers: Array.isArray(parsed.contractsDefaultFilters.commercializers)
            ? parsed.contractsDefaultFilters.commercializers
            : [],
        });
      }
      if (parsed.contractsSortPreference && (parsed.contractsSortPreference.field === "createdAt" || parsed.contractsSortPreference.field === "contractNumber") && (parsed.contractsSortPreference.direction === "asc" || parsed.contractsSortPreference.direction === "desc")) {
        setSortPreference(parsed.contractsSortPreference);
      }
      if (parsed.contractsDateFormat === "short" || parsed.contractsDateFormat === "long") {
        setDateFormat(parsed.contractsDateFormat);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 1600);
    } catch {
      window.alert("Formato JSON inválido");
    }
  };

  const toggleSummaryField = (field: keyof ContractsSummaryFields) => {
    setSummaryFields((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const toggleDefaultCommercializer = (value: string) => {
    setDefaultFilters((prev) => ({
      ...prev,
      commercializers: prev.commercializers.includes(value)
        ? prev.commercializers.filter((item) => item !== value)
        : [...prev.commercializers, value],
    }));
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-inner">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Ajustes</h1>
            <p className="text-sm text-gray-600">Configura preferencias del panel y accesos</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={restoreDefaults} className="btn-soft">Restaurar por defecto</button>
            <Link href="/dashboard" className="btn-secondary">Volver a contratos</Link>
          </div>
        </div>
      </header>

      <main className="app-main space-y-6">
        <section className="app-card p-6">
          <h2 className="text-lg font-semibold text-gray-900">Listado principal de contratos</h2>
          <p className="mt-1 text-sm text-gray-500">Define cuántos contratos quieres ver por página en el dashboard.</p>

          <div className="mt-4 w-full sm:w-64">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Contratos por página</label>
            <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="field-input">
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>
        </section>

        <section className="app-card p-6">
          <h2 className="text-lg font-semibold text-gray-900">Resumen de contratos</h2>
          <p className="mt-1 text-sm text-gray-500">Elige qué información se muestra en la tabla y en las tarjetas del dashboard.</p>

          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <label className="inline-flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={summaryFields.agent} onChange={() => toggleSummaryField("agent")} />Agente</label>
            <label className="inline-flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={summaryFields.cups} onChange={() => toggleSummaryField("cups")} />CUPS</label>
            <label className="inline-flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={summaryFields.commercializer} onChange={() => toggleSummaryField("commercializer")} />Comercializadora</label>
            <label className="inline-flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={summaryFields.client} onChange={() => toggleSummaryField("client")} />Cliente</label>
            <label className="inline-flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={summaryFields.contact} onChange={() => toggleSummaryField("contact")} />Contacto</label>
            <label className="inline-flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={summaryFields.attachments} onChange={() => toggleSummaryField("attachments")} />Archivos adjuntos</label>
            <label className="inline-flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={summaryFields.createdAt} onChange={() => toggleSummaryField("createdAt")} />Fecha alta</label>
            <label className="inline-flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={summaryFields.activationDate} onChange={() => toggleSummaryField("activationDate")} />Activación</label>
            <label className="inline-flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={summaryFields.inactiveDate} onChange={() => toggleSummaryField("inactiveDate")} />Baja</label>
            <label className="inline-flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={summaryFields.status} onChange={() => toggleSummaryField("status")} />Estado</label>
            <label className="inline-flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={summaryFields.payment} onChange={() => toggleSummaryField("payment")} />Pago</label>
          </div>
        </section>

        <section className="app-card p-6">
          <h2 className="text-lg font-semibold text-gray-900">Filtros por defecto</h2>
          <p className="mt-1 text-sm text-gray-500">Se aplican al abrir el dashboard o al pulsar “Limpiar”.</p>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Estado</label>
              <select className="field-input" value={defaultFilters.status} onChange={(e) => setDefaultFilters((prev) => ({ ...prev, status: e.target.value }))}>
                <option value="all">Todos</option>
                <option value="PENDING">Pendiente</option>
                <option value="ACTIVE">Activo</option>
                <option value="INACTIVE">Inactivo</option>
                <option value="CANCELLED">Cancelado</option>
                <option value="PAID">Pagado</option>
                <option value="UNPAID">No pagado</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Agente</label>
              <select className="field-input" value={defaultFilters.agentId} onChange={(e) => setDefaultFilters((prev) => ({ ...prev, agentId: e.target.value }))}>
                <option value="all">Todos los agentes</option>
                {agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.fullName}</option>)}
              </select>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {commercializerDisplayOptions.map((com) => (
              <label key={com.value} className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={defaultFilters.commercializers.includes(com.value)}
                  onChange={() => toggleDefaultCommercializer(com.value)}
                />
                {com.label}
              </label>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div><label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Desde Activación</label><input type="date" value={defaultFilters.fromActivationDate} onChange={(e) => setDefaultFilters((prev) => ({ ...prev, fromActivationDate: e.target.value }))} className="field-input" /></div>
            <div><label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Hasta Activación</label><input type="date" value={defaultFilters.toActivationDate} onChange={(e) => setDefaultFilters((prev) => ({ ...prev, toActivationDate: e.target.value }))} className="field-input" /></div>
            <div><label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Desde Alta</label><input type="date" value={defaultFilters.fromCreatedDate} onChange={(e) => setDefaultFilters((prev) => ({ ...prev, fromCreatedDate: e.target.value }))} className="field-input" /></div>
            <div><label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Hasta Alta</label><input type="date" value={defaultFilters.toCreatedDate} onChange={(e) => setDefaultFilters((prev) => ({ ...prev, toCreatedDate: e.target.value }))} className="field-input" /></div>
            <div><label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Desde Baja</label><input type="date" value={defaultFilters.fromInactiveDate} onChange={(e) => setDefaultFilters((prev) => ({ ...prev, fromInactiveDate: e.target.value }))} className="field-input" /></div>
            <div><label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Hasta Baja</label><input type="date" value={defaultFilters.toInactiveDate} onChange={(e) => setDefaultFilters((prev) => ({ ...prev, toInactiveDate: e.target.value }))} className="field-input" /></div>
          </div>
        </section>

        <section className="app-card p-6">
          <h2 className="text-lg font-semibold text-gray-900">Vista y orden por defecto</h2>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Ordenar por</label>
              <select className="field-input" value={sortPreference.field} onChange={(e) => setSortPreference((prev) => ({ ...prev, field: e.target.value as SortPreference["field"] }))}>
                <option value="createdAt">Fecha de alta</option>
                <option value="contractNumber">Número de contrato</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Dirección</label>
              <select className="field-input" value={sortPreference.direction} onChange={(e) => setSortPreference((prev) => ({ ...prev, direction: e.target.value as SortPreference["direction"] }))}>
                <option value="desc">Descendente</option>
                <option value="asc">Ascendente</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Formato de fecha</label>
              <select className="field-input" value={dateFormat} onChange={(e) => setDateFormat(e.target.value as DateFormatPreference)}>
                <option value="short">Corto (dd/mm/aaaa)</option>
                <option value="long">Largo (12 mayo 2026)</option>
              </select>
            </div>
          </div>
        </section>

        <section className="app-card p-6">
          <h2 className="text-lg font-semibold text-gray-900">Importar / Exportar ajustes</h2>
          <p className="mt-1 text-sm text-gray-500">Comparte tu configuración entre equipos o usuarios.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className="btn-secondary" onClick={exportSettings}>Copiar configuración (JSON)</button>
            <button type="button" className="btn-soft" onClick={importSettings}>Pegar configuración</button>
          </div>
        </section>

        <section className="app-card p-6">
          <h2 className="text-lg font-semibold text-gray-900">Gestión de usuarios</h2>
          <p className="mt-1 text-sm text-gray-500">Accede a datos personales, seguridad y administración de usuarios.</p>

          <div className="mt-4">
            <Link href="/dashboard/user-management" className="btn-secondary inline-flex">Ir a Gestión de usuario</Link>
          </div>

          {user?.role !== "SUPER_ADMIN" && (
            <p className="mt-3 text-xs text-gray-500">Como {user?.role}, podrás gestionar tu perfil y contraseña. La administración de usuarios está reservada a SUPER_ADMIN.</p>
          )}
        </section>

        <div className="flex items-center gap-3">
          <button type="button" onClick={saveAll} className="btn-primary">Guardar ajustes</button>
          {saved && <p className="text-sm font-medium text-emerald-700">Ajustes guardados correctamente.</p>}
        </div>
      </main>
    </div>
  );
}
