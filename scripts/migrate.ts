import "dotenv/config";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) throw new Error("Set DATABASE_URL in .env to your dedicated Neon database before migrating.");

const migrationDirectory = resolve(process.cwd(), "migrations");
const migrations = (await readdir(migrationDirectory))
  .filter((file) => file.endsWith(".sql"))
  .sort();
const pool = new Pool({ connectionString: databaseUrl, max: 1 });
try {
  for (const migration of migrations) {
    const sql = await readFile(resolve(migrationDirectory, migration), "utf8");
    await pool.query(sql);
    console.log(`Applied migrations/${migration}`);
  }
} finally {
  await pool.end();
}