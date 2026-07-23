import { Agent, CursorAgentError } from "@cursor/sdk";

import { getCursorApiKey } from "@/lib/cursor/config";
import { pickDesignDirection } from "@/lib/cursor/design-directions";
import {
  buildAdditionalPagesPrompt,
  buildCustomPagePrompt,
  buildEditPrompt,
  buildFreshHomepagePrompt,
  buildHomepagePrompt,
  buildLegalPagesPrompt,
  type PromptSeedAsset,
} from "@/lib/cursor/prompts";
import { RUN_TIMEOUTS, waitForRun } from "@/lib/cursor/run";
import type { RunResult } from "@cursor/sdk";

const MODEL = { id: "composer-2.5" } as const;

/**
 * The agent's closing message says what it actually did (committed, wrote
 * files, hit a blocker). Logging a snippet makes "finished but produced
 * nothing" failures diagnosable from worker logs alone.
 */
function logRunSummary(phase: string, slug: string, result: RunResult): void {
  const summary = result.result?.replace(/\s+/g, " ").trim();

  if (summary) {
    console.info(
      `[refresh-kiwi] ${phase} agent summary slug=${slug}: ${summary.slice(0, 400)}`,
    );
  }
}

function cloudOptions(repoUrl: string) {
  return {
    repos: [{ url: repoUrl, startingRef: "main" }],
    workOnCurrentBranch: true,
    skipReviewerRequest: true,
  };
}

export interface PhaseRunResult {
  agentId: string;
  runId: string;
}

async function disposeAgent(agent: Awaited<ReturnType<typeof Agent.create>>) {
  await agent.close();
}

export async function runHomepagePhase(
  params: {
    sourceUrl: string;
    slug: string;
    repoUrl: string;
  },
  onStarted?: (info: PhaseRunResult) => Promise<void>,
): Promise<PhaseRunResult> {
  const apiKey = getCursorApiKey();
  const agent = await Agent.create({
    apiKey,
    model: MODEL,
    name: `Refresh Kiwi — ${params.slug} (homepage)`,
    cloud: cloudOptions(params.repoUrl),
  });

  try {
    const run = await agent.send(buildHomepagePrompt(params));
    const started = { agentId: agent.agentId, runId: run.id };

    console.info(
      `[refresh-kiwi] homepage agent started agentId=${started.agentId} runId=${started.runId} slug=${params.slug} designDirection=${pickDesignDirection(params.slug).name}`,
    );

    await onStarted?.(started);

    const result = await waitForRun(run, RUN_TIMEOUTS.homepage);

    console.info(
      `[refresh-kiwi] homepage agent finished agentId=${started.agentId} runId=${result.id} status=${result.status}`,
    );
    logRunSummary("homepage", params.slug, result);

    if (result.status === "error") {
      throw new Error(`Homepage build failed (run ${result.id})`);
    }

    if (result.status === "cancelled") {
      throw new Error(`Homepage build was cancelled (run ${result.id})`);
    }

    return { agentId: started.agentId, runId: result.id };
  } finally {
    await disposeAgent(agent);
  }
}

export async function runFreshHomepagePhase(
  params: {
    creationPrompt: string;
    slug: string;
    seedAssets: PromptSeedAsset[];
    repoUrl: string;
  },
  onStarted?: (info: PhaseRunResult) => Promise<void>,
): Promise<PhaseRunResult> {
  const apiKey = getCursorApiKey();
  const agent = await Agent.create({
    apiKey,
    model: MODEL,
    name: `Refresh Kiwi — ${params.slug} (fresh homepage)`,
    cloud: cloudOptions(params.repoUrl),
  });

  try {
    const run = await agent.send(
      buildFreshHomepagePrompt({
        sourceUrl: null,
        generationMode: "fresh",
        creationPrompt: params.creationPrompt,
        slug: params.slug,
        seedAssets: params.seedAssets,
      }),
    );
    const started = { agentId: agent.agentId, runId: run.id };

    console.info(
      `[refresh-kiwi] fresh homepage agent started agentId=${started.agentId} runId=${started.runId} slug=${params.slug} designDirection=${pickDesignDirection(params.slug).name}`,
    );

    await onStarted?.(started);

    const result = await waitForRun(run, RUN_TIMEOUTS.homepage);

    console.info(
      `[refresh-kiwi] fresh homepage agent finished agentId=${started.agentId} runId=${result.id} status=${result.status}`,
    );
    logRunSummary("fresh homepage", params.slug, result);

    if (result.status === "error") {
      throw new Error(`Fresh homepage build failed (run ${result.id})`);
    }

    if (result.status === "cancelled") {
      throw new Error(`Fresh homepage build was cancelled (run ${result.id})`);
    }

    return { agentId: started.agentId, runId: result.id };
  } finally {
    await disposeAgent(agent);
  }
}

