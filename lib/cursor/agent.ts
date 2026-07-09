import { Agent, CursorAgentError } from "@cursor/sdk";

import { getCursorApiKey, getSitesRepoUrl } from "@/lib/cursor/config";
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

const MODEL = { id: "composer-2.5" } as const;

function cloudOptions() {
  return {
    repos: [{ url: getSitesRepoUrl(), startingRef: "main" }],
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
  },
  onStarted?: (info: PhaseRunResult) => Promise<void>,
): Promise<PhaseRunResult> {
  const apiKey = getCursorApiKey();
  const agent = await Agent.create({
    apiKey,
    model: MODEL,
    name: `Refresh Kiwi — ${params.slug} (homepage)`,
    cloud: cloudOptions(),
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
  },
  onStarted?: (info: PhaseRunResult) => Promise<void>,
): Promise<PhaseRunResult> {
  const apiKey = getCursorApiKey();
  const agent = await Agent.create({
    apiKey,
    model: MODEL,
    name: `Refresh Kiwi — ${params.slug} (fresh homepage)`,
    cloud: cloudOptions(),
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
        cloud: cloudOptions(),
      })
    : await Agent.create({
        apiKey,
        model: MODEL,
        name: `Refresh Kiwi — ${params.slug} (pages)`,
        cloud: cloudOptions(),
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
        cloud: cloudOptions(),
      })
    : await Agent.create({
        apiKey,
        model: MODEL,
        name: `Refresh Kiwi — ${params.slug} (custom page)`,
        cloud: cloudOptions(),
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
        cloud: cloudOptions(),
      })
    : await Agent.create({
        apiKey,
        model: MODEL,
        name: `Refresh Kiwi — ${params.slug} (legal pages)`,
        cloud: cloudOptions(),
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
    editPrompt: string;
    generationMode?: "refresh" | "fresh";
    creationPrompt?: string | null;
  },
  onStarted?: (info: PhaseRunResult) => Promise<void>,
): Promise<PhaseRunResult> {
  const apiKey = getCursorApiKey();
  const agent = await Agent.create({
    apiKey,
    model: MODEL,
    name: `Refresh Kiwi — ${params.slug} (edit)`,
    cloud: cloudOptions(),
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
