export type ContractFormData = {
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
  paymentStatus: "PAID" | "UNPAID";
  observations: string;
};

export type ContractApiResponse = {
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
  paymentStatus?: "PAID" | "UNPAID";
  observations?: string;
};

export const CLIENT_TYPES = ["PYME", "DOMESTICO"] as const;
export const REQUEST_TYPES = ["LUZ", "GAS", "LUZ Y GAS"] as const;
export const ROAD_TYPES = [
  "CALLE",
  "AVENIDA",
  "PLAZA",
  "PASEO",
  "CAMINO",
  "CARRETERA",
  "RONDA",
  "TRAVESIA",
] as const;
export const STATUS_OPTIONS = ["ACTIVE", "PENDING", "INACTIVE", "CANCELLED"] as const;
export const LIGHT_TARIFFS = ["2.0 TD 0-10KW", "2.0 TD 10-15KW", "3.0 TD", "6.1 TD"] as const;
export const GAS_TARIFFS = ["RL1", "RL2", "RL3", "RL4", "RL5", "RL6"] as const;
export const PRODUCTS = [
  "SOLO LUZ",
  "SOLO GAS",
  "LUZ CON MANTENIMIENTO",
  "GAS CON MANTENIMIENTO",
  "BATERIA VIRTUAL",
  "FACTURA ON-LINE",
  "OK PERMANENCIA",
  "SERVIHOGAR",
] as const;
export const COMMERCIALIZERS = [
  "ADX",
  "IBERDROLA",
  "TOTAL",
  "NORDY",
  "GESTION ENERGETICA FV",
  "PLENITUDE",
  "ENDESA",
  "GANA ENERGIA",
  "NATURGY PDV",
  "ONG",
  "UNIELECTRICA",
  "ENDESA PYMES",
  "REPSOL",
  "COMPARATIVAS",
] as const;
export const PROVINCES = [
  "Alava",
  "Albacete",
  "Alicante",
  "Almeria",
  "Asturias",
  "Avila",
  "Badajoz",
  "Barcelona",
  "Burgos",
  "Caceres",
  "Cadiz",
  "Cantabria",
  "Castellon",
  "Ceuta",
  "Ciudad Real",
  "Cordoba",
  "A Coruna",
  "Cuenca",
  "Girona",
  "Granada",
  "Guadalajara",
  "Gipuzkoa",
  "Huelva",
  "Huesca",
  "Illes Balears",
  "Jaen",
  "Leon",
  "Lleida",
  "Lugo",
  "Madrid",
  "Malaga",
  "Melilla",
  "Murcia",
  "Navarra",
  "Ourense",
  "Palencia",
  "Las Palmas",
  "Pontevedra",
  "La Rioja",
  "Salamanca",
  "Segovia",
  "Sevilla",
  "Soria",
  "Tarragona",
  "Santa Cruz de Tenerife",
  "Teruel",
  "Toledo",
  "Valencia",
  "Valladolid",
  "Bizkaia",
  "Zamora",
  "Zaragoza",
] as const;

export function createEmptyContractFormData(): ContractFormData {
  return {
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
    paymentStatus: "UNPAID",
    observations: "",
  };
}

export function toDateInput(date?: string) {
  if (!date) return "";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

export function mapContractResponseToFormData(data: ContractApiResponse): ContractFormData {
  return {
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
    paymentStatus: data.paymentStatus || "UNPAID",
    observations: data.observations || "",
  };
}

export function buildContractPayload(formData: ContractFormData) {
  const address = `${formData.roadType} ${formData.roadName} ${formData.roadNumber}`.trim();

  return {
    clientType: formData.clientType,
    clientName: formData.clientName,
    clientLastName: formData.clientLastName,
    clientDNI: formData.clientDNI,
    clientPhone: formData.clientPhone,
    clientEmail: formData.clientEmail,
    clientIBAN: formData.clientIBAN,
    zipCode: formData.zipCode,
    municipality: formData.municipality,
    province: formData.province,
    roadType: formData.roadType,
    roadName: formData.roadName,
    roadNumber: formData.roadNumber,
    secondaryZipCode: formData.secondaryZipCode,
    secondaryMunicipality: formData.secondaryMunicipality,
    secondaryProvince: formData.secondaryProvince,
    secondaryRoadType: formData.secondaryRoadType,
    secondaryRoadName: formData.secondaryRoadName,
    secondaryRoadNumber: formData.secondaryRoadNumber,
    commercializer: formData.commercializer,
    requestType: formData.requestType,
    cups: formData.cups,
    lightTariff: formData.lightTariff,
    gasTariff: formData.gasTariff,
    cupsGas: formData.cupsGas,
    products: formData.products,
    activationDate: formData.activationDate,
    inactiveDate: formData.inactiveDate,
    scheduledCallDate: formData.scheduledCallDate,
    pdv: formData.pdv,
    status: formData.status,
    paymentStatus: formData.paymentStatus,
    observations: formData.observations,
    address,
    tariff: formData.lightTariff,
    supplyType: formData.requestType,
  };
}