export async function runAdditionalPagesPhase(
  params: {
    sourceUrl: string | null;
    slug: string;
    repoUrl: string;
    agentId?: string | null;
    generationMode?: "refresh" | "fresh";
    creationPrompt?: string | null;
  },
  onStarted?: (info: PhaseRunResult) => Promise<void>,
): Promise<PhaseRunResult> {
  const apiKey = getCursorApiKey();
  const agent = params.agentId
    ? await Agent.resume(params.agentId, {
        apiKey,
        model: MODEL,
        cloud: cloudOptions(params.repoUrl),
      })
    : await Agent.create({
        apiKey,
        model: MODEL,
        name: `Refresh Kiwi — ${params.slug} (pages)`,
        cloud: cloudOptions(params.repoUrl),
      });

  try {
    const run = await agent.send(buildAdditionalPagesPrompt(params));
    const started = { agentId: agent.agentId, runId: run.id };

    console.info(
      `[refresh-kiwi] pages agent started agentId=${started.agentId} runId=${started.runId} slug=${params.slug}`,
    );

    await onStarted?.(started);

    const result = await waitForRun(run, RUN_TIMEOUTS.pages);

    console.info(
      `[refresh-kiwi] pages agent finished agentId=${started.agentId} runId=${result.id} status=${result.status}`,
    );

    if (result.status === "error") {
      throw new Error(`Additional pages build failed (run ${result.id})`);
    }

    if (result.status === "cancelled") {
      throw new Error(`Additional pages build was cancelled (run ${result.id})`);
    }

    return { agentId: started.agentId, runId: result.id };
  } finally {
    await disposeAgent(agent);
  }
}

export async function runCustomPagePhase(
  params: {
    sourceUrl: string | null;
    slug: string;
    repoUrl: string;
    agentId?: string | null;
    generationMode?: "refresh" | "fresh";
    creationPrompt?: string | null;
    title: string;
    brief: string;
  },
  onStarted?: (info: PhaseRunResult) => Promise<void>,
): Promise<PhaseRunResult> {
  const apiKey = getCursorApiKey();
  const agent = params.agentId
    ? await Agent.resume(params.agentId, {
        apiKey,
        model: MODEL,
        cloud: cloudOptions(params.repoUrl),
      })
    : await Agent.create({
        apiKey,
        model: MODEL,
        name: `Refresh Kiwi — ${params.slug} (custom page)`,
        cloud: cloudOptions(params.repoUrl),
      });

  try {
    const run = await agent.send(buildCustomPagePrompt(params));
    const started = { agentId: agent.agentId, runId: run.id };

    console.info(
      `[refresh-kiwi] custom page agent started agentId=${started.agentId} runId=${started.runId} slug=${params.slug}`,
    );

    await onStarted?.(started);

    const result = await waitForRun(run, RUN_TIMEOUTS.pages);

    console.info(
      `[refresh-kiwi] custom page agent finished agentId=${started.agentId} runId=${result.id} status=${result.status}`,
    );

    if (result.status === "error") {
      throw new Error(`Custom page build failed (run ${result.id})`);
    }

    if (result.status === "cancelled") {
      throw new Error(`Custom page build was cancelled (run ${result.id})`);
    }

    return { agentId: started.agentId, runId: result.id };
  } finally {
    await disposeAgent(agent);
  }
}

