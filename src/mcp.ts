import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
    countMatchingAtms,
    findAtmAnomalies,
    findAtms,
    findNearestOperationalAtms,
    getAtmDetails,
    getAtmNetworkSummary,
} from "./atm-network/service.js";
import { getActiveMarketSignals, getMarketSignal, searchMarketSignals } from "./market-signals/service.js";
import { compareMarketPropositions } from "./propositions/service.js";

const category = z.enum(["savings", "credit_card", "mortgage"]);
const impact = z.enum(["low", "medium", "high"]);
const status = z.enum(["ACTIVE", "RECENT", "RESOLVED"]);
const atmStatus = z.enum(["ONLINE", "OUT_OF_SERVICE", "MAINTENANCE", "CASH_LOW", "CASH_EMPTY"]);
const atmLocationType = z.enum(["branch", "city_centre", "shopping_centre", "airport", "transit", "residential", "business_district"]);
const market = z.string().optional().describe("Market code, country code, or country name: US_RETAIL_BANKING / US / United States; UK_RETAIL_BANKING / GB / United Kingdom; DE_RETAIL_BANKING / DE / Germany; FR_RETAIL_BANKING / FR / France; IT_RETAIL_BANKING / IT / Italy.");

function result(value: Record<string, unknown>) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value) }],
    structuredContent: value,
  };
}

export function createMcpServer() {
  const server = new McpServer({ name: "SecurFinancial External Intelligence MCP", version: "2.0.0" });

  server.registerTool("get_active_market_signals", {
    title: "Get active market signals",
    description: "Return current synthetic retail-banking signals across the US, UK, Germany, France, and Italy. Filter by market, country, product category, signal type, or impact. Returns external facts only; it does not access customer profiles.",
    inputSchema: {
      market,
      country: z.string().optional(),
      product_category: category.optional(),
      product_subcategory: z.string().optional(),
      signal_type: z.string().optional(),
      impact: impact.optional(),
      limit: z.number().int().min(1).max(25).optional(),
    },
  }, async (input) => result({ signals: await getActiveMarketSignals(input) }));

  server.registerTool("get_market_signal", {
    title: "Get market signal details",
    description: "Retrieve one synthetic market signal by signal_id, including change, market, category and subcategory, impact, dates, source, and confidence.",
    inputSchema: { signal_id: z.string().min(1) },
  }, async ({ signal_id }) => {
    const signal = await getMarketSignal(signal_id);
    return result(signal ? { signal } : { signal: null, not_found: true });
  });

  server.registerTool("search_market_signals", {
    title: "Search market signals",
    description: "Search synthetic signals across the US, UK, Germany, France, and Italy using market, country, product/category, keywords, effective date range, impact, and status.",
    inputSchema: {
      market,
      country: z.string().optional(),
      product: z.string().optional(),
      product_category: category.optional(),
      product_subcategory: z.string().optional(),
      keyword: z.string().optional(),
      from_date: z.string().date().optional(),
      to_date: z.string().date().optional(),
      impact: impact.optional(),
      status: status.optional(),
      limit: z.number().int().min(1).max(25).optional(),
    },
  }, async (input) => result({ signals: await searchMarketSignals(input) }));

  server.registerTool("compare_market_propositions", {
    title: "Compare market propositions",
    description: "Compare SecurFinancial with current fictional competitors in a selected market and category. Market accepts a canonical code, country code, or country name. By default, only propositions with matching product subcategories are compared; set product_subcategory to select one explicitly. All terms are synthetic.",
    inputSchema: {
      market,
      product_category: category,
      product_subcategory: z.string().optional(),
      providers: z.array(z.string()).max(10).optional(),
    },
  }, async (input) => result(await compareMarketPropositions(input)));

  server.registerTool("get_atm_network_summary", {
    title: "Get ATM network summary",
    description: "Summarize synthetic SecurFinancial ATM status, withdrawal availability, and cash by currency globally or for a country/city. No customer or transaction data is included.",
    inputSchema: {
      country: z.string().optional(),
      city: z.string().optional(),
    },
  }, async (input) => result(getAtmNetworkSummary(input)));

  server.registerTool("find_atms", {
    title: "Find ATMs",
    description: "Find synthetic network ATMs by country, city, status, cash threshold, location type, or withdrawal/deposit capability.",
    inputSchema: {
      country: z.string().optional(),
      city: z.string().optional(),
      status: atmStatus.optional(),
      cash_below: z.number().nonnegative().optional(),
      location_type: atmLocationType.optional(),
      withdrawal_available: z.boolean().optional(),
      deposit_available: z.boolean().optional(),
      limit: z.number().int().min(1).max(50).optional(),
    },
  }, async (input) => result({ total_matches: countMatchingAtms(input), atms: findAtms(input) }));

  server.registerTool("get_atm_details", {
    title: "Get ATM details",
    description: "Retrieve a complete synthetic ATM record by atm_id, including status, cash, services, accessibility, coordinates, update time, and nearest operational ATM.",
    inputSchema: { atm_id: z.string().min(1) },
  }, async ({ atm_id }) => {
    const atm = getAtmDetails(atm_id);
    return result(atm ? { atm } : { atm: null, not_found: true });
  });

  server.registerTool("find_atm_anomalies", {
    title: "Find ATM network anomalies",
    description: "Calculate city-level availability gaps and low-cash concentrations from the synthetic ATM records. Findings are operational facts only and are not linked to customers or marketing recommendations.",
    inputSchema: {},
  }, async () => result(findAtmAnomalies()));

  server.registerTool("find_nearest_operational_atm", {
    title: "Find nearest operational ATM",
    description: "Find up to ten closest withdrawal-capable synthetic ATMs to an ATM ID or latitude/longitude. ATM-ID searches stay within the same country.",
    inputSchema: {
      atm_id: z.string().optional(),
      latitude: z.number().min(-90).max(90).optional(),
      longitude: z.number().min(-180).max(180).optional(),
      limit: z.number().int().min(1).max(10).optional(),
    },
  }, async (input) => result(findNearestOperationalAtms(input)));

  return server;
}