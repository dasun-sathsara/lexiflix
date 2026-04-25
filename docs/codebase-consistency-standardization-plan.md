# Codebase Consistency Standardization Plan

## Objective

Make LexiFlix feel like one codebase again.

The repo has been built in phases by multiple agents, so the problem is not that every individual choice is wrong. The problem is that local choices have accumulated into multiple competing standards. This plan defines the standard, identifies where the current code drifts from it, and breaks the cleanup into stages that can be handed to separate agents.

The immediate goal is consistency and cohesion, not new product scope.

## How To Use This Plan

Future agents should execute one stage at a time. This document is the source of truth for the cleanup sequence; agents should not reinterpret the stage order from chat context.

Use this reusable control prompt:

```text
You are working in /Users/pabasara/Dev/lexiflix.

Read and follow:
- AGENTS.md
- apps/web/AGENTS.md
- docs/codebase-consistency-standardization-plan.md

Execute Stage <STAGE_NUMBER>: <STAGE_TITLE> only.

Rules:
- Keep the diff scoped to this stage.
- Do not implement later stages opportunistically.
- Preserve unrelated worktree changes.
- Follow the repo's existing architecture: apps/web is the product center, Server Actions are preferred for app-internal writes, and route handlers need documented justification.
- If you discover a later-stage issue, add it to the plan's "Notes For Later Stages" instead of widening scope.
- After implementation, update only this stage's row in the Stage Completion Log.
- Run the validation listed for this stage.
- Report exactly what changed, what validation passed or failed, and what remains intentionally out of scope.

Start by confirming the current stage requirements from the plan, then execute.
```

When a stage is completed:

1. Change its status in the Stage Completion Log from `Pending` to `Completed`.
2. Add the date, commit hash if available, and a short evidence note.
3. Do not mark later stages complete.
4. If a later-stage issue is discovered, add it to the Notes For Later Stages section instead of widening the current stage.

## Finalized Decisions

- The plan is staged and sequential. Later stages depend on the standards and small boundary fixes established by earlier stages.
- Stage 1 is mandatory before code refactors because it writes the standard future agents must obey.
- App-internal writes should move toward typed Server Actions. Route handlers are allowed only for protocol, webhook, binary streaming, or file upload boundaries with explicit documentation.
- The settings profile write should be migrated to a Server Action in Stage 3 unless implementation proves that avatar `File` handling is blocked in this Next.js runtime. If blocked, the route handler stays only as a documented exception and must delegate to a settings server helper.
- New normalized Server Actions should return `{ ok: true, data }` or `{ ok: false, error, fieldErrors? }`.
- Existing action result contracts should be normalized feature by feature. Do not perform a broad mechanical rename across unrelated flows in one patch.
- Temporary implementation plans should be retired or rewritten once canonical docs absorb their durable decisions.

## Source Of Truth

This plan is grounded in:

- `AGENTS.md`
- `apps/web/AGENTS.md`
- `docs/architecture.md`
- `docs/business-rules.md`
- `docs/core-table-rationale.md`
- `docs/decision-log.md`
- `docs/srs.md`
- `apps/nlp_service/README.md`
- representative live code under `apps/web/src/app`, `apps/web/src/features`, and `apps/web/src/lib/server`

The durable architectural standard is:

- `apps/web` is the product center and the only public application surface.
- Next.js owns UI, auth/session flows, route handlers, durable product state, and browser-facing contracts.
- Trigger.dev owns long-running workflow execution, not product truth.
- `apps/nlp_service` is a narrow internal compute service, not a second backend.
- Postgres owns durable application truth.
- R2 owns binary generated artifacts.
- Gemini is the only AI provider.
- Local AI development should prefer mock, replay, and record modes over live calls.

## Current Repo Assessment

### What Is Already Cohesive

The high-level architecture is coherent. The docs and much of the live code agree on the major boundaries:

