export type AtmStatus = "ONLINE" | "OUT_OF_SERVICE" | "MAINTENANCE" | "CASH_LOW" | "CASH_EMPTY";

export type AtmLocationType =
  | "branch"
  | "city_centre"
  | "shopping_centre"
  | "airport"
  | "transit"
  | "residential"
  | "business_district";

export interface AtmRecord {
  atm_id: string;
  country: string;
  city: string;
  address: string;
  latitude: number;
  longitude: number;
  status: AtmStatus;
  cash_available: number;
  currency: "USD" | "GBP" | "EUR";
  withdrawal_available: boolean;
  deposit_available: boolean;
  accessibility: boolean;
  location_type: AtmLocationType;
  last_updated: string;
  nearest_operational_atm_id: string | null;
  nearest_operational_atm_distance_km: number | null;
}