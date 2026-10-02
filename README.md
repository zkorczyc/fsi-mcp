# SecurFinancial External Intelligence MCP

An intentionally small MCP server with two separate synthetic intelligence scenarios for Adobe Coworker: global retail-banking market changes and operational information about SecurFinancial's ATM network. Adobe remains the source of customer profiles, product ownership, propensity, consent, engagement, ATM audiences, and journeys. This project contains no customer records, ATM transactions, audiences, journeys, campaigns, or activation artifacts.

All providers, products, signals, sources, rates, offers, ATM records, addresses, and operational states in this repository are synthetic and are not claims about real institutions, locations, or conditions. The fixed demo date is **2026-10-02** so the scenarios are repeatable.

## Run Locally

Requires Node.js 20 or later.

```sh
npm install
npm test
npm run generate:atm
npm run build
npm start
```

`npm start` launches the MCP server over stdio for local MCP clients. With no `DATABASE_URL`, it reads the bundled JSON fixtures, so the tools work before Neon is configured. To use Neon, copy `.env.example` to `.env` and set `DATABASE_URL` to a **dedicated demo Neon database**, not another project's production database.

For a dedicated demo database, run:

```sh
npm run migrate
npm run seed
```

The market migrations create/update only `market_signals` and `market_propositions`. Seeding replaces rows in those two tables only. ATMs are served from a deterministic local JSON fixture and are not written to Neon. Never point this demo at a customer or production database.

## Remote MCP

Adobe Coworker needs a reachable Streamable HTTP MCP endpoint. Locally:

```sh
npm run start:http
```

- MCP endpoint: `http://localhost:3000/mcp`
- Health check: `http://localhost:3000/health`
- Set `MCP_API_KEY` and send `Authorization: Bearer <key>` for protected requests.
- Public deployments must set `NODE_ENV=production` and `MCP_API_KEY`.

`render.yaml` is a starter deployment blueprint. Add the dedicated Neon connection string and a generated API key as service secrets, deploy, then register the HTTPS `/mcp` URL with Coworker. Do not commit `.env` or paste credentials into source files.

The Render start command is `npm run start:render`, which runs the built Streamable HTTP server. If the Render dashboard has a manual start-command override, set it to the same command; do not use the stdio entrypoint `dist/src/index.js` for a web service.

## Tools

| Tool | Purpose |
| --- | --- |
| `get_active_market_signals` | Current `ACTIVE` signals; filters include market, country, category, type, and impact. |
| `get_market_signal` | One signal by `signal_id`, including category/subcategory, direction, impact, dates, synthetic source, and confidence. |
| `search_market_signals` | Search by market/country, product/category/subcategory, keyword, effective date range, impact, and status. |
| `compare_market_propositions` | Compare current fictional providers in one market/category. Default results include only subcategories also offered by SecurFinancial. |
| `get_atm_network_summary` | Status, withdrawal availability, and cash totals/averages by currency for the network or a country/city. |
| `find_atms` | Find records by country, city, status, cash threshold, location type, and available services. Results default to 20 and are capped at 50; `total_matches` reports the full filtered count. |
| `get_atm_details` | Retrieve the complete synthetic record for one ATM ID. |
| `find_atm_anomalies` | Calculate city availability gaps and low-cash concentrations from fixture records. |
| `find_nearest_operational_atm` | Find nearby withdrawal-capable alternatives by ATM ID or coordinates. |

Signal status is deliberately seeded rather than computed from today's date. Market proposition comparison uses the fixed demo date. ATM update times use the same date. Search dates use ISO `YYYY-MM-DD` strings. Country filters accept ISO country codes and common names.

## Global Market Coverage

| Market | Active signals | Planted condition | Comparison data |
| --- | ---: | --- | --- |
| `US_RETAIL_BANKING` (US) | 6 | A larger Northstar points bonus comes with a higher annual fee; Secur Gold has stronger ongoing points with a moderate bonus, while Redstone's cashback drops after its teaser period. | Secur Gold/Northstar are matched under `rewards`; Redstone is compared with SecurFinancial's `cashback` product. |
| `UK_RETAIL_BANKING` (GB) | 8 | SecurFinancial's selected flexible-savings proposition is relatively attractive; card and mortgage signals add context. | Existing UK savings, credit-card, and mortgage propositions. |
| `DE_RETAIL_BANKING` (DE) | 6 | Tagesgeld rates and short introductory periods create mixed deposit conditions. | SecurFinancial and two fictional Tagesgeld providers. |
| `FR_RETAIL_BANKING` (FR) | 6 | Selected prêt immobilier fixed rates have moved down, with competitors below SecurFinancial on sampled terms. | SecurFinancial and two fictional mortgage providers. |
| `IT_RETAIL_BANKING` (IT) | 6 | SecurFinancial leads selected ongoing flexible-deposit rates while a competitor advertises a short-lived higher teaser. | SecurFinancial and two fictional conto deposito providers. |

