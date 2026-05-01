- `NLP pipeline` refers to the local subtitle-analysis pipeline.
- `LLM pipeline` refers to batched LLM calls used to extract and classify phrasal verbs, idioms, slang, and related CEFR judgments for a subtitle corpus.
- `Content Generation Pipeline` refers to the later user-specific pipeline that generates meanings, example sentences, pronunciation audio, and optional images for the selected pack items.

- Curated catalog state is separate from canonical analysis content state.
- `curated_entry` owns the learner-facing curated catalog for `movie` and `tv`.
- `content` continues to own analysis/generation anchors for `movie` and `season`.

- For TV content, the primary learning unit is a **season**, not the show as a whole and not an individual episode.
- For movies, the primary learning unit is the **movie** itself.
- Therefore, the system generates packs against two canonical content entities only: **movie** and **season**.

- Canonical content entities are keyed by TMDB identifiers.
- Movies use the TMDB movie ID.
- Seasons use the pair **`(tmdb_show_id, season_number)`** as the canonical natural key.
- TMDB season ID may still be stored when available, but only as auxiliary metadata for joins, debugging, or payload traceability.

- Title metadata is cached locally from TMDB so the app does not need to re-fetch the same display metadata repeatedly.
- The product assumes TMDB metadata such as title, overview, poster, backdrop, release timing, and related display fields are safe to cache locally.
- `overview` is treated as a first-class cached field for movies, TV shows, and TV seasons.
- TMDB may return `overview` as an empty string when no localized or contributed description exists.
- On ingest, empty-string `overview` values should be normalized to `NULL` so "no description available" has one durable representation in the database.
- The system does not persist every TMDB search result into `content`.
- Search and browse results may remain transient TMDB responses until a title actually enters the product flow.
- A `content` row is created or refreshed when a curated title is seeded, when a user opens a media detail page, or when a workflow needs that title as a durable product entity.

- Admin curation uses two explicit TMDB query modes:
- `search` for title lookup
- `discover` for filterable browse
- Curated rows are never persisted directly from TMDB search/discover summary payloads.
- Before insert or refresh, the system fetches a TMDB detail payload and stores a normalized snapshot in Postgres.

- Subtitle files are sourced from **OpenSubtitles** in V1.
- Subtitle fetching is intentionally transient in V1:
- the system fetches subtitle text when content analysis is missing
- the fetched subtitle text is not persisted as a first-class database record
- for TV seasons, one analysis run still represents one merged season corpus
- episode-level subtitle provenance is intentionally not stored in the database for V1
- language variants are out of scope for now because the current release targets English only

- Content analysis follows an **on-demand** model.
- When a user opens a movie or season overview page and no reusable analysis exists for the current analysis pipeline fingerprint, the system fetches subtitles, runs the NLP pipeline, runs the LLM pipeline, and stores the resulting analysis.
- The system does not prefetch subtitle data or pre-run analysis for the general catalog in the background.
- Reusable analysis outputs are shared across users and rerun only when the analysis pipeline fingerprint changes or the cached analysis is manually invalidated.
- Pack generation is a separate **on-demand** model.
- The Content Generation Pipeline starts only after a user explicitly requests pack generation and confirms their generation preferences.
- In V1, generation preferences come from a dialog-driven request snapshot rather than from hidden defaults alone.
- That request may control vocabulary kinds, CEFR selection mode, pack size, known-term handling, example count, and custom instructions.
- There is no server-side hard cap for `packSize`; it must be a positive integer (minimum `1`).
- Pack generation reads from stored reusable analysis instead of repeating subtitle fetch, NLP analysis, or phrase-classification LLM work.

- The learner-facing curated catalog at `/curated` is a signed-in surface.
- It reads published curated rows from Postgres only.
- It must not depend on live TMDB responses at render time.
- Admin curation at `/admin/curated` is server-guarded and admin-only.

