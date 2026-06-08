import { Agent, CursorAgentError } from "@cursor/sdk";

import { getCursorApiKey, getSitesRepoUrl } from "@/lib/cursor/config";
import {
  buildAdditionalPagesPrompt,
  buildHomepagePrompt,
} from "@/lib/cursor/prompts";

const MODEL = { id: "composer-2.5" } as const;

function cloudOptions() {
  return {
    repos: [{ url: getSitesRepoUrl(), startingRef: "main" }],
    skipReviewerRequest: true,
  };
}

export async function runHomepagePhase(params: {
  sourceUrl: string;
  slug: string;
}): Promise<{ agentId: string; runId: string }> {
  const apiKey = getCursorApiKey();

  await using agent = await Agent.create({
    apiKey,
    model: MODEL,
    name: `Refresh Kiwi — ${params.slug} (homepage)`,
    cloud: cloudOptions(),
  });

  const run = await agent.send(buildHomepagePrompt(params));
  const result = await run.wait();

  if (result.status === "error") {
    throw new Error(`Homepage build failed (run ${result.id})`);
  }

  if (result.status === "cancelled") {
    throw new Error(`Homepage build was cancelled (run ${result.id})`);
  }

  return { agentId: agent.agentId, runId: result.id };
}

export async function runAdditionalPagesPhase(params: {
  sourceUrl: string;
  slug: string;
  agentId: string;
}): Promise<{ agentId: string; runId: string }> {
  const apiKey = getCursorApiKey();

  await using agent = await Agent.resume(params.agentId, {
    apiKey,
    model: MODEL,
    cloud: cloudOptions(),
  });

  const run = await agent.send(buildAdditionalPagesPrompt(params));
  const result = await run.wait();

  if (result.status === "error") {
    throw new Error(`Additional pages build failed (run ${result.id})`);
  }

  if (result.status === "cancelled") {
    throw new Error(`Additional pages build was cancelled (run ${result.id})`);
  }

  return { agentId: agent.agentId, runId: result.id };
}

export function isCursorStartupError(error: unknown): error is CursorAgentError {
  return error instanceof CursorAgentError;
}
