import { DEMO_DATE } from "../config/demo.js";
import { fixturePropositions } from "../data.js";
import { pool } from "../db/client.js";
import { canonicalMarket, marketMatches } from "../market-signals/market.js";
import type { MarketProposition, ProductCategory } from "../market-signals/types.js";


async function allPropositions(): Promise<MarketProposition[]> {
  if (!pool) return fixturePropositions;
  const { rows } = await pool.query<MarketProposition>(
    "SELECT provider, market, country, product_category, product_subcategory, product_name, primary_rate, rate_type, rate_direction, currency, fee, reward_rate, intro_offer, key_feature, effective_from::text, effective_to::text FROM market_propositions",
  );
  return rows;
}

export async function compareMarketPropositions(input: {
  product_category: ProductCategory;
  market?: string;
  product_subcategory?: string;
  providers?: string[];
}) {
  const market = canonicalMarket(input.market) ?? input.market ?? "UK_RETAIL_BANKING";
  const providerFilter = input.providers?.length ? new Set(input.providers) : undefined;
  const propositions = (await allPropositions())
    .filter((item) => item.product_category === input.product_category)
    .filter((item) => marketMatches(item.market, item.country, market))
    .filter((item) => item.provider === "SecurFinancial" || !providerFilter || providerFilter.has(item.provider))
    .filter((item) => !input.product_subcategory || item.product_subcategory === input.product_subcategory)
    .filter((item) => item.effective_from <= DEMO_DATE && (!item.effective_to || item.effective_to >= DEMO_DATE))
    .sort((a, b) => a.provider.localeCompare(b.provider));

  const ownProducts = propositions.filter((item) => item.provider === "SecurFinancial");
  const ownSubcategories = new Set(ownProducts.map((item) => item.product_subcategory));
  const equivalentPropositions = input.product_subcategory
    ? propositions
    : propositions.filter((item) => ownSubcategories.has(item.product_subcategory));
  const own = equivalentPropositions.find((item) => item.provider === "SecurFinancial");
  const competitors = equivalentPropositions.filter((item) => item.provider !== "SecurFinancial");
  let comparisonNote: string;
  if (input.product_category === "savings" && own && competitors.length) {
    const leadingRate = Math.max(...competitors.map((item) => item.primary_rate));
    comparisonNote = own.primary_rate >= leadingRate
      ? "SecurFinancial has the highest listed rate among these synthetic propositions."
      : `SecurFinancial is ${(leadingRate - own.primary_rate).toFixed(2)} percentage points below the highest listed competitor rate.`;
  } else if (input.product_category === "credit_card") {
    comparisonNote = "Offers differ on annual fee, reward rate, introductory bonus, spend threshold, and APR; compare eligibility and terms rather than treating one field as a complete value score.";
  } else if (input.product_category === "mortgage" && market === "FR_RETAIL_BANKING") {
    comparisonNote = "Selected French prêt immobilier rates span different fixed durations, apport levels, and frais de dossier; compare total borrowing terms rather than headline rates alone.";
  } else {
    comparisonNote = "Selected mortgage rates span different terms, loan-to-value tiers, and fees; headline rates alone are not directly comparable.";
  }

  return {
    market,
    product_category: input.product_category,
    reference_date: DEMO_DATE,
    product_subcategory: [...new Set(equivalentPropositions.map((item) => item.product_subcategory))],
    propositions: equivalentPropositions,
    comparison_note: comparisonNote,
    synthetic_data_notice: "All providers, products, and terms in this response are fictional demo data.",
  };
}