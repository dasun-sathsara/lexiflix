# LexiFlix Web App Guide

## Scope

This file applies to `/Users/pabasara/Dev/lexiflix/apps/web`.

The web app is the center of the LexiFlix product. It owns the user-facing application, authentication, route handlers, durable product state, and the browser-side experience around packs, decks, study flows, and settings.

## Development Workflow

The preferred workflow is to run web app commands from the repository root through `task`, because the Taskfile already wires Doppler-backed environment injection where needed.

Preferred commands:

- `task web:dev`
- `task web:typecheck`
- `task web:build`
- `task web:lint`
- `task vercel:web:sync-envs`

Direct `pnpm` commands are still valid from `apps/web`, but use them intentionally:

- `pnpm dev`
- `pnpm tsc`
- `pnpm lint`
- `pnpm build`
- `pnpm db:generate`
- `pnpm db:migrate`
- `pnpm db:studio`

## Environment Rules

This app validates env vars at startup through `src/lib/env.ts`. If env is broken, development, typechecking, builds, and database tooling may fail early.

Current required server-side envs include:

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
- `NLP_SERVICE_API_KEY`
- `RESEND_API_KEY`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `R2_ENDPOINT`
- `R2_PUBLIC_BASE_URL`
- `TMDB_API_KEY`
- `AZURE_SPEECH_API_KEY` (when `CONTENT_GENERATION_AUDIO_PROVIDER=azure-mai`)
- `AWS_POLLY_ACCESS_KEY_ID` (when `CONTENT_GENERATION_AUDIO_PROVIDER=aws-polly`)
- `AWS_POLLY_SECRET_ACCESS_KEY` (when `CONTENT_GENERATION_AUDIO_PROVIDER=aws-polly`)
- `AZURE_AI_FOUNDRY_ENDPOINT` (when either LLM provider is `azure-foundry`)
- `AZURE_AI_FOUNDRY_API_KEY` (when either LLM provider is `azure-foundry`)
- `AZURE_AI_FOUNDRY_MODEL` (when either LLM provider is `azure-foundry`)

The web app also supports optional server-side tuning vars:

- `AI_CREDENTIALS_ENCRYPTION_KEY` — dedicated key used to encrypt user-supplied AI provider credentials. Falls back to `AUTH_SECRET`. Rotating whichever secret is in use makes previously stored user credentials undecryptable, and affected users must re-enter their keys.
- `CONTENT_GENERATION_LLM_PROVIDER` — LLM provider for pack text generation (`gemini` | `azure-foundry`, default: `gemini`)
- `ANALYSIS_LLM_PROVIDER` — LLM provider for media-analysis phrase extraction (`gemini` | `azure-foundry`, default: `gemini`)
- `CONTENT_GENERATION_TEXT_MODEL` — model name for text generation (default: `gemini-3.1-flash-lite`)
- `ANALYSIS_LLM_MODEL` — model name for analysis LLM (default: `gemini-3.1-flash-lite`)
- `CONTENT_GENERATION_IMAGE_ENABLED` — enable image generation (`true` | `false`, default: `false`)
- `CONTENT_GENERATION_IMAGE_MODEL` — image model/deployment name (optional)
- `TEXT_LLM_PROVIDER` — deprecated, use CONTENT_GENERATION_LLM_PROVIDER and ANALYSIS_LLM_PROVIDER
- `OPENSUBTITLES_API_BASE_URL`
- `OPENSUBTITLES_REQUEST_TIMEOUT_MS`
- `NLP_SERVICE_REQUEST_TIMEOUT_MS`
- `AZURE_SPEECH_REGION`
- `AZURE_SPEECH_CONCURRENCY`
- `AZURE_SPEECH_MAX_RETRIES`
- `AZURE_MAI_VOICE_MALE`
- `AZURE_MAI_VOICE_FEMALE`
- `AZURE_MAI_VOICE_STYLE`
- `AWS_POLLY_REGION`
- `AWS_POLLY_ENGINE`
- `AWS_POLLY_CONCURRENCY`
- `AWS_POLLY_MAX_RETRIES`

