"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_FILTERS,
  DEFAULT_SORT,
  DEFAULT_SUMMARY_FIELDS,
  readDashboardPreferences,
} from "@/lib/dashboard-preferences";

export function useDashboardPreferences() {
  const preferences = readDashboardPreferences();
  const [pageSize, setPageSize] = useState(preferences.pageSize);
  const [summaryFields, setSummaryFields] = useState(preferences.summaryFields);
  const [defaultFilters, setDefaultFilters] = useState(preferences.defaultFilters);
  const [sortPreference, setSortPreference] = useState(preferences.sortPreference);
  const [dateFormat, setDateFormat] = useState(preferences.dateFormat);

  useEffect(() => {
    const onStorageChange = (event: StorageEvent) => {
      if (event.key === "contractsPageSize") {
        const next = readDashboardPreferences();
        setPageSize(next.pageSize);
      }

      if (event.key === "contractsSummaryFields") {
        const next = readDashboardPreferences();
        setSummaryFields(next.summaryFields || DEFAULT_SUMMARY_FIELDS);
      }

      if (event.key === "contractsDefaultFilters") {
        const next = readDashboardPreferences();
        setDefaultFilters(next.defaultFilters || DEFAULT_FILTERS);
      }

      if (event.key === "contractsSortPreference") {
        const next = readDashboardPreferences();
        setSortPreference(next.sortPreference || DEFAULT_SORT);
      }

      if (event.key === "contractsDateFormat") {
        const next = readDashboardPreferences();
        setDateFormat(next.dateFormat);
      }
    };

    window.addEventListener("storage", onStorageChange);
    return () => window.removeEventListener("storage", onStorageChange);
  }, []);

  return {
    pageSize,
    setPageSize,
    summaryFields,
    setSummaryFields,
    defaultFilters,
    setDefaultFilters,
    sortPreference,
    setSortPreference,
    dateFormat,
    setDateFormat,
  };
}