- `apps/web` has a feature-oriented structure under `src/features`.
- Auth guard helpers exist in `src/lib/auth-guards.ts`.
- Most app-internal mutations are now Server Actions.
- Generated pack, deck, study, dashboard, generation-progress, and notification surfaces mostly read persisted state instead of mock state.
- Pack generation now has a dedicated `features/pack-generation` boundary.
- Notifications now have a dedicated `features/notifications` boundary.
- The Python service is narrow and well aligned with the architecture docs.
- The root `Taskfile.yml` is the correct coordination surface for web and NLP commands.
- `apps/web/biome.json` already excludes generated `.trigger` output and low-level UI primitives.

### Where The Code Still Feels Agent-Built

The drift is mostly at the code-contract and boundary level:

- app-internal mutation contracts use several result shapes: `{ success, message }`, `{ success, error }`, `{ success, data }`, and `{ ok, error }`
- authenticated code mostly uses `requireSession`, but some pages and route handlers call `auth.api.getSession` directly
- Server Actions and route handlers are mostly separated, but the standard is not documented in code and the settings profile route remains a mixed app-internal JSON/multipart route
- shared read-model mapping is repeated across features, especially TMDB image URL construction, content href construction, ISO date conversion, media summaries, and effective card counts
- feature directory shape is close but not uniform; some actions live at feature root while newer features use `server/actions.ts`
- docs contain implementation plans that appear partly or fully implemented and now duplicate canonical docs
- route pages sometimes do direct orchestration and sometimes delegate cleanly to feature read models
- type contracts are split between feature-local `types.ts`, `lib/types.ts`, and `lib/server/db/json-contracts.ts` without a written rule for where each kind belongs
- validation expectations are known informally but not encoded as a standard for staged cleanup work

## Standard To Enforce

### 1. Public Surface Standard

Only `apps/web` is public.

Allowed public HTTP route handlers:

- Better Auth protocol routes under `app/api/auth`
- binary streaming or upload boundaries that cannot be represented cleanly as Server Actions
- external webhooks or provider callbacks
- explicitly public health or metadata endpoints if introduced later

Not allowed without a documented exception:

- route-local JSON endpoints for ordinary app-internal mutations
- route handlers that duplicate feature server logic
- browser calls directly to Trigger.dev, the Python service, Gemini, or R2

Current classification:

- `app/api/auth/[...all]/route.ts`: allowed protocol route
- `app/api/auth/all/route.ts`: allowed only if Better Auth requires it; otherwise it should be documented or removed
- `app/api/pack-artifacts/[id]/route.ts`: allowed binary/artifact route
- `app/api/settings/profile/route.ts`: temporary file-upload boundary; Stage 3 should migrate it to a Server Action unless the runtime proves avatar `File` handling is blocked

### 2. Server Action Standard

Use Server Actions for app-internal writes and polling-style app-owned mutations.

Preferred layout:

```text
src/features/<feature>/
  components/
  server/
    actions.ts
    queries.ts
  types.ts
```

Acceptable exceptions:

- `features/auth/actions.ts`, because auth form actions are a narrow feature surface and Better Auth calls require direct response handling
- feature-only pure libraries under `lib/`
- no `server/` directory for UI-only features

Preferred result shape for new and normalized actions:

```ts
type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };
```

Rules:

- Use `ok`, not `success`, for normalized new work.
- Use `error`, not `message`, for the failure string.
- Put returned payload under `data`.
- Parse all untrusted input with Zod at the action boundary.
- Actions must enforce session ownership or admin authorization before writing.
- Actions should call feature server functions rather than performing large query bodies inline when the logic is reusable.
- Actions should revalidate only the routes affected by the mutation.

Transitional rule:

- Do not rename every action result in one blind pass.
- Normalize by feature boundary, starting with settings, media/generation polling, notifications, and packs.

### 3. Route Page Standard

Route files under `src/app` should be thin.

Allowed in route files:

- parse params and search params
- require session or admin access
- call feature read-model functions
- choose `notFound()`, redirect, or render a feature component
- compose page-level layout

Not preferred in route files:

- Drizzle query construction
- TMDB mapping logic
- domain state transitions
- repeated authorization logic
- route-local mock data

Current status:

- `/pack/[id]`, `/study/[id]`, `/generation/[jobId]`, `/dashboard`, `/media/[id]`, `/curated`, and `/admin/curated` mostly follow the thin route standard.
- `/settings/page.tsx` should use `requireSession()` instead of direct `auth.api.getSession`.
- `app/page.tsx` may use direct session lookup because it is a public landing/root redirect surface, but the exception should be kept explicit.

### 4. Auth And Authorization Standard

Use `src/lib/auth-guards.ts` for app-owned auth checks.

Preferred helpers:

- `getSessionOrNull()` for optional app-owned session checks from Server Components and Server Actions
- `requireSession()` for signed-in app routes/actions
- `requireAdmin()` for admin routes/actions
- add a request-header-aware helper for route handlers if needed, for example `getSessionFromHeaders(headers: Headers)`

Rules:

- Do not call `auth.api.getSession` directly from signed-in app routes.
- Route handlers that must use request headers should use a helper rather than duplicating Better Auth calls.
- Ownership checks belong in feature server queries/actions, not in client components.
- Artifact, pack, study, generation, notification, and preference reads must be user-owned.

### 5. Feature Boundary Standard

Use feature modules for product concepts:

- `assessment`
- `auth`
- `browse`
- `curation`
- `dashboard`
- `media`
- `notifications`
- `pack-generation`
- `packs`
- `settings`
- `sidebar`

Use `src/lib/server` for cross-feature infrastructure and pipeline engines:

- database
- content generation
- media analysis
- storage-level or integration-adapter code

Do not move product-specific UI read models into `src/lib/server` just because multiple routes need them. Shared product read models should live in the owning feature.

Examples:

- pack staging, decks, study, and artifact ownership belong to `features/packs/server`
- generation job progress belongs to `features/pack-generation/server`
- content-analysis orchestration helpers can remain in `lib/server/media-analysis`
- content-generation workflow/provider code can remain in `lib/server/content-generation`

### 6. Shared Mapper Standard

Repeated low-level mapping should be centralized.

Candidates for shared helpers:

- `toIso(Date | null | undefined)`
- TMDB image URL construction
- media href construction for movie/season content rows
- content subtitle formatting
- release year extraction
- effective due-state counting
- app-day and app-week date helpers

Recommended locations:

- browser-safe TMDB constants and image helper: `src/lib/tmdb-shared.ts`
- content row to media summary/href helpers: `src/features/media/server/content-view.ts` or `src/features/packs/server/media-summary.ts`
- pack due/count helpers: `src/features/packs/server/read-models.ts`
- generic ISO helper only if it removes real duplication; otherwise keep feature-local for clarity

The standard is not "one helper for everything." The standard is: if three features independently format the same domain thing, make the domain owner expose one mapper.

### 7. Data Contract Standard

Keep three kinds of types separate:

- Feature UI/read-model types: `src/features/<feature>/types.ts`
- Internal pipeline and JSONB persistence contracts: `src/lib/server/db/json-contracts.ts`
- External service request/response contracts: the integration module that owns the call

Rules:

- JSONB contracts should describe the current stored shape, not every historical shape.
- Pipeline-derived JSONB is rebuildable; do not introduce backward-compatibility parsers unless the product actually needs them.
- Feature UI types should not import database table types into client components.
- Request snapshots should be explicitly typed and validated at the boundary where they are created.

### 8. Directory Structure Standard

Target shape for non-trivial web features:

```text
src/features/<feature>/
  components/
  server/
    actions.ts
    queries.ts
  lib/
  types.ts
```

Rules:

- `components/` contains client and server components owned by the feature.
- `server/queries.ts` contains read models and ownership-aware reads.
- `server/actions.ts` contains Server Actions and mutation boundaries.
- `lib/` contains pure feature logic, engines, constants, and type helpers.
- `data/` is acceptable only for static seed/item banks.
- avoid feature root `actions.ts` for new non-auth work.

