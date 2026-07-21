// Temporary debug script: list raw artifacts for the failed homepage agents.
// Prints only artifact paths/sizes and run status — never the API key.
import { config } from "dotenv";
import { Agent } from "@cursor/sdk";

config({ path: ".env.local" });
config({ path: ".env" });

const apiKey = process.env.CURSOR_API_KEY?.trim();

if (!apiKey) {
  console.log("CURSOR_API_KEY not set locally — cannot query Cursor API.");
  process.exit(0);
}

const agentIds = [
  "bc-191f5477-6138-433b-b4c9-166ecb517bc7", // jpcarpentry-caerphilly-2
  "bc-9306926d-35de-4791-b288-f7dedda699d9", // hm-carpentry
];

for (const agentId of agentIds) {
  console.log(`\n=== ${agentId} ===`);
  try {
    const agent = await Agent.resume(agentId, { apiKey });
    const artifacts = await agent.listArtifacts();
    console.log(`raw artifact count: ${artifacts.length}`);
    for (const artifact of artifacts.slice(0, 30)) {
      console.log(`  ${artifact.path} (${artifact.sizeBytes} bytes, ${artifact.updatedAt})`);
    }
    await agent.close();
  } catch (error) {
    console.log("ERROR:", error instanceof Error ? error.message : error);
  }
}
