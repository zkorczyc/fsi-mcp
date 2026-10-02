import "dotenv/config";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Pool } from "pg";
import type { MarketProposition, MarketSignal } from "../src/market-signals/types.js";

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) throw new Error("Set DATABASE_URL in .env to your dedicated Neon database before seeding.");

const dataPath = (name: string) => resolve(process.cwd(), "data/synthetic", name);
const signals = JSON.parse(await readFile(dataPath("market-signals.json"), "utf8")) as MarketSignal[];
const propositions = JSON.parse(await readFile(dataPath("market-propositions.json"), "utf8")) as MarketProposition[];
const pool = new Pool({ connectionString: databaseUrl, max: 1 });

try {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("TRUNCATE market_signals, market_propositions");

    for (const signal of signals) {
      await client.query(
        `INSERT INTO market_signals
          (signal_id, market, country, product_category, product_subcategory, signal_type, title, summary, direction, impact, status, effective_from, effective_to, source, confidence)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [signal.signal_id, signal.market, signal.country, signal.product_category, signal.product_subcategory, signal.signal_type, signal.title, signal.summary, signal.direction, signal.impact, signal.status, signal.effective_from, signal.effective_to, signal.source, signal.confidence],
      );
    }

    for (const proposition of propositions) {
      await client.query(
        `INSERT INTO market_propositions
          (provider, market, country, product_category, product_subcategory, product_name, rate, primary_rate, rate_type, rate_direction, currency, fee, reward_rate, intro_offer, key_feature, effective_from, effective_to)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
        [proposition.provider, proposition.market, proposition.country, proposition.product_category, proposition.product_subcategory, proposition.product_name, proposition.primary_rate, proposition.rate_type, proposition.rate_direction, proposition.currency, proposition.fee, proposition.reward_rate, proposition.intro_offer, proposition.key_feature, proposition.effective_from, proposition.effective_to],
      );
    }

    await client.query("COMMIT");
    console.log(`Seeded ${signals.length} market signals and ${propositions.length} propositions.`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
} finally {
  await pool.end();
}