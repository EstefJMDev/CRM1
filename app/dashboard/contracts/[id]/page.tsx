"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

interface Interaction {
  id: string;
  type: string;
  date: string;
  notes: string;
  createdAt: string;
}

interface Document {
  id: string;
  name: string;
  url: string;
  mimeType?: string;
  size?: number;
  createdAt: string;
}

interface StatusHistoryItem {
  id: string;
  status: string;
  paymentStatus: "PAID" | "UNPAID";
  paidAt?: string;
  observations?: string;
  changedBy: string;
  createdAt: string;
}

interface Contract {
  id: string;
  contractNumber: string;
  clientName: string;
  clientLastName?: string;
  clientType: string;
  clientDNI?: string;
  clientPhone?: string;
  clientSMS?: string;
  clientEmail?: string;
  clientIBAN?: string;
  supplyType: string;
  commercializer: string;
  requestType?: string;
  cups?: string;
  cupsGas?: string;
  tariff?: string;
  lightTariff?: string;
  gasTariff?: string;
  products?: string[];
  address?: string;
  municipality?: string;
  province?: string;
  zipCode?: string;
  roadType?: string;
  roadName?: string;
  roadNumber?: string;
  secondaryZipCode?: string;
  secondaryMunicipality?: string;
  secondaryProvince?: string;
  secondaryRoadType?: string;
  secondaryRoadName?: string;
  secondaryRoadNumber?: string;
  pdv?: string;
  scheduledCallDate?: string;
  status: string;
  paymentStatus: "PAID" | "UNPAID";
  paidAt?: string;
  observations?: string;
  activationDate?: string;
  inactiveDate?: string;
  createdAt: string;
  updatedAt: string;
  interactions: Interaction[];
  documents: Document[];
  statusHistory?: StatusHistoryItem[];
  user: { name: string; email: string };
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  ACTIVE: "Activo",
  INACTIVE: "Inactivo",
  CANCELLED: "Cancelado",
  TRAMITE: "Trámite",
};

function formatDate(date?: string) {
  if (!date) return "-";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleDateString("es-ES");
}

function isImportedContract(contract: Contract) {
  return Boolean(contract.observations?.includes("[IMPORT_ID:"));
}

function stripHtml(value?: string) {
  if (!value) return "";
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function cleanImportedText(value?: string) {
  if (!value) return "-";
  const lines = value
    .split("\n")
    .map((line) => stripHtml(line))
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("[IMPORT_ID:"));

  return lines.length > 0 ? lines.join("\n") : "-";
}

function emptyImportedValue(contract: Contract, value?: string) {
  if (value && value.trim()) return value;
  return isImportedContract(contract) ? "No disponible en el archivo importado" : "-";
}

