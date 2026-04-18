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
