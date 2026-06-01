# Software Requirements Specification

## Purpose

This document defines the current functional scope and key constraints for LexiFlix. It is written for the system that is actually being built, not for a hypothetical production platform.

LexiFlix is a university demo web application that helps English learners prepare for a movie or TV title before watching it elsewhere. It analyzes subtitle text, shows a reusable linguistic overview, and generates a user-specific study pack on demand.

## Scope

In scope:

- title search and selection using TMDB metadata
- learner CEFR assessment and settings
- reusable subtitle-based content analysis
- user-specific pack generation from stored analysis
- study and review of generated pack items

Out of scope:

- video streaming or subtitle playback
- user-uploaded subtitle files in V1
- storing subtitle files as durable product records
- enterprise-grade operations, multi-provider AI routing, or multi-tenant admin tooling

## System Summary

LexiFlix has one public application surface: `apps/web`.

Core system roles:

- `apps/web`
  Owns UI, auth, route handlers, and durable product state.
- Trigger.dev
  Orchestrates long-running analysis and generation workflows.
- `apps/nlp_service`
  Performs NLP extraction only.
- Postgres
  Stores durable application truth.
- R2
  Stores generated binary artifacts such as audio and images.

Important architectural boundary:

- fetched subtitles are transient workflow input in V1
- only derived analysis and generated outputs are stored

## Primary Users

### Learner

Uses the product to:

- search or open a title
- view the linguistic overview
- generate a study pack
- study and review generated items

### Administrator

Minimal operational role for demo support only.

## Functional Requirements

### 1. Authentication And Learner Identity

1. The system shall support account creation and sign-in through the web application.
2. The system shall persist learner-owned state separately per user.
3. The browser shall not communicate directly with internal workflows or the NLP service.

### 2. Title Discovery And Catalog Caching

1. The system shall allow users to search for movies and TV content using TMDB.
2. The system shall display core metadata such as title, artwork, year, and overview.
3. The system shall not persist every TMDB search result automatically.
4. The system shall create or refresh a durable `content` row only when a title enters the product flow, such as:
   - a curated title is seeded
   - a user opens the media detail page
   - a downstream workflow needs the title

### 3. Learner Level

1. The system shall support a CEFR-oriented placement assessment.
2. The system shall store an assessed or manually set learner level.
3. The system shall allow the learner to update or retake their level later.

### 4. Reusable Content Analysis

1. When a learner opens a title detail page, the system shall check whether reusable analysis already exists for that title and the current analysis pipeline fingerprint.
2. If reusable analysis does not exist, the system shall fetch subtitles transiently and start a content analysis workflow.
3. The content analysis workflow shall run:
   - the NLP pipeline for tokenization, lemmatization, filtering, and candidate extraction
   - the analysis LLM pipeline for batched extraction and classification of idioms, phrasal verbs, and slang
4. The system shall persist reusable analysis output in the database.
5. The system shall persist run status and stage events so the frontend can poll analysis progress.
6. The system shall reuse stored analysis across users until the cached analysis is invalidated or the analysis pipeline fingerprint changes.

### 5. Media Overview Page

1. The media detail page shall render from persisted content metadata plus persisted reusable analysis.
2. The page shall show a linguistic overview derived from stored analysis, including:
   - content difficulty indicators
   - extracted term counts
   - phrase or idiom-related counts
   - learner-versus-content challenge signal
3. The page shall not require pack generation to display reusable analysis data.
4. If analysis is still running, the page shall show stage-based progress instead of final metrics.

### 6. Pack Generation

1. Pack generation shall begin only after the learner explicitly requests it.
2. Before generation starts, the system shall allow the learner to choose generation preferences such as vocabulary type selection, CEFR selection mode, pack size, known-term handling, example count, and custom instructions.
3. Pack generation shall read from stored reusable analysis rather than re-running subtitle fetch, NLP analysis, or analysis LLM extraction.
4. The system shall select candidate items based on learner state, learner level, and generation preferences.
5. The system shall generate meanings and example sentences with an LLM.
6. In V1, the system shall generate meanings in English only.
7. In V1, the system shall generate newly written example sentences rather than reusing subtitle excerpts.
8. In V1, the default example count shall be one per item, with request-time configuration allowed up to three.
9. The system shall generate pronunciation audio for pack items.
10. In V1, pronunciation audio shall cover both the vocabulary item and generated example sentences.
11. Audio generation shall be treated as best-effort in V1 and missing audio shall result in warnings rather than total pack failure.
12. The system may generate contextual imagery when that feature is enabled.
13. In V1, contextual imagery shall remain env-gated rather than learner-configurable by default.
14. Image generation shall be best-effort in V1.
15. The system shall store generated pack content as user-specific output.
16. Generated pack content may be adapted to the learner’s current CEFR level at generation time.
17. The system shall persist pack generation job state and progress events for polling.
18. The system shall prevent accidental duplicate generation requests through idempotent handling.
19. The system shall enforce a server-side hard cap of `100` items per generation request in V1.
20. V1 CEFR selection modes shall be `same_level`, `one_level_above`, and `all_levels_above`.
21. V1 known-term handling modes shall be `exclude_known`, `downrank_known`, and `include_known`.

### 7. Study Experience

