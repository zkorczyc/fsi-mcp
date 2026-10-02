import { fixtureSignals } from "../data.js";
import { pool } from "../db/client.js";
import { countryMatches, marketMatches } from "./market.js";
import type { MarketSignal, SearchFilters, SignalFilters } from "./types.js";

async function allSignals(): Promise<MarketSignal[]> {
  if (!pool) return fixtureSignals;
  const { rows } = await pool.query<MarketSignal>(
    "SELECT signal_id, market, country, product_category, product_subcategory, signal_type, title, summary, direction, impact, status, effective_from::text, effective_to::text, source, confidence FROM market_signals",
  );
  return rows;
}

function matches(value: string, filter?: string): boolean {
  return !filter || value.toLocaleLowerCase().includes(filter.trim().toLocaleLowerCase());
}

export async function getActiveMarketSignals(filters: SignalFilters = {}): Promise<MarketSignal[]> {
  const limit = Math.min(Math.max(filters.limit ?? 9, 1), 25);
  return (await allSignals())
    .filter((signal) => signal.status === "ACTIVE")
    .filter((signal) => marketMatches(signal.market, signal.country, filters.market))
    .filter((signal) => countryMatches(signal.country, filters.country))
    .filter((signal) => !filters.product_category || signal.product_category === filters.product_category)
    .filter((signal) => !filters.product_subcategory || signal.product_subcategory === filters.product_subcategory)
    .filter((signal) => matches(signal.signal_type, filters.signal_type))
    .filter((signal) => !filters.impact || signal.impact === filters.impact)
    .sort((a, b) => b.effective_from.localeCompare(a.effective_from))
    .slice(0, limit);
}

export async function getMarketSignal(signalId: string): Promise<MarketSignal | null> {
  if (pool) {
    const { rows } = await pool.query<MarketSignal>(
      "SELECT signal_id, market, country, product_category, product_subcategory, signal_type, title, summary, direction, impact, status, effective_from::text, effective_to::text, source, confidence FROM market_signals WHERE signal_id = $1",
      [signalId],
    );
    return rows[0] ?? null;
  }
  return fixtureSignals.find((signal) => signal.signal_id === signalId) ?? null;
}

export async function searchMarketSignals(filters: SearchFilters): Promise<MarketSignal[]> {
  const terms = `${filters.keyword ?? ""} ${filters.product ?? ""}`
    .trim()
    .toLocaleLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  const limit = Math.min(Math.max(filters.limit ?? 10, 1), 25);

  return (await allSignals())
    .filter((signal) => marketMatches(signal.market, signal.country, filters.market))
    .filter((signal) => countryMatches(signal.country, filters.country))
    .filter((signal) => !filters.product_category || signal.product_category === filters.product_category)
    .filter((signal) => !filters.product_subcategory || signal.product_subcategory === filters.product_subcategory)
    .filter((signal) => matches(signal.signal_type, filters.signal_type))
    .filter((signal) => !filters.impact || signal.impact === filters.impact)
    .filter((signal) => !filters.status || signal.status === filters.status)
    .filter((signal) => !filters.from_date || signal.effective_from >= filters.from_date)
    .filter((signal) => !filters.to_date || signal.effective_from <= filters.to_date)
    .filter((signal) => {
      const searchable = `${signal.title} ${signal.summary} ${signal.market} ${signal.country} ${signal.product_category} ${signal.product_subcategory} ${signal.signal_type} ${signal.direction} ${signal.source}`.toLocaleLowerCase();
      return terms.every((term) => searchable.includes(term));
    })
    .sort((a, b) => b.effective_from.localeCompare(a.effective_from))
    .slice(0, limit);
}