- Canonical reusable processing happens at the content level.
- User-visible pack-generation jobs are separate from canonical content-analysis runs.
- The workflow engine owns execution order and retries.
- Postgres owns the durable meaning of the reusable analysis, the user-visible jobs, and the resulting pack.

- The stable vocabulary type set is:
- `word`
- `phrasal_verb`
- `idiom`
- `slang`

- Canonical vocabulary must remain separate from content-specific occurrences.
- The reason is structural, not stylistic:
- user mastery must carry across titles at the canonical term level
- content-specific context, counts, and enrichment must still be tied to the subtitle source that produced them
- therefore the schema should keep a reusable canonical term layer plus a content-level occurrence/enrichment layer

- For each reusable content-analysis item, the system stores or derives:
- the owning canonical content entity
- the canonical term it maps to
- the vocabulary type
- the observed surface form in subtitles
- the normalized form or lemma
- representative subtitle context
- CEFR judgment and related confidence/provenance
- occurrence count and frequency signal
- whether the item came from the NLP pipeline or the LLM pipeline
- standard housekeeping metadata

- For each reusable content-analysis run, the system stores or derives:
- the analysis pipeline fingerprint and versions
- coarse stage/progress state for polling the overview page
- summary metrics needed by the overview page such as vocabulary distribution and counts by kind
- warnings and failure metadata when relevant

- For each generated pack item, the system stores or derives:
- the generated `meaning`
- generated example sentences where available
- the object-storage references for pronunciation and example sentence audio
- the optional object-storage reference for a contextual image
- those generated outputs are user-specific and belong to the pack item, not to reusable content analysis
- generated meanings, examples, and related assets may take the learner's current CEFR level into account
- standard housekeeping metadata for the content-generation pass

- In V1, generated meanings remain English-only.
- In V1, example sentences are newly generated and should not reuse subtitle excerpts.
- In V1, the default example count is one per item, with the request allowed to increase that to two or three.
- In V1, pronunciation audio covers both the vocabulary item and generated example sentences.

- Pack selection is personalized per user.
- When generating a pack, the system considers the learner's CEFR level, their frequency preference, and the vocabulary types they want to study.
- V1 CEFR selection options are:
- `same_level`
- `one_level_above`
- `all_levels_above`
- Known-term handling is request-driven in V1:
- `exclude_known`
- `downrank_known`
- `include_known`
- Those preferences determine which candidate items are included in the resulting pack.

- There is only **one pack per user per content item**.
- If the user regenerates a pack for the same content with new inputs or preferences, the previous pack is deleted and replaced rather than versioned.

- Curated catalog publication is explicit.
- Learner-facing curated pages show published curated entries only.
- Ordering is controlled by `featuredRank`, with lower ranks appearing first and null ranks falling behind ranked entries.

- When a pack is created, content-level vocabulary items are linked into pack items.
- Each pack item stores or derives:
- the pack identifier
- the linked canonical term / content vocabulary item
- current SRS state such as due date, interval, easiness factor, repetition count, and lapse count
- standard housekeeping metadata

- Generated pack surfaces render real learner-owned pack data.
- `/pack/[id]`, `/decks`, and `/study/[id]` must verify pack ownership before exposing pack data.
- Pack read models distinguish active cards from hidden/removed cards when `pack_item.state = 'removed'` or `removedAt IS NOT NULL`.
- Card removal is soft and reversible through either card restore or pack reset.
- `pack.itemCount` represents the current active non-removed card count after removals or restores.
- Pack reset is pack-local: it restores cards and clears mutable scheduling fields, but it does not delete `review_event` history and does not rewrite `user_term_state`.
- A single-card reset clears mutable scheduling fields for that pack item only and does not delete review history.

- `pack_item.state` is a lifecycle state, not a persisted clock-driven due flag.
- The effective due state is derived from `dueAt <= now` for active non-new, non-mastered cards.
- The system should not rely on a background job to flip rows into a persisted `due` state.
- Mastered cards stay out of the default study queue unless explicitly opened through a card-specific route.
- The normal study modes are explicit: due review, learn new, preview, and cram.
- Due review queues include effective due cards only; future learning cards wait until `dueAt <= now`.
- New-card queues include only new cards and are capped by the learner's `newCardsPerDay` remaining allowance.
- Cram is an explicit unscheduled practice mode and is not the default path.
- `/study/[id]?card=<packItemId>` may open a specific active card for preview, including a mastered card, but that does not reintroduce mastered cards into the normal queue.