1. The system shall present generated pack items with learner-facing study content.
2. The system shall support playback of generated pronunciation audio.
3. The system shall track learner progress within a generated pack.
4. In V1, long-running generation progress shall be accessible both from a dedicated progress view and from the decks surface through one shared app-owned polling contract.
5. The system shall provide a generated pack staging surface at `/pack/[id]`.
6. The system shall provide a generated decks surface at `/decks`.
7. The system shall provide a study session surface at `/study/[id]`.
8. These pack, decks, and study surfaces shall render persisted generated pack data rather than mock pack data.
9. These surfaces shall verify that the signed-in learner owns the requested pack before exposing pack content.
10. The staging surface shall support pack-local soft removal of cards.
11. The staging surface shall support pack reset that restores removed cards and clears mutable pack scheduling fields.
12. Pack reset shall not delete immutable review history or rewrite cross-pack learner term state.
13. The study surface shall support opening a specific active card with `?card=<packItemId>`.
14. The default study queue shall exclude mastered and removed cards.
15. The normal study queue shall include due reviews before new cards and shall not include future learning cards before `dueAt <= now`.
16. New-card study shall be capped by the learner's remaining `newCardsPerDay` allowance.
17. The study surface shall support due, new, preview, and cram modes.
18. The staging surface shall support restoring a removed card and resetting one card without deleting review history.
19. The staging surface shall support term-level mark known, mark learning, ignore globally, and unignore actions.

### 8. Review And Ongoing Learner State

1. The system shall support a review flow for generated pack items.
2. The system shall record immutable review events.
3. The system shall maintain learner term state across packs for the same canonical term.
4. The system shall maintain a learner streak summary.
5. A successful review rating shall create exactly one immutable `review_event` row.
6. A successful review rating shall update pack-local scheduling fields on `pack_item`.
7. A successful review rating shall update cross-pack learner knowledge in `user_term_state`.
8. A successful review rating shall update the learner streak snapshot in `user_streak`.
9. Removed cards shall be rejected from review rating actions.
10. In V1, review scheduling shall use an Anki-inspired legacy SM-2 baseline rather than FSRS.
11. In V1, effective due status shall be computed from `dueAt <= now` for active non-new, non-mastered cards.
12. In V1, `pack_item.state` shall remain a lifecycle state rather than a persisted clock-driven due state.
13. In V1, `user_term_state.state = 'known'` shall be set only when the mastery threshold is met.
14. In V1, streak day boundaries shall use one shared server-side app-day helper.
15. A globally known term shall be demoted to learning by an `again` rating or explicit mark-learning action.
16. Marking or mastering a term as known shall propagate mastery to matching active cards for that learner.
17. Ignored terms shall be excluded from default study queues and future generation by default.

### 9. Dashboard

1. The dashboard shall read persisted learner state rather than mock pack or review data.
2. The dashboard shall derive current streak from `user_streak`.
3. The dashboard shall derive known term count from `user_term_state`.
4. The dashboard shall derive due review counts from effective pack-card due state.
5. The dashboard shall derive weekly completed reviews from `review_event`.
6. The dashboard shall use "Reviews This Week" instead of a mock "Time Spent" stat.
7. The dashboard shall route the primary study CTA to the first due study pack when due cards exist.
8. The dashboard shall route the primary CTA to `/decks` when packs exist but no cards are due.
9. The dashboard shall route the primary CTA to `/browse` when the learner has no packs.
10. The dashboard shall show due reviews, new cards available today, new cards completed today, and the next learning step.

### 10. Notifications And Preferences

1. The system shall store learner preferences relevant to study and generation defaults.
2. The system shall support notification records for events such as pack completion or due reviews.
3. Due-review notifications shall reconcile from the shared study plan and dedupe by app day.
4. Reading or dismissing a notification shall not mark reviews complete.

## Core Data Requirements

The system shall preserve these boundaries in the data model:

- `content` stores canonical title metadata for titles that entered the product flow
- `content_analysis_run` and `content_analysis_item` store reusable title analysis
- `pack_generation_job` stores learner-specific generation workflow state
- `pack`, `pack_item`, and `pack_item_content` store learner-specific generated outputs
- `pack_item_content` is not reusable across users
- `review_event` and `user_term_state` store ongoing learner study history and knowledge state

## External Dependencies

The current system depends on:

- TMDB for title metadata
- OpenSubtitles for subtitle retrieval during analysis
- Gemini for LLM-powered analysis and generation
- an internal FastAPI NLP service for subtitle analysis
- Postgres for durable product state
- R2 for generated binary artifacts

## Non-Functional Requirements

Only the requirements that materially affect the current architecture are kept here.

1. Long-running analysis and generation shall execute asynchronously and shall not block browser request handling.
2. Postgres shall remain the durable source of truth for product state.
3. The browser shall communicate only with the Next.js application.
4. The NLP service shall remain a narrow internal compute service, not a second product backend.
5. The web app shall remain the only public application surface.

## Business Rules

1. LexiFlix is an English-learning product in the current version.
2. Reusable content analysis is shared across users.
3. Pack generation is user-specific.
4. Generated pack content may vary by learner context, including CEFR level at generation time.
5. Trigger.dev workflow state does not replace database state as the product source of truth.

## Glossary

| Term                        | Definition                                                                      |
| --------------------------- | ------------------------------------------------------------------------------- |
| CEFR                        | Common European Framework of Reference proficiency scale from A1 to C2          |
| Content analysis            | Reusable subtitle-derived analysis for a title                                  |
| Analysis LLM pipeline       | Batched LLM calls used to extract and classify idioms, phrasal verbs, and slang |
| Content Generation Pipeline | User-specific generation of meanings, examples, audio, and optional imagery     |
| Study pack                  | Generated learner-specific set of items for one title                           |
