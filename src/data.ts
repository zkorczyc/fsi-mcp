import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { AtmRecord } from "./atm-network/types.js";
import type { MarketProposition, MarketSignal } from "./market-signals/types.js";

const dataPath = (name: string) => resolve(process.cwd(), "data/synthetic", name);

export const fixtureSignals = JSON.parse(
  readFileSync(dataPath("market-signals.json"), "utf8"),
) as MarketSignal[];

export const fixturePropositions = JSON.parse(
  readFileSync(dataPath("market-propositions.json"), "utf8"),
) as MarketProposition[];

export const fixtureAtms = JSON.parse(
  readFileSync(dataPath("atm-network.json"), "utf8"),
) as AtmRecord[];