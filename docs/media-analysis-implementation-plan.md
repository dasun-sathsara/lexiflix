# Media Page Analysis Implementation Plan

## Overview

This document replaces the earlier draft plan for the linguistic overview page at `apps/web/src/app/(app)/media/[id]/page.tsx`.

The previous version had the right broad direction, but it was not execution-safe. It glossed over run idempotency, schema constraints, retry behavior, and the actual durable analysis unit supported by the database.

This version is intended to be implementable by an autonomous agent without inventing missing architecture along the way.

## Goal

Implement the reusable subtitle-analysis workflow that powers the media page's linguistic overview.

That workflow must:

- resolve a durable `content` row for the selected title
- reuse a compatible `content_analysis_run` when one already exists
- create and trigger a new analysis run when no compatible run exists
- fetch subtitles transiently
- run the narrow Python NLP service for vocabulary analysis
- run Gemini for phrase-level extraction and classification
- persist reusable derived facts in Postgres
- expose stage-based progress and final results to the Next.js UI

This plan covers only reusable content analysis.

It does not cover:

- pack generation
- learner-specific study material generation
- WebSocket or streaming progress
- storing raw subtitle files in Postgres

## Durable Architectural Decisions

These decisions are fixed for this implementation:

1. The web app remains the only public application surface.
2. Trigger.dev owns orchestration, not durable product truth.
3. Postgres remains the source of truth for content-analysis state.
4. The Python service remains a narrow stateless compute dependency.
5. Gemini calls must go through an internal adapter layer, not be scattered directly through route code or workflow files.
6. Subtitle files are transient workflow input and are not stored durably.
7. Reusable analysis is cached by `content_id + pipeline_fingerprint`.

## Durable Analysis Unit

This is the first place the old plan was sloppy.

The database does not support an episode-level `content` entity. The current `content` table supports only:

- `movie`
- `season`

That means the reusable analysis unit must also be one of those two:

- movie subtitle corpus for movies
- season subtitle corpus for TV content

The workflow must not invent episode rows or treat a bare TV show page as analyzable without first resolving a concrete season-level `content` row.

Practical consequence:

- for movies, the media page can trigger analysis directly once the `content` row exists
- for TV content, analysis starts only after the app resolves a concrete season target

If the current UI does not yet support season selection on the media page, that UI work is a dependency, not something the workflow should paper over with episode-level shortcuts.

## Current State

At the time of writing:

- `apps/web/src/app/(app)/media/[id]/page.tsx` is still mock-driven
- `content_analysis_run`, `content_analysis_run_event`, `vocabulary_term`, and `content_analysis_item` already exist in the schema
- `@google/genai` and `srt-parser-2` are already installed in `apps/web`
- environment validation does not yet include the subtitle-analysis integration variables
- there is no implemented Trigger.dev analysis workflow yet
- there is no implemented Gemini adapter yet for this feature

## Required Integration Surfaces

The implementation needs these surfaces before the feature is complete.

### 1. Environment Validation

Add the required server env vars to `apps/web/src/lib/env.ts`.

Required values:

- `OPENSUBTITLES_API_KEY`
- `OPENSUBTITLES_USERNAME`
- `OPENSUBTITLES_PASSWORD`
- `GEMINI_API_KEY`
- `NLP_SERVICE_BASE_URL`
- any Trigger.dev env required by the chosen local/cloud setup

Do not leave these as undocumented ad hoc `process.env` reads inside random files.

### 2. Gemini Analysis Adapter

Create one internal adapter in the web app for the analysis LLM pass.

Responsibilities:

- construct prompts and schemas
- own the analysis prompt version
- support live, record, replay, and mock execution modes as described in `docs/architecture.md`
- normalize Gemini output into a typed internal contract
- keep Gemini-specific details out of route files and most workflow code

The workflow should depend on this adapter, not on raw `@google/genai` calls.