- Review history is immutable and stored separately from the mutable current card state.
- Dashboard metrics, streak calculations, and future analytics should come from review history rather than from lossy status snapshots alone.
- Review history is intentionally thin in V1.
- The system stores immutable per-review events such as references, rating, and timing, but it does not persist before/after JSON state snapshots for each review.
- A successful review rating creates exactly one `review_event` row.
- The same successful rating updates pack-local SRS fields on `pack_item`, cross-pack learner knowledge in `user_term_state`, and the learner's streak snapshot in `user_streak`.
- Study ratings must never set `user_term_state.state = 'ignored'`.
- A learner may explicitly mark a term known, mark it learning, ignore it globally, or unignore it.
- Marking a term known sets `user_term_state.state = 'known'` and propagates mastery to matching active cards for that learner.
- Marking a term learning clears explicit known state and reopens matching non-removed cards.
- Ignoring a term globally sets `user_term_state.state = 'ignored'`, excludes the term from default queues and future generation, and removes matching active cards from normal queues.
- Unignoring a term returns it to learning unless mastery is established again.
- `user_term_state.state = 'known'` is set only when the pack item reaches the mastery threshold.
- A globally known term is demoted back to learning by an `again` rating or an explicit mark-learning action; `hard` and `good` ratings do not demote known terms by themselves.
- V1 scheduling uses an Anki-inspired legacy SM-2 baseline, not FSRS.
- V1 learning and relearning steps stay under one day.
- V1 mastery is a LexiFlix product milestone, not an Anki state.
- The V1 mastery threshold is reached after a good/easy rating when either repetition count is at least `5` or the next interval is at least `21` days.
- Streak calculations use the shared server-side app-day helper in V1 so the day-boundary rule can be replaced later with learner time zones.
- Dashboard review counts are derived from persisted review and pack state.
- The dashboard "Reviews This Week" metric comes from `review_event`, not from a client counter or mock data.
- Dashboard next-action CTAs route to the first due study pack when due cards exist, offer new-card study after due reviews are clear, and route to `/browse` when the learner has no packs.

- Mastered vocabulary should carry across titles for the same user.
- This means user knowledge state is tracked at the canonical term level, not only at the pack-item level.

- If a learner deletes a card from a pack, that deletion is local to that pack only.
- Card deletion must not globally mark the term as known or ignored for future packs.

- The initial implementation scope includes a **basic notification system** and a **basic streak system**.
- Notifications should be sufficient for:
- pack ready events
- review due reminders
- streak risk nudges
- Due-review in-app notifications are derived from effective due pack cards and should dedupe by app day so repeated dashboard or topbar loads do not create notification spam.
- Reading or dismissing a due-review notification must not change card due state.
- `emailRemindersEnabled` is an email-delivery preference in V1; in-app due-review notification records are product state and do not depend on that flag.

- Curated TV entries are show-level in V1.
- When a learner opens a curated TV show, season selection happens later in the detail flow rather than in the curated shelf itself.

- Artifact support should be designed for both audio and images.
- In the first real implementation pass:
- pronunciation audio is in scope
- contextual images remain optional and may be added later without reshaping the schema
- image generation is best-effort and env-gated in V1 rather than learner-configurable by default
- image generation should run only for items that plausibly benefit from imagery
- audio generation is also best-effort in V1; missing audio should produce warnings rather than fail the whole pack

- JSONB fields that store pipeline-derived payloads use one active contract at a time.
- If the NLP or LLM service changes those payload shapes in a breaking way, the correct response for this project is to purge and rebuild the affected derived data rather than maintain multiple historical JSON parsers/schemas.
