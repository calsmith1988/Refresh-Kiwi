# Refresh Kiwi

Refresh Kiwi is a Next.js SaaS app for generating small-business website previews with AI.

Users can either:

- paste an existing website URL to get a refreshed version, or
- find their Google Business Profile listing when they do not have a website, or
- describe a new site and optionally upload images/logo assets.

The app stores jobs in Postgres, runs Cursor cloud agents to generate static website files in a separate sites repo, syncs those files into local preview storage and Cloudflare R2, then lets users claim, edit, publish, and connect custom domains for the generated sites.

This README is written primarily for future AI coding agents. It intentionally skips basic dependency/setup instructions and focuses on project shape, important flows, and maintenance cautions.

## Product model

The core user journey is:

1. User starts a refresh or fresh-site generation from the landing page.
2. A job is created in the database.
3. A durable `background_tasks` row is queued in Postgres.
4. A Render worker service claims the task and starts a Cursor cloud agent.
5. The Cursor agent writes generated site files under `sites/{slug}/` in the site's own GitHub repo (`site-{slug}`, created per job by `lib/github/repos.ts`). Sites built before per-site repos have `jobs.sites_repo_url = NULL` and live in the shared `CURSOR_SITES_REPO_URL` repo instead.
6. Refresh Kiwi syncs those files into `/previews/{slug}` and Cloudflare R2.
7. The preview is served from `/preview/{slug}/...`.
8. Users can claim the site, request edits, generate pages, upload/remix images, upgrade to Pro, publish, and connect a custom domain.

Long-running work is handled by a separate Render worker process. API routes enqueue durable background tasks and return quickly; the worker runs Cursor agents, syncs previews, captures screenshots, localises images, and handles page/edit/publish follow-up work.

## Major subsystems

### App routes

- `app/page.tsx` - landing page entry point.
- `components/RefreshPage.tsx` - main landing-page client component and generation UX.
- `app/dashboard/page.tsx` - large client dashboard for website management.
- `app/preview/[slug]/[[...path]]/route.ts` - serves generated preview files.
- `app/custom-domain/[[...path]]/route.ts` - serves published sites on custom domains.
- `middleware.ts` - redirects signed-out dashboard visitors and rewrites non-app hosts to custom-domain serving.

### API routes

Important API entry points:

- `app/api/refresh/route.ts` - creates URL-refresh jobs.
- `app/api/fresh/route.ts` - creates prompt-based fresh-site jobs.
- `app/api/places/**` and `app/api/import/gbp/route.ts` - Google Business Profile search/details/import via Places API.
- `app/api/refresh/[jobId]/route.ts` - polls job status.
- `app/api/websites/**` - website ownership, edits, images, pages, publishing, screenshots, and domains.
- `app/api/auth/**` and `app/api/account/**` - custom auth/account flows.
- `app/api/stripe/**` - checkout, billing portal, and webhook handling.
- `app/api/cron/lifecycle-emails/route.ts` - lifecycle email cron endpoint.

Most route handlers delegate business logic to `lib/*` modules. Keep route handlers thin where possible.

### Job generation pipeline

Core files:

- `lib/jobs/service.ts` - creates jobs, normalizes job responses, cancellation/failure helpers.
- `lib/jobs/processor.ts` - runs homepage generation and initial preview sync.
- `lib/pages/processor.ts` - generates additional and legal pages.
- `lib/edits/processor.ts` - handles user-requested AI edits.
- `lib/worker/queue.ts` - durable Postgres queue helpers and stale-task recovery.
- `worker/index.ts` - Render worker process entry point.
- `lib/cursor/agent.ts` - creates/resumes Cursor cloud agents.
- `lib/cursor/prompts.ts` - prompts sent to Cursor agents.
- `lib/cursor/run.ts` - waits for Cursor runs with timeouts.
- `lib/preview/sync.ts` - syncs generated files from Cursor artifacts or GitHub.
- `lib/preview/serve.ts` - reads preview files from local disk, R2, then GitHub fallback.

The Cursor agent model is currently hardcoded in `lib/cursor/agent.ts`.

Generated sites are expected under:

```text
sites/{slug}/
```

The local mirror is:

```text
previews/{slug}/
```

`/previews` is intentionally ignored by git.

### Database

Database schema lives in:

```text
lib/db/schema.ts
```

Drizzle migrations live in:

```text
drizzle/
```

Important tables:

- `users`
- `sessions`
- auth token/challenge tables
- `jobs`
- `websites`
- `jobPages`
- `editRequests`
- `emailEvents`
- `backgroundTasks`

Important statuses:

- jobs: `queued`, `analyzing`, `building_homepage`, `homepage_ready`, `building_pages`, `complete`, `failed`
- websites: `preview`, `live`, `expired`, `archived`
- generation modes: `refresh`, `fresh`
- plans: `free`, `pro`
- background tasks: `queued`, `running`, `complete`, `failed`

