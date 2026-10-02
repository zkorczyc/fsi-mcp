import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import { host, port } from "./config/env.js";
import { createMcpServer } from "./mcp.js";



const app = express();
app.use(express.json({ limit: "64kb" }));
app.get("/health", (_request, response) => response.json({ status: "ok", name: "SecurFinancial External Intelligence MCP" }));
app.post("/mcp", async (request, response) => {


  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  const server = createMcpServer();
  response.on("close", () => void transport.close());
  try {
    await server.connect(transport);
    await transport.handleRequest(request, response, request.body);
  } catch (error) {
    console.error("MCP request failed", error);
    if (!response.headersSent) response.status(500).json({ error: "MCP request failed" });
  } finally {
    await server.close();
  }
});

app.listen(port, host, () => {
  console.log(`SecurFinancial External Intelligence MCP listening at http://${host}:${port}/mcp`);
});