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

### Season subtitle storage

- Decision: a season is stored as one merged subtitle corpus, not as episode-level subtitle rows.
- Reasoning: the learning unit is the season, and episode-level provenance adds complexity without supporting a current product requirement.
- Consequence: the subtitle snapshot model stays simple and content-focused.

### Subtitle availability cache

- Decision: persist subtitle availability checks, including negative results.
- Reasoning: repeated failed subtitle lookups are wasted work and produce bad UX when the app cannot explain why generation is unavailable.
- Consequence: the schema includes a provider-specific availability snapshot so the UI can surface "not available" honestly and retry on a controlled schedule.

### Review event depth

- Decision: keep review events intentionally thin in V1.
- Reasoning: immutable review references, ratings, and timestamps are enough for the MVP study loop, analytics, and streak logic.
- Consequence: the schema does not persist bulky before/after JSON state snapshots for each review event.

### JSONB contract policy

- Decision: pipeline-derived JSONB columns use one active contract at a time.
- Reasoning: this is a rebuildable demo-system data layer, not a long-lived compatibility archive for every historical NLP or LLM payload shape.
- Consequence: if a breaking payload-shape change lands, purge and rebuild the affected database state instead of layering compatibility parsing across multiple schema generations.