Market filters accept canonical codes, ISO country codes, and common country names, for example `DE_RETAIL_BANKING`, `DE`, or `Germany`. `compare_market_propositions` compares only propositions from the requested market; compare UK, Germany, and Italy savings by calling it once per market.

Useful comparison calls:

```json
{"market":"UK","product_category":"savings"}
{"market":"Germany","product_category":"savings"}
{"market":"Italy","product_category":"savings"}
{"market":"US","product_category":"credit_card","product_subcategory":"cashback"}
{"market":"France","product_category":"mortgage"}
```

## Example Calls

These are MCP `tools/call` arguments, not REST endpoints.

### `get_active_market_signals`

Request:

```json
{"product_category":"savings","limit":2}
```

Response excerpt:

```json
{"signals":[{"signal_id":"FSI-SAV-001","market":"UK_RETAIL_BANKING","country":"GB","product_category":"savings","product_subcategory":"easy_access","signal_type":"competitor_rate_change","title":"Two challenger banks trim top easy-access rates","direction":"favorable_for_securfinancial","impact":"high","status":"ACTIVE","effective_from":"2026-09-24","source":"MarketPulse (synthetic)","confidence":0.91}]}
```

### `get_market_signal`

Request:

```json
{"signal_id":"FSI-CARD-001"}
```

Response excerpt:

```json
{"signal":{"signal_id":"FSI-CARD-001","title":"Northstar launches a large travel-points welcome bonus","product_category":"credit_card","product_subcategory":"travel_rewards","summary":"Northstar's fictional card offers 30,000 points after eligible spend, with a £195 annual fee and 1.5 points per £1 ongoing.","impact":"high","status":"ACTIVE","source":"MarketPulse (synthetic)","confidence":0.93}}
```

### `search_market_signals`

Request:

```json
{"market":"France","product":"mortgage","keyword":"fixed","from_date":"2026-09-01","impact":"high","limit":5}
```

Response excerpt:

```json
{"signals":[{"signal_id":"FSI-FR-MTG-001","title":"Montclair lowers its 20-year fixed mortgage rate","product_subcategory":"purchase_fixed_20yr","direction":"more_competitive","impact":"high","effective_from":"2026-09-28","source":"MarketPulse (synthetic)"}]}
```

### `compare_market_propositions`

Request:

```json
{"market":"US","product_category":"credit_card","product_subcategory":"rewards"}
```

Response excerpt:

```json
{"market":"US_RETAIL_BANKING","product_category":"credit_card","product_subcategory":["rewards"],"reference_date":"2026-10-02","propositions":[{"provider":"SecurFinancial","product_name":"Secur Gold","fee":95,"reward_rate":2,"intro_offer":"25,000 points after $3,000 eligible spend in 3 months","product_subcategory":"rewards"},{"provider":"Northstar","product_name":"Northstar Premier Rewards","fee":195,"reward_rate":1.5,"intro_offer":"30,000 points after $3,000 eligible spend in 3 months","product_subcategory":"rewards"}],"comparison_note":"Offers differ on annual fee, reward rate, introductory bonus, spend threshold, and APR; compare eligibility and terms rather than treating one field as a complete value score."}
```

## Planted Demo Stories

| Market/story | External market evidence | Adobe handoff |
| --- | --- | --- |
| UK savings | Selected SecurFinancial easy-access rate leads the sampled propositions; flexible-savings interest is rising. | The original demo brief cites about **58,871** profiles with high new-account propensity and no savings account. Verify this count in Adobe before assessing an acquisition opportunity. |
| US credit cards | Northstar's fictional 30,000-point offer has a $195 annual fee; Secur Gold offers 25,000 points, 2 points per dollar ongoing, and a $95 fee. Redstone's 3% introductory cash back falls to 0.5%, below SecurFinancial's 1.5% ongoing cash back. | The demo's Adobe opportunity is **70,277** profiles with card intent and no card. Validate audience criteria, consent, and the count in Adobe. The competitor headline is stronger, but not universally better value. |
| Germany savings | Tagesgeld rates and short promotional periods are diverging; the best ongoing rate is not necessarily the best introductory rate. | Query Adobe for the relevant German-market savings propensity and ownership gap. No audience count is stored here. |
| France mortgages | Selected fixed-rate prêt immobilier offers have moved lower; terms, apport, and frais de dossier differ. | Query Adobe for French-market mortgage propensity and ownership data before assessing the opportunity. No audience count is stored here. |
| Italy savings | The selected SecurFinancial ongoing rate leads, while a competitor's temporary rate is higher for three months. | Query Adobe for Italian-market savings propensity and ownership data; distinguish introductory response from sustained proposition value. No audience count is stored here. |

