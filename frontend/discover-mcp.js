import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

async function main() {
  const transport = new SSEClientTransport(new URL("http://localhost:3000/sse"));
  const client = new Client(
    { name: "discovery-client", version: "1.0.0" },
    { capabilities: {} }
  );

  try {
    await client.connect(transport);
    console.log("Connected to Stitch MCP Bridge");

    const tools = await client.listTools();
    console.log("Available Tools:");
    console.log(JSON.stringify(tools, null, 2));

    await transport.close();
  } catch (error) {
    console.error("Failed to connect or list tools:", error.message);
    process.exit(1);
  }
}

main();
