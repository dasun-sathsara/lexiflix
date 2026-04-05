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
2. Before generation starts, the system shall allow the learner to choose generation preferences such as frequency preference and vocabulary type selection.
3. Pack generation shall read from stored reusable analysis rather than re-running subtitle fetch, NLP analysis, or analysis LLM extraction.
4. The system shall select candidate items based on learner state, learner level, and generation preferences.
5. The system shall generate meanings and example sentences with an LLM.
6. The system shall generate pronunciation audio for pack items.
7. The system may generate contextual imagery when that feature is enabled.
8. The system shall store generated pack content as user-specific output.
9. Generated pack content may be adapted to the learner’s current CEFR level at generation time.
10. The system shall persist pack generation job state and progress events for polling.
11. The system shall prevent accidental duplicate generation requests through idempotent handling.

### 7. Study Experience

1. The system shall present generated pack items with learner-facing study content.
2. The system shall support playback of generated pronunciation audio.
3. The system shall track learner progress within a generated pack.

### 8. Review And Ongoing Learner State

1. The system shall support a review flow for generated pack items.
2. The system shall record immutable review events.
3. The system shall maintain learner term state across packs for the same canonical term.
4. The system shall maintain a learner streak summary.

### 9. Notifications And Preferences

1. The system shall store learner preferences relevant to study and generation defaults.
2. The system shall support notification records for events such as pack completion or due reviews.

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

| Term | Definition |
| --- | --- |
| CEFR | Common European Framework of Reference proficiency scale from A1 to C2 |
| Content analysis | Reusable subtitle-derived analysis for a title |
| Analysis LLM pipeline | Batched LLM calls used to extract and classify idioms, phrasal verbs, and slang |
| Content Generation Pipeline | User-specific generation of meanings, examples, audio, and optional imagery |
| Study pack | Generated learner-specific set of items for one title |