Current public envs include:

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_ENV`

Do not print or copy secret values into diffs, docs, or responses.

## Project Structure

- `src/app`: App Router routes, layouts, loading states, and API route handlers
- `src/features`: feature-level UI and server logic
- `src/components/common`: hand-written shared UI
- `src/components/ui`: lower-level design system primitives
- `src/lib`: auth, env validation, integrations, DB helpers, storage, email, and utility code
- `drizzle`: SQL migrations and metadata snapshots

Keep product behavior in feature modules or dedicated library files when possible. Do not dump everything into route files just because it is convenient in the moment.

## Coding Guidance

This app is TypeScript-first and already has established patterns. Follow them.

- Use the `@/` import alias for code under `src`.
- Let Biome handle formatting and linting.
- Respect the existing visual language unless the task is explicitly about redesign.
- Do not casually churn `src/components/ui`; those primitives should remain stable unless the change belongs there.
- Prefer focused changes over wide refactors in a demo project.

### Loading and pending state

One interaction gets one indicator. Do not stack them.

- Route navigation and URL-filter transitions: the single global `RouteProgressBar` mounted in `src/app/(app)/layout.tsx`. Feed it by reporting local pending state through `useReportNavigationPending`, or by rendering the headless `<LinkPending />` inside a `next/link`. Links themselves stay visually unchanged — a per-link spinner element also breaks the collapsed sidebar, which hides a menu button's last child span.
- Debounced text inputs: a muted `Loader2` inside the field.
- Buttons running an action: swap the button's leading icon for `Loader2` and disable it; keep the label.
- Sections waiting on refreshed server data: wrap in `PendingSection`, which only dims the content.

## Architecture Constraints

The current repo-level direction is:

- Next.js is the only public app surface
- Trigger.dev will orchestrate background workflows
- Python handles narrow NLP compute through `apps/nlp_service`
- the frontend polls app-owned job endpoints rather than talking to infrastructure directly

That means:

- do not make the browser talk directly to the Python service
- do not introduce a second public backend inside the web app
- do not reintroduce Celery/Redis assumptions into the web layer
- do not scatter Gemini calls across route handlers; AI integration should stay behind internal adapters

## Web Boundary Standards

Use Server Actions for app-internal writes, preference changes, and app-owned mutation or polling flows. Route handlers are reserved for protocol boundaries, webhooks or provider callbacks, binary streaming, and file upload boundaries that cannot be cleanly represented as Server Actions. Any new route handler outside those cases needs a short code or docs justification that explains why a Server Action is not the right boundary.

Current route-handler exceptions:

- `app/api/auth/[...all]/route.ts` is an allowed Better Auth protocol route.
- `app/api/pack-artifacts/[id]/route.ts` is an allowed binary streaming route for generated artifacts.

Preferred feature shape for non-trivial product features:

```text
src/features/<feature>/
  components/
  server/
    actions.ts
    queries.ts
  lib/
  types.ts
```

`server/actions.ts` owns Server Actions and mutation boundaries. `server/queries.ts` owns read models and ownership-aware reads. `components/` owns feature UI. `lib/` owns pure feature logic, constants, engines, and type helpers. UI-only features do not need empty server folders, and `features/auth/actions.ts` remains an acceptable narrow auth exception.

New normalized Server Actions should return:

```ts
type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };
```

Use `ok`, not `success`; use `error`, not `message`; put successful payloads under `data`; parse untrusted input with Zod at the action boundary; enforce session ownership or admin authorization before writes; and revalidate only the affected routes.

Auth checks for app-owned surfaces should go through `src/lib/auth-guards.ts`: `getSessionOrNull()` for optional session reads, `requireSession()` for signed-in app routes and actions, and `requireAdmin()` for admin-only surfaces. Do not call `auth.api.getSession` directly from signed-in app routes. Route handlers that need request headers should use a shared auth helper instead of duplicating Better Auth calls.

Route files under `src/app` should stay thin: parse params and search params, require session/admin access, call feature read-model functions, choose `notFound()` or redirects, and render feature components. Keep Drizzle query construction, domain state transitions, TMDB mapping, repeated authorization logic, and mock data out of route files unless there is a documented reason.

## AI Credentials (bring your own)

Learners can store their own provider credentials under Settings → AI services. Behaviour:

- Supported providers: Gemini, Azure AI Foundry, AWS Polly, Azure MAI Speech.
- Secrets are encrypted at rest with AES-256-GCM (`src/lib/server/security/secret-box.ts`); only non-secret fields such as endpoints, regions and deployment names are stored in clear text, and the settings read model never returns plaintext secrets.
- Resolution order lives in `src/lib/server/ai-credentials/policy.ts`: admin enforcement → the user's own credential → system `.env`. Administrators therefore run on the system configuration by default, since they normally store no personal keys.
- Admins can force every account onto the system configuration from the same tab; custom credentials remain stored but are ignored while enforcement is on.
- Only per-user pack generation uses these credentials. Subtitle analysis (`content_analysis_run`) is content-scoped and shared between users, so it always runs on system credentials.
- `AUTH_SECRET` and `AI_CREDENTIALS_ENCRYPTION_KEY` are synced to the Trigger.dev worker (`trigger.config.ts`) because decryption happens inside the generation task.

## Analysis LLM Chunking

Phrase extraction (`src/lib/server/media-analysis/providers/analysis-llm`) receives raw subtitles and windows them itself:

- `windows.ts` parses SRT/VTT cues, strips markup and release credits, and emits 15-minute windows of media time (`ANALYSIS_LLM_WINDOW_MS`). `ANALYSIS_LLM_WINDOW_CHARACTERS` splits a window further only when its dialogue would overflow the model context. Timestamp-free input falls back to character windows.
- Providers that derive a JSON Schema from a Zod object (Azure structured outputs) must use `analysisLlmWireResponseSchema`, not `analysisLlmResponseSchema`: JSON Schema cannot represent the transform in `contextListSchema`, and strict structured outputs require every property to be present. Responses are still validated with the lenient schema.

## Validation Expectations

Unit tests exist: Vitest is configured (`vitest.config.ts`), and `pnpm test` runs colocated `*.test.ts` files covering pure logic and domain utilities. Coverage is partial, not comprehensive — there is no end-to-end or CI integration yet.

For most changes, the minimum useful validation is:

- `task web:typecheck`
- `task web:lint`
- `pnpm test` (from `apps/web`)
- manual verification of the affected route or interaction in the browser

If you skip validation because the environment is unavailable, say so explicitly.

## Deployment Notes

The app is intended to deploy on Vercel. The Taskfile includes a Vercel env sync task backed by Doppler.

If a task involves deploy-time config:

- keep Vercel preview vs production env behavior in mind
- remember that preview env syncs are branch-scoped
- prefer updating the Taskfile or docs rather than inventing one-off shell workflows
