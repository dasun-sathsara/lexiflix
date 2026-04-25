# Manual Golden-Path Runbook

## Purpose

This is the acceptance gate for the current product-hardening slice. Typecheck and lint prove the code is statically coherent; this runbook proves the real text-first product path works across the web app, Trigger.dev, NLP service, database, storage, subtitle retrieval, and Gemini.

## Current Capability Boundaries

- Pronunciation audio is provider-ready but not provider-complete. `CONTENT_GENERATION_AUDIO_MODE=mock` may create non-playable mock payloads, and non-mock modes can warn until a real TTS provider is chosen.
- Image generation is schema-ready but not provider-ready. `CONTENT_GENERATION_IMAGE_ENABLED=true` only means the workflow may attempt the image path; it is not proof that a real ImageGen provider exists.
- `pack_item.state = 'due'` must not be persisted. Due status is effective state derived from `dueAt <= now` for active non-new, non-mastered cards.

## Setup

Run these from the repository root unless noted otherwise:

```bash
task web:typecheck
task web:lint
task nlp:typecheck
task nlp:lint
```

Start the local services in separate terminals:

```bash
task web:dev
task nlp:dev
cd apps/web && pnpm trigger.dev
```

If the Trigger.dev command changes, use the project-local Trigger.dev script from `apps/web/package.json`; do not replace Trigger.dev with a second queue or local orchestration system.

## Golden Path

1. Sign in to the web app with a learner account.
2. Confirm the learner has a usable CEFR source: either no assessment, a stored assessment, or a manual override depending on the scenario being tested.
3. Open a known movie page.
4. Start reusable subtitle analysis.
5. Confirm the media page progresses through queued/running states and lands on completed, or shows a usable failure if subtitles are unavailable.
6. Confirm persisted `content_analysis_item` rows include a real mix where available: `word`, `phrasal_verb`, `idiom`, and `slang`.
7. Start pack generation from the media page dialog.
8. In the dialog, choose vocabulary types, CEFR window, known-term handling, pack size, example count, and custom instructions.
9. Confirm the persisted generation job request snapshot exactly matches the submitted dialog values.
10. Open the dedicated `/generation/[jobId]` progress page and confirm it reflects the same job state.
11. When generation completes, open `/pack/[id]`.
12. Confirm the pack renders generated meanings and examples from persisted `pack_item_content`.
13. Accept missing audio, missing images, or explicit provider warnings as expected current behavior unless the demo explicitly promises those assets.
14. Review one card in `/study/[id]`.
15. Confirm one `review_event` row was written, the matching `pack_item` scheduling fields changed, and `user_term_state` was updated.
16. Confirm `/dashboard`, `/decks`, and notification state reflect the reviewed/generated pack.
17. Run the invariant check below.

## Invariant Checks

Use database tooling with the configured development database. Do not print connection strings or secret values.

```sql
select count(*) as persisted_due_pack_items
from pack_item
where state = 'due';
```

Expected result: `0`.

```sql
select request_snapshot
from pack_generation_job
order by created_at desc
limit 1;
```

Expected result: `selectedVocabularyTypes`, `cefrWindowMode`, `packSize`, `knownTermHandling`, `exampleSentenceCount`, and `customInstructions` match the submitted dialog.

## TV Season Spot Check

Repeat the analysis start path on a TV title with a selected season. Confirm TMDB season resolution and OpenSubtitles lookup both use the selected season rather than a show-level fallback.
