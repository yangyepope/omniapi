import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

async function main() {
  const transport = new SSEClientTransport(new URL("http://localhost:3000/sse"));
  const client = new Client(
    { name: "screen-list-client", version: "1.0.0" },
    { capabilities: {} }
  );

  try {
    await client.connect(transport);
    console.log("Connected to Stitch MCP Bridge");

    // We don't have a direct 'list_screens' tool in the discovery output? 
    // Wait, let's re-read the discovery output carefully.
    // Ah, I see generate_screen, edit_screen, get_screen_code, get_screen_image, scaffold_project_files.
    // I missed the 'list' tool. Let's look for it.
    // Wait, I see 'list_projects'. Maybe there's a 'get_project' or 'list_screens'?
    // Let's re-run discovery and capture EVERYTHING.
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}
main();