### 3. OpenSubtitles Client

Create a dedicated integration module for:

- authentication
- subtitle search
- subtitle download
- normalization of external failure modes into internal error codes

Do not inline OpenSubtitles HTTP calls throughout the workflow implementation.

### 4. NLP Service Client

Create a single server-side integration module for the Python service call.

Responsibilities:

- build the request payload
- call `POST /api/v1/analyze`
- validate the response contract
- normalize transport and service failures

## Data Model Constraints That Must Drive The Design

This is the second place the old plan was weak.

### `content_analysis_run`

`content_analysis_run` is unique on `(content_id, pipeline_fingerprint)`.

That means:

- run creation must be idempotent
- concurrent page opens must not create duplicate runs
- failed runs need an explicit replacement policy

### `content_analysis_item`

`content_analysis_item` is unique on `(analysis_run_id, term_id)`.

That means:

- there is exactly one reusable item row per canonical term within a run
- the workflow cannot blindly insert one NLP row and one Gemini row for the same canonical term

### `vocabulary_term`

`vocabulary_term` is unique on `(kind, normalized_text)`.

That means term normalization is not optional. The workflow needs deterministic normalization before upsert.

## Source Ownership And Merge Contract

The old plan treated merge as a vague post-processing step. That is not acceptable because the schema is opinionated.

For this implementation:

- the NLP service owns `word` candidates
- Gemini owns `phrasal_verb`, `idiom`, and `slang` candidates

This avoids most same-term same-kind collisions between the two pipelines and aligns with their strengths.

Rules:

1. NLP output is persisted as `analysis_source = 'nlp'` for `word` terms only.
2. Gemini output is persisted as `analysis_source = 'analysis_llm'` for `phrasal_verb`, `idiom`, and `slang`.
3. If either pipeline emits a shape outside its owned vocabulary kinds, the first implementation should drop that candidate and record a warning rather than stretching the schema.
4. `content_analysis_item` remains one row per `(run, term)`.
5. `representative_context` is the first stable, human-readable context chosen for UI display.
6. `contexts` should preserve the current NLP-service context shape where available. For Gemini phrase items, store only what the current contract can represent cleanly.

If later product requirements demand multi-source provenance for the same term, that is a schema evolution topic. It is not something to fake in this first implementation.

## Pipeline Fingerprint Contract

The pipeline fingerprint must be deterministic and owned by application code.

It should include at minimum:

- NLP pipeline version
- analysis LLM pipeline version
- analysis prompt version
- normalization/chunking strategy version

The fingerprint must not depend on transient values such as timestamps, request ids, or subtitle download urls.

The point of the fingerprint is simple:

- if code changes in a way that should invalidate cached analysis, the fingerprint changes
- if code has not changed meaningfully, the same content reuses the same cached run

## Run Creation And Reuse Contract

This is non-negotiable.

The app must never implement `if missing then insert` as two loose steps without collision handling.

Required flow:

1. Resolve or create the durable `content` row first.
2. Compute the pipeline fingerprint.
3. Attempt to find an existing `content_analysis_run` for `(content_id, pipeline_fingerprint)`.
4. If a run exists:
   - `completed`: reuse it
   - `queued` or `running`: reuse it and poll it
   - `failed`: apply the retry policy below
5. If no run exists, create one transactionally and then trigger the workflow once.

Implementation note:

- use a transaction and/or insert-with-conflict-safe-reload pattern
- the action should return the durable `runId`, not just a media id
- polling should target the resolved run

## Retry And Failure Policy

The earlier plan treated failure as mostly `NO_SUBTITLES`. Real systems fail in more ways than that.

Define these error classes:

- `NO_SUBTITLES`
- `SUBTITLE_PROVIDER_ERROR`
- `SUBTITLE_PARSE_ERROR`
- `NLP_SERVICE_ERROR`
- `ANALYSIS_LLM_ERROR`
- `PERSISTENCE_ERROR`

