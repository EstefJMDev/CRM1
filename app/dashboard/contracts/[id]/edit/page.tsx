"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ContractForm } from "@/components/contract-form";
import { useContractForm } from "@/hooks/use-contract-form";
import {
  buildContractPayload,
  ContractApiResponse,
  createEmptyContractFormData,
  mapContractResponseToFormData,
} from "@/lib/contract-form";

export default function EditContractPage() {
  const router = useRouter();
  const params = useParams();
  const contractId = params?.id as string;
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const {
    formData,
    sameSupplyPoint,
    setFormData,
    handleFieldChange,
    toggleProduct,
    handleSameSupplyPointChange,
  } = useContractForm(createEmptyContractFormData());

  useEffect(() => {
    const fetchContract = async () => {
      try {
        const response = await fetch(`/api/contracts/${contractId}`);

        if (!response.ok) {
          throw new Error("No se pudo cargar el contrato");
        }

        const data = (await response.json()) as ContractApiResponse;
        setFormData(mapContractResponseToFormData(data));
      } catch (loadError) {
        console.error(loadError);
        setError("Error al cargar el contrato");
      } finally {
        setLoadingData(false);
      }
    };

    if (contractId) {
      void fetchContract();
    }
  }, [contractId, router, setFormData]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess(false);
    setLoading(true);

    try {
      const response = await fetch(`/api/contracts/${contractId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(buildContractPayload(formData)),
      });

      if (!response.ok) {
        throw new Error("Error al actualizar el contrato");
      }

      setSuccess(true);
      window.setTimeout(() => {
        router.push(`/dashboard/contracts/${contractId}`);
      }, 1000);
    } catch (submissionError) {
      console.error(submissionError);
      setError("Error al guardar cambios");
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="app-shell app-main">
        <div className="app-card p-6 space-y-4 fade-in">
          <div className="skeleton h-8 w-52" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="skeleton h-11" />
            <div className="skeleton h-11" />
            <div className="skeleton h-11" />
            <div className="skeleton h-11" />
          </div>
          <div className="skeleton h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-inner">
          <h1 className="text-3xl font-bold text-gray-900">Editar Contrato</h1>
          <Link href={`/dashboard/contracts/${contractId}`} className="text-gray-600 hover:text-gray-900">
            Volver al detalle
          </Link>
        </div>
      </header>

      <main className="app-main max-w-5xl">
        <div className="app-card p-6 sm:p-8 slide-up">
          {error ? <div className="alert alert-error mb-6">{error}</div> : null}
          {success ? <div className="alert alert-success mb-6">Contrato actualizado</div> : null}

          <ContractForm
            formData={formData}
            sameSupplyPoint={sameSupplyPoint}
            loading={loading}
            cancelHref={`/dashboard/contracts/${contractId}`}
            submitLabel="Guardar cambios"
            showPaymentStatus
            onSubmit={handleSubmit}
            onFieldChange={handleFieldChange}
            onToggleProduct={toggleProduct}
            onSameSupplyPointChange={handleSameSupplyPointChange}
          />
        </div>
      </main>
    </div>
  );
}
