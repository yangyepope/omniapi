const { spawn } = require('child_process');

async function sync() {
  const projectId = "553729816665366717";
  const prompt = "System Settings design, including personal info, password change, and API keys. MD3 style.";
  
  const payload = {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: {
      name: "generate_and_fetch_code",
      arguments: {
        projectId,
        prompt,
        deviceType: "DESKTOP"
      }
    }
  };

  console.log("Starting raw Stdio sync with 5-minute timeout...");
  const child = spawn("npx", ["stitch-mcp-server"], {
    env: { ...process.env, STITCH_API_KEY: process.env.STITCH_API_KEY }
  });

  let output = "";
  child.stdout.on("data", (data) => {
    output += data.toString();
    console.log("Received data chunk...");
  });

  child.stderr.on("data", (data) => {
    console.error("STDERR:", data.toString());
  });

  child.stdin.write(JSON.stringify(payload) + "\n");

  const timeout = setTimeout(() => {
    console.log("Manual 5-minute timeout reached. Killing process.");
    child.kill();
  }, 300000);

  child.on("close", (code) => {
    clearTimeout(timeout);
    console.log(`Process closed with code ${code}`);
    console.log("--- FINAL OUTPUT ---");
    console.log(output);
    console.log("--- END ---");
  });
}

sync();