Current drift:

- `settings/actions.ts` is at feature root while newer features use `server/actions.ts`.
- `auth/actions.ts` is acceptable as an exception.
- `assessment` uses `data`, `lib`, and `server` coherently.
- `dashboard` is query-only and fine.
- `sidebar` is UI-only and fine unless it begins fetching data.

### 9. Docs Standard

Canonical docs:

- `docs/architecture.md`
- `docs/business-rules.md`
- `docs/decision-log.md`
- `docs/srs.md`
- `docs/core-table-rationale.md`

Temporary implementation plans:

- should live in `docs/`
- should have a stage log
- should be updated by the agent that completes a stage
- should be retired once implemented decisions are folded into canonical docs

Current stale or near-stale plan docs to review:

- `docs/generation-continuity-implementation-plan.md`
- `docs/learner-preferences-and-due-notifications-implementation-plan.md`

These plans appear partly or fully implemented in live code. Keeping them around as if they are active plans creates confusion. Retirement should happen only after confirming that canonical docs already contain the durable decisions.

## Stage Completion Log

| Stage                                                        | Status  | Completed Date | Evidence |
| ------------------------------------------------------------ | ------- | -------------- | -------- |
| Stage 1: Write and enforce the web boundary standards        | Completed | 2026-04-25     | Updated `apps/web/AGENTS.md#web-boundary-standards`; `task web:lint` passed. |
| Stage 2: Normalize auth/session access                       | Completed | 2026-04-25     | Added request-header auth guard helper; `/settings` uses `requireSession()`; profile upload route uses shared auth helper; remaining direct `auth.api.getSession` calls are in auth guards and the documented public home-page optional session read. `task web:typecheck` and `task web:lint` passed; signed-out `/settings` returned 401 locally. |
| Stage 3: Normalize settings write boundaries                 | Completed | 2026-04-25     | Added `updateProfileAction(formData)`, removed `app/api/settings/profile/route.ts`, removed the temporary route-handler exception, and updated the settings client to call the Server Action. `task web:typecheck` and `task web:lint` passed; signed-out `/settings` returned the expected 401 locally. |
| Stage 4: Normalize Server Action result contracts by feature | Completed | 2026-04-25     | Added shared `ActionResult<T>` and normalized notifications, pack-generation, media, and settings actions plus callers to `ok`/`data`/`error`; auth and assessment remain intentionally separate. `task web:typecheck` and `task web:lint` passed. Browser route smoke checks for `/settings`, `/generation`, `/generation/test-job`, and `/media/550?type=movie` had no client console errors, but signed-in interaction checks were blocked by the unauthenticated local browser session. |
| Stage 5: Extract shared read-model mappers                   | Completed | 2026-04-25     | Added `buildTmdbImageUrl()` and `buildContentMediaHref()`; replaced duplicated TMDB image URL construction and content media href mapping in pack, generation, dashboard, media detail, browse, and curation surfaces. Left tiny `toIso()` helpers in place because they are local serialization helpers, not domain read-model mappers. `task web:typecheck` and `task web:lint` passed. |
| Stage 6: Retire or refresh stale implementation plans        | Completed | 2026-04-25     | Retired `docs/generation-continuity-implementation-plan.md` and `docs/learner-preferences-and-due-notifications-implementation-plan.md` after promoting durable generation, preference, due-notification, and plan-retirement rules into canonical docs. `rg -n "generation-continuity|learner-preferences|implementation-plan|Current State|Missing Or Weak" docs` returns only this standardization plan. |
| Stage 7: Align docs with the final consistency standard      | Completed | 2026-04-25     | Updated `docs/architecture.md` with Server Action default, route-handler exception policy, feature boundary standard, and temporary-plan retirement rule; updated `docs/decision-log.md` with learner preference/due-notification and web consistency decisions; updated `docs/business-rules.md` and `docs/core-table-rationale.md` for due-notification behavior and table rationale. Docs contradiction searches found no remaining conflicting route-handler or mock-data guidance outside this plan. |
| Stage 8: Validation and cleanup pass                         | Completed | 2026-04-25     | `task web:typecheck` and `task web:lint` passed. Consistency searches found no `fetch("/api/...")`; direct `auth.api.getSession` remains only in shared auth guards and the documented public home optional session read; `success` action results remain only in auth and assessment exceptions; TMDB base URL is centralized in `src/lib/tmdb-shared.ts`; mock references are local AI modes, documented persisted-state decisions, UI placeholders, or this plan. No Python files were touched, so NLP validation was not required. |

