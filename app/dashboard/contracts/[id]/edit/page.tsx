"use client";

import { useEffect, useMemo, useState, FormEvent, ChangeEvent } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

interface FormData {
  contractNumber: string;
  clientType: string;
  clientName: string;
  clientLastName: string;
  clientDNI: string;
  clientPhone: string;
  clientEmail: string;
  clientIBAN: string;
  zipCode: string;
  municipality: string;
  province: string;
  roadType: string;
  roadName: string;
  roadNumber: string;
  secondaryZipCode: string;
  secondaryMunicipality: string;
  secondaryProvince: string;
  secondaryRoadType: string;
  secondaryRoadName: string;
  secondaryRoadNumber: string;
  commercializer: string;
  requestType: string;
  cups: string;
  lightTariff: string;
  gasTariff: string;
  cupsGas: string;
  products: string[];
  activationDate: string;
  inactiveDate: string;
  scheduledCallDate: string;
  pdv: string;
  status: string;
  observations: string;
}

interface ContractResponse {
  contractNumber?: string;
  clientType?: string;
  clientName?: string;
  clientLastName?: string;
  clientDNI?: string;
  clientPhone?: string;
  clientEmail?: string;
  clientIBAN?: string;
  zipCode?: string;
  municipality?: string;
  province?: string;
  roadType?: string;
  roadName?: string;
  roadNumber?: string;
  secondaryZipCode?: string;
  secondaryMunicipality?: string;
  secondaryProvince?: string;
  secondaryRoadType?: string;
  secondaryRoadName?: string;
  secondaryRoadNumber?: string;
  commercializer?: string;
  requestType?: string;
  supplyType?: string;
  cups?: string;
  lightTariff?: string;
  tariff?: string;
  gasTariff?: string;
  cupsGas?: string;
  products?: string[];
  activationDate?: string;
  inactiveDate?: string;
  scheduledCallDate?: string;
  pdv?: string;
  status?: string;
  observations?: string;
}

const CLIENT_TYPES = ["PYME", "DOMESTICO"];
const REQUEST_TYPES = ["LUZ", "GAS", "LUZ Y GAS"];
const ROAD_TYPES = ["CALLE", "AVENIDA", "PLAZA", "PASEO", "CAMINO", "CARRETERA", "RONDA", "TRAVESIA"];
const STATUS_OPTIONS = ["ACTIVE", "PENDING", "INACTIVE", "CANCELLED"];
const LIGHT_TARIFFS = ["2.0 TD 0-10KW", "2.0 TD 10-15KW", "3.0 TD", "6.1 TD"];
const GAS_TARIFFS = ["RL1", "RL2", "RL3", "RL4", "RL5", "RL6"];
const PRODUCTS = ["SOLO LUZ", "SOLO GAS", "LUZ CON MANTENIMIENTO", "GAS CON MANTENIMIENTO", "BATERIA VIRTUAL", "FACTURA ON-LINE", "OK PERMANENCIA", "SERVIHOGAR"];
const COMMERCIALIZERS = ["ADX", "IBERDROLA", "TOTAL", "NORDY", "GESTION ENERGETICA FV", "PLENITUDE", "ENDESA", "GANA ENERGIA", "NATURGY PDV", "ONG", "UNIELECTRICA", "ENDESA PYMES", "REPSOL", "COMPARATIVAS"];
const PROVINCES = ["Alava", "Albacete", "Alicante", "Almeria", "Asturias", "Avila", "Badajoz", "Barcelona", "Burgos", "Caceres", "Cadiz", "Cantabria", "Castellon", "Ceuta", "Ciudad Real", "Cordoba", "A Coruna", "Cuenca", "Girona", "Granada", "Guadalajara", "Gipuzkoa", "Huelva", "Huesca", "Illes Balears", "Jaen", "Leon", "Lleida", "Lugo", "Madrid", "Malaga", "Melilla", "Murcia", "Navarra", "Ourense", "Palencia", "Las Palmas", "Pontevedra", "La Rioja", "Salamanca", "Segovia", "Sevilla", "Soria", "Tarragona", "Santa Cruz de Tenerife", "Teruel", "Toledo", "Valencia", "Valladolid", "Bizkaia", "Zamora", "Zaragoza"];

