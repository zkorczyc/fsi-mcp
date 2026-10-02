import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import assert from "node:assert/strict";
import { test } from "node:test";
import {
    findAtmAnomalies,
    findAtms,
    findNearestOperationalAtms,
    getAtmDetails,
    getAtmNetworkSummary,
} from "../src/atm-network/service.js";
import { fixtureAtms, fixturePropositions, fixtureSignals } from "../src/data.js";
import { getActiveMarketSignals, searchMarketSignals } from "../src/market-signals/service.js";
import { createMcpServer } from "../src/mcp.js";
import { compareMarketPropositions } from "../src/propositions/service.js";

test("synthetic dataset has stable coverage and no audience records", () => {
  assert.equal(fixtureSignals.length, 45);
  assert.equal(fixturePropositions.length, 39);
  assert.equal(fixtureAtms.length, 250);
  assert.deepEqual(new Set(fixtureSignals.map((signal) => signal.product_category)), new Set(["savings", "credit_card", "mortgage"]));
  assert.deepEqual(new Set(fixtureSignals.map((signal) => signal.market)), new Set([
    "US_RETAIL_BANKING",
    "UK_RETAIL_BANKING",
    "DE_RETAIL_BANKING",
    "FR_RETAIL_BANKING",
    "IT_RETAIL_BANKING",
  ]));
  assert.ok(fixtureSignals.every((signal) => signal.source.includes("synthetic")));
  assert.ok(fixtureSignals.every((signal) => signal.confidence >= 0 && signal.confidence <= 1));
  assert.ok(fixtureSignals.every((signal) => signal.product_subcategory));
  assert.ok(fixturePropositions.every((item) => item.primary_rate > 0 && item.rate_type && item.rate_direction && item.currency));
  assert.ok(fixtureSignals.every((signal) => signal.country === ({
    US_RETAIL_BANKING: "US",
    UK_RETAIL_BANKING: "GB",
    DE_RETAIL_BANKING: "DE",
    FR_RETAIL_BANKING: "FR",
    IT_RETAIL_BANKING: "IT",
  } as Record<string, string>)[signal.market]));
  for (const market of ["US_RETAIL_BANKING", "UK_RETAIL_BANKING", "DE_RETAIL_BANKING", "FR_RETAIL_BANKING", "IT_RETAIL_BANKING"]) {
    const activeCount = fixtureSignals.filter((signal) => signal.market === market && signal.status === "ACTIVE").length;
    assert.ok(activeCount >= 5 && activeCount <= 8, `${market} has ${activeCount} active signals`);
  }
});

test("ATM network fixture is global and anomalies are calculated from records", () => {
  assert.deepEqual(new Set(fixtureAtms.map((atm) => atm.country)), new Set(["US", "GB", "DE", "FR", "IT"]));
  assert.ok(fixtureAtms.every((atm) => atm.nearest_operational_atm_id && atm.nearest_operational_atm_distance_km !== null));

  const berlin = getAtmNetworkSummary({ country: "Germany", city: "Berlin" });
  assert.equal(berlin.total_atms, 18);
  assert.equal(berlin.out_of_service + berlin.maintenance, 7);
  assert.equal(berlin.availability_percentage, 61.1);

  const londonLowCash = findAtms({ country: "GB", city: "London", status: "CASH_LOW", cash_below: 1_000 });
  assert.equal(londonLowCash.length, 5);
  assert.ok(londonLowCash.every((atm) => atm.currency === "GBP"));

  const anomalies = findAtmAnomalies();
  assert.ok(anomalies.anomalies.some((item) => item.city === "Berlin" && item.anomaly_type === "city_availability_gap"));
  assert.ok(anomalies.anomalies.some((item) => item.city === "London" && item.anomaly_type === "low_cash_concentration"));
  assert.ok(anomalies.anomalies.some((item) => item.city === "Chicago" && item.anomaly_type === "city_availability_gap"));
  assert.ok(!anomalies.anomalies.some((item) => item.city === "Paris" || item.city === "Milan"));

  const berlinAtm = getAtmDetails("ATM-DE-BER-003");
  assert.equal(berlinAtm?.status, "OUT_OF_SERVICE");
  const alternatives = findNearestOperationalAtms({ atm_id: "ATM-DE-BER-003" });
  assert.ok(alternatives.alternatives.length > 0);
  assert.equal(alternatives.alternatives[0].country, "DE");
});

