# LexiFlix Decision Log

## 2026-04-05

### Canonical season key

- Decision: TV seasons are canonically keyed by **`(tmdb_show_id, season_number)`**.
- Reasoning: TMDB's official season lookup model is contextual to the parent show and season number. The season payload exposes a season-level `id`, but the researched docs did not establish that field as the explicit long-term canonical contract for downstream consumers.
- Consequence: `tmdb_season_id` stays in the schema only as auxiliary metadata, not as the primary natural key.

### `overview` cache behavior

- Decision: cache `overview` for movies, TV shows, and TV seasons as a nullable text field.
- Reasoning: TMDB exposes `overview` broadly enough to justify a first-class cached column, but it may return an empty string when a description is missing or unavailable in the requested language.
- Consequence: ingestion should normalize `""` to `NULL` so the database has one consistent representation for "no overview available."

### Pack lifecycle

- Decision: there is exactly one pack per user per content item.
- Reasoning: this is a demo app optimized for clarity and fast iteration, not historical version management.
- Consequence: regeneration replaces the old pack instead of creating pack versions.

### Knowledge transfer

- Decision: mastered vocabulary carries across titles for the same user.
- Reasoning: user knowledge is about the canonical term, not about a single title-specific flashcard.
- Consequence: the schema must keep a canonical vocabulary layer separate from content-specific vocabulary occurrences.

### Card deletion semantics

- Decision: deleting a card affects only the current pack.
- Reasoning: a local cleanup action should not silently redefine the user's global knowledge state.
- Consequence: deletion state belongs to pack-local workflow/state, not to canonical term mastery.

### Early feature scope

- Decision: basic notifications and streak tracking remain in scope for the first real implementation pass.
- Reasoning: they support the study loop directly and do not introduce major architectural complexity.

### Media artifacts

- Decision: keep schema support for both pronunciation audio and contextual images, but treat audio as the first shipped artifact type.
- Reasoning: audio supports the core learning loop more directly; images can remain optional without forcing a schema redesign later.

### Season subtitle handling

- Decision: a season is analyzed as one merged subtitle corpus, not as episode-level subtitle rows.
- Reasoning: the learning unit is the season, and episode-level provenance adds complexity without supporting a current product requirement.
- Consequence: the analysis pipeline stays content-focused without introducing episode-level subtitle persistence.

### Subtitle persistence scope

- Decision: do not persist subtitle availability checks or fetched subtitle files in V1.
- Reasoning: this is a demo system and the durable value is the derived content analysis, not the fetched subtitle payload or failed lookup history.
- Consequence: the system refetches subtitles whenever reusable analysis is missing, and invalidation remains coarse rather than provenance-heavy.

### Review event depth

- Decision: keep review events intentionally thin in V1.
- Reasoning: immutable review references, ratings, and timestamps are enough for the MVP study loop, analytics, and streak logic.
- Consequence: the schema does not persist bulky before/after JSON state snapshots for each review event.

### JSONB contract policy

- Decision: pipeline-derived JSONB columns use one active contract at a time.
- Reasoning: this is a rebuildable demo-system data layer, not a long-lived compatibility archive for every historical NLP or LLM payload shape.
- Consequence: if a breaking payload-shape change lands, purge and rebuild the affected database state instead of layering compatibility parsing across multiple schema generations.

## 2026-04-06

### Curated catalog ownership

- Decision: curated catalog state lives in a dedicated `curated_entry` table, not in `content`.
- Reasoning: the curated feature needs to support `movie` and `tv` immediately, while `content` is still modeled around analysis units `movie` and `season`.
- Consequence: editorial catalog concerns stay separate from subtitle-analysis concerns, and `content` remains the durable anchor for deeper analysis/generation flows.

### TMDB query model for admin curation

- Decision: admin curation uses two explicit TMDB modes.
- Reasoning: TMDB `search` is for title lookup, while `discover` is the filterable browse API. Pretending they are one unified query model produces misleading UI and brittle backend logic.
- Consequence: admin UI must expose `search` and `browse` as distinct modes, and persistence must hydrate from a TMDB detail payload rather than from summary cards.

### TV curation scope in V1

- Decision: curated TV entries are stored at the show level in V1, not the season level.
- Reasoning: the product request is “movies and TV shows,” and show-level curation keeps the learner catalog simple while preserving a later path to season selection.
- Consequence: curated TV rows use `media_type='tv'` and `curation_scope='show'`; season linkage fields stay reserved but null until a later feature actually needs them.

### Learner catalog read path

- Decision: learner-facing curated pages read only published curated rows from Postgres.
- Reasoning: curated shelves should be stable and fast, and should not depend on live TMDB summary responses at render time.
- Consequence: TMDB detail data is normalized and cached on write, and `/curated` renders published entries only.

## 2026-04-19

### Pack generation request shape

- Decision: pack generation in V1 is driven by an explicit generation dialog rather than by hidden defaults alone.
- Reasoning: pack composition is no longer just a backend heuristic; the learner should control the main inclusion levers up front.
- Consequence: the request snapshot needs to capture vocabulary kinds, CEFR selection mode, pack size, known-term handling, example count, and custom instructions.

### Pack size cap

- Decision: the server-side hard cap for `packSize` is `100` in V1.
- Reasoning: this keeps prompt size, asset fan-out, and wall-clock latency within a manageable range for the demo without making packs trivially small.
- Consequence: the backend must enforce the cap regardless of any client-side dialog controls.

### CEFR selection modes

- Decision: V1 CEFR selection modes are `same_level`, `one_level_above`, and `all_levels_above`.
- Reasoning: these cover the meaningful learner choices without introducing arbitrary range builders or overcomplicated selection UI.
- Consequence: generation request schemas and selection logic should model those options directly.

### Known-term handling

- Decision: known-term handling is explicit and request-driven in V1.
- Reasoning: excluding known terms, down-ranking them, or including them are materially different learning strategies and should not be silently inferred.
- Consequence: generation request schemas and selection logic should support `exclude_known`, `downrank_known`, and `include_known`.

### Content generation language and examples

- Decision: generated meanings stay English-only in V1, and example sentences must be newly generated rather than adapted from subtitle excerpts.
- Reasoning: English-only explanations keep the first pass simpler, and newly generated examples reduce spoiler risk and avoid subtitle reuse in learner-facing output.
- Consequence: prompts and output contracts should reflect English-only meanings and generated examples by default.

### Example count

- Decision: the default example count is one per item, with request-time configuration allowed up to three.
- Reasoning: one example is enough for the baseline study loop, while allowing up to three preserves flexibility without making every pack bloated by default.
- Consequence: the request snapshot and prompt contracts should include example count as an explicit field.

### Audio failure policy

- Decision: audio generation is best-effort in V1, and pronunciation audio reads only the vocabulary item itself.
- Reasoning: missing audio should not destroy an otherwise usable pack, and vocabulary-only audio keeps the first implementation narrower and cheaper.
- Consequence: the workflow should persist warning state for missing audio instead of failing the whole job.

### Image generation exposure

- Decision: image generation remains env-gated in V1 rather than learner-configurable by default.
- Reasoning: image usefulness and quality are less predictable than text generation, so the capability should be tested operationally before being exposed as a normal learner control.
- Consequence: the architecture should support images now, but the first shipped learner dialog should not depend on a visible image toggle.

### Generation progress surfaces

- Decision: long-running generation progress should be visible both in a dedicated progress view and in the decks surface.
- Reasoning: users need a clear active-job view, but they also need to be able to leave and return later without losing the job trail.
- Consequence: both surfaces should read from one shared app-owned polling contract rather than separate progress systems.
