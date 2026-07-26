// Token-usage audit for Cursor cloud agents.
//
// Pulls the agent IDs we already store in the DB (homepage/pages builds and
// edits), asks Cursor's API for per-run token usage on each, and prints a
// breakdown so we can see which phase of which site is burning tokens.
//
// Usage:
//   node scripts/audit-agent-usage.mjs            # last 14 days
//   node scripts/audit-agent-usage.mjs --days 30  # further back
//
// Needs CURSOR_API_KEY and DATABASE_URL in .env.local (or the environment).
// Prints token counts only — never the API key.
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });
config({ path: ".env" });

const apiKey = process.env.CURSOR_API_KEY?.trim();
const dbUrl = process.env.DATABASE_URL;

if (!apiKey || !dbUrl) {
  console.error("CURSOR_API_KEY and DATABASE_URL must be set (.env.local).");
  process.exit(1);
}

const daysArgIndex = process.argv.indexOf("--days");
const days =
  daysArgIndex > -1 ? Number(process.argv[daysArgIndex + 1]) || 14 : 14;
const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

const connectionUrl = dbUrl.includes("sslmode")
  ? dbUrl
  : `${dbUrl}${dbUrl.includes("?") ? "&" : "?"}sslmode=require`;
const sql = postgres(connectionUrl, { connect_timeout: 15 });

async function fetchUsage(agentId) {
  const response = await fetch(
    `https://api.cursor.com/v1/agents/${encodeURIComponent(agentId)}/usage`,
    {
      headers: {
        Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`,
      },
    },
  );

  if (!response.ok) {
    return { error: `${response.status} ${response.statusText}` };
  }

  return response.json();
}

function formatTokens(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}m`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n ?? 0);
}

function usageLine(usage) {
  const cacheShare = usage.totalTokens
    ? Math.round((usage.cacheReadTokens / usage.totalTokens) * 100)
    : 0;
  return (
    `total=${formatTokens(usage.totalTokens)} ` +
    `(cacheRead=${formatTokens(usage.cacheReadTokens)} [${cacheShare}%], ` +
    `cacheWrite=${formatTokens(usage.cacheWriteTokens)}, ` +
    `input=${formatTokens(usage.inputTokens)}, ` +
    `output=${formatTokens(usage.outputTokens)})`
  );
}

try {
  const jobs = await sql`
    SELECT slug, generation_mode, created_at, homepage_agent_id, pages_agent_id
    FROM jobs
    WHERE created_at > ${since}
      AND (homepage_agent_id IS NOT NULL OR pages_agent_id IS NOT NULL)
    ORDER BY created_at DESC
    LIMIT 50
  `;

  const edits = await sql`
    SELECT e.agent_id, e.prompt, e.created_at, w.slug
    FROM edit_requests e
    JOIN websites w ON w.id = e.website_id
    WHERE e.created_at > ${since} AND e.agent_id IS NOT NULL
    ORDER BY e.created_at DESC
    LIMIT 50
  `;

  // One agent can back several rows (builds resume the homepage agent for
  // pages; edits resume it again), so group labels per agent ID.
  const agents = new Map();
  const addLabel = (agentId, label) => {
    if (!agentId) return;
    const entry = agents.get(agentId) ?? { labels: [] };
    entry.labels.push(label);
    agents.set(agentId, entry);
  };

  for (const job of jobs) {
    const day = job.created_at.toISOString().slice(0, 10);
    addLabel(
      job.homepage_agent_id,
      `${job.slug} homepage (${job.generation_mode}, ${day})`,
    );
    if (job.pages_agent_id && job.pages_agent_id !== job.homepage_agent_id) {
      addLabel(job.pages_agent_id, `${job.slug} pages (${day})`);
    }
  }

  for (const edit of edits) {
    const day = edit.created_at.toISOString().slice(0, 10);
    const promptPreview = edit.prompt.replaceAll("\n", " ").slice(0, 60);
    addLabel(edit.agent_id, `${edit.slug} edit "${promptPreview}" (${day})`);
  }

  if (agents.size === 0) {
    console.log(`No agent runs found in the last ${days} days.`);
    process.exit(0);
  }

  console.log(
    `Auditing ${agents.size} agents from the last ${days} days...\n`,
  );

  const results = [];
  for (const [agentId, entry] of agents) {
    const usage = await fetchUsage(agentId);
    results.push({ agentId, labels: entry.labels, usage });
  }

  results.sort(
    (a, b) =>
      (b.usage.totalUsage?.totalTokens ?? 0) -
      (a.usage.totalUsage?.totalTokens ?? 0),
  );

  const grand = {
    inputTokens: 0,
    outputTokens: 0,
    cacheWriteTokens: 0,
    cacheReadTokens: 0,
    totalTokens: 0,
  };

  for (const { agentId, labels, usage } of results) {
    console.log(`=== ${labels.join(" + ")}`);
    console.log(`    ${agentId}`);

    if (usage.error) {
      console.log(`    usage lookup failed: ${usage.error}\n`);
      continue;
    }

    console.log(`    ${usageLine(usage.totalUsage)}`);

    if (usage.runs.length > 1) {
      for (const run of usage.runs) {
        console.log(`      run ${run.id}: ${usageLine(run.usage)}`);
      }
    }

    for (const key of Object.keys(grand)) {
      grand[key] += usage.totalUsage[key] ?? 0;
    }
    console.log("");
  }

  console.log(`=== GRAND TOTAL (${results.length} agents)`);
  console.log(`    ${usageLine(grand)}`);
} finally {
  await sql.end();
}