Be careful with migration edits. Existing migrations may already be applied in production.

### Auth and accounts

Auth is custom, not NextAuth.

Core files:

- `lib/auth/service.ts`
- `lib/auth/session.ts`
- `lib/auth/tokens.ts`
- `lib/auth/twoFactor.ts`
- `lib/auth/password.ts`
- `lib/auth/rateLimit.ts`

Session cookie:

```text
refresh_kiwi_session
```

Session tokens are random values stored client-side as cookies and stored server-side as SHA-256 hashes.

### Website lifecycle

Core file:

```text
lib/websites/service.ts
```

Important business rules:

- previews expire after 7 days.
- free users can save 1 website.
- Pro users can save 3 websites.
- free edit limit defaults to 3.
- Pro status is based on both `plan = "pro"` and an active/trialing subscription status.

Changing these rules affects product limits, dashboard behavior, and billing assumptions.

### Storage and generated files

Core files:

- `lib/storage/r2.ts`
- `lib/preview/paths.ts`
- `lib/preview/sync.ts`
- `lib/preview/serve.ts`
- `lib/assets/*`

Preview serving checks sources in this broad order:

1. local `/previews/{slug}`
2. Cloudflare R2
3. GitHub contents fallback from the site's repo (per-site repo when the job has one, else `CURSOR_SITES_REPO_URL`)

R2 is accessed through a custom S3-compatible SigV4 implementation, not an AWS SDK dependency.

### Images

Core files:

- `lib/assets/localize.ts`
- `lib/assets/seed.ts`
- `lib/assets/optimize.ts`
- `lib/assets/remix.ts`
- `lib/assets/generate.ts`
- `lib/assets/placement.ts`

Image functionality includes:

- localizing generated-site images into controlled storage,
- user image uploads,
- AI image generation,
- image remixing,
- image replacement/revert history,
- placement instructions for generated edits.

### Google Business Profile imports

Core files:

- `lib/google/places.ts`
- `lib/google/brief.ts`
- `app/api/places/search/route.ts`
- `app/api/places/details/route.ts`
- `app/api/import/gbp/route.ts`

This flow uses the official Google Places API (New), not scraping. The landing
page keeps one Refresh input: URL-looking text goes through `/api/refresh`, while
business-name text searches Google listings and lets the user confirm details and
select photos.

GBP imports are stored as `generationMode = "fresh"` jobs. The imported listing
data becomes `creationPrompt`, selected Google photos are downloaded and seeded
through `seedWebsiteAssets`, and the existing `fresh-homepage` worker task builds
the site. Keep it this way so later edit/page flows use the brief and local
assets instead of trying to crawl Google Maps pages.

Manual Google Cloud setup:

1. Create or choose a Google Cloud project.
2. Enable billing and **Places API (New)**.
3. Create an API key restricted to Places API (New).
4. Set `GOOGLE_PLACES_API_KEY` on the web service.
5. Add quota caps and a budget alert. The worker does not need this key.

### Admin dashboard

Core files:

- `app/admin/page.tsx` + `components/AdminDashboard.tsx` - internal admin UI.
- `app/api/admin/**` - admin-only API routes.
- `lib/admin/guard.ts` - access control (ADMIN_EMAILS allowlist + verified email; 2FA required in production).
- `lib/admin/service.ts` - stats/funnel/list queries.
- `lib/admin/audit.ts` - `admin_audit_log` writes; every mutating admin action is recorded.

Capabilities: performance stats (builds/signups/edits, attribution by `utm_source`), user and website lookup, rename/extend-expiry/reset-edits, applying edits on a customer's behalf (attributed to the admin user, consumes no customer quota), cancel-at-period-end for subscriptions, and Render custom-domain reconciliation (flags and removes orphaned domains). Non-admins get a 404.

Marketing attribution (`utm_source`/`utm_medium`/`utm_campaign`/external referrer) is captured client-side on the landing page and stored on `jobs` at creation time.

### Billing

Core files:

- `lib/stripe/service.ts`
- `lib/stripe/config.ts`
- `app/api/stripe/checkout/route.ts`
- `app/api/stripe/portal/route.ts`
- `app/api/stripe/webhook/route.ts`

Stripe webhook updates can flip users between free/pro and update website publish states. Treat billing changes as high-risk.

### Email and lifecycle events

Core files:

- `lib/email/service.ts`
- `lib/email/events.ts`
- `lib/email/unsubscribe.ts`
- `app/api/cron/lifecycle-emails/route.ts`

Emails are sent through Resend. If Resend is not configured, sends are skipped with a warning.

`emailEvents` is used to dedupe event-triggered emails.

### Custom domains

Core files:

- `lib/render/domains.ts`
- `app/api/websites/[websiteId]/domain/route.ts`
- `middleware.ts`
- `app/custom-domain/[[...path]]/route.ts`

