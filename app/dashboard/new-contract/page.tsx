"use client";

import { ChangeEvent, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ContractForm } from "@/components/contract-form";
import { useContractForm } from "@/hooks/use-contract-form";
import { buildContractPayload, createEmptyContractFormData } from "@/lib/contract-form";

export default function NewContractPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [relatedDocuments, setRelatedDocuments] = useState<File[]>([]);
  const {
    formData,
    sameSupplyPoint,
    handleFieldChange,
    toggleProduct,
    handleSameSupplyPointChange,
  } = useContractForm(createEmptyContractFormData());

  const handleFileSelection = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setRelatedDocuments(files);
  };

  const handleDropFiles = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files || []);
    setRelatedDocuments(files);
  };

  const uploadDocuments = async (contractId: string) => {
    for (const file of relatedDocuments) {
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);

      const uploadResponse = await fetch(`/api/contracts/${contractId}/documents`, {
        method: "POST",
        body: uploadFormData,
      });

      if (!uploadResponse.ok) {
        throw new Error("Error subiendo documentos");
      }
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess(false);
    setSuccessMessage("");
    setLoading(true);

    try {
      const response = await fetch("/api/contracts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(buildContractPayload(formData)),
      });

      if (!response.ok) {
        throw new Error("Error al crear el contrato");
      }

      const createdContract = await response.json();

      if (relatedDocuments.length > 0) {
        await uploadDocuments(createdContract.id);
      }

      setSuccess(true);
      setSuccessMessage("Contrato creado correctamente. Redirigiendo al dashboard...");
      window.setTimeout(() => {
        router.push("/dashboard");
      }, 1200);
    } catch (submissionError) {
      setError("Error al crear el contrato");
      console.error(submissionError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-inner">
          <h1 className="text-3xl font-bold text-gray-900">Nuevo Contrato</h1>
          <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">
            Volver al Dashboard
          </Link>
        </div>
      </header>

      <main className="app-main max-w-5xl">
        <div className="app-card p-6 sm:p-8 slide-up">
          {error ? <div className="alert alert-error mb-6">{error}</div> : null}
          {success ? <div className="alert alert-success mb-6">{successMessage}</div> : null}

          <ContractForm
            formData={formData}
            sameSupplyPoint={sameSupplyPoint}
            loading={loading}
            cancelHref="/dashboard"
            submitLabel="Guardar contrato"
            contractNumberHelpText="Se asigna automaticamente cuando guardas el contrato."
            extraSection={
              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Documentos relacionados</h2>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={handleDropFiles}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
                  className="w-full border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-teal-400 hover:bg-teal-50/40 transition"
                >
                  <p className="text-sm text-gray-700 font-medium">
                    Arrastra archivos aqui o haz clic para subir
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Formatos permitidos: PNG, JPG, DOCX, PDF
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".png,.jpg,.jpeg,.docx,.pdf"
                    onChange={handleFileSelection}
                    className="hidden"
                  />
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Archivos seleccionados: {relatedDocuments.length}
                </p>
                {relatedDocuments.length > 0 ? (
                  <ul className="mt-2 text-sm text-gray-700 space-y-1">
                    {relatedDocuments.map((file) => (
                      <li key={`${file.name}-${file.size}`}>{file.name}</li>
                    ))}
                  </ul>
                ) : null}
              </section>
            }
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
