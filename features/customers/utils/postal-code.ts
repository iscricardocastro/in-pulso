const mexicoStateByPostalPrefix: Record<string, string> = {
  "00": "Ciudad de Mexico",
  "01": "Ciudad de Mexico",
  "02": "Ciudad de Mexico",
  "03": "Ciudad de Mexico",
  "04": "Ciudad de Mexico",
  "05": "Ciudad de Mexico",
  "06": "Ciudad de Mexico",
  "07": "Ciudad de Mexico",
  "08": "Ciudad de Mexico",
  "09": "Ciudad de Mexico",
  "10": "Ciudad de Mexico",
  "11": "Ciudad de Mexico",
  "12": "Ciudad de Mexico",
  "13": "Ciudad de Mexico",
  "14": "Ciudad de Mexico",
  "15": "Ciudad de Mexico",
  "16": "Ciudad de Mexico",
  "20": "Aguascalientes",
  "21": "Baja California",
  "22": "Baja California",
  "23": "Baja California Sur",
  "24": "Campeche",
  "25": "Coahuila",
  "26": "Coahuila",
  "27": "Coahuila",
  "28": "Colima",
  "29": "Chiapas",
  "30": "Chiapas",
  "31": "Chihuahua",
  "32": "Chihuahua",
  "33": "Chihuahua",
  "34": "Durango",
  "35": "Durango",
  "36": "Guanajuato",
  "37": "Guanajuato",
  "38": "Guanajuato",
  "39": "Guerrero",
  "40": "Guerrero",
  "41": "Guerrero",
  "42": "Hidalgo",
  "43": "Hidalgo",
  "44": "Jalisco",
  "45": "Jalisco",
  "46": "Jalisco",
  "47": "Jalisco",
  "48": "Jalisco",
  "49": "Jalisco",
  "50": "Estado de Mexico",
  "51": "Estado de Mexico",
  "52": "Estado de Mexico",
  "53": "Estado de Mexico",
  "54": "Estado de Mexico",
  "55": "Estado de Mexico",
  "56": "Estado de Mexico",
  "57": "Estado de Mexico",
  "58": "Michoacan",
  "59": "Michoacan",
  "60": "Michoacan",
  "61": "Michoacan",
  "62": "Morelos",
  "63": "Nayarit",
  "64": "Nuevo Leon",
  "65": "Nuevo Leon",
  "66": "Nuevo Leon",
  "67": "Nuevo Leon",
  "68": "Oaxaca",
  "69": "Oaxaca",
  "70": "Oaxaca",
  "71": "Oaxaca",
  "72": "Puebla",
  "73": "Puebla",
  "74": "Puebla",
  "75": "Puebla",
  "76": "Queretaro",
  "77": "Quintana Roo",
  "78": "San Luis Potosi",
  "79": "San Luis Potosi",
  "80": "Sinaloa",
  "81": "Sinaloa",
  "82": "Sinaloa",
  "83": "Sonora",
  "84": "Sonora",
  "85": "Sonora",
  "86": "Tabasco",
  "87": "Tamaulipas",
  "88": "Tamaulipas",
  "89": "Tamaulipas",
  "90": "Tlaxcala",
  "91": "Veracruz",
  "92": "Veracruz",
  "93": "Veracruz",
  "94": "Veracruz",
  "95": "Veracruz",
  "96": "Veracruz",
  "97": "Yucatan",
  "98": "Zacatecas",
  "99": "Zacatecas",
};

