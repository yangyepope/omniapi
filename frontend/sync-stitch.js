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
    { name: "sync-client", version: "1.0.0" },
    { capabilities: {} }
  );

  try {
    await client.connect(transport);
    console.log("Connected to Stitch MCP Server via Stdio");

    // Discover tools
    const tools = await client.listTools();
    console.log("Available tools:", tools.tools.map(t => t.name));

    // Try to list projects to verify
    const projectsResponse = await client.callTool("list_projects", {});
    console.log("Projects Response:", JSON.stringify(projectsResponse, null, 2));

    // If we can't find a list_screens tool, we might have to guess or use the provided project ID
    const projectId = "553729816665366717";
    
    // Check if there is a way to find screens for this project
    // Some implementations might have get_project_details
    if (tools.tools.find(t => t.name === 'list_screens')) {
        const screens = await client.callTool("list_screens", { projectId });
        console.log("Screens:", JSON.stringify(screens, null, 2));
    } else {
        console.log("No list_screens tool found. Attempting to find Screens in Project metadata if any.");
    }

    await transport.close();
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

main();
