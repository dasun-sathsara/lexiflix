# Curated Catalog And Admin Curation Plan

## Goal

Add a learner-facing curated catalog page and an admin-only curation workflow without inventing a second backend or a heavyweight editorial system.

The feature should do three things:

1. make admin status visible in the signed-in app shell
2. let admins search/filter TMDB content and curate entries from inside `apps/web`
3. show curated movies and TV shows to regular signed-in users on a dedicated `curated` page

## Current Repo Reality

This is what the codebase already gives us:

- user roles already exist in the DB and auth session shape
- the app does not currently use those roles for navigation or authorization
- TMDB search/discover and genre fetching already exist in [`apps/web/src/lib/tmdb.ts`](/Users/pabasara/Dev/lexiflix/apps/web/src/lib/tmdb.ts)
- the signed-in shell already has a sidebar and user dropdown in [`apps/web/src/features/sidebar/components/app-sidebar.tsx`](/Users/pabasara/Dev/lexiflix/apps/web/src/features/sidebar/components/app-sidebar.tsx) and [`apps/web/src/features/sidebar/components/nav-user.tsx`](/Users/pabasara/Dev/lexiflix/apps/web/src/features/sidebar/components/nav-user.tsx)
- the architecture docs already assume “curated titles” are a valid way for content to enter the product flow

This is what the repo does not yet have:

- a server-side admin guard
- a curated catalog table
- admin UI for editorial curation
- a learner-facing curated page backed by durable curated state

## Hard Constraint

There is one important modeling mismatch already in the repo:

- the browse and TMDB layer think in `movie` and `tv`
- the durable `content` schema currently thinks in `movie` and `season`

That matters because your requested curated experience is “movies and TV shows,” not “movies and seasons.”

If we ignore that mismatch and start coding, we will either:

- leak TMDB-only TV show records deep into product state with no durable model, or
- force a rushed schema change that mixes catalog curation concerns with subtitle-analysis concerns

That is avoidable if we split the problem correctly.

## Recommended Product Shape

### Recommendation

Use a dedicated `curated_entry` table as the durable curated catalog overlay.

Do not force the entire feature through the existing `content` table in V1.

Reason:

- it solves the actual feature you asked for
- it supports both `movie` and `tv` immediately
- it avoids prematurely rewriting the product’s canonical analysis model
- it still leaves room to upsert or link `content` rows later when a curated item enters deeper product flows

### Why this is better than overloading `content`

Using `content` alone sounds clean, but it is wrong for the current repo state because:

- `content` is currently optimized around analysis/generation units, not editorial catalog state
- `content` does not currently model TV shows cleanly
- the media detail page is still mock-heavy, so binding curated admin workflow directly to content-analysis assumptions would couple unfinished areas together

The pragmatic split is:

- `curated_entry` owns curated catalog state
- `content` keeps owning reusable analysis and generation anchors

## Proposed V1 Scope

### Learner Experience

Add a signed-in page at `/curated` that:

- shows curated movies and TV shows from the database
- supports at least basic segmentation by media type
- presents curated items in a visually stronger layout than the admin tool
- links into the existing detail flow where possible
- treats curated TV items as show-level entries; the later detail flow should let the learner choose a season

### Admin Experience

Add an admin-only page at `/admin/curated` that:

- lets admins search TMDB titles
- lets admins use two explicit query modes:
  - title search via TMDB search endpoints
  - filter/browse via TMDB discover endpoints
- shows which search results are already curated
- supports add, remove, reorder, and publish/unpublish operations
- persists curated state in Postgres

### Admin Visibility

When an admin is signed in:

- show an obvious admin marker in the shell
- add an admin-only sidebar section for curated management
- label the user clearly in the dropdown or avatar treatment

This should be unmistakable at a glance, but not visually noisy.

## Proposed Data Model

### New Table

Add a table similar to `curated_entry` with these fields:

- `id`
- `sourceProvider` default `tmdb`
- `mediaType` enum: `movie | tv`
- `curationScope` enum: `movie | show | season`
- `tmdbId`
- `tmdbTvId` nullable for future season linkage
- `tmdbSeasonNumber` nullable for future season linkage
- `tmdbSeasonId` nullable for future season linkage
- `title`
- `originalTitle`
- `displaySubtitle` nullable for future labels like `Season 2`
- `overview`
- `posterPath`
- `backdropPath`
- `releaseDate` normalized primary date
- `releaseYear`
- `decade`
- `originalLanguage`
- `originCountries`
- `genreIds`
- `genres` JSON snapshot
- `imdbId`
- `contentRating`
- `tmdbPopularity`
- `voteAverage`
- `voteCount`
- `seasonCountSnapshot` nullable for TV
- `tmdbSnapshot`
- `isPublished`
- `featuredRank`
- `curatedByUserId`
- `curatedAt`
- `lastTmdbSyncedAt`
- standard audit timestamps

Recommended constraints:

- unique on `(mediaType, tmdbId)`
- index on `(isPublished, featuredRank)`
- foreign key from `curatedByUserId -> user.id`

Recommended V1 values:

- movies use `mediaType='movie'` and `curationScope='movie'`
- TV entries use `mediaType='tv'` and `curationScope='show'`
- reserve the season fields now, but leave them null in V1

### Optional Future-Proofing

If we want a migration path toward deeper integration, keep one nullable field reserved:

- `contentId` nullable FK to `content.id`

But I would not make that required in V1.

## Authorization Plan

### Server-Side Guards

Add a small server auth/authorization helper layer, for example:

- `requireSession()`
- `requireAdmin()`

Use it for:

- `/admin/curated`
- any curation mutation route or server action

Do not rely on hiding links in the UI. Admin-only behavior must be enforced server-side.

### Non-Admin Handling

For non-admin access attempts:

- return `forbidden()` if the current Next.js version/app setup supports it cleanly
- otherwise redirect to `/forbidden`

## Route Plan

### Learner Route

`/curated`

Purpose:

- show published curated items only

Suggested structure:

- topbar title: `Curated`
- section tabs or grouped rows for `Movies` and `TV Shows`
- optional “featured” strip driven by `featuredRank`

### Admin Route

`/admin/curated`

Purpose:

- perform editorial selection and ordering

Suggested structure:

- topbar title: `Curated Admin`
- left/top filter bar
- searchable results area
- current curated list area
- inline add/remove/publish/reorder actions

## TMDB Integration Plan

### Query Strategy

The admin tool should not pretend TMDB supports one perfect “search plus filters” request.

Use two explicit TMDB modes:

- keyword search mode:
  - `/search/movie`
  - `/search/tv`
- advanced browse mode:
  - `/discover/movie`
  - `/discover/tv`

Reason:

- TMDB search is good for finding a title you already know
- TMDB discover is the filterable catalog endpoint
- mixing those concepts into one fake server contract produces confusing behavior

### Reuse Existing TMDB Layer First

The current TMDB helper already supports:

- `getGenres(type)`
- `discoverMedia(type, params)`
- `searchMedia(query, type, page)`

That is enough to build the first admin result lists.

### Likely TMDB Additions

We should add detail helpers for persistence-grade snapshots:

- `getMovieDetails(id)` using `/movie/{id}?append_to_response=external_ids,release_dates`
- `getTvDetails(id)` using `/tv/{id}?append_to_response=external_ids,content_ratings`

Reason:

- search/discover payloads are chooser payloads, not durable catalog snapshots
- learner-facing curated pages should render entirely from Postgres
- external IDs and ratings are easiest to capture at insert/update time

### Sync Strategy

Recommended V1 behavior:

- on admin add: fetch detail payload, then persist curated snapshot
- on admin update: refresh curated snapshot from TMDB
- on learner read: read from Postgres, not live from TMDB

That keeps learner pages stable and avoids making the curated page depend on a live external API.

### Normalization Rules

Normalize TMDB movie and TV fields into one internal curated shape:

- `movie.title` and `tv.name` -> `title`
- `movie.original_title` and `tv.original_name` -> `originalTitle`
- `movie.release_date` and `tv.first_air_date` -> `releaseDate`
- movie ratings and TV ratings -> one nullable `contentRating`

Store image paths as TMDB-relative paths, not full URLs.

Store both:

- normalized app fields for rendering/querying
- raw TMDB JSON snapshot for forward compatibility

## UI Plan

### Admin Shell Changes

Update the signed-in shell to pass the user role through to sidebar/user components.

Suggested UI cues:

- avatar ring or badge color for admin
- `Admin` badge near the name/email block
- admin-only nav group with `Curated Admin`

### Learner Curated Page

This page should look polished, not like the admin tool copied into a public route.

