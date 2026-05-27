export type ContractsSummaryFields = {
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

export type DefaultFilters = {
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

export type SortPreference = {
  field: "createdAt" | "contractNumber";
  direction: "asc" | "desc";
};

export type DateFormatPreference = "short" | "long";

export type DashboardPreferences = {
  pageSize: number;
  summaryFields: ContractsSummaryFields;
  defaultFilters: DefaultFilters;
  sortPreference: SortPreference;
  dateFormat: DateFormatPreference;
};

export const PAGE_SIZE_OPTIONS = [5, 10, 20, 30, 50];

export const DEFAULT_SUMMARY_FIELDS: ContractsSummaryFields = {
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

export const DEFAULT_FILTERS: DefaultFilters = {
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

export const DEFAULT_SORT: SortPreference = {
  field: "createdAt",
  direction: "desc",
};

export function readDashboardPreferences(): DashboardPreferences {
  if (typeof window === "undefined") {
    return {
      pageSize: 10,
      summaryFields: DEFAULT_SUMMARY_FIELDS,
      defaultFilters: DEFAULT_FILTERS,
      sortPreference: DEFAULT_SORT,
      dateFormat: "short",
    };
  }

  const storedSize = Number.parseInt(localStorage.getItem("contractsPageSize") || "", 10);
  let summaryFields = DEFAULT_SUMMARY_FIELDS;
  let defaultFilters = DEFAULT_FILTERS;
  let sortPreference = DEFAULT_SORT;
  const dateFormat: DateFormatPreference =
    localStorage.getItem("contractsDateFormat") === "long" ? "long" : "short";

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
      if (
        (parsed.field === "createdAt" || parsed.field === "contractNumber") &&
        (parsed.direction === "asc" || parsed.direction === "desc")
      ) {
        sortPreference = { field: parsed.field, direction: parsed.direction };
      }
    }
  } catch {
    sortPreference = DEFAULT_SORT;
  }

  return {
    pageSize: PAGE_SIZE_OPTIONS.includes(storedSize) ? storedSize : 10,
    summaryFields,
    defaultFilters,
    sortPreference,
    dateFormat,
  };
}

export function saveDashboardPreferences(preferences: DashboardPreferences) {
  localStorage.setItem("contractsPageSize", String(preferences.pageSize));
  localStorage.setItem("contractsSummaryFields", JSON.stringify(preferences.summaryFields));
  localStorage.setItem("contractsDefaultFilters", JSON.stringify(preferences.defaultFilters));
  localStorage.setItem("contractsSortPreference", JSON.stringify(preferences.sortPreference));
  localStorage.setItem("contractsDateFormat", preferences.dateFormat);
}
