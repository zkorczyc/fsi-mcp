import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { AtmRecord, AtmStatus } from "../src/atm-network/types.js";
import { DEMO_DATE } from "../src/config/demo.js";

const locationTypes = ["branch", "city_centre", "shopping_centre", "airport", "transit", "residential", "business_district"] as const;
const demoDate = `${DEMO_DATE}T09:00:00Z`;

interface CityConfig {
  country: string;
  currency: AtmRecord["currency"];
  city: string;
  code: string;
  count: number;
  lat: number;
  lon: number;
  faults?: Record<number, AtmStatus>;
  lowCash?: number[];
}

const cities: CityConfig[] = [
  { country: "US", currency: "USD", city: "New York", code: "NYC", count: 22, lat: 40.7128, lon: -74.0060 },
  { country: "US", currency: "USD", city: "Chicago", code: "CHI", count: 16, lat: 41.8781, lon: -87.6298, faults: { 4: "OUT_OF_SERVICE", 5: "MAINTENANCE", 6: "OUT_OF_SERVICE" } },
  { country: "US", currency: "USD", city: "San Francisco", code: "SFO", count: 12, lat: 37.7749, lon: -122.4194 },
  { country: "GB", currency: "GBP", city: "London", code: "LON", count: 30, lat: 51.5072, lon: -0.1276, lowCash: [2, 7, 13, 19, 25] },
  { country: "GB", currency: "GBP", city: "Manchester", code: "MAN", count: 10, lat: 53.4808, lon: -2.2426 },
  { country: "GB", currency: "GBP", city: "Edinburgh", code: "EDI", count: 10, lat: 55.9533, lon: -3.1883 },
  { country: "DE", currency: "EUR", city: "Berlin", code: "BER", count: 18, lat: 52.5200, lon: 13.4050, faults: { 2: "OUT_OF_SERVICE", 3: "OUT_OF_SERVICE", 4: "MAINTENANCE", 5: "OUT_OF_SERVICE", 6: "MAINTENANCE", 7: "OUT_OF_SERVICE", 8: "OUT_OF_SERVICE" } },
  { country: "DE", currency: "EUR", city: "Munich", code: "MUC", count: 16, lat: 48.1372, lon: 11.5756 },
  { country: "DE", currency: "EUR", city: "Hamburg", code: "HAM", count: 16, lat: 53.5511, lon: 9.9937 },
  { country: "FR", currency: "EUR", city: "Paris", code: "PAR", count: 30, lat: 48.8566, lon: 2.3522, faults: { 10: "OUT_OF_SERVICE", 21: "CASH_EMPTY" } },
  { country: "FR", currency: "EUR", city: "Lyon", code: "LYO", count: 10, lat: 45.7640, lon: 4.8357 },
  { country: "FR", currency: "EUR", city: "Marseille", code: "MRS", count: 10, lat: 43.2965, lon: 5.3698 },
  { country: "IT", currency: "EUR", city: "Milan", code: "MIL", count: 30, lat: 45.4642, lon: 9.1900 },
  { country: "IT", currency: "EUR", city: "Rome", code: "ROM", count: 10, lat: 41.9028, lon: 12.4964 },
  { country: "IT", currency: "EUR", city: "Bologna", code: "BLQ", count: 10, lat: 44.4949, lon: 11.3426 },
];

function distanceKm(left: Pick<AtmRecord, "latitude" | "longitude">, right: Pick<AtmRecord, "latitude" | "longitude">): number {
  const radians = Math.PI / 180;
  const latitudeDelta = (right.latitude - left.latitude) * radians;
  const longitudeDelta = (right.longitude - left.longitude) * radians;
  const value = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(left.latitude * radians) * Math.cos(right.latitude * radians) * Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

const records: AtmRecord[] = [];
for (const city of cities) {
  for (let index = 0; index < city.count; index += 1) {
    const row = Math.floor(index / 5);
    const column = index % 5;
    const status = city.faults?.[index]
      ?? (city.lowCash?.includes(index) ? "CASH_LOW" : "ONLINE");
    const amount = status === "CASH_EMPTY"
      ? 0
      : status === "CASH_LOW"
        ? 250 + ((index * 137) % 700)
        : 5_000 + ((index * 1_379 + city.count * 97) % 35_000);
    const unavailable = status === "OUT_OF_SERVICE" || status === "MAINTENANCE";
    const record: AtmRecord = {
      atm_id: `ATM-${city.country}-${city.code}-${String(index + 1).padStart(3, "0")}`,
      country: city.country,
      city: city.city,
      address: `Demo grid ${String(index + 1).padStart(2, "0")}, ${city.city}`,
      latitude: Number((city.lat + (row - 2) * 0.008 + (column - 2) * 0.006).toFixed(6)),
      longitude: Number((city.lon + (column - 2) * 0.009 + (row - 2) * 0.005).toFixed(6)),
      status,
      cash_available: amount,
      currency: city.currency,
      withdrawal_available: !unavailable && status !== "CASH_EMPTY",
      deposit_available: !unavailable && index % 3 === 0,
      accessibility: index % 4 !== 1,
      location_type: locationTypes[(index + row) % locationTypes.length],
      last_updated: demoDate,
      nearest_operational_atm_id: null,
      nearest_operational_atm_distance_km: null,
    };
    records.push(record);
  }
}

for (const record of records) {
  const alternatives = records
    .filter((candidate) => candidate.city === record.city && candidate.atm_id !== record.atm_id && candidate.withdrawal_available)
    .map((candidate) => ({ candidate, distance: distanceKm(record, candidate) }))
    .sort((left, right) => left.distance - right.distance);
  record.nearest_operational_atm_id = alternatives[0]?.candidate.atm_id ?? null;
  record.nearest_operational_atm_distance_km = alternatives[0] ? Number(alternatives[0].distance.toFixed(2)) : null;
}

await writeFile(resolve(process.cwd(), "data/synthetic/atm-network.json"), `${JSON.stringify(records, null, 2)}\n`);
console.log(`Generated ${records.length} deterministic ATM records across ${new Set(records.map((record) => record.country)).size} countries.`);