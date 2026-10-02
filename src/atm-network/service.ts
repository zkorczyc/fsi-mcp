import { fixtureAtms } from "../data.js";
import { countryMatches } from "../market-signals/market.js";
import type { AtmRecord, AtmStatus } from "./types.js";

const unavailableStatuses = new Set<AtmStatus>(["OUT_OF_SERVICE", "MAINTENANCE", "CASH_EMPTY"]);

function selectedAtms(input: { country?: string; city?: string }): AtmRecord[] {
  const city = input.city?.trim().toLocaleLowerCase();
  return fixtureAtms.filter((atm) => countryMatches(atm.country, input.country))
    .filter((atm) => !city || atm.city.toLocaleLowerCase() === city);
}

export function getAtmNetworkSummary(input: { country?: string; city?: string } = {}) {
  const atms = selectedAtms(input);
  const count = (status: AtmStatus) => atms.filter((atm) => atm.status === status).length;
  const cashByCurrency = Object.fromEntries(
    [...new Set(atms.map((atm) => atm.currency))].sort().map((currency) => {
      const amounts = atms.filter((atm) => atm.currency === currency).map((atm) => atm.cash_available);
      const total = amounts.reduce((sum, amount) => sum + amount, 0);
      return [currency, { total, average: amounts.length ? Number((total / amounts.length).toFixed(2)) : 0 }];
    }),
  );

  return {
    country: input.country,
    city: input.city,
    total_atms: atms.length,
    online: count("ONLINE"),
    out_of_service: count("OUT_OF_SERVICE"),
    maintenance: count("MAINTENANCE"),
    cash_low: count("CASH_LOW"),
    cash_empty: count("CASH_EMPTY"),
    availability_percentage: atms.length
      ? Number((atms.filter((atm) => atm.withdrawal_available).length * 100 / atms.length).toFixed(1))
      : 0,
    cash_available_by_currency: cashByCurrency,
  };
}

export function findAtms(input: {
  country?: string;
  city?: string;
  status?: AtmStatus;
  cash_below?: number;
  location_type?: AtmRecord["location_type"];
  withdrawal_available?: boolean;
  deposit_available?: boolean;
  limit?: number;
}): AtmRecord[] {
  return selectedAtms(input)
    .filter((atm) => !input.status || atm.status === input.status)
    .filter((atm) => input.cash_below === undefined || atm.cash_available < input.cash_below)
    .filter((atm) => !input.location_type || atm.location_type === input.location_type)
    .filter((atm) => input.withdrawal_available === undefined || atm.withdrawal_available === input.withdrawal_available)
    .filter((atm) => input.deposit_available === undefined || atm.deposit_available === input.deposit_available)
    .slice(0, Math.min(Math.max(input.limit ?? 20, 1), 50));
}

  export function countMatchingAtms(input: Parameters<typeof findAtms>[0]): number {
    return selectedAtms(input)
    .filter((atm) => !input.status || atm.status === input.status)
    .filter((atm) => input.cash_below === undefined || atm.cash_available < input.cash_below)
    .filter((atm) => !input.location_type || atm.location_type === input.location_type)
    .filter((atm) => input.withdrawal_available === undefined || atm.withdrawal_available === input.withdrawal_available)
    .filter((atm) => input.deposit_available === undefined || atm.deposit_available === input.deposit_available)
    .length;
  }

export function getAtmDetails(atmId: string): AtmRecord | null {
  return fixtureAtms.find((atm) => atm.atm_id === atmId) ?? null;
}

function isUnavailable(atm: AtmRecord): boolean {
  return unavailableStatuses.has(atm.status);
}

export function findAtmAnomalies() {
  const networkAvailability = fixtureAtms.filter((atm) => atm.withdrawal_available).length * 100 / fixtureAtms.length;
  const cities = new Map<string, AtmRecord[]>();
  for (const atm of fixtureAtms) {
    const key = `${atm.country}:${atm.city}`;
    const group = cities.get(key) ?? [];
    group.push(atm);
    cities.set(key, group);
  }

  const anomalies: Array<Record<string, unknown>> = [];
  for (const atms of cities.values()) {
    const operational = atms.filter((atm) => atm.withdrawal_available).length;
    const availability = operational * 100 / atms.length;
    const unavailable = atms.filter(isUnavailable);
    const gap = networkAvailability - availability;
    if (unavailable.length >= 2 && gap >= 10) {
      anomalies.push({
        anomaly_type: "city_availability_gap",
        severity: gap >= 20 ? "high" : "medium",
        country: atms[0].country,
        city: atms[0].city,
        total_atms: atms.length,
        unavailable_count: unavailable.length,
        availability_percentage: Number(availability.toFixed(1)),
        network_availability_percentage: Number(networkAvailability.toFixed(1)),
        affected_atms: unavailable.map(({ atm_id, address, status }) => ({ atm_id, address, status })),
      });
    }

    const lowCash = atms.filter((atm) => atm.status === "CASH_LOW");
    if (lowCash.length >= 3 && lowCash.length / atms.length >= 0.15) {
      anomalies.push({
        anomaly_type: "low_cash_concentration",
        severity: lowCash.length / atms.length >= 0.25 ? "high" : "medium",
        country: atms[0].country,
        city: atms[0].city,
        total_atms: atms.length,
        low_cash_count: lowCash.length,
        affected_atms: lowCash.map(({ atm_id, address, cash_available, currency }) => ({ atm_id, address, cash_available, currency })),
      });
    }
  }

  return {
    network_availability_percentage: Number(networkAvailability.toFixed(1)),
    anomaly_count: anomalies.length,
    anomalies: anomalies.sort((left, right) => {
      const severityScore = (value: unknown) => value === "high" ? 2 : 1;
      return severityScore(right.severity) - severityScore(left.severity);
    }),
  };
}

function distanceKm(left: Pick<AtmRecord, "latitude" | "longitude">, right: Pick<AtmRecord, "latitude" | "longitude">): number {
  const radians = Math.PI / 180;
  const latitudeDelta = (right.latitude - left.latitude) * radians;
  const longitudeDelta = (right.longitude - left.longitude) * radians;
  const value = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(left.latitude * radians) * Math.cos(right.latitude * radians) * Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

export function findNearestOperationalAtms(input: {
  atm_id?: string;
  latitude?: number;
  longitude?: number;
  limit?: number;
}) {
  const anchor = input.atm_id ? getAtmDetails(input.atm_id) : null;
  if (input.atm_id && !anchor) return { not_found: true, alternatives: [] };
  if (!anchor && (input.latitude === undefined || input.longitude === undefined)) {
    throw new Error("Provide atm_id or both latitude and longitude.");
  }

  const point = anchor ?? { latitude: input.latitude!, longitude: input.longitude! };
  const alternatives = fixtureAtms
    .filter((atm) => atm.withdrawal_available && atm.atm_id !== anchor?.atm_id)
    .filter((atm) => !anchor || atm.country === anchor.country)
    .map((atm) => ({ atm, distance_km: distanceKm(point, atm) }))
    .sort((left, right) => left.distance_km - right.distance_km)
    .slice(0, Math.min(Math.max(input.limit ?? 3, 1), 10))
    .map(({ atm, distance_km }) => ({
      atm_id: atm.atm_id,
      country: atm.country,
      city: atm.city,
      address: atm.address,
      status: atm.status,
      cash_available: atm.cash_available,
      currency: atm.currency,
      distance_km: Number(distance_km.toFixed(2)),
    }));

  return { origin_atm_id: anchor?.atm_id, alternatives };
}