Suggested composition:

- featured hero row or highlighted top picks
- separate movie and TV sections
- artwork-first cards
- concise metadata
- no advanced editorial controls

### Admin Curated Page

This page can be more utilitarian.

Suggested controls:

- media type tabs
- query mode toggle: `Search` vs `Browse`
- search field
- genre filter
- sort
- decade filter
- curated-status toggle
- rank input or move-up/move-down controls
- publish toggle

Behavior rules:

- if a keyword is present, use search mode and suppress discover-only promises
- if keyword is empty, use discover mode and expose the full filter set
- decade is a UI macro that expands to a date range

This should optimize for speed and clarity, not visual theater.

## Implementation Phases

### Phase 1: Role Surfacing And Guard Rails

- pass `role` through the app shell session model
- add admin shell badge/treatment
- add server-side admin guard helper
- add admin-only navigation entry

### Phase 2: Durable Curated Catalog

- add `curated_entry` schema and migration
- add the normalized curated snapshot TypeScript contract
- add server-side data access helpers under a new curation feature module
- add list/query functions for learner and admin use cases

### Phase 3: Admin Curation Workflow

- build `/admin/curated`
- reuse current TMDB search/discover flows for result lists
- fetch detail payload before save
- support add/remove/publish/reorder/update

### Phase 4: Learner Curated Page

- build `/curated`
- render published curated items only
- separate movie and TV presentation
- wire links into existing routes as far as current media flow allows
- for TV cards, preserve the product decision that season selection happens after the show-level entry is opened

### Phase 5: Verification And Cleanup

- run `task web:typecheck`
- run `task web:lint`
- manually verify admin and learner flows
- update docs if env or schema expectations change

## Risks And Decision Points

### 1. TV Show Versus Season Modeling

- curate TV at the show level for the catalog experience
- keep analysis/generation canonicalization separate for now
- when a learner opens a curated TV show, the later detail flow should let them choose the season they want to learn

Reason:

- it matches your product language
- it avoids dragging season modeling into the first curated rollout

### 2. Immediate Publish Versus Draft Workflow

Recommended V1 decision:

- changes publish immediately

Reason:

- this is a university demo app
- draft/review states add admin complexity with little user value here

### 3. Manual Ordering

Recommended V1 decision:

- include one simple `featuredRank` field

Reason:

- it gives you editorial control without building collections, drag-and-drop infrastructure, or campaigns

### 4. TMDB Snapshot Freshness

- store a durable snapshot
- refresh on admin action
- do not add background resync jobs yet

Reason:

- that is enough for a demo and keeps the system understandable

## Recommended File/Module Shape

This is the shape I would target during implementation:

- `apps/web/src/features/curation/server/*`
- `apps/web/src/features/curation/components/*`
- `apps/web/src/features/curation/lib/*`
- `apps/web/src/app/(app)/curated/page.tsx`
- `apps/web/src/app/(app)/admin/curated/page.tsx`
- shared auth guard helper under `apps/web/src/lib` or `apps/web/src/features/auth`

That keeps route files thin and avoids burying editorial logic inside page components.

## Validation Plan

Minimum useful validation for this feature:

- `task web:typecheck`
- `task web:lint`
- manual verification as an admin:
  - admin marker is visible in the shell
  - admin nav entry appears
  - search mode works with TMDB search endpoints
  - browse mode works with TMDB discover endpoints
  - add/remove/publish/reorder works
- manual verification as a learner:
  - `/curated` loads in the signed-in shell
  - only published items are visible
  - curated TV entries render as shows, not seasons
  - admin controls are absent

## Final Decisions

These decisions are now locked for implementation unless the product direction changes:

- curate series-level TMDB `tv` entries in V1, not seasons
- signed-in users only can access `/curated`
- admin changes publish immediately
- use one simple `featuredRank` integer for ordering
- skip extra editorial metadata in V1
- when a learner opens a curated TV show later, the detail flow should let them choose which season to learn

## Research Resolution

The TMDB research resolved the main open questions:

- admin UI should use explicit `Search` and `Browse` modes instead of pretending TMDB has one unified query model
- durable curated rows should be persisted from TMDB detail payloads, not from search/discover summaries
- show-level TV curation is sufficient for V1 and is the best fit for this repo’s demo-oriented scope

No further research is required before stage-by-stage implementation.
