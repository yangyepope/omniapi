import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import express from "express";

const app = express();
app.use(express.json());
const port = process.env.PORT || 3000;

// Initialize the stdio client to the local Stitch server
const transport = new StdioClientTransport({
  command: "npx",
  args: ["stitch-mcp-server"],
  env: {
    STITCH_API_KEY: process.env.STITCH_API_KEY
  }
});

const client = new Client(
  { name: "sse-bridge", version: "1.0.0" },
  { capabilities: { tools: {}, resources: {} } }
);

async function main() {
  await client.connect(transport);
  console.log("Connected to local Stitch MCP server");

  const server = new Server(
    { name: "stitch-sse", version: "1.0.0" },
    { capabilities: { tools: {}, resources: {} } }
  );

  // Proxy tools
  server.setRequestHandler(
    ListToolsRequestSchema,
    async () => {
      return await client.listTools();
    }
  );

  server.setRequestHandler(
    CallToolRequestSchema,
    async (request) => {
      return await client.callTool(request.params.name, request.params.arguments);
    }
  );

  let sseTransport;

  app.get("/sse", async (req, res) => {
    console.log("New SSE connection");
    sseTransport = new SSEServerTransport("/post", res);
    await server.connect(sseTransport);
  });

  app.post("/post", async (req, res) => {
    if (sseTransport) {
      await sseTransport.handlePostMessage(req, res);
    }
  });

  app.listen(port, () => {
    console.log(`MCP SSE Bridge listening on port ${port}`);
    console.log(`SSE endpoint: http://localhost:${port}/sse`);
  });
}

main().catch(console.error);
