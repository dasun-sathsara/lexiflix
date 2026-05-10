# LexiFlix Agent Guide

Repo-wide guide. Check subdirectory `AGENTS.md` files first — especially [apps/web/AGENTS.md](apps/web/AGENTS.md) for web work.

## Context

Optimize for fast iteration, reliable demos, and clear architecture — not enterprise platform complexity. Full architecture: [docs/architecture.md](docs/architecture.md).

| Area | Role |
|------|------|
| `apps/web` | Product center — Next.js 15, React 19, Better Auth, Drizzle, Biome |
| `apps/nlp_service` | Narrow FastAPI NLP service (spaCy/transformers) |
| `apps/scripts` | Legacy/experimental tooling — reference only |
| `docs` | Architecture and design docs |
| `infra` | Reserved, not central to deployment |

**Stack:** Trigger.dev Cloud (background jobs), Neon Postgres (state), Cloudflare R2 (artifacts), Gemini (AI). Local AI dev should use replay/mock modes by default.

Not a single-package monorepo — no root `package.json` or workspace runner. Coordinate via root `Taskfile.yml`; apps live in subdirectories.

## Working Rules

- No root-level `pnpm` — use `task` commands from repo root.
- No production-grade infrastructure unless explicitly requested.
- Ignore generated artifacts (`.next`, `node_modules`, `.venv`, caches) unless the task targets them.
- Conventional commits with scopes: `feat(web):`, `fix(web):`, `chore(web):`, etc.
- **Secrets:** Doppler (`lexiflix_web` / `dev`). Never print secrets. Don't overwrite `.env` casually. Update docs/tasks when env vars change.
- **Think first:** state assumptions, ask when unclear, surface tradeoffs, prefer simpler approaches.
- **Minimum change:** only what was asked; match existing style; no drive-by refactors; remove orphans your changes create.
- **Verify:** define success criteria; for multi-step work, plan steps with verification checks.

Run app-native commands from the correct subdirectory only when clearer than `task`.

## Service Boundaries

**`apps/web` owns:** UI, auth, route handlers, durable job/pack state, progress polling.

**`apps/web` does not own:** heavy NLP, second orchestration platform.

**`apps/nlp_service` owns:** subtitle normalization, tokenization, lemmatization, POS tagging, NER filtering, candidate vocabulary extraction.

**`apps/nlp_service` must not become:** a public backend, queue/orchestrator, or product-state owner. No Celery/Redis assumptions.

**`apps/scripts`:** supporting material only — don't move product-critical logic here.

## Validation

No mature test suite — don't claim one exists.

- Web: `task web:typecheck`, `task web:lint`, manual browser check
- NLP service: local tooling from `apps/nlp_service` via `uv`

State clearly what you verified and what you did not.
