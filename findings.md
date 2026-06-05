# Refactor Findings

Survey of the remaining LexiFlix codebase for areas that still deviate from established practice, judged against `AGENTS.md`, `apps/web/AGENTS.md`, and the newly refactored `lib/server/content-generation` and `lib/server/media-analysis` (facade/port/factory/adapter/service split, thin orchestrators, single-source constants, shared helpers in `lib/domain` and `lib/server/utils`).

**Method.** Three independent surveys (server layer + routes, client/UI layer, shared lib + data layer + Python service + tooling), then every finding below was re-checked directly with grep/file reads. Findings the surveys raised that did not hold up are omitted. Nothing was modified. Line counts and file paths are as of 2026-07-28.

**Not covered:** `src/components/ui` (design-system primitives, intentionally stable), `.venv`, generated artifacts. No runtime/behavioural testing was performed.

---

## Priority summary

| # | Area | Severity | Effort |
|---|------|----------|--------|
| 1 | `features/packs/server/actions.ts`: 646 lines, five responsibilities, zero input validation | HIGH | M |
| 2 | `queries.ts` files that own mutations (curation, notifications) | HIGH | S |
| 3 | TMDB integration is the last client not on the shared convention, and its mapping logic is duplicated 3–4× | HIGH | M |
| 4 | `features/media` has both `utils.ts` and `lib/utils.ts`; settings imports CEFR from another feature | HIGH | S |
| 5 | `pack-generation-panel.tsx` bypasses the documented form pattern | HIGH | M |
| 6 | Four oversized client components with extractable state | MEDIUM | M |
| 7 | Trigger dispatch error handling duplicated in three places | MEDIUM | S |
| 8 | `json-contracts.ts` location forces client-safe modules to import from `lib/server` | MEDIUM | M |
| 9 | Env naming and coupling: `..._IMAGE_PROVIDER` holds a model; one flag drives two pipelines | MEDIUM | S |
| 10 | Documentation drift: `apps/scripts`, undocumented env vars, "no test suite" | MEDIUM | S |
| 11 | No tests on the highest-risk pure logic | MEDIUM | M |
| 12 | NLP service contract can drift silently between Python and TypeScript | MEDIUM | M |
| 13 | Small duplications and dead code (formatDate, alias re-exports, unused exports) | LOW | S |
| 14 | Assorted one-line cleanups (r2 guard, empty route dir, revalidate scope, auth guard) | LOW | S |

---

## 1. `features/packs/server/actions.ts` — 646 lines, five responsibilities, no input validation

`apps/web/src/features/packs/server/actions.ts`

Two problems in one file, and it is the largest server module outside the DB schema.

**Tangled responsibilities.** The file holds card CRUD actions, the full SRS review path, streak computation, cross-pack term-state propagation, and revalidation. `computeNextStreak` (line 62) is a pure function living in a `"use server"` file; `ratePackItemAction` (line ~347) runs ~180 lines coordinating streak upsert, SRS scheduling, term-state propagation and review-event logging inline. `apps/web/AGENTS.md` reserves `server/actions.ts` for mutation boundaries and puts pure logic in `lib/`.

**No Zod at the boundary.** `grep -c "zod\|z\." → 0`. All nine exported actions take typed objects and trust them at runtime; `ratePackItemAction` hand-checks the rating against a `Set` instead of parsing. `media/server/actions.ts` and `pack-generation/server/actions.ts` both do this correctly, so the pattern exists and this file is the outlier. This is the one finding with a security dimension: unvalidated ids reach ownership checks and Drizzle queries.

Recommended: move `computeNextStreak` to `features/packs/lib/streak.ts` (pure, testable), extract term-state propagation and review recording into `features/packs/server/review-service.ts`, leave thin validate-authorize-call-revalidate wrappers in `actions.ts`, and add per-action Zod schemas. This is the same decomposition just applied to `content-generation/workflow.ts`.

## 2. `queries.ts` files that own mutations

- `apps/web/src/features/curation/server/queries.ts:261,342,355,368,386,391` — `upsertCuratedEntryFromTmdb`, `setCuratedEntryPublishedState`, `setCuratedEntryFeaturedRank`, `reorderCuratedEntries`, `deleteCuratedEntryById`, `setCuratedEntryLevel`
- `apps/web/src/features/notifications/server/queries.ts:42,101,126,149,157,172,180` — reconcile, two create-notification functions, three read/dismiss mutations