Behavior:

1. Permanent no-subtitle failures can remain on the existing run until the fingerprint changes or a manual retry is explicitly requested.
2. Transient external failures should be retryable.
3. A retry after a transient failure should create a new run only if the application deliberately marks the failed run as superseded or uses an explicit force-retry path.

Because the table is unique on `(content_id, pipeline_fingerprint)`, the application must choose one of these approaches before implementation:

- update and reuse the failed row for a retry, or
- delete/recreate in a controlled transaction before retriggering

For the first implementation, the simpler path is:

- reuse the same failed row for manual retry
- reset status/stage/error fields before retriggering
- do not create a second row with the same fingerprint

## Workflow Stages

Use the existing coarse durable stages already modeled in the schema:

- `queued`
- `fetching_subtitles`
- `running_nlp`
- `running_llm`
- `merging_analysis`
- `saving_analysis`
- `completed`
- `failed`

Each stage transition should:

- update the main `content_analysis_run` row
- append a `content_analysis_run_event` row
- include a concise human-readable message

Do not fabricate percentages. Stage-based progress is enough.

## Subtitle Fetching Strategy

Use OpenSubtitles as the runtime subtitle source.

Execution shape inside the workflow:

1. Authenticate.
2. Search for an English subtitle file using the resolved content unit:
   - movie by TMDB movie id
   - season-compatible TV lookup based on the resolved season-level content target
3. Choose a concrete subtitle file.
4. Request a download link.
5. Fetch the `.srt` text.
6. Parse and normalize the subtitle text in memory.

Rules:

- do not store raw subtitle bodies durably
- record operational warnings where subtitle quality is poor
- fail with `NO_SUBTITLES` only when the provider successfully responds but no compatible English subtitle is available

## Chunking Strategy For Gemini

Chunking should be deterministic and versioned as part of the pipeline fingerprint.

Use `srt-parser-2` to parse blocks, then group them with these rules:

- target a bounded chunk size based on elapsed subtitle time, not arbitrary token count alone
- avoid splitting immediately before the next block if the current block does not appear to end a sentence
- allow chunk closure on clear sentence endings or meaningful time gaps
- keep chunk ordering stable

The workflow may process Gemini chunks in parallel, but the merge step must remain deterministic.

For each chunk:

- send only the text needed for phrase extraction
- request structured JSON output
- validate the response against the internal adapter schema

## Persistence Contract

Persistence should happen in this order:

1. Upsert or resolve canonical `vocabulary_term` rows.
2. Build final reusable `content_analysis_item` rows.
3. Compute and persist `content_analysis_run.summary`.
4. Mark the run `completed` only after all durable writes succeed.

The workflow must not mark a run completed and then attempt best-effort inserts afterwards.

Summary should include at least:

- total word count
- unique lemma count
- extracted item count
- selectable item count
- kind counts
- CEFR distribution
- average CEFR level when derivable
- speech rate when derivable
- subtitle line count

## UI And Server Action Contract

The media page should stop pretending.

### Server-rendered initial load

The page should load:

- TMDB-backed durable `content` data, creating or refreshing the `content` row when needed
- the best matching reusable analysis run for the current content and fingerprint
- final summary and extracted items if the run is completed

### Server Actions

Implement at minimum:

- `startAnalysisAction(input)`:
  - resolves the `content` target
  - computes the fingerprint
  - reuses or creates the run
  - triggers the workflow when needed
  - returns `{ runId, status, stage }`

- `getAnalysisStatusAction(runId)`:
  - returns the current durable status for that run
  - includes summary and failure details when available
  - is safe to poll from the client

Poll by `runId`, not by a bare media id.

### UI States

The page must support:

- no reusable analysis yet
- queued/running analysis
- completed reusable analysis
- failed reusable analysis with a user-friendly message

Friendly copy matters, but durable state matters more. The UI should not infer fake progress from timers.

