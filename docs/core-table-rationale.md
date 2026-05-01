# Core Table Rationale

This document explains the purpose of the core product tables at a high level. It is intentionally concise and technical.

The schema is split into four boundaries:

- catalog and reusable content facts
- reusable content analysis
- user-specific pack generation
- user-specific learning state

That split is not cosmetic. It is what keeps shared analysis reusable across users while allowing generated learning content and study progress to remain learner-specific.

## Catalog And Shared Reference Tables

### `content`

Canonical row for a movie, show, or season that has entered the product flow.

Why it exists:

- anchors all reusable analysis and user-specific generation to one durable internal entity
- decouples product state from transient TMDB search payloads
- supports lazy upsert when a title is actually opened or curated, instead of persisting every search hit

### `vocabulary_term`

Canonical identity for a normalized learning unit such as a word, idiom, slang item, or phrasal verb.

Why it exists:

- separates stable term identity from content-specific evidence
- enables cross-pack and cross-content learner state on the same term
- prevents duplicate “same term, different row per title” logic from contaminating mastery tracking

### `artifact_object`

Metadata record for generated binary assets such as audio and images.

Why it exists:

- stores durable object identity and metadata without pushing blobs into Postgres
- allows generated pack content to reference assets cleanly
- centralizes artifact access and storage metadata instead of scattering raw URLs across product tables

## Reusable Content Analysis

### `content_analysis_run`

One reusable analysis execution for a content item under a specific pipeline fingerprint.

Why it exists:

- is the cache boundary for “has this title already been analyzed with the current pipelines?”
- stores run lifecycle, status, summary metrics, warnings, and failure state
- separates non-user-specific title analysis from later user-specific generation

Important boundary:

- subtitles are transient runtime input in V1 and are not persisted
- the durable output is the analysis run and its derived items

### `content_analysis_run_event`

Immutable event log for a reusable content analysis run.

Why it exists:

- gives the frontend a durable progress trail to poll while analysis is running
- keeps operational history out of the main run row
- makes debugging stage transitions possible without overloading `content_analysis_run`

### `content_analysis_item`

Reusable extracted item row produced by the NLP pipeline and the analysis LLM pipeline.

Why it exists:

- is the durable per-title output used by the overview page and later pack generation
- stores content-specific evidence such as surface form, context, occurrence count, CEFR judgment, and selectability
- keeps shared extracted results separate from canonical term identity in `vocabulary_term`

## User-Specific Pack Generation

### `pack_generation_job`

User-owned request to generate learning content from reusable analysis.

Why it exists:

- separates shared title analysis from learner-specific content generation
- captures the request snapshot and workflow lifecycle for one learner’s generation run
- provides the durable polling target for the generation modal and pack creation flow

### `pack_generation_job_event`

Immutable event log for the pack generation workflow.

Why it exists:

- exposes detailed progress and failure context for long-running generation
- avoids collapsing execution history into the job row
- mirrors the same lifecycle pattern used by reusable content analysis

### `pack`

Durable generated study pack for one user and one content selection.

Why it exists:

- is the learner-facing resource created after generation completes
- stores the generation context that produced the pack
- separates finished generated output from transient workflow state

### `pack_item`

Selected study item inside a pack plus its mutable scheduling and review state.

Why it exists:

- represents the subset of analysis items actually included for that learner
- allows pack-specific ordering, inclusion reason, due dates, and SRS state
- keeps reusable analysis rows free of learner-specific review mutations

### `pack_item_content`

Generated learning content attached to a specific `pack_item`.

Why it exists:

- stores user-specific outputs from the Content Generation Pipeline such as meanings, examples, and asset references
- keeps generated study content separate from reusable analysis
- allows generation to take the learner’s current CEFR level into account at generation time

Important boundary:

- this table is not reusable across users
- identical source terms may still yield different generated content if learner context or generation settings differ

## User Learning State

### `review_event`

Immutable history of learner review interactions.

Why it exists:

- preserves the actual study timeline rather than only the latest mutable card state
- supports analytics, streak calculations, and auditability of review behavior
- prevents loss of historical signal when `pack_item` scheduling fields are updated

### `user_term_state`

Cross-pack learner state for a canonical term.

Why it exists:

- materializes learner knowledge at the term level across packs and titles
- prevents the same term from being treated as brand new in every pack
- gives the application one place to answer “what does this learner currently know about this term?”

### `user_preferences`

Durable learner defaults for generation and study behavior.

Why it exists:

- stores stable defaults separately from one-off generation requests
- keeps learner configuration out of the core `user` row
- supports prefilled generation choices without coupling preferences to a specific pack

### `notification`

Durable learner-facing notification records.

Why it exists:

- records pack-generation outcomes and due-review reminders in product state
- lets the app dedupe reminder records instead of recreating them on every read
- keeps read and dismissed status separate from study-card scheduling state

## Architectural Reading Order

When evaluating the model, read it in this order:

1. `content` and `vocabulary_term` define shared identities.
2. `content_analysis_run`, `content_analysis_run_event`, and `content_analysis_item` define reusable title analysis.
3. `pack_generation_job`, `pack_generation_job_event`, `pack`, `pack_item`, and `pack_item_content` define learner-specific generation.
4. `review_event`, `user_term_state`, `user_preferences`, `user_streak`, and `notification` define ongoing learner state after generation.
