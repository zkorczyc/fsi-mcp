const marketAliases: Record<string, string> = {
  us: "US_RETAIL_BANKING",
  usa: "US_RETAIL_BANKING",
  america: "US_RETAIL_BANKING",
  united_states: "US_RETAIL_BANKING",
  united_states_of_america: "US_RETAIL_BANKING",
  us_retail_banking: "US_RETAIL_BANKING",
  uk: "UK_RETAIL_BANKING",
  gb: "UK_RETAIL_BANKING",
  britain: "UK_RETAIL_BANKING",
  great_britain: "UK_RETAIL_BANKING",
  united_kingdom: "UK_RETAIL_BANKING",
  uk_retail_banking: "UK_RETAIL_BANKING",
  de: "DE_RETAIL_BANKING",
  deutschland: "DE_RETAIL_BANKING",
  germany: "DE_RETAIL_BANKING",
  de_retail_banking: "DE_RETAIL_BANKING",
  fr: "FR_RETAIL_BANKING",
  france: "FR_RETAIL_BANKING",
  fr_retail_banking: "FR_RETAIL_BANKING",
  it: "IT_RETAIL_BANKING",
  italia: "IT_RETAIL_BANKING",
  italy: "IT_RETAIL_BANKING",
  it_retail_banking: "IT_RETAIL_BANKING",
};

function normalizeMarket(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

export function canonicalMarket(value?: string): string | undefined {
  if (!value) return undefined;
  return marketAliases[normalizeMarket(value)];
}

const countryAliases: Record<string, string> = {
  us: "US",
  usa: "US",
  united_states: "US",
  united_states_of_america: "US",
  uk: "GB",
  gb: "GB",
  britain: "GB",
  great_britain: "GB",
  united_kingdom: "GB",
  de: "DE",
  deutschland: "DE",
  germany: "DE",
  fr: "FR",
  france: "FR",
  it: "IT",
  italia: "IT",
  italy: "IT",
};

export function canonicalCountry(value?: string): string | undefined {
  if (!value) return undefined;
  return countryAliases[normalizeMarket(value)];
}

export function countryMatches(country: string, filter?: string): boolean {
  if (!filter) return true;
  return country === (canonicalCountry(filter) ?? filter.trim().toUpperCase());
}

export function marketMatches(market: string, country: string, filter?: string): boolean {
  if (!filter) return true;

  const canonical = canonicalMarket(filter);
  if (canonical) return market === canonical;

  const normalizedFilter = normalizeMarket(filter);
  return normalizeMarket(market).includes(normalizedFilter) || countryMatches(country, filter);
}