## Five Sequential Execution Stages

Execute the work in this exact order.

### Stage 1. Build The Integration Foundation

Objective:
Create all external integration surfaces before touching orchestration or UI.

Work:

1. Add missing server env validation and any related docs updates.
2. Add the OpenSubtitles integration module.
3. Add the NLP service client.
4. Add the Gemini analysis adapter with versioned prompt/schema handling.
5. Add shared pipeline fingerprint utilities.

Done when:

- the web app has typed, centralized integrations for subtitles, NLP, and Gemini
- the fingerprint can be computed deterministically in application code
- no planned workflow step depends on ad hoc `process.env` reads or raw provider calls

### Stage 2. Implement Durable Run Control

Objective:
Make run creation, reuse, retry, and polling safe before any background job is wired in.

Work:

1. Add server-side helpers to resolve or create the durable `content` target.
2. Add run lookup by `contentId + pipelineFingerprint`.
3. Add idempotent run creation with collision-safe reload behavior.
4. Add retry/reset behavior for failed reusable analysis runs.
5. Add helpers to write stage transitions into both `content_analysis_run` and `content_analysis_run_event`.

Done when:

- concurrent requests cannot create duplicate analysis runs
- the application can always return one durable `runId` for the current analysis target
- failed runs have a defined retry path

### Stage 3. Implement The Trigger.dev Analysis Workflow

Objective:
Build the real reusable analysis pipeline end to end behind the durable run model.

Work:

1. Create the `analyze-media-subtitles` workflow.
2. Implement subtitle fetch, parse, and normalization.
3. Implement the NLP analysis step.
4. Implement Gemini chunking and extraction through the adapter.
5. Implement deterministic merge and persistence.
6. Implement durable success and failure transitions.

Done when:

- one workflow execution can move a run from `queued` to `completed` or `failed`
- subtitle, NLP, Gemini, merge, and persistence steps all update durable stage state
- the workflow persists schema-safe reusable outputs rather than mock data

### Stage 4. Refactor The Media Page To Use Durable State

Objective:
Replace the mock overview page with real server-loaded analysis data and client polling.

Work:

1. Refactor `apps/web/src/app/(app)/media/[id]/page.tsx` away from mock-only behavior.
2. Split server-loaded data from client polling UI.
3. Implement and wire `startAnalysisAction`.
4. Implement and wire `getAnalysisStatusAction(runId)`.
5. Render completed, in-progress, and failed analysis states from Postgres-backed run state.

Done when:

- the page starts analysis through the app, not fake timers
- the client polls by `runId`
- completed analysis renders real summary and extracted-item data from the database

### Stage 5. Validate The Full Flow

Objective:
Prove that the feature works as a product flow, not just as isolated code paths.

Work:

1. Run `task web:typecheck`.
2. Run `task web:lint`.
3. Manually verify:
   - first-time analysis trigger
   - in-progress polling
   - completed cached run reuse
   - no-subtitles failure
   - retry after a transient failure

Done when:

- typecheck and lint pass
- the media page shows durable progress and final results
- rerunning the same content under the same fingerprint reuses the existing run instead of creating a duplicate

## Explicit Non-Goals

To avoid architecture drift, this implementation must not:

- make the browser call Trigger.dev directly
- make the browser call the Python service directly
- store raw subtitle files in Postgres
- invent episode-level durable content rows
- introduce WebSockets just for progress
- couple the UI to provider-specific Gemini or OpenSubtitles response shapes
- blend reusable analysis with learner-specific pack-generation logic

## Deliverable Standard

The feature is not done when the workflow merely runs once.

It is done when:

- the page renders real durable analysis data
- concurrent opens do not create duplicate runs
- failed runs have a defined retry path
- source ownership and merge semantics are consistent with the schema
- the UI polls durable run state rather than simulating progress
- the implementation stays inside the architecture already defined for LexiFlix