test("global market aliases and proposition comparisons resolve locally", async () => {
  const unitedStates = await getActiveMarketSignals({ market: "United States", product_category: "credit_card" });
  assert.ok(unitedStates.length >= 5);
  assert.ok(unitedStates.every((signal) => signal.market === "US_RETAIL_BANKING"));

  const germany = await searchMarketSignals({ market: "Germany", product_category: "savings", status: "ACTIVE" });
  assert.ok(germany.length >= 5);
  assert.ok(germany.every((signal) => signal.country === "DE"));

  for (const market of ["UK", "Germany", "Italy"]) {
    const comparison = await compareMarketPropositions({ market, product_category: "savings" });
    assert.equal(comparison.propositions.filter((item) => item.provider === "SecurFinancial").length, 1);
    assert.ok(comparison.propositions.some((item) => item.provider !== "SecurFinancial"));
  }

  const france = await compareMarketPropositions({ market: "France", product_category: "mortgage" });
  assert.equal(france.market, "FR_RETAIL_BANKING");
  assert.match(france.comparison_note, /apport/);

  const usCards = await compareMarketPropositions({ market: "US", product_category: "credit_card" });
  assert.deepEqual(new Set(usCards.product_subcategory), new Set(["cashback", "rewards", "balance_transfer"]));
  assert.ok(usCards.propositions.some((item) => item.provider === "Redstone Financial"));
  const securGold = usCards.propositions.find((item) => item.product_name === "Secur Gold");
  const northstar = usCards.propositions.find((item) => item.product_name === "Northstar Premier Rewards");
  const redstone = usCards.propositions.find((item) => item.product_name === "Redstone Select Cash");
  const securCash = usCards.propositions.find((item) => item.product_name === "Secur Everyday Cash");
  assert.ok(securGold && northstar && redstone && securCash);
  assert.equal(securGold.product_subcategory, "rewards");
  assert.equal(northstar.product_subcategory, "rewards");
  assert.equal(securGold.fee, 95);
  assert.equal(northstar.fee, 195);
  assert.match(securGold.intro_offer, /25,000 points/);
  assert.match(northstar.intro_offer, /30,000 points/);
  assert.match(redstone.intro_offer, /3%.*then 0.5%/);
  assert.equal(redstone.reward_rate, 0.5);
  assert.equal(securCash.reward_rate, 1.5);
});

test("three planted stories surface deliberately different market contexts", async () => {
  const savings = await getActiveMarketSignals({ product_category: "savings" });
  assert.ok(savings.some((signal) => signal.direction === "favorable_for_securfinancial" && signal.impact === "high"));
  const cards = await searchMarketSignals({ product_category: "credit_card", keyword: "welcome bonus", impact: "high" });
  assert.ok(cards.some((signal) => signal.signal_id === "FSI-CARD-001"));
  const mortgages = await getActiveMarketSignals({ product_category: "mortgage" });
  assert.ok(mortgages.some((signal) => signal.signal_id === "FSI-MTG-001" && signal.direction === "rates_falling"));

  const savingsCompare = await compareMarketPropositions({ product_category: "savings" });
  assert.match(savingsCompare.comparison_note, /highest listed rate/);
  const cardCompare = await compareMarketPropositions({ product_category: "credit_card" });
  assert.match(cardCompare.comparison_note, /annual fee/);
  const mortgageCompare = await compareMarketPropositions({ product_category: "mortgage" });
  assert.match(mortgageCompare.comparison_note, /loan-to-value/);
});