export async function runLegalPagesPhase(
  params: {
    sourceUrl: string | null;
    slug: string;
    repoUrl: string;
    agentId?: string | null;
    generationMode?: "refresh" | "fresh";
    creationPrompt?: string | null;
    legalDraft: string;
    existingLegalSummary: string;
  },
  onStarted?: (info: PhaseRunResult) => Promise<void>,
): Promise<PhaseRunResult> {
  const apiKey = getCursorApiKey();
  const agent = params.agentId
    ? await Agent.resume(params.agentId, {
        apiKey,
        model: MODEL,
        cloud: cloudOptions(params.repoUrl),
      })
    : await Agent.create({
        apiKey,
        model: MODEL,
        name: `Refresh Kiwi — ${params.slug} (legal pages)`,
        cloud: cloudOptions(params.repoUrl),
      });

  try {
    const run = await agent.send(buildLegalPagesPrompt(params));
    const started = { agentId: agent.agentId, runId: run.id };

    console.info(
      `[refresh-kiwi] legal pages agent started agentId=${started.agentId} runId=${started.runId} slug=${params.slug}`,
    );

    await onStarted?.(started);

    const result = await waitForRun(run, RUN_TIMEOUTS.legalPages);

    console.info(
      `[refresh-kiwi] legal pages agent finished agentId=${started.agentId} runId=${result.id} status=${result.status}`,
    );

    if (result.status === "error") {
      throw new Error(`Legal pages build failed (run ${result.id})`);
    }

    if (result.status === "cancelled") {
      throw new Error(`Legal pages build was cancelled (run ${result.id})`);
    }

    return { agentId: started.agentId, runId: result.id };
  } finally {
    await disposeAgent(agent);
  }
}

export async function runEditPhase(
  params: {
    sourceUrl: string | null;
    slug: string;
    repoUrl: string;
    editPrompt: string;
    generationMode?: "refresh" | "fresh";
    creationPrompt?: string | null;
    resumeAgentId?: string | null;
  },
  onStarted?: (info: PhaseRunResult) => Promise<void>,
): Promise<PhaseRunResult> {
  const apiKey = getCursorApiKey();

  // Resuming the agent that last worked on this site reuses its cloud
  // workspace (repo already cloned, site files already in context) instead of
  // paying full VM provisioning + clone cost for every small edit. Fall back
  // to a fresh agent when the old one is gone (archived/expired).
  let agent: Awaited<ReturnType<typeof Agent.create>> | null = null;

  if (params.resumeAgentId) {
    try {
      agent = await Agent.resume(params.resumeAgentId, {
        apiKey,
        model: MODEL,
        cloud: cloudOptions(params.repoUrl),
      });
      console.info(
        `[refresh-kiwi] edit agent resumed agentId=${params.resumeAgentId} slug=${params.slug}`,
      );
    } catch (error) {
      console.warn(
        `[refresh-kiwi] edit agent resume failed agentId=${params.resumeAgentId} slug=${params.slug}; creating a fresh agent: ${
          error instanceof Error ? error.message : error
        }`,
      );
    }
  }

  agent ??= await Agent.create({
    apiKey,
    model: MODEL,
    name: `Refresh Kiwi — ${params.slug} (edit)`,
    cloud: cloudOptions(params.repoUrl),
  });

  try {
    const run = await agent.send(buildEditPrompt(params));
    const started = { agentId: agent.agentId, runId: run.id };

    console.info(
      `[refresh-kiwi] edit agent started agentId=${started.agentId} runId=${started.runId} slug=${params.slug}`,
    );

    await onStarted?.(started);

    const result = await waitForRun(run, RUN_TIMEOUTS.edit);

    console.info(
      `[refresh-kiwi] edit agent finished agentId=${started.agentId} runId=${result.id} status=${result.status}`,
    );

    if (result.status === "error") {
      throw new Error(`Edit failed (run ${result.id})`);
    }

    if (result.status === "cancelled") {
      throw new Error(`Edit was cancelled (run ${result.id})`);
    }

    return { agentId: started.agentId, runId: result.id };
  } finally {
    await disposeAgent(agent);
  }
}

export function isCursorStartupError(error: unknown): error is CursorAgentError {
  return error instanceof CursorAgentError;
}