`apps/web/AGENTS.md`: "`server/queries.ts` owns read models and ownership-aware reads." Both files are large mostly because writes live beside reads. Recommended: split writes into `server/mutations.ts` (or a named service module, e.g. `catalog-writer.ts`), keeping `queries.ts` read-only. Note the content-generation workflow imports `createPackReadyNotification` from the notifications `queries.ts` today, so that import moves with it.

## 3. TMDB integration is the last vendor client off the shared convention

**Client.** `apps/web/src/lib/integrations/tmdb/client.ts:26-51` uses raw `fetch` with no timeout, no retry, no `readJsonSafely`, and `res.json()` cast straight to a TypeScript interface with no Zod validation. The OpenSubtitles and NLP-service clients now use `fetchWithRetry` + `readJsonSafely` + schema validation from `lib/server/utils/request.ts`. TMDB also has no `TMDB_REQUEST_TIMEOUT_MS`, unlike its two siblings. It does use Next's `next: { revalidate }` cache, which the others cannot, so retry policy matters less — but an unbounded request and an unvalidated response are both real.

**Duplicated mapping.** The same TMDB-to-domain logic exists in several places:

- US certification extraction: `features/curation/server/queries.ts:57,69`, `features/media/server/queries.ts:96,139`, and inline again in `lib/integrations/tmdb/client.ts:106,117`
- Genre map construction (`Promise.all([getGenres("movie"), getGenres("tv")])` then an identical `Record<number,string>` build): `features/browse/server/queries.ts:26` and `features/curation/server/queries.ts:413`
- Snapshot/view normalization: `features/curation/server/queries.ts:46-162` (`normalizeMovieSnapshot`, `normalizeTvSnapshot`, `extractDecade`, …) parallels `features/media/server/queries.ts` (`mapMovieToView`, `mapTvToView`)

Recommended: add `lib/integrations/tmdb/certification.ts`, `lib/integrations/tmdb/genres.ts` (`getUnifiedGenreMap()`), and `lib/integrations/tmdb/mappers.ts`; have both features import them. Then bring the client onto `fetchWithRetry` + Zod contracts, mirroring the OpenSubtitles client. This is the closest remaining analogue of what the media-analysis refactor did for subtitles.

## 4. Feature slice violations

**Dual utils in `features/media`.** `apps/web/src/features/media/utils.ts` (32 lines: href building, language/country names) and `apps/web/src/features/media/lib/utils.ts` (153 lines: CEFR distribution, analysis labels, runtime formatting). The architecture doc already names this as a seam worth closing. Recommended: merge into `lib/`, splitting by topic (`lib/href.ts`, `lib/analysis-view.ts`) rather than one grab-bag `utils.ts`. Note `features/media/utils.test.ts` targets the root file and moves with it.

**Cross-feature CEFR imports.** `features/settings/server/actions.ts:8`, `features/settings/components/preferences-settings-card.tsx:31`, `features/settings/hooks/use-preferences-form.ts:7`, `features/settings/lib/utils.ts:1` import `CEFR_LEVELS` / `CefrLevel` from `@/features/assessment/types`, which merely re-exports `@/lib/domain/cefr`. Settings should not depend on the assessment feature for a domain constant. Recommended: import from `@/lib/domain/cefr` in all four files.

## 5. `pack-generation-panel.tsx` bypasses the documented form pattern

`apps/web/src/features/media/components/pack-generation-panel.tsx` (374 lines, `useState`-driven form at ~line 66)

The documented pattern is Zod schema in `types.ts` → `zodResolver` → `register`/`Controller` → submit gated on dirty → canonical reset from the action result. This dialog uses `const [form, setForm] = useState(generationDefaults)` with manual `vocabularyTypesAreValid` checking and no per-field error surface, even though `generationRequestSchema` already exists server-side in `lib/server/content-generation/contracts.ts`. It also lacks a `"use client"` directive (line 1) and works only because it is imported transitively from `media-detail-client.tsx`.

Recommended: extract `pack-generation-dialog.tsx` backed by react-hook-form and a client-safe schema in `features/media/types.ts` that mirrors the server schema; add the missing directive.

## 6. Oversized client components with extractable state

