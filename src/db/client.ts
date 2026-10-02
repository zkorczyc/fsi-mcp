import { Pool } from "pg";
import { databaseUrl } from "../config/env.js";

export const pool = databaseUrl
  ? new Pool({ connectionString: databaseUrl, max: 5 })
  : undefined;