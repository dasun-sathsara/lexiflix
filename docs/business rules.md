- `NLP pipeline` refers to the local subtitle-analysis pipeline.
- `LLM pipeline` refers to the enrichment pipeline used to identify or explain idioms, slang, phrasal verbs, and related CEFR judgments.

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

- Subtitle files are sourced either from **OpenSubtitles** or from a **manual user upload**.
- Subtitle ingestion is intentionally simple for the current scope:
- a content item can have multiple stored subtitle snapshots over time
- only one subtitle snapshot is considered **active** for a content item at a time
- once stored, a subtitle snapshot is treated as immutable input
- for TV seasons, one subtitle snapshot represents one merged season corpus
- episode-level subtitle provenance is intentionally not stored in the database for V1
- language variants are out of scope for now because the current release targets English only
- the system persists subtitle-availability checks, including unavailable results, so the app can avoid repeated failed lookups and explain missing subtitles in the UI

- Pack generation follows an **on-demand** model.
- The system fetches source data, runs NLP and LLM enrichment, and generates a pack only when a user explicitly requests a movie or season.
- The system does not prefetch subtitle data or pre-generate packs in the background for the general catalog.
- Once generated, reusable outputs are stored so later requests for the same content do not require the full pipeline to run again unless the subtitle snapshot or pipeline fingerprint changes.

- Canonical reusable processing happens at the content level.
- User-visible generation jobs are separate from canonical content processing runs.
- The workflow engine owns execution order and retries.
- Postgres owns the durable meaning of the job and the resulting pack.

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

- For each reusable content-level vocabulary item, the system stores or derives:
- the owning canonical content entity
- the canonical term it maps to
- the vocabulary type
- the observed surface form in subtitles
- the normalized form or lemma
- representative subtitle context
- CEFR judgment and related confidence/provenance
- occurrence count and frequency signal
- a single generated `meaning` field
- generated example sentences where available
- the object-storage reference for pronunciation audio
- the optional object-storage reference for a contextual image
- standard housekeeping metadata

- Pack selection is personalized per user.
- When generating a pack, the system considers the learner's CEFR level, their frequency preference, and the vocabulary types they want to study.
- Those preferences determine which candidate items are included in the resulting pack.

- There is only **one pack per user per content item**.
- If the user regenerates a pack for the same content with new inputs or preferences, the previous pack is deleted and replaced rather than versioned.

- When a pack is created, content-level vocabulary items are linked into pack items.
- Each pack item stores or derives:
- the pack identifier
- the linked canonical term / content vocabulary item
- current SRS state such as due date, interval, easiness factor, repetition count, and lapse count
- standard housekeeping metadata

- Review history is immutable and stored separately from the mutable current card state.
- Dashboard metrics, streak calculations, and future analytics should come from review history rather than from lossy status snapshots alone.
- Review history is intentionally thin in V1.
- The system stores immutable per-review events such as references, rating, and timing, but it does not persist before/after JSON state snapshots for each review.

- Mastered vocabulary should carry across titles for the same user.
- This means user knowledge state is tracked at the canonical term level, not only at the pack-item level.

- If a learner deletes a card from a pack, that deletion is local to that pack only.
- Card deletion must not globally mark the term as known or ignored for future packs.

- The initial implementation scope includes a **basic notification system** and a **basic streak system**.
- Notifications should be sufficient for:
- pack ready events
- review due reminders
- streak risk nudges

- Artifact support should be designed for both audio and images.
- In the first real implementation pass:
- pronunciation audio is in scope
- contextual images remain optional and may be added later without reshaping the schema

- JSONB fields that store pipeline-derived payloads use one active contract at a time.
- If the NLP or LLM service changes those payload shapes in a breaking way, the correct response for this project is to purge and rebuild the affected derived data rather than maintain multiple historical JSON parsers/schemas.