| File | Lines | State hooks | Extract |
|------|-------|-------------|---------|
| `features/settings/components/preferences-settings-card.tsx` | 498 | 0 (logic already in `use-preferences-form.ts`) | Split markup into generation / notification section components |
| `features/packs/components/pack-staging-client.tsx` | 381 | 5 `useState`, 1 `useEffect`, 1 `useTransition` | `usePackStagingState` hook (selection, filtering, optimistic updates) |
| `features/packs/components/study-session-card.tsx` | 377 | 0 (presentational) | Optional: rating bar subcomponent |
| `features/admin-users/components/admin-user-row.tsx` | 375 | 5 `useState`, 2 `useTransition` | Two dialog subcomponents; Zod for the limit field; drop local `formatDate` |
| `features/assessment/components/assessment-flow.tsx` | 368 | 10 `useState`, 2 `useEffect`, 2 `useTransition` | `useAssessmentFlow` hook + `assessment-result.tsx` |

`assessment-flow.tsx` is the strongest case: ten `useState` calls implementing a lifecycle that `study-session-client.tsx` already models cleanly with `useReducer`, and the feature has no `hooks/` directory even though `settings` demonstrates the pattern. `preferences-settings-card.tsx` is the weakest — it is repetitive `Controller`+`Select` markup, not tangled logic.

## 7. Trigger dispatch error handling duplicated

`features/media/server/actions.ts:70-89` and `:91-110`, `features/pack-generation/server/actions.ts:79-100`

Three copies of: `try tasks.trigger(...)` → catch → record a failed transition with `errorCode: "WORKFLOW_TRIGGER_FAILED"` and a copy-pasted `{ triggerApiUrl, triggerSecretConfigured }` payload. Recommended: one `dispatchWorkflow(taskId, payload, onFailure)` helper in `lib/server/trigger/dispatch.ts`; call sites become one-liners.

## 8. `json-contracts.ts` location forces a layering inversion

`apps/web/src/lib/server/db/json-contracts.ts`, imported by `lib/constants.ts:8`, `lib/domain/vocabulary.ts:2`, `lib/domain/contexts.ts:2`

`StoredCefrLevel`, `StoredVocabularyKind`, `NlpCandidateContext` and the preference enums are domain literals that merely happen to be persisted as JSONB, yet client-safe modules must reach into `lib/server/**` to get them. These are `import type` only, so there is no bundle risk today — the cost is conceptual, and it invites someone to add a runtime import along the same path. Recommended: move the shared literal unions to `lib/domain/types.ts` and keep genuinely DB-structural types (`JsonMap`, `TmdbRawPayload`, `WorkflowEventPayload`, `AssessmentAttemptState`, …) in place. Pre-existing, not introduced by the recent refactor.

## 9. Environment naming and coupling

- `CONTENT_GENERATION_IMAGE_PROVIDER` (`lib/config/env.ts:100`) holds a model/deployment name, consumed as `model:` in `providers/image/index.ts`. Siblings are named `CONTENT_GENERATION_TEXT_MODEL` and `ANALYSIS_LLM_MODEL`. Rename to `CONTENT_GENERATION_IMAGE_MODEL` (touches env, the image facade, `trigger.config.ts`, Doppler, README). The provider chapter of the architecture doc currently explains the mismatch instead — renaming would let that paragraph go.
- `TEXT_LLM_PROVIDER` drives provider selection for **both** pack text generation (`providers/text/index.ts`) and subtitle phrase extraction (`providers/analysis-llm/index.ts`), while their model names are already independent. Splitting into `CONTENT_GENERATION_LLM_PROVIDER` and `ANALYSIS_LLM_PROVIDER` is cheap and should happen before either pipeline gains a third provider. Until then the coupling deserves one line in `apps/web/AGENTS.md`.

## 10. Documentation drift

- `README.md:20` and `AGENTS.md:13,44` describe `apps/scripts` as a repository surface. It does not exist — `apps/` contains only `nlp_service` and `web`. Remove the references.
- Env vars validated by `lib/config/env.ts` but absent from `README.md` and `apps/web/AGENTS.md`: `NLP_SERVICE_API_KEY` (**required** — `z.string().min(1)`), `TEXT_LLM_PROVIDER`, `ANALYSIS_LLM_MODEL`, `CONTENT_GENERATION_TEXT_MODEL`, `CONTENT_GENERATION_IMAGE_ENABLED`, `CONTENT_GENERATION_IMAGE_PROVIDER`, `AZURE_AI_FOUNDRY_ENDPOINT`, `AZURE_AI_FOUNDRY_API_KEY`, `AZURE_AI_FOUNDRY_MODEL`. A missing required var fails typecheck, dev and build, so this one bites new contributors immediately.
- `AGENTS.md` ("Validation") and `apps/web/AGENTS.md` ("Validation Expectations") both say there is no test suite and to not claim one exists. There is now: Vitest is configured (`apps/web/vitest.config.ts`), `pnpm test` runs 74 tests across 8 files. Update both to describe what exists and what it covers.

