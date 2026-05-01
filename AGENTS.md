# LexiFlix Agent Guide

## Scope

This file applies to the whole repository at `/Users/pabasara/Dev/lexiflix`. Always check for a more specific `AGENTS.md` before changing files in a subdirectory. At the time of writing, `apps/web/AGENTS.md` adds tighter guidance for the web app.

## Project Context

LexiFlix is a university demo application. That matters. The repo should be optimized for fast iteration, reliable demos, and understandable architecture, not for enterprise-grade platform complexity.

The current architectural direction is:

- `apps/web` is the product center and the only public application surface.
- background workflows are intended to run through Trigger.dev Cloud.
- `apps/nlp_service` is a narrow Python FastAPI service for NLP work only.
- Neon Postgres is the durable system of record.
- Cloudflare R2 stores generated artifacts.
- Gemini is the only AI provider.
- local AI development should rely on replay/mock modes rather than expensive live calls by default.

The architecture reference lives in [docs/architecture.md](/Users/pabasara/Dev/lexiflix/docs/architecture.md).

## Repo Shape

This is not a single-package monorepo. There is no root `package.json`, no `pnpm-workspace.yaml`, and no task runner like Turbo or Nx. The repository is coordinated through a root `Taskfile.yml`, but the actual applications still live in their own subdirectories.

Main areas:

- `apps/web`: Next.js 15 app, React 19, Better Auth, Drizzle, Biome.
- `apps/nlp_service`: Python 3.13 NLP service scaffold with spaCy/transformer-oriented dependencies.
- `apps/scripts`: older and experimental subtitle/NLP tooling. Useful for reference, but not the main product surface.
- `docs`: architecture and other design documentation.
- `infra`: reserved for infra-related work, but not currently the center of the deployment model.

## Working Rules

- Do not assume root-level `pnpm` commands exist.
- Prefer the root `task` commands when they exist, especially for the web app.
- Avoid inventing production-grade infrastructure unless the user explicitly asks for it.
- Ignore generated artifacts such as `.next`, `node_modules`, `.venv`, and local caches unless the task is explicitly about them.
- Preserve the current commit style: conventional commits with useful scopes, especially `feat(web): ...`, `fix(web): ...`, and `chore(web): ...`.

## Environment and Secrets

The repo uses Doppler as the main secret source for the web app workflow.

Current defaults in the root `Taskfile.yml`:

- Doppler project: `lexiflix_web`
- Doppler config: `dev`
- Vercel preview branch: `dev`

Important rules:

- Do not print secret values into logs, docs, commits, or chat responses.
- Do not overwrite `.env` files casually.
- If you add or rename an environment variable, update the relevant docs and task workflow.

## Root Commands

Use the root `Taskfile.yml` where possible.

Common commands:

- `task web:dev`
- `task web:typecheck`
- `task web:build`
- `task web:lint`
- `task vercel:web:sync-envs`

These exist to reduce setup drift. If you need to run application-native commands directly, do so from the correct subdirectory and only when it makes the workflow clearer.

## Web App

The web app lives in `apps/web`. It owns:

- UI
- auth/session flows
- route handlers
- durable job and pack state
- user-facing progress polling

It does not own:

- heavy NLP processing
- a second background orchestration platform

When working in `apps/web`, prefer reading [apps/web/AGENTS.md](/Users/pabasara/Dev/lexiflix/apps/web/AGENTS.md) before making changes.

## NLP Service

The Python service lives in `apps/nlp_service`. It should stay narrow.

It is intended to own:

- subtitle normalization
- tokenization
- lemmatization
- POS tagging
- NER-based filtering
- candidate vocabulary extraction

It should not grow into:

- a second public backend
- a queue/orchestration system
- a product-state owner

If you are adding behavior here, align it with the architecture document rather than reviving Celery/Redis-style assumptions from older drafts.

## Scripts

`apps/scripts` contains experiments and older tooling. Treat it as supporting material, not the primary product architecture.

Do not move product-critical logic into `apps/scripts` unless the user explicitly wants that restructuring.

## Validation Expectations

There is no mature automated test suite yet. Do not claim one exists.

Useful minimum verification:

- for web changes: `task web:typecheck`, `task web:lint`, and manual verification in the browser
- for Python service changes: run the local Python tooling directly from `apps/nlp_service` using `uv` where appropriate

When automation is absent, state clearly what you did verify and what you did not.