const mexicoCityByPostalRange = [
  { from: 1000, to: 16999, city: "Ciudad de Mexico" },
  { from: 20000, to: 20999, city: "Aguascalientes" },
  { from: 21000, to: 22999, city: "Mexicali" },
  { from: 22000, to: 22699, city: "Tijuana" },
  { from: 23000, to: 23999, city: "La Paz" },
  { from: 24000, to: 24999, city: "Campeche" },
  { from: 25000, to: 25999, city: "Saltillo" },
  { from: 27000, to: 27999, city: "Torreon" },
  { from: 28000, to: 28999, city: "Colima" },
  { from: 29000, to: 30999, city: "Tuxtla Gutierrez" },
  { from: 31000, to: 32999, city: "Chihuahua" },
  { from: 34000, to: 34999, city: "Durango" },
  { from: 36000, to: 36999, city: "Guanajuato" },
  { from: 37000, to: 37999, city: "Leon" },
  { from: 39000, to: 39999, city: "Chilpancingo" },
  { from: 42000, to: 43999, city: "Pachuca" },
  { from: 44100, to: 44999, city: "Guadalajara" },
  { from: 45000, to: 45999, city: "Zapopan" },
  { from: 50000, to: 50999, city: "Toluca" },
  { from: 58000, to: 58999, city: "Morelia" },
  { from: 62000, to: 62999, city: "Cuernavaca" },
  { from: 63000, to: 63999, city: "Tepic" },
  { from: 64000, to: 64999, city: "Monterrey" },
  { from: 66000, to: 66099, city: "Garcia" },
  { from: 66100, to: 66199, city: "Santa Catarina" },
  { from: 66200, to: 66299, city: "San Pedro Garza Garcia" },
  { from: 66300, to: 66399, city: "Santa Catarina" },
  { from: 66400, to: 66499, city: "San Nicolas de los Garza" },
  { from: 66600, to: 66699, city: "Apodaca" },
  { from: 67100, to: 67199, city: "Guadalupe" },
  { from: 67200, to: 67299, city: "Juarez" },
  { from: 68000, to: 71999, city: "Oaxaca" },
  { from: 72000, to: 72999, city: "Puebla" },
  { from: 76000, to: 76999, city: "Queretaro" },
  { from: 77000, to: 77999, city: "Chetumal" },
  { from: 78000, to: 78999, city: "San Luis Potosi" },
  { from: 80000, to: 80999, city: "Culiacan" },
  { from: 83000, to: 83999, city: "Hermosillo" },
  { from: 86000, to: 86999, city: "Villahermosa" },
  { from: 87000, to: 87999, city: "Ciudad Victoria" },
  { from: 89000, to: 89999, city: "Tampico" },
  { from: 90000, to: 90999, city: "Tlaxcala" },
  { from: 91000, to: 91999, city: "Xalapa" },
  { from: 97000, to: 97999, city: "Merida" },
  { from: 98000, to: 98999, city: "Zacatecas" },
];

type PostalCodeInference = {
  city?: string;
  country: string;
  state: string;
};

type ZippopotamPlace = {
  "place name"?: string;
  state?: string;
};

type ZippopotamResponse = {
  country?: string;
  places?: ZippopotamPlace[];
};

export function inferMexicoPostalCode(postalCode: string): PostalCodeInference | null {
  const digits = postalCode.replace(/\D/g, "");
  if (digits.length < 2) return null;
  const state = mexicoStateByPostalPrefix[digits.slice(0, 2)];
  if (!state) return null;

  const numericPostalCode = Number(digits);
  const city = mexicoCityByPostalRange.find((range) => numericPostalCode >= range.from && numericPostalCode <= range.to)?.city;

  return { city, country: "Mexico", state };
}

export async function lookupMexicoPostalCode(postalCode: string): Promise<PostalCodeInference | null> {
  const digits = postalCode.replace(/\D/g, "");
  if (digits.length !== 5) return inferMexicoPostalCode(postalCode);

  try {
    const response = await fetch(`https://api.zippopotam.us/mx/${digits}`);
    if (!response.ok) return inferMexicoPostalCode(postalCode);

    const data = (await response.json()) as ZippopotamResponse;
    const place = data.places?.[0];
    const state = place?.state;

    if (!state) return inferMexicoPostalCode(postalCode);

    return {
      city: place["place name"],
      country: data.country || "Mexico",
      state,
    };
  } catch {
    return inferMexicoPostalCode(postalCode);
  }
}