Render custom domains are managed through the Render API. Middleware decides whether an incoming host is the Refresh Kiwi app or a customer domain.

## Worker service

The web service handles user-facing traffic only: API validation, auth, dashboard rendering, polling, billing, and preview serving.

The worker service runs with:

```bash
npm run worker
```

Deploy it as a Render Background Worker with the same environment variables as the web service. It needs access to Postgres, Cursor, the generated-sites GitHub repo, R2, OpenAI, Resend, and `NEXT_PUBLIC_APP_URL` so screenshots can call the live web service.

The worker currently processes one task at a time. Tune these optional variables only after observing production behaviour:

```text
WORKER_IDLE_SLEEP_MS=5000
WORKER_RECOVERY_INTERVAL_MS=60000
```

Do not reintroduce Next.js `after()` for long-running work. Enqueue a `background_tasks` row instead.

## Cron jobs

Two Render cron jobs POST to the app with the `CRON_SECRET` bearer token:

- `/api/cron/check-domains` - verifies pending custom domains.
- `/api/cron/lifecycle-emails` - sends the 24-hour free-plan follow-up.

Optional post-deploy (or manual) IndexNow ping for **refresh.kiwi marketing URLs only** (Bing, Yandex, etc. — not Google):

- `/api/cron/indexnow` - POST the current marketing sitemap URL list to IndexNow.
- Key file: `https://refresh.kiwi/e3f5de666e3b58ee2dcff3f763dbddd8.txt` (plain text, public).
- Local/script alternative: `INDEXNOW_SUBMIT=1 npx tsx scripts/submit-indexnow.ts`

They live in the Render dashboard, not in this repo, so keep these commands in
sync there:

```bash
curl -fsS -X POST "$NEXT_PUBLIC_APP_URL/api/cron/check-domains" \
  -H "Authorization: Bearer $CRON_SECRET" \
  --connect-timeout 15 --max-time 180 \
  --retry 5 --retry-delay 30 --retry-connrefused

# After a marketing deploy (optional — run manually or as a one-off Render cron):
curl -fsS -X POST "$NEXT_PUBLIC_APP_URL/api/cron/indexnow" \
  -H "Authorization: Bearer $CRON_SECRET" \
  --connect-timeout 15 --max-time 60
```

The retry flags matter: without them a brief window where the app is
unreachable makes `curl` hang for ~2 minutes and then exit 28, which sends a
false-alarm failure email. Both endpoints take an advisory lock and dedupe
their side effects (`sendOnce`, and no DB write for still-pending domains), so
a skipped or retried run is harmless — the next run picks up the same
candidates.

## External services

This app depends on several external systems:

- Cursor cloud agents - generated site creation.
- Google Places API (New) - Google Business Profile search/import.
- External generated-sites GitHub repo - stores `sites/{slug}/` outputs.
- Postgres - application data.
- Cloudflare R2 - durable preview and asset storage.
- Render - app hosting and custom domain management.
- Stripe - Pro subscriptions.
- Resend - transactional emails.
- OpenAI - image generation/remix and legal-page drafting.
- Meta/Google Analytics - tracking and conversion events.
- Optional Redis-compatible rate limiting - falls back to memory locally.

The complete environment variable list is in `.env.example`.

## Code style and conventions

- TypeScript strict mode is enabled.
- Import alias `@/*` maps to the repository root.
- API routes generally use `export const runtime = "nodejs"`.
- Prefer keeping business logic in `lib/*` and route handlers as orchestration.
- Avoid broad refactors in `components/RefreshPage.tsx` and `app/dashboard/page.tsx` unless the task is specifically about UI decomposition; both are large, stateful client components.
- Generated customer preview files must not be committed.
- Do not treat `/site-template` as part of this repo; `.gitignore` says it lives in the separate generated-sites repo.

## Known gaps and sharp edges

These are context notes for future agents, not necessarily urgent bugs:

- There was no README before this file.
- No automated test suite is configured beyond manual smoke scripts in `scripts/`.
- No GitHub Actions workflow was found.
- Drizzle SQL migrations exist through `0005`, while `drizzle/meta/_journal.json` currently lists entries through `0003`; inspect database migration state carefully before changing migration metadata.
- The landing component imports root-level PNG preview assets such as `../after-preview.png` and `../before-preview.png`. If a build fails around missing image files, verify whether those assets should be restored or moved to a tracked/public location.
- Background work runs in the worker process. Any new long-running work should be represented as a durable `background_tasks` row before returning from an API route.

## Useful commands for agents

These are not onboarding instructions; they are quick checks that are usually relevant before/after changes:

```bash
npm run build
npm run lint
npm run worker
node scripts/test-db.mjs
node scripts/test-cloud-agent.mjs
```

The smoke scripts require real environment configuration.