## Implementation Stages

### Stage 1: Write And Enforce The Web Boundary Standards

Goal: make the standard explicit in repo-local guidance before moving code.

Files to change:

- `apps/web/AGENTS.md`
- optionally `AGENTS.md` if the repo-level guide needs a short pointer

Required changes:

- Add a "Web Boundary Standards" section to `apps/web/AGENTS.md`.
- Define when to use Server Actions versus route handlers.
- Define the preferred feature directory shape.
- Define the action result shape for new normalized work.
- Define the auth helper standard.
- Define the thin route file rule.
- State that `app/api/settings/profile/route.ts` is a temporary file-upload exception and the Stage 3 migration target.
- State that `app/api/pack-artifacts/[id]/route.ts` is an allowed binary streaming route.

Do not change application behavior in this stage.

Validation:

- `task web:lint`
- no browser verification required

Completion evidence:

- link to the changed `apps/web/AGENTS.md` section
- lint result

Recommended execution prompt:

```text
Execute Stage 1 of docs/codebase-consistency-standardization-plan.md.
Only update repo guidance. Do not refactor application code.
Run task web:lint.
Update the Stage Completion Log and stop.
```

### Stage 2: Normalize Auth/Session Access

Goal: remove direct app-owned session lookups outside intentional protocol boundaries.

Files likely involved:

- `apps/web/src/lib/auth-guards.ts`
- `apps/web/src/app/(app)/settings/page.tsx`
- `apps/web/src/app/api/settings/profile/route.ts`
- possibly `apps/web/src/app/page.tsx`

Required changes:

- Add a helper in `auth-guards.ts` for request-header-aware session lookup if route handlers still need it.
- Change `/settings/page.tsx` to use `requireSession()`.
- Change `app/api/settings/profile/route.ts` to use a shared request-header auth helper instead of direct `auth.api.getSession`.
- Keep `app/page.tsx` as a documented exception if it remains a public landing/root redirect surface; it does not need the protected-route `requireSession()` pattern.
- Do not touch Better Auth protocol route files unless there is a concrete duplicate or broken route.

Non-goals:

- do not redesign auth
- do not change Better Auth configuration
- do not move profile upload yet

Validation:

- `task web:typecheck`
- `task web:lint`
- manual browser check: `/settings` redirects/loads exactly as before for signed-in and signed-out states if feasible

Completion evidence:

- list direct `auth.api.getSession` occurrences that remain and why
- validation result

Recommended execution prompt:

```text
Execute Stage 2 of docs/codebase-consistency-standardization-plan.md.
Normalize app-owned session access through auth-guards only.
Keep Better Auth protocol routes untouched unless clearly redundant.
Run typecheck and lint, update the Stage Completion Log, and stop.
```

### Stage 3: Normalize Settings Write Boundaries

Goal: make settings consistent with the newer typed Server Action direction while preserving file upload behavior.

Files likely involved:

- `apps/web/src/app/(app)/settings/settings-client.tsx`
- `apps/web/src/features/settings/actions.ts`
- `apps/web/src/features/settings/server/preferences.ts`
- `apps/web/src/features/settings/types.ts`
- `apps/web/src/app/api/settings/profile/route.ts`

Finalized direction:

