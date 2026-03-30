import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import 'dotenv/config';

async function main() {
  console.log("Starting Long-Timeout Sync...");
  const transport = new StdioClientTransport({
    command: "npx",
    args: ["stitch-mcp-server"],
    env: { ...process.env, STITCH_API_KEY: process.env.STITCH_API_KEY }
  });

  const client = new Client(
    { name: "sync-settings-long", version: "1.0.0" },
    { capabilities: {} }
  );

  try {
    await client.connect(transport);
    console.log("Connected to Stitch MCP Server via Stdio");

    const projectId = "553729816665366717";
    const prompt = "System Settings design, including personal info, password change, and API keys. MD3 style.";

    console.log(`Calling generate_and_fetch_code (waiting up to 150s)...`);
    // Some MCP clients allow timeout per call. 
    // We'll wrap it in a custom promise if needed, but SDK callTool should handle it if server does.
    const result = await client.callTool("generate_and_fetch_code", {
      projectId,
      prompt,
      deviceType: "DESKTOP"
    });

    console.log("--- RESULT ---");
    console.log(JSON.stringify(result, null, 2));
    console.log("--- END ---");

    await transport.close();
  } catch (error) {
    console.error("Sync Error:", error.message);
    process.exit(1);
  }
}

main();
