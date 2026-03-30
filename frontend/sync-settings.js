import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import 'dotenv/config';

async function main() {
  const transport = new StdioClientTransport({
    command: "npx",
    args: ["stitch-mcp-server"],
    env: { ...process.env, STITCH_API_KEY: process.env.STITCH_API_KEY }
  });

  const client = new Client(
    { name: "sync-settings-client", version: "1.0.0" },
    { capabilities: {} }
  );

  try {
    await client.connect(transport);
    console.log("Connected to Stitch MCP Server");

    const projectId = "553729816665366717";
    const prompt = "Current System Settings design with User Information, API Keys, and Password Change sections. Use Material Design 3 tokens.";

    console.log(`Requesting code for project ${projectId}...`);
    
    // Use generate_and_fetch_code as a fallback since list_projects was timing out
    const result = await client.callTool("generate_and_fetch_code", {
      projectId,
      prompt,
      deviceType: "DESKTOP"
    });

    console.log("Sync Result received.");
    console.log("--- START CODE ---");
    console.log(JSON.stringify(result, null, 2));
    console.log("--- END CODE ---");

    await transport.close();
  } catch (error) {
    console.error("Sync Error:", error.message);
    process.exit(1);
  }
}

main();