- preference updates are already Server Actions and stay that way
- password change and account deletion remain Server Actions
- profile update should become a Server Action that accepts `FormData`
- `app/api/settings/profile/route.ts` should be deleted after the action caller is working
- settings client should not contain arbitrary JSON fetches for app-internal writes
- if avatar `File` handling is blocked by the runtime, keep the route only as a documented exception and delegate its work to a settings server helper

Required changes:

- add `updateProfileAction(formData: FormData)` or an equivalent typed action
- keep R2 upload and cleanup behavior intact
- return `{ ok: true, data: { user } }` or `{ ok: false, error }`
- update the settings client caller
- remove `app/api/settings/profile/route.ts` after the Server Action path is verified
- if the route must remain, add the exception to `apps/web/AGENTS.md`, normalize the route response shape, and remove inline `fetch("/api/settings/profile")` from the settings component by adding a typed settings-feature client wrapper

Validation:

- `task web:typecheck`
- `task web:lint`
- manual browser check: profile name update
- manual browser check: avatar upload if R2 env is available
- manual browser check: avatar removal if R2 env is available
- manual browser check: preferences still save

Completion evidence:

- state whether the profile route was removed; if retained, name the runtime blocker and the exact exception documented
- validation result

Recommended execution prompt:

```text
Execute Stage 3 of docs/codebase-consistency-standardization-plan.md.
Normalize the settings profile write boundary without redesigning settings UI.
Preserve avatar upload, cleanup, and error behavior.
Run typecheck and lint, update the Stage Completion Log, and stop.
```

### Stage 4: Normalize Server Action Result Contracts By Feature

Goal: reduce caller complexity by converging Server Action result shapes.

Current drift:

- `features/settings/actions.ts` uses `success` plus `message`
- `features/media/server/actions.ts` uses `success` plus `message`
- `features/assessment/server/actions.ts` uses `success` plus `data` or `error`
- `features/packs/server/actions.ts` uses `ok` plus `error`
- `features/notifications/server/actions.ts` uses `success`
- `features/pack-generation/server/actions.ts` uses `success`
- `features/auth/actions.ts` uses `success`, `message`, and field `errors`

Standard:

```ts
type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };
```

Order of work:

1. Add a shared type helper only if it genuinely reduces duplication. Candidate path: `apps/web/src/lib/action-result.ts`.
2. Normalize `pack-generation` and `notifications` first because their result shapes are small.
3. Normalize `media` polling/generation actions next.
4. Normalize `settings` after Stage 3.
5. Leave `auth` for last or keep it as an explicit exception because form field errors are already integrated with auth UI.
6. Leave `assessment` for a separate focused pass if the adaptive flow would require broad client changes.

Rules:

- Do not change every feature in one huge diff unless the resulting patch is still readable.
- Update all client callers in the same stage.
- Do not silently swallow thrown authorization errors; use `requireSession` for protected actions and explicit error results for user-correctable validation failures.
- Keep field-level validation useful where the UI already renders it.

Validation:

- `task web:typecheck`
- `task web:lint`
- browser checks for each touched interaction:
  - notification read/dismiss
  - generation progress polling
  - media generation submit if touched
  - settings save if touched
  - pack remove/reset/rating if touched

Completion evidence:

- list features normalized
- list features intentionally left for later
- validation result

Recommended execution prompt:

```text
Execute Stage 4 of docs/codebase-consistency-standardization-plan.md.
Normalize action result contracts feature-by-feature; do not mix unrelated UI redesign.
Run typecheck and lint, update the Stage Completion Log, and stop.
```

### Stage 5: Extract Shared Read-Model Mappers

Goal: remove repeated mapping logic without creating a generic abstraction layer that hides the domain.

Observed duplication:

- `toIso()` exists in multiple server query modules.
- TMDB image URL construction appears in browse, curation, media, dashboard, pack-generation, and packs code.
- content-to-media href logic appears in pack-generation and packs.
- pack/card count derivation appears in pack and dashboard surfaces.
- effective due-state logic is correctly centralized in `packs/server/srs.ts`, but surrounding count/read-model logic is still repeated.

