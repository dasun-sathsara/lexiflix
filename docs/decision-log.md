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

- Decision: `packSize` has no server-side hard cap; it must be a positive integer (minimum `1`).
- Reasoning: the earlier `100` cap was removed by request; pack size is now bounded only by available candidate terms.
- Consequence: the backend validates `packSize` as a positive integer and selection naturally truncates to the number of available candidates.

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

- Decision: audio generation is best-effort in V1, and pronunciation audio covers both the vocabulary item and generated example sentences.
- Reasoning: missing audio should not destroy an otherwise usable pack, and example sentence audio better supports listening practice around the generated context.
- Consequence: the workflow should persist warning state for missing audio instead of failing the whole job.

### Image generation exposure

- Decision: image generation remains env-gated in V1 rather than learner-configurable by default.
- Reasoning: image usefulness and quality are less predictable than text generation, so the capability should be tested operationally before being exposed as a normal learner control.
- Consequence: the architecture should support images now, but the first shipped learner dialog should not depend on a visible image toggle.

### Generation progress surfaces

- Decision: long-running generation progress should be visible both in a dedicated progress view and in the decks surface.
- Reasoning: users need a clear active-job view, but they also need to be able to leave and return later without losing the job trail.
- Consequence: both surfaces should read from one shared app-owned polling contract rather than separate progress systems.

## 2026-04-25

### Real pack study surfaces

- Decision: `/pack/[id]`, `/decks`, and `/study/[id]` render learner-owned generated pack data from Postgres rather than mock data.
- Reasoning: once pack generation is durable, adjacent learner surfaces need to read the same generated output or the demo hides integration bugs behind fake UI.
- Consequence: pack ownership checks, explicit Drizzle joins, generated meanings/examples, optional artifact URLs, and active-card filtering live behind the pack feature read models.

### Pack-local card removal and reset

- Decision: card removal is a pack-local soft removal, while reset restores removed cards and clears mutable pack scheduling fields without deleting review history.
- Reasoning: a learner's cleanup action inside one pack should not rewrite global term knowledge or destroy historical study evidence.
- Consequence: removed cards are excluded from active counts and study queues, `pack.itemCount` is recalculated from active cards, and `review_event` plus `user_term_state` remain intact on reset.

### Effective due state

- Decision: due status is computed from `dueAt <= now` for active non-new, non-mastered cards rather than by persisting `pack_item.state = 'due'`.
- Reasoning: a persisted due state drifts without a background updater, which is unnecessary complexity for this demo.
- Consequence: `pack_item.state` remains a lifecycle state, and `/pack/[id]`, `/decks`, `/study/[id]`, and `/dashboard` must use the shared effective-state rule.

### V1 SRS scheduling

- Decision: V1 scheduling uses an Anki-inspired legacy SM-2 baseline rather than FSRS.
- Reasoning: LexiFlix needs familiar four-button review behavior and understandable interval growth, not a more advanced scheduling model before the core study loop is stable.
- Consequence: learning/relearning steps stay sub-day, review intervals grow by rating and ease, non-again review intervals do not shrink, and the constants remain centralized for later replacement.

### Mastery threshold

- Decision: a pack item becomes mastered only after a `good` or `easy` rating when repetition count reaches at least `5` or the next interval reaches at least `21` days.
- Reasoning: mastery should be a durable product milestone, not an eager result of the first successful review.
- Consequence: `user_term_state.state = 'known'` is only set when the same threshold is met, while other ratings keep the canonical term in `learning`.

### Durable rating writes

- Decision: a successful rating writes one immutable review event and updates `pack_item`, `user_term_state`, `user_streak`, and the parent pack timestamp together through the Neon HTTP batch path.
- Reasoning: review history, current scheduling, cross-pack knowledge, streaks, and dashboard freshness are one practical product update even though full interactive transactions are not available through the current Drizzle Neon HTTP driver.
- Consequence: the action keeps validation narrow, rejects removed cards, revalidates the affected study/pack/decks/dashboard routes, and avoids fake transaction comments.

### Dashboard data source

- Decision: `/dashboard` reads persisted learner state and no longer uses mock pack or review data.
- Reasoning: the dashboard becomes misleading as soon as reviews are durable if it keeps displaying invented progress.
- Consequence: dashboard stats derive from `review_event`, `user_term_state`, `user_streak`, and effective pack due state; the old mock "Time Spent" stat is replaced with "Reviews This Week."

### Learner preferences and due notifications

- Decision: learner preferences include durable study defaults and generation defaults, while due-review in-app notifications are created from effective due pack-card state.
- Reasoning: generation choices should be prefilled from stable learner defaults, and due reminders need to be visible product state rather than transient UI badges.
- Consequence: settings writes use the app's typed Server Action path, generation reads saved defaults when request fields are omitted, due-review notification rows dedupe by app day, and reading or dismissing a notification does not mutate card scheduling.

### Web consistency standard

- Decision: app-internal writes use typed Server Actions by default, route handlers are limited to documented HTTP/protocol boundaries, and non-trivial product behavior stays inside feature boundaries rather than route files.
- Reasoning: the web app is the product center, so mixing route-local mutation logic, duplicated auth/session access, and ad hoc read models makes the codebase harder to reason about than the demo project justifies.
- Consequence: `apps/web/AGENTS.md` owns the execution rules for agents, while canonical docs capture the architectural standard; temporary implementation plans are retired after their durable decisions are absorbed into canonical docs.

## 2026-04-27

### Daily new-card workload

- Decision: rename the learner workload setting from `dailyWordsGoal` to `newCardsPerDay`.
- Reasoning: the setting controls newly introduced cards only; due reviews are scheduled debt and must not be capped by a learner pace preference.
- Consequence: due reviews stay visible until cleared, new-card queues are capped by remaining daily allowance, and daily completion is distinct from streak credit.

### Explicit study modes

- Decision: normal study uses explicit due, new, preview, and cram modes.
- Reasoning: blending due reviews, new learning, preview, and unscheduled practice makes the scheduler feel untrustworthy.
- Consequence: future learning cards are held until due, dashboard defaults to due first, new cards are offered after due reviews clear, and cram remains opt-in.

### Learner term controls

- Decision: learners can mark terms known, mark them learning, ignore them globally, and unignore them.
- Reasoning: generated material needs learner correction paths; pack-local removal alone cannot express canonical knowledge or globally bad candidates.
- Consequence: term actions update `user_term_state` and matching active cards for the learner instead of relying on read-model hiding.

### Cross-pack SRS coherence

- Decision: global known and ignored states affect all pack and generation surfaces for the same learner.
- Reasoning: mastering or ignoring a canonical term in one title should not contradict another title's study queue.
- Consequence: known-term mastery propagates to matching active cards, ignored terms are excluded from default queues and generation, and `again` demotes known terms back to learning.