export default function ContractDetailPage() {
  const router = useRouter();
  const params = useParams();
  const contractId = params?.id as string;

  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newInteraction, setNewInteraction] = useState({ type: "", notes: "" });
  const [showInteractionForm, setShowInteractionForm] = useState(false);
  const [interactionLoading, setInteractionLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const fetchContract = async () => {
      try {
        const response = await fetch(`/api/contracts/${contractId}`);

        if (!response.ok) {
          if (response.status === 404) {
            setError("Contrato no encontrado");
          } else {
            setError("Error al cargar el contrato");
          }
          return;
        }

        const data = await response.json();
        setContract(data);
      } catch (err) {
        setError("Error de conexión");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (contractId) {
      fetchContract();
    }
  }, [contractId, router]);

  const handleAddInteraction = async () => {
    if (!newInteraction.type || !newInteraction.notes) {
      alert("Por favor completa todos los campos");
      return;
    }

    setInteractionLoading(true);
    try {
      const response = await fetch(
        `/api/contracts/${contractId}/interactions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: newInteraction.type,
            notes: newInteraction.notes,
            date: new Date().toISOString(),
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Error al agregar interacción");
      }

      const interaction = await response.json();
      setContract((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          interactions: [interaction, ...prev.interactions],
        };
      });

      setNewInteraction({ type: "", notes: "" });
      setShowInteractionForm(false);
    } catch (err) {
      alert("Error al agregar interacción");
      console.error(err);
    } finally {
      setInteractionLoading(false);
    }
  };

  const handleUploadDocument = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`/api/contracts/${contractId}/documents`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Error al subir archivo");
      }

      const newDocument = await response.json();
      setContract((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          documents: [newDocument, ...prev.documents],
        };
      });
    } catch (err) {
      alert("No se pudo subir el documento");
      console.error(err);
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  if (loading) {
    return (
      <div className="app-shell app-main">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 fade-in">
          <div className="app-card space-y-4 p-6 lg:col-span-2">
            <div className="skeleton h-8 w-60" />
            <div className="skeleton h-40 w-full" />
            <div className="skeleton h-40 w-full" />
          </div>
          <div className="app-card space-y-3 p-6">
            <div className="skeleton h-6 w-32" />
            <div className="skeleton h-24 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className="app-shell">
        <header className="app-header">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <Link href="/dashboard" className="link-accent">
              ? Volver al Dashboard
            </Link>
          </div>
        </header>
        <main className="app-main max-w-7xl">
          <div className="alert alert-error">
            {error}
          </div>
        </main>
      </div>
    );
  }

  const importedContract = isImportedContract(contract);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-inner">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{contract.contractNumber}</h1>
            <p className="text-gray-600 text-sm mt-1">{contract.clientName}</p>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href={`/dashboard/contracts/${contract.id}/edit`}
              className="btn-primary text-sm"
            >
              Editar
            </Link>
            <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">
              Volver al Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="app-main max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="app-card p-6 mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Datos del Cliente</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Nombre</p>
                  <p className="font-medium text-gray-900">{contract.clientName || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Apellidos</p>
                  <p className="font-medium text-gray-900">{contract.clientLastName || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Tipo Cliente</p>
                  <p className="font-medium text-gray-900">{contract.clientType || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">DNI/CIF</p>
                  <p className="font-medium text-gray-900">{contract.clientDNI || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Teléfono</p>
                  <p className="font-medium text-gray-900">{contract.clientPhone || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-medium text-gray-900">{contract.clientEmail || "-"}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm text-gray-600">IBAN</p>
                  <p className="font-medium text-gray-900">{contract.clientIBAN || "-"}</p>
                </div>
              </div>
            </div>

            <div className="app-card p-6 mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Punto de Suministro</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Cod. Postal</p>
                  <p className="font-medium text-gray-900">{contract.zipCode || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Municipio</p>
                  <p className="font-medium text-gray-900">{emptyImportedValue(contract, contract.municipality)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Provincia</p>
                  <p className="font-medium text-gray-900">{emptyImportedValue(contract, contract.province)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Tipo Vía</p>
                  <p className="font-medium text-gray-900">{emptyImportedValue(contract, contract.roadType)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Nombre Vía</p>
                  <p className="font-medium text-gray-900">{contract.roadName || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Número</p>
                  <p className="font-medium text-gray-900">{contract.roadNumber || "-"}</p>
                </div>
              </div>

              <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">Segundo Punto de Suministro</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Cod. Postal</p>
                  <p className="font-medium text-gray-900">{emptyImportedValue(contract, contract.secondaryZipCode)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Municipio</p>
                  <p className="font-medium text-gray-900">{emptyImportedValue(contract, contract.secondaryMunicipality)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Provincia</p>
                  <p className="font-medium text-gray-900">{emptyImportedValue(contract, contract.secondaryProvince)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Tipo Vía</p>
                  <p className="font-medium text-gray-900">{emptyImportedValue(contract, contract.secondaryRoadType)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Nombre Vía</p>
                  <p className="font-medium text-gray-900">{emptyImportedValue(contract, contract.secondaryRoadName)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Número</p>
                  <p className="font-medium text-gray-900">{emptyImportedValue(contract, contract.secondaryRoadNumber)}</p>
                </div>
              </div>
            </div>

            <div className="app-card p-6 mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Datos del Contrato</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Comercializadora</p>
                  <p className="font-medium text-gray-900">{contract.commercializer || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Tipo Solicitud</p>
                  <p className="font-medium text-gray-900">{contract.requestType || emptyImportedValue(contract, undefined)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Tipo de suministro</p>
                  <p className="font-medium text-gray-900">{contract.supplyType || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">CUPS Luz</p>
                  <p className="font-medium text-gray-900">{contract.cups || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Tarifa Luz</p>
                  <p className="font-medium text-gray-900">{emptyImportedValue(contract, contract.lightTariff || contract.tariff)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">CUPS Gas</p>
                  <p className="font-medium text-gray-900">{contract.cupsGas || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Tarifa Gas</p>
                  <p className="font-medium text-gray-900">{emptyImportedValue(contract, contract.gasTariff)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Fecha Activación</p>
                  <p className="font-medium text-gray-900">{formatDate(contract.activationDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Fecha Baja</p>
                  <p className="font-medium text-gray-900">{formatDate(contract.inactiveDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Fecha prevista locución</p>
                  <p className="font-medium text-gray-900">{formatDate(contract.scheduledCallDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">PDV</p>
                  <p className="font-medium text-gray-900">{contract.pdv || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Pago</p>
                  <p className="font-medium text-gray-900">{contract.paymentStatus === "PAID" ? "Pagado" : "No pagado"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Fecha de pago</p>
                  <p className="font-medium text-gray-900">{contract.paymentStatus === "PAID" ? formatDate(contract.paidAt) : "-"}</p>
                </div>
              </div>

              {importedContract && (
                <div className="mt-5 rounded-lg border border-teal-100 bg-teal-50 px-4 py-3 text-sm text-teal-900">
                  Este contrato procede de una importación. Los campos que aparecen como no disponibles no existían como columnas separadas en el Excel original.
                </div>
              )}

              <div className="mt-5">
                <p className="text-sm text-gray-600 mb-1">Productos</p>
                {contract.products && contract.products.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {contract.products.map((product) => (
                      <span
                        key={product}
                        className="badge-neutral border border-slate-200"
                      >
                        {product}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="font-medium text-gray-900">-</p>
                )}
              </div>
            </div>

            <div className="app-card p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-900">Seguimiento de Interacciones</h2>
                <button
                  onClick={() => setShowInteractionForm(!showInteractionForm)}
                  className="btn-primary text-sm py-1"
                >
                  + Agregar Interacción
                </button>
              </div>

              {showInteractionForm && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                  <select
                    value={newInteraction.type}
                    onChange={(e) =>
                      setNewInteraction({
                        ...newInteraction,
                        type: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">Seleccionar tipo...</option>
                    <option value="LLAMADA">Llamada</option>
                    <option value="EMAIL">Email</option>
                    <option value="VISITA">Visita</option>
                    <option value="OTRO">Otro</option>
                  </select>

                  <textarea
                    value={newInteraction.notes}
                    onChange={(e) =>
                      setNewInteraction({
                        ...newInteraction,
                        notes: e.target.value,
                      })
                    }
                    placeholder="Notas de la interacción..."
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />

                  <div className="flex gap-2">
                    <button
                      onClick={handleAddInteraction}
                      disabled={interactionLoading}
                      className="btn-primary disabled:bg-slate-400"
                    >
                      {interactionLoading ? "Guardando..." : "Guardar"}
                    </button>
                    <button
                      onClick={() => setShowInteractionForm(false)}
                      className="btn-secondary"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {contract.interactions.length > 0 ? (
                <div className="space-y-4">
                  {contract.interactions.map((interaction) => (
                    <div
                      key={interaction.id}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-medium text-gray-900">
                          {interaction.type}
                        </span>
                        <span className="text-sm text-gray-600">
                          {new Date(interaction.createdAt).toLocaleDateString("es-ES")}
                        </span>
                      </div>
                      <p className="text-gray-700">{interaction.notes}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600 text-center py-4">
                  No hay interacciones registradas
                </p>
              )}
            </div>

            <div className="bg-white rounded-lg shadow p-6 mt-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Historial de Cambios de Estado</h2>
              {contract.statusHistory && contract.statusHistory.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Fecha</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Usuario</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Estado</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Observaciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {contract.statusHistory.map((item) => (
                        <tr key={item.id}>
                          <td className="px-4 py-2 text-sm text-gray-700">
                            {new Date(item.createdAt).toLocaleString("es-ES")}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-700">{item.changedBy}</td>
                          <td className="px-4 py-2 text-sm text-gray-700">
                            {STATUS_LABELS[item.status] || item.status}
                          </td>
                          <td className="px-4 py-2 text-sm whitespace-pre-line text-gray-700">{cleanImportedText(item.observations)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-gray-600">Sin cambios de estado registrados todavía.</p>
              )}
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="app-card p-6 mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Estado</h3>
              <span
                className={`px-4 py-2 rounded-full text-sm font-medium inline-block ${
                  contract.status === "ACTIVE"
                    ? "badge-ok"
                    : contract.status === "PENDING"
                    ? "bg-yellow-100 text-yellow-800"
                    : contract.status === "INACTIVE"
                    ? "bg-gray-100 text-gray-800"
                    : "badge-danger"
                }`}
              >
                {STATUS_LABELS[contract.status] || contract.status}
              </span>
              <div className="mt-4 text-sm text-gray-700">
                <p className="text-gray-600">Pago</p>
                <p className="font-medium text-gray-900">
                  {contract.paymentStatus === "PAID" ? `Pagado (${formatDate(contract.paidAt)})` : "No pagado"}
                </p>
              </div>
            </div>

            <div className="app-card p-6 mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Documentos</h3>
              <label className="btn-primary inline-block cursor-pointer mb-4 py-2">
                {uploading ? "Subiendo..." : "Adjuntar documento"}
                <input
                  type="file"
                  className="hidden"
                  onChange={handleUploadDocument}
                  disabled={uploading}
                />
              </label>

              {contract.documents.length > 0 ? (
                <ul className="space-y-2">
                  {contract.documents.map((doc) => (
                    <li key={doc.id} className="text-sm">
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noreferrer"
                        className="link-accent"
                      >
                        {doc.name}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-600">Sin documentos todavía</p>
              )}
            </div>

            <div className="app-card p-6 mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Información</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Creado por</p>
                  <p className="font-medium text-gray-900">{contract.user.name}</p>
                  <p className="text-sm text-gray-500">{contract.user.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Fecha Creación</p>
                  <p className="font-medium text-gray-900">{formatDate(contract.createdAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Última Actualización</p>
                  <p className="font-medium text-gray-900">{formatDate(contract.updatedAt)}</p>
                </div>
              </div>
            </div>

            {contract.observations && (
              <div className="app-card p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Observaciones</h3>
                <p className="whitespace-pre-line text-gray-700">{cleanImportedText(contract.observations)}</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}