Files likely involved:

- `apps/web/src/lib/tmdb-shared.ts`
- `apps/web/src/features/packs/server/queries.ts`
- `apps/web/src/features/pack-generation/server/queries.ts`
- `apps/web/src/features/dashboard/server/queries.ts`
- `apps/web/src/features/media/server/analysis.ts`
- `apps/web/src/features/browse/components/media-card.tsx`
- `apps/web/src/features/curation/components/admin-catalog-row.tsx`
- `apps/web/src/features/curation/components/admin-discover-row.tsx`

Recommended changes:

- Add `buildTmdbImageUrl(path, size)` to `tmdb-shared.ts`.
- Replace hard-coded `https://image.tmdb.org/t/p/w500` in `media-detail-client.tsx`.
- Add a content media summary helper under the domain owner, not a generic `utils` dumping ground.
- Use that helper from pack and generation read models where it fits cleanly.
- If pack due/card counts can be shared without coupling dashboard too tightly to pack UI types, extract them under `features/packs/server`.

Rules:

- Do not chase every two-line duplication.
- Do not create `src/lib/read-model-utils.ts` full of unrelated helpers.
- Keep helper names domain-specific.
- Preserve current output shapes unless a stage explicitly updates callers.

Validation:

- `task web:typecheck`
- `task web:lint`
- browser checks:
  - `/media/[id]`
  - `/decks`
  - `/generation/[jobId]`
  - `/dashboard`
  - `/curated` or `/admin/curated` if TMDB image mapping changed there

Completion evidence:

- list helpers introduced
- list duplicated helpers intentionally left in place and why
- validation result

Recommended execution prompt:

```text
Execute Stage 5 of docs/codebase-consistency-standardization-plan.md.
Extract only domain-obvious read-model mappers and keep output behavior unchanged.
Run typecheck and lint, update the Stage Completion Log, and stop.
```

### Stage 6: Retire Or Refresh Stale Implementation Plans

Goal: stop temporary plans from competing with canonical docs.

Files to inspect:

- `docs/generation-continuity-implementation-plan.md`
- `docs/learner-preferences-and-due-notifications-implementation-plan.md`
- `docs/architecture.md`
- `docs/business-rules.md`
- `docs/decision-log.md`
- `docs/srs.md`
- `docs/core-table-rationale.md`

Process:

1. Check whether every implemented decision from each temporary plan exists in canonical docs.
2. If not, update the canonical docs first.
3. If a plan is fully implemented and absorbed, delete the plan file.
4. If a plan is partly implemented, rewrite the plan to show only remaining work and add a stage log.
5. Search docs for references to removed plan files and update them.

Likely findings:

- Generation continuity appears largely implemented: dedicated `/generation/[jobId]`, pack-generation feature boundary, decks visibility, notifications, and pack replacement hardening are present in live code.
- Learner preferences and due notifications appear largely implemented: generation default columns and settings action exist, but due-review notification reconciliation needs confirmation before retirement.
- The current code already has `apps/web/drizzle/0006_elite_the_hand.sql` for generation preference columns, so any plan text claiming those are missing is stale.

Rules:

- Do not delete a plan just because code exists. Confirm canonical docs carry durable decisions.
- Do not preserve stale "Current State" sections that describe problems already fixed.
- Keep canonical docs concise; do not paste implementation-plan detail into them.

Validation:

- `rg -n "generation-continuity|learner-preferences|implementation-plan|Current State|Missing Or Weak" docs`
- `task web:lint` only if docs linting is part of Biome scope; otherwise no code validation required

Completion evidence:

- list plan files retired or refreshed
- list canonical docs updated
- validation/search result

Recommended execution prompt:

```text
Execute Stage 6 of docs/codebase-consistency-standardization-plan.md.
Retire or refresh stale implementation plans only after canonical docs absorb durable decisions.
Run the listed docs search, update the Stage Completion Log, and stop.
```

### Stage 7: Align Docs With The Final Consistency Standard