test("global market opening query discovers all five markets and planted categories", async () => {
  const recent = await getActiveMarketSignals({ limit: 25 });
  assert.deepEqual(new Set(recent.map((signal) => signal.market)), new Set([
    "US_RETAIL_BANKING",
    "UK_RETAIL_BANKING",
    "DE_RETAIL_BANKING",
    "FR_RETAIL_BANKING",
    "IT_RETAIL_BANKING",
  ]));
  assert.ok(recent.some((signal) => signal.signal_id === "FSI-US-CARD-001"));
  assert.ok(recent.some((signal) => signal.signal_id === "FSI-DE-SAV-001"));
  assert.ok(recent.some((signal) => signal.signal_id === "FSI-FR-MTG-001"));
  assert.ok(recent.some((signal) => signal.signal_id === "FSI-IT-SAV-001"));
});

test("all nine MCP tools return structured, coherent responses", async () => {
  const server = createMcpServer();
  const client = new Client({ name: "fsi-market-signals-test", version: "1.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

  try {
    const tools = await client.listTools();
    assert.deepEqual(new Set(tools.tools.map((tool) => tool.name)), new Set([
      "get_active_market_signals",
      "get_market_signal",
      "search_market_signals",
      "compare_market_propositions",
      "get_atm_network_summary",
      "find_atms",
      "get_atm_details",
      "find_atm_anomalies",
      "find_nearest_operational_atm",
    ]));

    const active = await client.callTool({ name: "get_active_market_signals", arguments: { product_category: "savings" } });
    assert.ok(JSON.stringify(active.structuredContent).includes("FSI-SAV-001"));
    const detail = await client.callTool({ name: "get_market_signal", arguments: { signal_id: "FSI-CARD-001" } });
    assert.ok(JSON.stringify(detail.structuredContent).includes("30,000 points"));
    const search = await client.callTool({ name: "search_market_signals", arguments: { product: "mortgage", keyword: "rates", impact: "high" } });
    assert.ok(JSON.stringify(search.structuredContent).includes("FSI-MTG-001"));
    const compare = await client.callTool({ name: "compare_market_propositions", arguments: { product_category: "credit_card" } });
    assert.ok(JSON.stringify(compare.structuredContent).includes("SecurFinancial"));
    assert.ok(!JSON.stringify(compare.structuredContent).includes("real offers"));

    const usSignals = await client.callTool({ name: "get_active_market_signals", arguments: { market: "US", product_category: "credit_card" } });
    assert.ok(JSON.stringify(usSignals.structuredContent).includes("FSI-US-CARD-001"));
    const germanyCompare = await client.callTool({ name: "compare_market_propositions", arguments: { market: "Germany", product_category: "savings" } });
    assert.ok(JSON.stringify(germanyCompare.structuredContent).includes("MorgenKontor"));

    const berlinSummary = await client.callTool({ name: "get_atm_network_summary", arguments: { country: "DE", city: "Berlin" } });
    assert.ok(JSON.stringify(berlinSummary.structuredContent).includes('"total_atms":18'));
    const anomalies = await client.callTool({ name: "find_atm_anomalies", arguments: {} });
    assert.ok(JSON.stringify(anomalies.structuredContent).includes("low_cash_concentration"));
    const affected = await client.callTool({ name: "find_atms", arguments: { city: "Berlin", status: "OUT_OF_SERVICE" } });
    assert.ok(JSON.stringify(affected.structuredContent).includes("ATM-DE-BER"));
    const details = await client.callTool({ name: "get_atm_details", arguments: { atm_id: "ATM-DE-BER-003" } });
    assert.ok(JSON.stringify(details.structuredContent).includes("nearest_operational_atm_id"));
    const nearest = await client.callTool({ name: "find_nearest_operational_atm", arguments: { atm_id: "ATM-DE-BER-003" } });
    assert.ok(JSON.stringify(nearest.structuredContent).includes("ATM-DE-BER"));
  } finally {
    await client.close();
    await server.close();
  }
});