## 11. Missing tests on the highest-risk pure logic

Has tests: `features/packs/server/srs.ts`, `features/assessment/utils.ts`, `features/curation/utils.ts`, `features/media/utils.ts`, `features/pack-generation/utils.ts`, `lib/integrations/tmdb/contracts.ts`, `lib/domain/cefr.ts`, `lib/domain/contexts.ts`.

Missing, in rough order of payoff:

1. `lib/server/media-analysis/subtitles/chunks.ts` — pure boundary arithmetic (exact-limit, single line, empty input). Needs `vi.mock("server-only")`, as the deleted `contracts.test.ts` did.
2. `features/packs/server/study-time.ts` — timezone day-key arithmetic against a fixed `APP_TIME_ZONE`; the classic source of off-by-one-day review bugs.
3. `computeNextStreak` — untestable where it currently sits (see finding 1); testable once extracted.
4. `lib/server/media-analysis/merge.ts` — pure over its inputs; needs small fixture objects.
5. `lib/server/content-generation/selection.ts` — the scoring and CEFR-window functions are pure but wrapped in a DB query; extracting them enables tests.

## 12. NLP service contract can drift silently

`apps/nlp_service/app/schemas/responses.py` and `apps/web/src/lib/integrations/nlp-service/contracts.ts`

The Pydantic response model and the Zod schema are maintained independently. The Zod `safeParse` catches drift, but only at runtime inside a Trigger.dev run, reported as "NLP service returned an invalid response contract." Recommended (demo-appropriate): have the Python test suite emit a JSON fixture of a representative response and add a web-side test that parses it with `nlpAnalysisResponseSchema`. That turns a workflow failure into a test failure. *Not independently verified beyond confirming both files define the contract separately.*

## 13. Small duplications and dead code

- `function formatDate` defined locally in `features/admin-users/components/admin-user-row.tsx:52` and `features/pack-generation/components/generation-progress-client.tsx:22`, with different locale arguments. `lib/primitives/dates.ts` has `formatRelativeTime` but no absolute formatter — add one and delete both copies.
- Alias re-exports of the same domain constants: `features/media/lib/utils.ts:7-9` (`VOCABULARY_KIND_LABELS as VOCABULARY_TYPE_LABELS`, `VOCABULARY_KINDS as GENERATION_VOCABULARY_TYPES`) and `features/settings/lib/utils.ts:14` (`as vocabularyTypeLabels`). Three names for two constants. Import from `@/lib/domain/vocabulary` directly.
- `features/packs/lib/format.ts` is a one-line re-export of `formatRelativeTime` with a single consumer (`deck-row.tsx:8`). Delete it.
- Dead exports (verified: no references outside their defining file): `getGenerationStatusCopy` (`features/pack-generation/utils.ts:112`), `ANALYSIS_STAGE_LABELS` (`features/media/lib/utils.ts:13`), and `getFallbackContentLevel` (`features/media/lib/utils.ts:95`, used only internally — drop the `export`).
- `lib/constants.ts` mixes domain literals, SRS config, pipeline tunables and UI class strings (`SETTINGS_CARD_CLASS` and friends). The file is still navigable at ~185 lines with section headers; the cheap improvement is moving the UI class strings to `lib/ui/settings-card.ts`, since they are the only non-primitive exports.

## 14. One-line cleanups