Goal: make the canonical docs describe how the codebase should stay cohesive.

Files to update:

- `docs/architecture.md`
- `docs/core-table-rationale.md`
- `docs/srs.md` only if functional requirements need wording
- `docs/business-rules.md` only for product rules, not code style
- `docs/decision-log.md` for durable architectural decisions

Required additions:

- Add a short architecture note that app-internal writes use Server Actions by default.
- Add the route-handler exception policy.
- Add the feature boundary standard at a high level.
- Add the "temporary implementation plans retire after canonical docs absorb decisions" rule if not already present elsewhere.
- Add a decision-log entry for the consistency standard once stages 1-5 are complete.

Rules:

- Do not turn canonical docs into coding-style manuals.
- Put coding details in `AGENTS.md`; put architectural decisions in `docs/architecture.md` and `docs/decision-log.md`.
- Preserve SRS functional requirements unless behavior actually changed.

Validation:

- docs search for contradictory route-handler or mock-data statements
- no code validation required unless code is touched

Completion evidence:

- list canonical docs updated
- list contradictions removed

Recommended execution prompt:

```text
Execute Stage 7 of docs/codebase-consistency-standardization-plan.md.
Align canonical docs with the consistency standard without adding new product scope.
Update the Stage Completion Log and stop.
```

### Stage 8: Validation And Cleanup Pass

Goal: verify that the repo now has one visible standard.

Checks:

- `task web:typecheck`
- `task web:lint`
- `task nlp:lint` if Python files were touched
- `task nlp:typecheck` if Python files were touched

Search checks:

```bash
rg -n "auth\\.api\\.getSession" apps/web/src
rg -n "fetch\\(\\\"/api/" apps/web/src
rg -n "success: true|success: false|ok: true|ok: false" apps/web/src/features
rg -n "https://image\\.tmdb\\.org/t/p" apps/web/src
rg -n "mock|placeholder|hard-coded|hardcoded" apps/web/src docs
```

Expected interpretation:

- direct `auth.api.getSession` should remain only in Better Auth protocol routes or documented public/route-handler exceptions
- `fetch("/api/...")` should remain only for documented HTTP boundaries
- action result shapes should be substantially converged or explicitly documented as exceptions
- hard-coded TMDB image base URLs should be gone from feature code
- mock references should be either intended local AI modes or documented non-product examples

Manual browser checks:

- `/settings`
- `/media/[id]?type=movie`
- `/decks`
- `/generation/[jobId]` with fixture data if needed
- `/pack/[id]`
- `/study/[id]`
- notification bell read/dismiss flow

Completion evidence:

- command results
- remaining intentional exceptions
- any follow-up issue that should become a separate plan

Recommended execution prompt:

```text
Execute Stage 8 of docs/codebase-consistency-standardization-plan.md.
Run the consistency searches and validation commands.
Fix only low-risk cleanup issues found by those checks.
Update the Stage Completion Log and stop.
```

## Notes For Later Stages

- Confirm whether `app/api/auth/all/route.ts` is required by Better Auth. If it is not required, remove it in the auth normalization stage.
- Confirm whether due-review notification reconciliation is already implemented before retiring `learner-preferences-and-due-notifications-implementation-plan.md`.
- Consider adding a tiny `ActionResult` helper only after at least two feature boundaries are normalized. Do not introduce it if it becomes abstraction for abstraction's sake.
- Consider creating a short `docs/web-code-standard.md` only if `apps/web/AGENTS.md` becomes too long. Prefer keeping agent execution rules in `AGENTS.md`.

## Priority Recommendation

Start with Stage 1.

The strongest first move is not to immediately refactor. The code already mostly follows the desired architecture; the missing piece is a written standard that future agents must obey. Without Stage 1, later agents will keep making locally reasonable but globally inconsistent choices.

After Stage 1, Stage 2 and Stage 3 should be done before broad action-result normalization. Auth and settings are the smallest places where current drift is visible and easy to correct without destabilizing generation or study flows.