The cited UK audience figures come from the demo brief and are not stored or verified by this MCP. Retrieve market-specific counts from Adobe customer data. Treat external signals and customer counts as separate evidence; neither establishes that a signal caused customer intent. The next campaign-planning step belongs in Adobe marketing capabilities, not here.

## Dataset and Reset

- `data/synthetic/market-signals.json`: 45 authored signals across five markets (8 active UK signals, plus 6 active signals and one historical signal in each added market).
- `data/synthetic/market-propositions.json`: 39 authored propositions with market, product subcategory, currency, and explicit primary-rate semantics.
- `data/synthetic/atm-network.json`: 250 generated ATM records, 50 per country.
- `scripts/generate-atm-network.ts`: deterministic generator for the ATM fixture.
- `scripts/seed.ts`: reloads the market JSON files into the two Neon tables in one transaction.

To regenerate the repeatable ATM file, run `npm run generate:atm`. To migrate and reload market data in a dedicated demo database, confirm `DATABASE_URL` points to that database, then run `npm run migrate && npm run seed`. Seeding truncates and reloads only `market_signals` and `market_propositions`; it does not touch ATM data, Adobe, customer records, or other tables. Fixture-only local runs use JSON files directly.

## Coworker Demo Sequence

1. Market story: ask what changed across retail markets; Coworker calls the market tools, then checks product ownership and propensity in Adobe. Keep external signals and Adobe audience counts as separate evidence.
2. ATM story: ask whether the global ATM network has anomalies; Coworker calls `find_atm_anomalies`, drills into Berlin with `find_atms`/`get_atm_details`, then checks nearest alternatives.
3. For customer impact or existing ATM support, Coworker inspects Adobe's customer data and existing ATM notification assets. The MCP has no transaction-to-customer linkage and creates no audiences or journeys.
4. Use [DEMO_SCENARIOS.md](DEMO_SCENARIOS.md) for planted facts, expected tool sequences, and the boundary between MCP and Adobe information.

## ATM Tool Examples

`get_atm_network_summary` request and response excerpt:

```json
{"country":"Germany","city":"Berlin"}
{"total_atms":18,"online":11,"out_of_service":5,"maintenance":2,"availability_percentage":61.1,"cash_available_by_currency":{"EUR":{"total":332415,"average":18467.5}}}
```

`find_atms` request and response excerpt:

```json
{"country":"DE","city":"Berlin","status":"OUT_OF_SERVICE"}
{"atms":[{"atm_id":"ATM-DE-BER-003","address":"Demo grid 03, Berlin","status":"OUT_OF_SERVICE","currency":"EUR"}]}
```

`get_atm_details` request and response excerpt:

```json
{"atm_id":"ATM-DE-BER-003"}
{"atm":{"atm_id":"ATM-DE-BER-003","country":"DE","city":"Berlin","status":"OUT_OF_SERVICE","withdrawal_available":false,"nearest_operational_atm_id":"ATM-DE-BER-011","nearest_operational_atm_distance_km":0.7}}
```

`find_atm_anomalies` request and response excerpt:

```json
{}
{"network_availability_percentage":95.2,"anomaly_count":3,"anomalies":[{"anomaly_type":"city_availability_gap","severity":"high","country":"DE","city":"Berlin","total_atms":18,"unavailable_count":7,"availability_percentage":61.1},{"anomaly_type":"city_availability_gap","severity":"medium","country":"US","city":"Chicago","total_atms":16,"unavailable_count":3,"availability_percentage":81.3},{"anomaly_type":"low_cash_concentration","severity":"medium","country":"GB","city":"London","total_atms":30,"low_cash_count":5}]}
```

`find_nearest_operational_atm` request and response excerpt:

```json
{"atm_id":"ATM-DE-BER-003"}
{"origin_atm_id":"ATM-DE-BER-003","alternatives":[{"atm_id":"ATM-DE-BER-011","city":"Berlin","status":"ONLINE","distance_km":0.7}]}
```