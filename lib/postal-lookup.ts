import path from "path";

const PROVINCE_BY_PREFIX: Record<string, string> = {
  "01": "Alava", "02": "Albacete", "03": "Alicante", "04": "Almeria", "05": "Avila",
  "06": "Badajoz", "07": "Illes Balears", "08": "Barcelona", "09": "Burgos", "10": "Caceres",
  "11": "Cadiz", "12": "Castellon", "13": "Ciudad Real", "14": "Cordoba", "15": "A Coruna",
  "16": "Cuenca", "17": "Girona", "18": "Granada", "19": "Guadalajara", "20": "Gipuzkoa",
  "21": "Huelva", "22": "Huesca", "23": "Jaen", "24": "Leon", "25": "Lleida",
  "26": "La Rioja", "27": "Lugo", "28": "Madrid", "29": "Malaga", "30": "Murcia",
  "31": "Navarra", "32": "Ourense", "33": "Asturias", "34": "Palencia", "35": "Las Palmas",
  "36": "Pontevedra", "37": "Salamanca", "38": "Santa Cruz de Tenerife", "39": "Cantabria",
  "40": "Segovia", "41": "Sevilla", "42": "Soria", "43": "Tarragona", "44": "Teruel",
  "45": "Toledo", "46": "Valencia", "47": "Valladolid", "48": "Bizkaia", "49": "Zamora",
  "50": "Zaragoza", "51": "Ceuta", "52": "Melilla",
};

type PostalEntry = {
  placeName?: string;
  adminName2?: string;
};

type PostalLibrary = {
  init: (datasetPath: string) => void;
  postalCodeExactLookup: (zipCode: string) => PostalEntry | undefined;
};

let initialized = false;
let geonamesPostalCodes: PostalLibrary | null = null;

function ensureLibrary() {
  if (!geonamesPostalCodes) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    geonamesPostalCodes = require("geonames-postalcodes") as PostalLibrary;
  }
  if (!initialized && geonamesPostalCodes) {
    geonamesPostalCodes.init(path.join(process.cwd(), "data", "ES", "ES.txt"));
    initialized = true;
  }
}

export function lookupPostalCode(zipCode: string) {
  const normalized = String(zipCode || "").trim();
  if (!/^\d{5}$/.test(normalized)) {
    return { municipality: "", province: "" };
  }

  try {
    ensureLibrary();
    const entry = geonamesPostalCodes?.postalCodeExactLookup(normalized);
    return {
      municipality: entry?.placeName || "",
      province: entry?.adminName2 || PROVINCE_BY_PREFIX[normalized.slice(0, 2)] || "",
    };
  } catch {
    return {
      municipality: "",
      province: PROVINCE_BY_PREFIX[normalized.slice(0, 2)] || "",
    };
  }
}

