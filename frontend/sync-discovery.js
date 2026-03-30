import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import 'dotenv/config';

async function main() {
  console.log("Starting Stdio discovery...");
  const transport = new StdioClientTransport({
    command: "npx",
    args: ["stitch-mcp-server"],
    env: { ...process.env, STITCH_API_KEY: process.env.STITCH_API_KEY }
  });

  const client = new Client(
    { name: "discovery-client", version: "1.0.0" },
    { capabilities: {} }
  );

  try {
    // Connect with a long timeout (implicit in client.connect)
    await client.connect(transport);
    console.log("Connected to Stitch MCP Server via Stdio");

    const projectId = "553729816665366717";
    
    // We'll try to find any list or get tool that can give us screens
    const tools = await client.listTools();
    const toolNames = tools.tools.map(t => t.name);
    console.log("Available tools:", toolNames.join(", "));

    // Since list_projects was timeouting via SSE, let's try it via Stdio with 60s wait
    console.log("Calling list_projects (waiting up to 60s)...");
    const projects = await client.callTool("list_projects", {});
    console.log("Projects Result:", JSON.stringify(projects, null, 2));

    await transport.close();
  } catch (error) {
    console.error("Discovery Error:", error.message);
    process.exit(1);
  }
}

main();