- `lib/integrations/storage/r2.ts:18-24` uses a hand-rolled `ensureServerOnly()` runtime check instead of `import "server-only"`, which is what every other server module uses and what fails at build time rather than at request time.
- `apps/web/src/app/api/artifacts/[id]/` is an empty directory, orphaned by the move to `api/pack-artifacts/[id]`. Delete it.
- `features/admin-tools/server/actions.ts:125,142,227,250` use `revalidatePath("/", "layout")` four times. Justified for global clears; for the media-scoped branches, revalidate the affected routes instead.
- `features/assessment/server/actions.ts:32,83` use `getSessionOrNull()` plus a manual `if (!session?.user)` guard in two write actions. `requireSession()` is the documented guard for signed-in mutations; the manual form is the only instance in the codebase.
- `features/packs/server/study-time.ts:1` marks pure UTC/`Intl` date arithmetic as `server-only`, which blocks both client reuse (review countdowns) and straightforward testing. Move to `features/packs/lib/study-time.ts`.
- `lib/server/db/schema.ts:539` — `contentAnalysisItem.isSelectable` is filtered on every selection query (`content-generation/selection.ts`) but is not part of any index. A partial index on `(analysisRunId, contentId) WHERE is_selectable` would help at scale; irrelevant at demo data volumes. *Performance claim not measured.*

---

## Resolution status (2026-07-28)

All fourteen findings were remediated in the follow-up commit, except where noted.

| # | Status | Notes |
|---|--------|-------|
| 1 | Fixed | actions.ts 646 → 399 lines; `lib/streak.ts`, `server/review-service.ts`, `server/term-state-service.ts`; Zod `safeParse` on every action returning the previous error strings |
| 2 | Fixed | `curation/server/mutations.ts` and `notifications/server/mutations.ts`; both `queries.ts` are read-only with no compatibility re-exports |
| 3 | Fixed | `tmdb/{certification,genres,mappers}.ts`; client has a timeout and Zod validation, detail schemas are loose so `content.tmdbRaw` still stores full payloads; Next caching retained |
| 4 | Fixed | `media/lib/{href,analysis-view}.ts`, root `utils.ts` deleted; settings imports CEFR from `lib/domain/cefr` |
| 5 | Fixed | `pack-generation-dialog.tsx` on react-hook-form + Zod, `"use client"` added; empty custom instructions still serialize to `null` |
| 6 | Fixed | assessment 368 → 156 (+`use-assessment-flow`), admin-user-row 375 → 245, pack-staging 381 → 252 (+`use-pack-staging`), preferences card 498 → 57 (+2 sections), study-session-card 377 → 304 |
| 7 | Fixed | `lib/server/trigger/dispatch.ts`, three call sites rewritten |
| 8 | Fixed | `lib/domain/types.ts`; `constants.ts` and `lib/domain/*` no longer import from `lib/server/**` |
| 9 | Fixed | `CONTENT_GENERATION_IMAGE_MODEL`, `CONTENT_GENERATION_LLM_PROVIDER`, `ANALYSIS_LLM_PROVIDER`, with the old names kept as deprecated fallbacks so existing Doppler/Vercel config keeps working |
| 10 | Fixed | `apps/scripts` references removed; env lists completed in README and both AGENTS.md; test-suite claims corrected |
| 11 | Fixed | New tests for chunking, merge, selection ranking, streak and study-time; suite is 143 tests across 14 files |
| 12 | Partial | A committed JSON fixture is validated against `nlpAnalysisResponseSchema`, and the request payload defaults are asserted. The fixture is hand-maintained — generating it from the Python test suite is still open |
| 13 | Fixed | `formatAbsoluteDate` in `lib/primitives/dates.ts`; alias re-exports, `packs/lib/format.ts` and the three dead exports removed; UI class strings moved to `lib/ui/settings-card.ts` |
| 14 | Fixed except the index | r2 uses `server-only`; empty route dir deleted; media-scoped admin clears revalidate deck/dashboard/pack/study/media; assessment actions keep the `ActionResult` contract via `getSessionOrNull`; `study-time.ts` moved to `packs/lib/`. **Deferred:** the `contentAnalysisItem.isSelectable` partial index needs a Drizzle migration and database access, and the payoff is unmeasured at demo data volumes |

Two adversarial reviews were run over the remediation. Regressions they caught and that are now fixed: empty custom instructions serializing as `""` instead of `null`, `requireSession()` breaking the assessment `ActionResult` contract, over-narrowed admin revalidation, `ZodError` escaping the pack actions instead of returning a result, strict TMDB schemas silently stripping fields destined for `tmdbRaw`, and the movie certification safety filter loosening from "any US rating" to "first US rating".

Operational follow-up for the repo owner: the new env names are optional and fall back to the deprecated ones, so nothing breaks, but `CONTENT_GENERATION_LLM_PROVIDER`, `ANALYSIS_LLM_PROVIDER` and `CONTENT_GENERATION_IMAGE_MODEL` should be added to Doppler and Vercel before the deprecated names are removed.
