# SecurFinancial External Intelligence Demo Scenarios

All market signals, product propositions, ATM IDs, locations, cash balances, and operating states in these scenarios are fictional. The fixed demo date is 2026-10-02. The MCP supplies external/operational facts; Adobe supplies customer and activation context.

## Scenario A: Market Intelligence to Marketing Opportunity

Opening prompt:

> What has changed across our key retail banking markets recently that might create a marketing opportunity for us?

Expected discovery path:

1. Call `get_active_market_signals` without filters to sample the newest active facts across markets. For a category comparison, repeat with `product_category` and/or `market`.
2. Use `search_market_signals` or `get_market_signal` to inspect relevant facts and their source, confidence, effective date, category, and product subcategory.
3. Call `compare_market_propositions` for the selected market/category. By default, it returns only equivalent subcategories offered by SecurFinancial; optionally provide `product_subcategory` to focus the comparison.
4. Switch to Adobe customer/profile data to verify propensity, product ownership, consent, and market audience size. The MCP contains no customer counts.
5. Synthesize market attractiveness and Adobe opportunity as separate evidence. Treat any campaign recommendation as Coworker's interpretation, not an MCP output or a causal conclusion.
6. Continue campaign planning in Adobe only after validating the audience and relevant customer context.

Planted market stories:

| Market | External facts the MCP can expose | Adobe information to retrieve |
| --- | --- | --- |
| UK savings | SecurFinancial's fictional easy-access rate leads the sampled standard propositions; synthetic panel interest in flexible savings is rising. | The original demo brief suggests about 58,871 profiles with high new-account propensity and no savings account. Verify the count, consent, and eligibility in Adobe. |
| US credit cards | Fictional competitors have aggressive travel welcome bonuses, cashback promotions, lower APR, and longer balance-transfer offers with distinct conditions. | The brief cites about 58,599 profiles with card intent and no card, including about 28,339 in the stronger high-intent core. Validate these figures and audience criteria in Adobe. |
| Germany savings | Tagesgeld propositions have mixed conditions: one competitor is slightly above SecurFinancial's ongoing rate while another advertises a short teaser that falls below it afterward. | Retrieve German savings propensity, ownership gap, and consent from Adobe. No audience count is stored here. |
| France mortgages | Selected fictional prêt immobilier fixed rates moved lower. Duration, apport, and frais de dossier differ, so headline rates alone are not equivalent. | The demo brief cites about 35,145 profiles with strong mortgage-sales propensity and no mortgage. Verify the market scope and count in Adobe. |
| Italy savings | SecurFinancial's fictional ongoing flexible-deposit rate is above sampled standard rates, while a competitor's short introductory rate is temporarily higher. | Retrieve Italian savings propensity, ownership gap, and consent from Adobe. No audience count is stored here. |

These stories are deliberately not scored or ranked by the MCP. Customer counts above are supplied by the demo brief, are not held in MCP data, and must be checked against Adobe before use.

## Scenario B: ATM Intelligence to Customer Experience

Opening prompt:

> Check our global ATM network. Is there anything unusual I should know about?

Expected discovery path:

1. Call `find_atm_anomalies` to calculate outlier cities from ATM records rather than list all 250 ATMs.
2. Call `get_atm_network_summary` for a country or city to compare the local counts and availability with the global network.
3. Call `find_atms` to list affected ATM IDs and filter by status, cash, location, or available services.
4. Call `get_atm_details` for a specific unit, then `find_nearest_operational_atm` to find withdrawal-capable alternatives.
5. If asked about customer impact, inspect Adobe's existing customer and journey assets. Do not infer that any particular person visited or used an affected ATM.

Planted operational stories:

| City | Synthetic network facts | Expected interpretation |
| --- | --- | --- |
| Berlin, Germany | 18 ATMs; 7 are out of service or in maintenance, clustered in one demo-grid area. Other Berlin ATMs remain operational; the nearest alternatives are included in the fixture. | Strong availability anomaly relative to the global withdrawal-availability baseline. |
| London, UK | 30 ATMs; 5 are `CASH_LOW`, each with less than GBP 1,000. They remain withdrawal-capable, and the rest of the network is online. | Cash-capacity risk, not a broad outage. |
| Chicago, US | 16 ATMs; 3 are out of service or maintenance. | Moderate localized availability gap, below Berlin's severity. |
| Paris, France | 30 ATMs; one is out of service and one has no cash. | Limited local exceptions; does not cross the city anomaly thresholds. |
| Milan, Italy | 30 ATMs; all are online with adequate cash. | Healthy control market. |

The anomaly tool calculates city availability against the fixture-wide baseline and flags a gap of at least 10 percentage points with at least two unavailable ATMs. It separately flags a low-cash concentration at three or more ATMs and at least 15% of a city's network. Thresholds describe the demo's detection rule; they are not customer-impact or campaign conclusions.

## MCP and Adobe Responsibilities

MCP facts:

- Market signals, synthetic competitors/products, local rate semantics, and synthetic ATM operations.
- No customer profiles, audience membership, customer-level ATM activity, or transaction-to-profile linkage.
- No audience creation, journey authoring, campaign recommendation, or activation.

Adobe facts and actions:

- Propensity, product ownership, loyalty, consent, behavior, and market-eligible audience counts.
- Existing ATM-support assets discovered in the sandbox: `SecurFinancial - Subscribed to ATM Notification Service` (about 7,874 profiles) and the deployed `SecurFinancial - ATM Out of service Notification` journey.
- Customer-impact assessment, audience validation, campaign planning, and activation.

Do not recreate or modify the existing Adobe ATM assets as part of this MCP demo. Do not claim an ATM outage caused a customer behavior change based only on these data sources.

## Repeatability

- Market reference and ATM timestamps use `DEMO_DATE` in `src/config/demo.ts`.
- `npm run generate:atm` deterministically regenerates `data/synthetic/atm-network.json`.
- Local MCP runs read JSON fixtures directly.
- For a dedicated demo database, `npm run migrate && npm run seed` migrates and reloads only `market_signals` and `market_propositions`. It does not write ATM records or touch Adobe data.
