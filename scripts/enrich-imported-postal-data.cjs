/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require("@prisma/client");
const geonamesPostalCodes = require("geonames-postalcodes");

const prisma = new PrismaClient();

const PROVINCE_BY_PREFIX = {
  "01": "Alava",
  "02": "Albacete",
  "03": "Alicante",
  "04": "Almeria",
  "05": "Avila",
  "06": "Badajoz",
  "07": "Illes Balears",
  "08": "Barcelona",
  "09": "Burgos",
  "10": "Caceres",
  "11": "Cadiz",
  "12": "Castellon",
  "13": "Ciudad Real",
  "14": "Cordoba",
  "15": "A Coruna",
  "16": "Cuenca",
  "17": "Girona",
  "18": "Granada",
  "19": "Guadalajara",
  "20": "Gipuzkoa",
  "21": "Huelva",
  "22": "Huesca",
  "23": "Jaen",
  "24": "Leon",
  "25": "Lleida",
  "26": "La Rioja",
  "27": "Lugo",
  "28": "Madrid",
  "29": "Malaga",
  "30": "Murcia",
  "31": "Navarra",
  "32": "Ourense",
  "33": "Asturias",
  "34": "Palencia",
  "35": "Las Palmas",
  "36": "Pontevedra",
  "37": "Salamanca",
  "38": "Santa Cruz de Tenerife",
  "39": "Cantabria",
  "40": "Segovia",
  "41": "Sevilla",
  "42": "Soria",
  "43": "Tarragona",
  "44": "Teruel",
  "45": "Toledo",
  "46": "Valencia",
  "47": "Valladolid",
  "48": "Bizkaia",
  "49": "Zamora",
  "50": "Zaragoza",
  "51": "Ceuta",
  "52": "Melilla",
};

const MANUAL_LOCATION_BY_CODE = {
  "08485": {
    municipality: "Fogars de la Selva",
    province: "Barcelona",
    source: "manual_address_fallback",
  },
  "28079": {
    municipality: "Madrid",
    province: "Madrid",
    source: "manual_municipality_code",
  },
  "41091": {
    municipality: "Sevilla",
    province: "Sevilla",
    source: "manual_municipality_code",
  },
  "43037": {
    municipality: "Calafell",
    province: "Tarragona",
    source: "manual_municipality_code",
  },
  "46226": {
    municipality: "Sempere",
    province: "Valencia",
    source: "manual_municipality_code",
  },
};

function normalizePostalCode(value) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.padStart(5, "0").slice(0, 5);
}

async function lookupPostalCode(zipCode) {
  if (MANUAL_LOCATION_BY_CODE[zipCode]) {
    return MANUAL_LOCATION_BY_CODE[zipCode];
  }

  const entry = geonamesPostalCodes.postalCodeExactLookup(zipCode);

  return {
    municipality: entry?.placeName || null,
    province: entry?.adminName2 || PROVINCE_BY_PREFIX[zipCode.slice(0, 2)] || null,
    source: entry ? "geonames" : "prefix_fallback",
  };
}

async function main() {
  geonamesPostalCodes.init("./data/ES/ES.txt");

  const importedContracts = await prisma.contract.findMany({
    where: {
      observations: { contains: "[IMPORT_ID:" },
      zipCode: { not: null },
      OR: [{ municipality: null }, { province: null }],
    },
    select: {
      id: true,
      zipCode: true,
      municipality: true,
      province: true,
    },
  });

  const zipCodes = [
    ...new Set(
      importedContracts
        .map((contract) => normalizePostalCode(contract.zipCode))
        .filter((zipCode) => zipCode.length === 5)
    ),
  ];

  const contractsByZipCode = importedContracts.reduce((acc, contract) => {
    const zipCode = normalizePostalCode(contract.zipCode);
    if (!zipCode) return acc;
    if (!acc.has(zipCode)) acc.set(zipCode, []);
    acc.get(zipCode).push(contract);
    return acc;
  }, new Map());

  let updated = 0;
  let unresolved = 0;
  let lookedUp = 0;

  for (const zipCode of zipCodes) {
    const location = await lookupPostalCode(zipCode);
    lookedUp += 1;

    const contracts = contractsByZipCode.get(zipCode) || [];
    if (!location.municipality && !location.province) {
      unresolved += contracts.length;
      continue;
    }

    if (contracts.length > 0) {
      const ids = contracts.map((contract) => contract.id);
      await prisma.contract.updateMany({
        where: { id: { in: ids } },
        data: {
          municipality: location.municipality || undefined,
          province: location.province || undefined,
          zipCode,
        },
      });
      updated += contracts.length;
    }

    if (lookedUp % 200 === 0 || lookedUp === zipCodes.length) {
      console.log(
        JSON.stringify(
          {
            processedPostalCodes: lookedUp,
            totalPostalCodes: zipCodes.length,
            updatedContracts: updated,
            unresolvedContracts: unresolved,
          },
          null,
          2
        )
      );
    }
  }

  console.log(
    JSON.stringify(
      {
        contractsChecked: importedContracts.length,
        uniquePostalCodes: zipCodes.length,
        updated,
        unresolved,
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
