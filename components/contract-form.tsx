"use client";

import { ReactNode } from "react";
import Link from "next/link";
import {
  CLIENT_TYPES,
  COMMERCIALIZERS,
  ContractFormData,
  GAS_TARIFFS,
  LIGHT_TARIFFS,
  PRODUCTS,
  PROVINCES,
  REQUEST_TYPES,
  ROAD_TYPES,
  STATUS_OPTIONS,
} from "@/lib/contract-form";

type ContractFormProps = {
  formData: ContractFormData;
  sameSupplyPoint: boolean;
  loading: boolean;
  cancelHref: string;
  submitLabel: string;
  contractNumberHelpText?: string;
  showPaymentStatus?: boolean;
  extraSection?: ReactNode;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onFieldChange: (name: keyof ContractFormData, value: string) => void;
  onToggleProduct: (product: string) => void;
  onSameSupplyPointChange: (checked: boolean) => void;
};

export function ContractForm({
  formData,
  sameSupplyPoint,
  loading,
  cancelHref,
  submitLabel,
  contractNumberHelpText,
  showPaymentStatus = false,
  extraSection,
  onSubmit,
  onFieldChange,
  onToggleProduct,
  onSameSupplyPointChange,
}: ContractFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <div className={showPaymentStatus ? "grid grid-cols-1 gap-4 md:grid-cols-2" : ""}>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Contrato n°</label>
          <input
            type="text"
            value={formData.contractNumber}
            disabled
            placeholder="Se asigna al guardar"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
          />
          {contractNumberHelpText ? (
            <p className="mt-2 text-xs text-gray-500">{contractNumberHelpText}</p>
          ) : null}
        </div>
        {showPaymentStatus ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Pagado</label>
            <select
              name="paymentStatus"
              value={formData.paymentStatus}
              onChange={(event) => onFieldChange("paymentStatus", event.target.value)}
              className="field-input"
            >
              <option value="UNPAID">No</option>
              <option value="PAID">Si</option>
            </select>
          </div>
        ) : null}
      </div>

      <section>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Datos de cliente</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de cliente</label>
            <select
              name="clientType"
              value={formData.clientType}
              onChange={(event) => onFieldChange("clientType", event.target.value)}
              className="field-input"
            >
              {CLIENT_TYPES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nombre cliente</label>
            <input
              type="text"
              name="clientName"
              value={formData.clientName}
              onChange={(event) => onFieldChange("clientName", event.target.value)}
              required
              className="field-input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Apellidos cliente</label>
            <input
              type="text"
              name="clientLastName"
              value={formData.clientLastName}
              onChange={(event) => onFieldChange("clientLastName", event.target.value)}
              className="field-input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">DNI/CIF</label>
            <input
              type="text"
              name="clientDNI"
              value={formData.clientDNI}
              onChange={(event) => onFieldChange("clientDNI", event.target.value)}
              className="field-input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Telefono</label>
            <input
              type="tel"
              name="clientPhone"
              value={formData.clientPhone}
              onChange={(event) => onFieldChange("clientPhone", event.target.value)}
              className="field-input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input
              type="email"
              name="clientEmail"
              value={formData.clientEmail}
              onChange={(event) => onFieldChange("clientEmail", event.target.value)}
              className="field-input"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">IBAN</label>
            <input
              type="text"
              name="clientIBAN"
              value={formData.clientIBAN}
              onChange={(event) => onFieldChange("clientIBAN", event.target.value)}
              className="field-input"
            />
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Punto de suministro</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Cod. Postal</label>
            <input
              type="text"
              name="zipCode"
              value={formData.zipCode}
              onChange={(event) => onFieldChange("zipCode", event.target.value)}
              maxLength={5}
              className="field-input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Municipio</label>
            <input
              type="text"
              name="municipality"
              value={formData.municipality}
              onChange={(event) => onFieldChange("municipality", event.target.value)}
              className="field-input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Provincia</label>
            <select
              name="province"
              value={formData.province}
              onChange={(event) => onFieldChange("province", event.target.value)}
              className="field-input"
            >
              <option value="">Seleccionar valor</option>
              {PROVINCES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tipo Via</label>
            <select
              name="roadType"
              value={formData.roadType}
              onChange={(event) => onFieldChange("roadType", event.target.value)}
              className="field-input"
            >
              {ROAD_TYPES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nombre Via</label>
            <input
              type="text"
              name="roadName"
              value={formData.roadName}
              onChange={(event) => onFieldChange("roadName", event.target.value)}
              className="field-input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Numero</label>
            <input
              type="text"
              name="roadNumber"
              value={formData.roadNumber}
              onChange={(event) => onFieldChange("roadNumber", event.target.value)}
              className="field-input"
            />
          </div>
        </div>

        <div className="mt-6 border-t pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Segundo punto de suministro</h3>
          <label className="inline-flex items-center gap-2 text-sm text-gray-700 mb-4">
            <input
              type="checkbox"
              checked={sameSupplyPoint}
              onChange={(event) => onSameSupplyPointChange(event.target.checked)}
            />
            La misma que el punto de suministro
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Cod. Postal</label>
              <input
                type="text"
                name="secondaryZipCode"
                value={formData.secondaryZipCode}
                onChange={(event) => onFieldChange("secondaryZipCode", event.target.value)}
                maxLength={5}
                disabled={sameSupplyPoint}
                className="field-input disabled:bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Municipio</label>
              <input
                type="text"
                name="secondaryMunicipality"
                value={formData.secondaryMunicipality}
                onChange={(event) => onFieldChange("secondaryMunicipality", event.target.value)}
                disabled={sameSupplyPoint}
                className="field-input disabled:bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Provincia</label>
              <select
                name="secondaryProvince"
                value={formData.secondaryProvince}
                onChange={(event) => onFieldChange("secondaryProvince", event.target.value)}
                disabled={sameSupplyPoint}
                className="field-input disabled:bg-gray-50"
              >
                <option value="">Seleccionar valor</option>
                {PROVINCES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tipo Via</label>
              <select
                name="secondaryRoadType"
                value={formData.secondaryRoadType}
                onChange={(event) => onFieldChange("secondaryRoadType", event.target.value)}
                disabled={sameSupplyPoint}
                className="field-input disabled:bg-gray-50"
              >
                {ROAD_TYPES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nombre Via</label>
              <input
                type="text"
                name="secondaryRoadName"
                value={formData.secondaryRoadName}
                onChange={(event) => onFieldChange("secondaryRoadName", event.target.value)}
                disabled={sameSupplyPoint}
                className="field-input disabled:bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Numero</label>
              <input
                type="text"
                name="secondaryRoadNumber"
                value={formData.secondaryRoadNumber}
                onChange={(event) => onFieldChange("secondaryRoadNumber", event.target.value)}
                disabled={sameSupplyPoint}
                className="field-input disabled:bg-gray-50"
              />
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Datos de contrato</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Comercializadora</label>
            <select
              name="commercializer"
              value={formData.commercializer}
              onChange={(event) => onFieldChange("commercializer", event.target.value)}
              className="field-input"
            >
              {COMMERCIALIZERS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tipo Solicitud</label>
            <select
              name="requestType"
              value={formData.requestType}
              onChange={(event) => onFieldChange("requestType", event.target.value)}
              className="field-input"
            >
              {REQUEST_TYPES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">CUPS Luz</label>
            <input
              type="text"
              name="cups"
              value={formData.cups}
              onChange={(event) => onFieldChange("cups", event.target.value)}
              className="field-input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tarifa Luz</label>
            <select
              name="lightTariff"
              value={formData.lightTariff}
              onChange={(event) => onFieldChange("lightTariff", event.target.value)}
              className="field-input"
            >
              {LIGHT_TARIFFS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tarifa Gas</label>
            <select
              name="gasTariff"
              value={formData.gasTariff}
              onChange={(event) => onFieldChange("gasTariff", event.target.value)}
              className="field-input"
            >
              {GAS_TARIFFS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">CUPS Gas</label>
            <input
              type="text"
              name="cupsGas"
              value={formData.cupsGas}
              onChange={(event) => onFieldChange("cupsGas", event.target.value)}
              className="field-input"
            />
          </div>
        </div>

        <div className="mt-5">
          <p className="text-sm font-medium text-gray-700 mb-2">Productos</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PRODUCTS.map((product) => (
              <label key={product} className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={formData.products.includes(product)}
                  onChange={() => onToggleProduct(product)}
                />
                {product}
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Fecha Activacion</label>
            <input
              type="date"
              name="activationDate"
              value={formData.activationDate}
              onChange={(event) => onFieldChange("activationDate", event.target.value)}
              className="field-input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Fecha Baja</label>
            <input
              type="date"
              name="inactiveDate"
              value={formData.inactiveDate}
              onChange={(event) => onFieldChange("inactiveDate", event.target.value)}
              className="field-input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Fecha prevista locucion</label>
            <input
              type="date"
              name="scheduledCallDate"
              value={formData.scheduledCallDate}
              onChange={(event) => onFieldChange("scheduledCallDate", event.target.value)}
              className="field-input"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">PDV</label>
            <input
              type="text"
              name="pdv"
              value={formData.pdv}
              onChange={(event) => onFieldChange("pdv", event.target.value)}
              className="field-input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
            <select
              name="status"
              value={formData.status}
              onChange={(event) => onFieldChange("status", event.target.value)}
              className="field-input"
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {extraSection}

      <section>
        <label className="block text-sm font-medium text-gray-700 mb-2">Observaciones</label>
        <textarea
          name="observations"
          value={formData.observations}
          onChange={(event) => onFieldChange("observations", event.target.value)}
          rows={3}
          className="field-input"
        />
      </section>

      <div className="flex gap-4">
        <button
          type="submit"
          disabled={loading}
          className="btn-primary flex-1 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {loading ? `${submitLabel}...` : submitLabel}
        </button>
        <Link href={cancelHref} className="btn-secondary flex-1 text-center">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
