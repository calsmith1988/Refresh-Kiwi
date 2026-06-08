import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { Agent } from "@cursor/sdk";

import { getCursorApiKey } from "@/lib/cursor/config";
import { previewDirectory } from "@/lib/preview/paths";

export async function syncPreviewFromAgent(
  agentId: string,
  slug: string,
): Promise<void> {
  const apiKey = getCursorApiKey();
  const prefix = `sites/${slug}/`;
  const outputDir = previewDirectory(slug);

  await using agent = await Agent.resume(agentId, { apiKey });

  const artifacts = await agent.listArtifacts();
  const relevant = artifacts.filter(
    (artifact) =>
      artifact.path.startsWith(prefix) &&
      !artifact.path.endsWith("/") &&
      artifact.path !== prefix,
  );

  if (relevant.length === 0) {
    throw new Error(`No artifacts found under ${prefix}`);
  }

  for (const artifact of relevant) {
    const relativePath = artifact.path.slice(prefix.length);
    const destination = path.join(outputDir, relativePath);

    await mkdir(path.dirname(destination), { recursive: true });
    const buffer = await agent.downloadArtifact(artifact.path);
    await writeFile(destination, buffer);
  }
}
