import "dotenv/config";

export const databaseUrl = process.env.DATABASE_URL?.trim() || undefined;
export const mcpApiKey = process.env.MCP_API_KEY?.trim() || undefined;
export const port = Number.parseInt(process.env.PORT || "3000", 10);
export const host = process.env.HOST || "0.0.0.0";

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be an integer between 1 and 65535");
}