function toDateInput(date?: string) {
  if (!date) return "";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

export default function EditContractPage() {
  const router = useRouter();
  const params = useParams();
  const contractId = params?.id as string;

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [sameSupplyPoint, setSameSupplyPoint] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    contractNumber: "",
    clientType: "PYME",
    clientName: "",
    clientLastName: "",
    clientDNI: "",
    clientPhone: "",
    clientEmail: "",
    clientIBAN: "",
    zipCode: "",
    municipality: "",
    province: "",
    roadType: "CALLE",
    roadName: "",
    roadNumber: "",
    secondaryZipCode: "",
    secondaryMunicipality: "",
    secondaryProvince: "",
    secondaryRoadType: "CALLE",
    secondaryRoadName: "",
    secondaryRoadNumber: "",
    commercializer: COMMERCIALIZERS[0],
    requestType: REQUEST_TYPES[0],
    cups: "",
    lightTariff: LIGHT_TARIFFS[0],
    gasTariff: GAS_TARIFFS[0],
    cupsGas: "",
    products: [],
    activationDate: "",
    inactiveDate: "",
    scheduledCallDate: "",
    pdv: "",
    status: "ACTIVE",
    observations: "",
  });

  useEffect(() => {
    const fetchContract = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          router.push("/auth/login");
          return;
        }

        const response = await fetch(`/api/contracts/${contractId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error("No se pudo cargar el contrato");
        }

        const data = (await response.json()) as ContractResponse;

        setFormData({
          contractNumber: data.contractNumber || "",
          clientType: data.clientType || "PYME",
          clientName: data.clientName || "",
          clientLastName: data.clientLastName || "",
          clientDNI: data.clientDNI || "",
          clientPhone: data.clientPhone || "",
          clientEmail: data.clientEmail || "",
          clientIBAN: data.clientIBAN || "",
          zipCode: data.zipCode || "",
          municipality: data.municipality || "",
          province: data.province || "",
          roadType: data.roadType || "CALLE",
          roadName: data.roadName || "",
          roadNumber: data.roadNumber || "",
          secondaryZipCode: data.secondaryZipCode || "",
          secondaryMunicipality: data.secondaryMunicipality || "",
          secondaryProvince: data.secondaryProvince || "",
          secondaryRoadType: data.secondaryRoadType || "CALLE",
          secondaryRoadName: data.secondaryRoadName || "",
          secondaryRoadNumber: data.secondaryRoadNumber || "",
          commercializer: data.commercializer || COMMERCIALIZERS[0],
          requestType: data.requestType || data.supplyType || REQUEST_TYPES[0],
          cups: data.cups || "",
          lightTariff: data.lightTariff || data.tariff || LIGHT_TARIFFS[0],
          gasTariff: data.gasTariff || GAS_TARIFFS[0],
          cupsGas: data.cupsGas || "",
          products: Array.isArray(data.products) ? data.products : [],
          activationDate: toDateInput(data.activationDate),
          inactiveDate: toDateInput(data.inactiveDate),
          scheduledCallDate: toDateInput(data.scheduledCallDate),
          pdv: data.pdv || "",
          status: data.status || "ACTIVE",
          observations: data.observations || "",
        });
      } catch (err) {
        console.error(err);
        setError("Error al cargar el contrato");
      } finally {
        setLoadingData(false);
      }
    };

    if (contractId) {
      void fetchContract();
    }
  }, [contractId, router]);

  const lookupLocationByPostalCode = async (zipCode: string) => {
    if (!/^\d{5}$/.test(zipCode)) {
      return { municipality: "", province: "" };
    }
    const response = await fetch(`/api/postal-lookup?zipCode=${zipCode}`);
    if (!response.ok) {
      return { municipality: "", province: "" };
    }
    return (await response.json()) as { municipality?: string; province?: string };
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      return next;
    });
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

  const handleProductsChange = (product: string) => {
    setFormData((prev) => ({
      ...prev,
      products: prev.products.includes(product)
        ? prev.products.filter((item) => item !== product)
        : [...prev.products, product],
    }));
  };

  const supplyAddressSummary = useMemo(
    () => `${formData.roadType} ${formData.roadName} ${formData.roadNumber}`.trim(),
    [formData.roadName, formData.roadNumber, formData.roadType]
  );

  const handleSameSupplyPoint = (checked: boolean) => {
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

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/auth/login");
        return;
      }

      const payload = {
        ...formData,
        address: supplyAddressSummary,
        tariff: formData.lightTariff,
        supplyType: formData.requestType,
      };

      const response = await fetch(`/api/contracts/${contractId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Error al actualizar el contrato");

      setSuccess(true);
      setTimeout(() => {
        router.push(`/dashboard/contracts/${contractId}`);
      }, 1000);
    } catch (err) {
      console.error(err);
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
          <Link href={`/dashboard/contracts/${contractId}`} className="text-gray-600 hover:text-gray-900">Volver al detalle</Link>
        </div>
      </header>

      <main className="app-main max-w-5xl">
        <div className="app-card p-6 sm:p-8 slide-up">
          {error && <div className="alert alert-error mb-6">{error}</div>}
          {success && <div className="alert alert-success mb-6">Contrato actualizado</div>}

          <form onSubmit={handleSubmit} className="space-y-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Contrato nÂ°</label>
              <input type="text" value={formData.contractNumber} disabled className="w-full md:w-52 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50" />
            </div>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Datos de cliente</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-2">Tipo de cliente</label><select name="clientType" value={formData.clientType} onChange={handleChange} className="field-input">{CLIENT_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-2">Nombre cliente</label><input type="text" name="clientName" value={formData.clientName} onChange={handleChange} required className="field-input" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-2">Apellidos cliente</label><input type="text" name="clientLastName" value={formData.clientLastName} onChange={handleChange} className="field-input" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-2">DNI/CIF</label><input type="text" name="clientDNI" value={formData.clientDNI} onChange={handleChange} className="field-input" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-2">Teléfono</label><input type="tel" name="clientPhone" value={formData.clientPhone} onChange={handleChange} className="field-input" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-2">Email</label><input type="email" name="clientEmail" value={formData.clientEmail} onChange={handleChange} className="field-input" /></div>
                <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-2">IBAN</label><input type="text" name="clientIBAN" value={formData.clientIBAN} onChange={handleChange} className="field-input" /></div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Punto de suministro</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-2">Cod. Postal</label><input type="text" name="zipCode" value={formData.zipCode} onChange={handleChange} maxLength={5} className="field-input" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-2">Municipio</label><input type="text" name="municipality" value={formData.municipality} onChange={handleChange} className="field-input" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-2">Provincia</label><select name="province" value={formData.province} onChange={handleChange} className="field-input"><option value="">Seleccionar valor</option>{PROVINCES.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-2">Tipo Via</label><select name="roadType" value={formData.roadType} onChange={handleChange} className="field-input">{ROAD_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-2">Nombre Via</label><input type="text" name="roadName" value={formData.roadName} onChange={handleChange} className="field-input" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-2">Número</label><input type="text" name="roadNumber" value={formData.roadNumber} onChange={handleChange} className="field-input" /></div>
              </div>

              <div className="mt-6 border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Segundo punto de suministro</h3>
                <label className="inline-flex items-center gap-2 text-sm text-gray-700 mb-4"><input type="checkbox" checked={sameSupplyPoint} onChange={(e) => handleSameSupplyPoint(e.target.checked)} />La misma que el punto de suministro</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-2">Cod. Postal</label><input type="text" name="secondaryZipCode" value={formData.secondaryZipCode} onChange={handleChange} maxLength={5} disabled={sameSupplyPoint} className="field-input disabled:bg-gray-50" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-2">Municipio</label><input type="text" name="secondaryMunicipality" value={formData.secondaryMunicipality} onChange={handleChange} disabled={sameSupplyPoint} className="field-input disabled:bg-gray-50" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-2">Provincia</label><select name="secondaryProvince" value={formData.secondaryProvince} onChange={handleChange} disabled={sameSupplyPoint} className="field-input disabled:bg-gray-50"><option value="">Seleccionar valor</option>{PROVINCES.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-2">Tipo Via</label><select name="secondaryRoadType" value={formData.secondaryRoadType} onChange={handleChange} disabled={sameSupplyPoint} className="field-input disabled:bg-gray-50">{ROAD_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-2">Nombre Via</label><input type="text" name="secondaryRoadName" value={formData.secondaryRoadName} onChange={handleChange} disabled={sameSupplyPoint} className="field-input disabled:bg-gray-50" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-2">Número</label><input type="text" name="secondaryRoadNumber" value={formData.secondaryRoadNumber} onChange={handleChange} disabled={sameSupplyPoint} className="field-input disabled:bg-gray-50" /></div>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Datos de contrato</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-2">Comercializadora</label><select name="commercializer" value={formData.commercializer} onChange={handleChange} className="field-input">{COMMERCIALIZERS.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-2">Tipo Solicitud</label><select name="requestType" value={formData.requestType} onChange={handleChange} className="field-input">{REQUEST_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-2">CUPS Luz</label><input type="text" name="cups" value={formData.cups} onChange={handleChange} className="field-input" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-2">Tarifa Luz</label><select name="lightTariff" value={formData.lightTariff} onChange={handleChange} className="field-input">{LIGHT_TARIFFS.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-2">Tarifa Gas</label><select name="gasTariff" value={formData.gasTariff} onChange={handleChange} className="field-input">{GAS_TARIFFS.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-2">CUPS Gas</label><input type="text" name="cupsGas" value={formData.cupsGas} onChange={handleChange} className="field-input" /></div>
              </div>

              <div className="mt-5">
                <p className="text-sm font-medium text-gray-700 mb-2">Productos</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {PRODUCTS.map((product) => (
                    <label key={product} className="inline-flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={formData.products.includes(product)} onChange={() => handleProductsChange(product)} />{product}</label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
                <div><label className="block text-sm font-medium text-gray-700 mb-2">Fecha Activacion</label><input type="date" name="activationDate" value={formData.activationDate} onChange={handleChange} className="field-input" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-2">Fecha Baja</label><input type="date" name="inactiveDate" value={formData.inactiveDate} onChange={handleChange} className="field-input" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-2">Fecha prevista locución</label><input type="date" name="scheduledCallDate" value={formData.scheduledCallDate} onChange={handleChange} className="field-input" /></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-2">PDV</label><input type="text" name="pdv" value={formData.pdv} onChange={handleChange} className="field-input" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-2">Estado</label><select name="status" value={formData.status} onChange={handleChange} className="field-input">{STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}</select></div>
              </div>
            </section>

            <section>
              <label className="block text-sm font-medium text-gray-700 mb-2">Observaciones</label>
              <textarea name="observations" value={formData.observations} onChange={handleChange} rows={3} className="field-input" />
            </section>

            <div className="flex gap-4">
              <button type="submit" disabled={loading} className="btn-primary flex-1 disabled:cursor-not-allowed disabled:bg-slate-400">{loading ? "Guardando..." : "Guardar cambios"}</button>
              <Link href={`/dashboard/contracts/${contractId}`} className="btn-secondary flex-1 text-center">Cancelar</Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}






