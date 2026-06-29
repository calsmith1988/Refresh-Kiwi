import { config } from "dotenv";
import { Agent, Cursor, CursorAgentError } from "@cursor/sdk";

config({ path: ".env.local" });

const apiKey = process.env.CURSOR_API_KEY?.trim();
const repoUrl = process.env.CURSOR_SITES_REPO_URL?.trim();

if (!apiKey) {
  console.error("CURSOR_API_KEY missing");
  process.exit(1);
}

if (!repoUrl) {
  console.error("CURSOR_SITES_REPO_URL missing");
  process.exit(1);
}

console.log("API key prefix:", apiKey.slice(0, 8) + "...");
console.log("Repo:", repoUrl);

try {
  const me = await Cursor.me({ apiKey });
  console.log("Cursor.me OK:", me.apiKeyName ?? "authenticated");
} catch (error) {
  console.error("Cursor.me FAILED:", error instanceof Error ? error.message : error);
  process.exit(1);
}

try {
  const repos = await Cursor.repositories.list({ apiKey });
  console.log(
    "Connected repos:",
    repos.map((r) => r.url ?? r.name ?? JSON.stringify(r)).join(", ") || "(none)",
  );
} catch (error) {
  console.error("Cursor.repositories.list FAILED:", error instanceof Error ? error.message : error);
}

console.log("Creating cloud agent (smoke test)...");

try {
  const agent = await Agent.create({
    apiKey,
    model: { id: "composer-2.5" },
    name: "Refresh Kiwi — smoke test",
    cloud: {
      repos: [{ url: repoUrl, startingRef: "main" }],
      workOnCurrentBranch: true,
      skipReviewerRequest: true,
    },
  });

  console.log("Agent.create OK, agentId:", agent.agentId);

  const run = await agent.send(
    "Reply with exactly the word PONG. Do not modify any files.",
  );

  console.log("agent.send OK, runId:", run.id);

  const result = await Promise.race([
    run.wait(),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Timed out after 120s")), 120_000),
    ),
  ]);

  console.log("run.wait OK, status:", result.status, "result:", result.result?.slice(0, 200));

  await agent.close();
} catch (error) {
  if (error instanceof CursorAgentError) {
    console.error("CursorAgentError:", error.message, "retryable:", error.isRetryable);
    if ("helpUrl" in error && error.helpUrl) {
      console.error("helpUrl:", error.helpUrl);
    }
  } else {
    console.error("FAILED:", error instanceof Error ? error.message : error);
  }
  process.exit(1);
}
