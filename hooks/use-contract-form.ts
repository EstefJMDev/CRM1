"use client";

import { useEffect, useState } from "react";
import { ContractFormData } from "@/lib/contract-form";

type PostalLookupResult = {
  municipality?: string;
  province?: string;
};

export function useContractForm(initialFormData: ContractFormData) {
  const [formData, setFormData] = useState<ContractFormData>(initialFormData);
  const [sameSupplyPoint, setSameSupplyPoint] = useState(false);

  const lookupLocationByPostalCode = async (zipCode: string) => {
    if (!/^\d{5}$/.test(zipCode)) {
      return { municipality: "", province: "" };
    }

    const response = await fetch(`/api/postal-lookup?zipCode=${zipCode}`);
    if (!response.ok) {
      return { municipality: "", province: "" };
    }

    return (await response.json()) as PostalLookupResult;
  };

  useEffect(() => {
    if (!/^\d{5}$/.test(formData.zipCode)) return;

    const timeoutId = window.setTimeout(() => {
      void (async () => {
        const location = await lookupLocationByPostalCode(formData.zipCode);
        setFormData((prev) => ({
          ...prev,
          municipality: location.municipality || prev.municipality,
          province: location.province || prev.province,
          ...(sameSupplyPoint
            ? {
                secondaryZipCode: prev.zipCode,
                secondaryMunicipality: location.municipality || prev.secondaryMunicipality,
                secondaryProvince: location.province || prev.secondaryProvince,
              }
            : {}),
        }));
      })();
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [formData.zipCode, sameSupplyPoint]);

  useEffect(() => {
    if (!/^\d{5}$/.test(formData.secondaryZipCode) || sameSupplyPoint) return;

    const timeoutId = window.setTimeout(() => {
      void (async () => {
        const location = await lookupLocationByPostalCode(formData.secondaryZipCode);
        setFormData((prev) => ({
          ...prev,
          secondaryMunicipality: location.municipality || prev.secondaryMunicipality,
          secondaryProvince: location.province || prev.secondaryProvince,
        }));
      })();
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [formData.secondaryZipCode, sameSupplyPoint]);

  const handleFieldChange = (name: keyof ContractFormData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const toggleProduct = (product: string) => {
    setFormData((prev) => ({
      ...prev,
      products: prev.products.includes(product)
        ? prev.products.filter((item) => item !== product)
        : [...prev.products, product],
    }));
  };

  const handleSameSupplyPointChange = (checked: boolean) => {
    setSameSupplyPoint(checked);
    if (!checked) return;

    setFormData((prev) => ({
      ...prev,
      secondaryZipCode: prev.zipCode,
      secondaryMunicipality: prev.municipality,
      secondaryProvince: prev.province,
      secondaryRoadType: prev.roadType,
      secondaryRoadName: prev.roadName,
      secondaryRoadNumber: prev.roadNumber,
    }));
  };

  return {
    formData,
    sameSupplyPoint,
    setFormData,
    handleFieldChange,
    toggleProduct,
    handleSameSupplyPointChange,
  };
}
