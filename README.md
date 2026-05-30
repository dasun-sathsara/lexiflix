# LexiFlix

LexiFlix is a demo web application for vocabulary learning through movies and TV. The core idea is simple: instead of forcing learners to pause constantly during playback, the app prepares a study pack in advance by analyzing subtitle content and extracting useful vocabulary, phrases, and idioms before the user watches.

This repository is intentionally optimized for fast iteration rather than production-grade infrastructure. The product lives in the Next.js web app, long-running generation flows run through Trigger.dev, and a separate Python NLP service handles the heavier subtitle analysis work.

## Current Architecture

At a high level, the project is moving toward a Next.js-first architecture with a narrow Python compute service. The web app owns user-facing routes, auth, durable state, and pack/review experiences. The Python service is reserved for NLP work that is genuinely better in Python, such as spaCy- and transformer-based subtitle analysis. Neon is the primary relational database, Cloudflare R2 stores generated artifacts, and Gemini is the sole LLM provider.

The detailed architectural rationale lives in [docs/architecture.md](/Users/pabasara/Dev/lexiflix/docs/architecture.md).

## Repository Layout

The repository currently has two main application surfaces:

- `apps/web` contains the Next.js application, UI, route handlers, auth, and database integration.
- `apps/nlp_service` contains the Python NLP service that provides subtitle analysis to the workflow layer.

There are also older and experimental scripts under `apps/scripts`. Those are useful reference material and pipeline experiments, but they are not the main product surface.

## Local Development

The project uses a root `Taskfile.yml` so the normal development commands can be run from the repository root. For the web app, Doppler is the source of truth for local environment variables.

Common commands:

```bash
task web:dev
task web:typecheck
task web:build
task web:lint
task vercel:web:sync-envs
```

The current defaults assume:

- Doppler project: `lexiflix_web`
- Doppler config: `dev`
- Vercel preview branch: `dev`

For `apps/web`, Doppler needs to provide the required server-side envs:

- `DATABASE_URL`
- `AUTH_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `OPENSUBTITLES_API_KEY`
- `OPENSUBTITLES_USERNAME`
- `OPENSUBTITLES_PASSWORD`
- `GOOGLE_CLOUD_API_KEY`
- `TRIGGER_SECRET_KEY`
- `NLP_SERVICE_BASE_URL`
- `RESEND_API_KEY`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `R2_ENDPOINT`
- `R2_PUBLIC_BASE_URL`
- `TMDB_API_KEY`

AWS Polly credentials are required only when `CONTENT_GENERATION_AUDIO_PROVIDER=aws-polly`:

- `AWS_POLLY_ACCESS_KEY_ID`
- `AWS_POLLY_SECRET_ACCESS_KEY`

Optional tuning variables supported by the web app are:

- `OPENSUBTITLES_API_BASE_URL`
- `OPENSUBTITLES_REQUEST_TIMEOUT_MS`
- `NLP_SERVICE_REQUEST_TIMEOUT_MS`

If you need different values, override them at command time.

## Web App

The web app is in `apps/web`. It uses Next.js 15, React 19, Better Auth, Drizzle, and Biome. The app currently contains the main user experience: authentication, dashboard/browse flows, deck/study pages, settings, and the surrounding product shell.

Useful commands from `apps/web` directly are still available if needed:

```bash
pnpm dev
pnpm tsc
pnpm lint
pnpm build
pnpm db:generate
pnpm db:migrate
pnpm db:studio
```

In normal day-to-day work, prefer the root `task` commands so the Doppler-backed environment stays consistent.

## NLP Service

The Python NLP service lives in `apps/nlp_service`. Its role is narrow: accept subtitle-related input, run Python-native NLP analysis, and return structured vocabulary candidates to the workflow layer. It is not intended to become a second application backend or a separate orchestration platform.

The service uses Python 3.13 and is a FastAPI application. It is containerized and deployed to Google Cloud Run.

## Deployment Direction

The current deployment direction is:

- `apps/web` on Vercel
- workflow orchestration through Trigger.dev Cloud
- `apps/nlp_service` deployed as a container to Google Cloud Run
- Neon for Postgres
- Cloudflare R2 for artifact storage

This is deliberately simpler than a Celery/Redis-heavy architecture. The goal is to keep the system explainable, easy to demo, and fast to iterate on.

## Notes

- The repository is still evolving, so not every directory reflects the final architecture yet.
- The root architecture document should be treated as the canonical design reference.
- If you are working inside `apps/web`, also read [apps/web/AGENTS.md](/Users/pabasara/Dev/lexiflix/apps/web/AGENTS.md).
