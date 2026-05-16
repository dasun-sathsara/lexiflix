# Design Document: Media Detail Metadata Expansion

## Overview

This feature widens the projection from TMDB into `MediaDetailView` and renders five new metadata fields — original language, original title, country of origin (TV only), content certification, and IMDb ID — in the existing `MediaPosterBanner` slot structure on the media detail page.

All data is already fetched from TMDB by the existing `getMovieDetails` and `getTvDetails` calls (both use `append_to_response=external_ids,release_dates` for movies and `append_to_response=external_ids,content_ratings` for TV). No new network requests are introduced. The work is purely a projection and rendering expansion.

---

## Architecture

Data flows in one direction through four layers:

```
TMDB v3 API
  └─ getMovieDetails / getTvDetails          (lib/tmdb.ts — unchanged)
       └─ mapMovieToView / mapTvToView       (server/analysis.ts — extended)
            └─ MediaDetailView               (features/media/types.ts — extended)
                 └─ MediaDetailClient        (components/media-detail-client.tsx — extended)
                      ├─ badges slot         → certification badge
                      └─ children slot       → Sub_Meta_Row (above genre row)
```

### Layer responsibilities

| Layer | Change |
|---|---|
| `lib/tmdb.ts` | None. Existing calls already append the needed sub-resources. |
| `lib/tmdb-shared.ts` | None. `TMDBMovieDetails` and `TMDBTvDetails` already type all required fields. |
| `features/media/types.ts` | Add five new nullable fields to `MediaDetailView`. |
| `features/media/server/analysis.ts` | Extend `mapMovieToView` and `mapTvToView` to project the new fields. |
| `features/media/lib/locale-display.ts` | New file. Pure helpers for ISO code → human-readable name conversion. |
| `features/media/components/media-detail-client.tsx` | Render certification badge and Sub_Meta_Row using the new fields. |

---

## Components and Interfaces

### 1. `MediaDetailView` type changes

Five fields are added to the existing type in `features/media/types.ts`:

```ts
export type MediaDetailView = {
  // ... existing fields unchanged ...

  /** ISO 639-1 language code, e.g. "en", "ja". Null when TMDB omits it. */
  originalLanguage: string | null;

  /**
   * Native title in the production's original language.
   * Stored as the raw TMDB value; de-duplication against the display title
   * happens at render time, not here.
   */
  originalTitle: string | null;

  /**
   * ISO 3166-1 alpha-2 country codes from TMDB origin_country.
   * TV only — always null for movies.
   */
  originCountryCodes: string[] | null;

  /**
   * Age rating string, e.g. "PG-13", "TV-MA".
   * US-first selection; falls back to first non-empty entry; null when absent.
   */
  contentCertification: string | null;

  /** IMDb title ID, e.g. "tt0816692". Null when absent or external_ids missing. */
  imdbId: string | null;
};
```

### 2. Server mapper changes (`server/analysis.ts`)

#### `mapMovieToView`

```ts
function mapMovieToView(detail: TMDBMovieDetails): MediaDetailView {
  return {
    // ... existing fields ...
    originalLanguage: detail.original_language ?? null,
    originalTitle: detail.original_title ?? null,
    originCountryCodes: null,                          // movies: not available
    contentCertification: extractMovieCertification(detail),
    imdbId: detail.imdb_id ?? null,
  };
}
```

#### `mapTvToView`

```ts
function mapTvToView(detail: TMDBTvDetails, selectedSeasonNumber: number | null): MediaDetailView {
  return {
    // ... existing fields ...
    originalLanguage: detail.original_language ?? null,
    originalTitle: detail.original_name ?? null,
    originCountryCodes: detail.origin_country?.length ? detail.origin_country : null,
    contentCertification: extractTvCertification(detail),
    imdbId: detail.external_ids?.imdb_id ?? null,
  };
}
```

#### Certification extraction helpers (private, co-located in `analysis.ts`)

```ts
/** US-first selection from movie release_dates; falls back to first non-empty entry. */
function extractMovieCertification(detail: TMDBMovieDetails): string | null {
  const results = detail.release_dates?.results;
  if (!results?.length) return null;

  const usEntry = results.find((r) => r.iso_3166_1 === "US");
  const usCert = usEntry?.release_dates.find((d) => d.certification)?.certification;
  if (usCert) return usCert;

  for (const country of results) {
    const cert = country.release_dates.find((d) => d.certification)?.certification;
    if (cert) return cert;
  }
  return null;
}

/** US-first selection from TV content_ratings; falls back to first non-empty entry. */
function extractTvCertification(detail: TMDBTvDetails): string | null {
  const results = detail.content_ratings?.results;
  if (!results?.length) return null;

  const usEntry = results.find((r) => r.iso_3166_1 === "US");
  if (usEntry?.rating) return usEntry.rating;

  const fallback = results.find((r) => r.rating);
  return fallback?.rating ?? null;
}
```

### 3. Locale display helpers (`features/media/lib/locale-display.ts`)

A new pure-utility file with no side effects and no imports from the rest of the app.

```ts
/**
 * Maps an ISO 639-1 language code to an English language name using the
 * browser-native Intl.DisplayNames API. Falls back to the uppercased code
 * when the runtime does not support the API or the code is unrecognised.
 */
export function getLanguageName(code: string): string {
  try {
    const display = new Intl.DisplayNames(["en"], { type: "language" });
    return display.of(code) ?? code.toUpperCase();
  } catch {
    return code.toUpperCase();
  }
}

/**
 * Maps an ISO 3166-1 alpha-2 country code to an English country name using
 * Intl.DisplayNames. Falls back to the uppercased code when unavailable.
 */
export function getCountryName(code: string): string {
  try {
    const display = new Intl.DisplayNames(["en"], { type: "region" });
    return display.of(code) ?? code.toUpperCase();
  } catch {
    return code.toUpperCase();
  }
}
```

These helpers are called at render time inside `media-detail-client.tsx`, not in the server mapper. This keeps the mapper free of locale concerns and lets the helpers be tested in isolation.

### 4. UI changes (`media-detail-client.tsx`)

#### 4a. Certification badge in the `badges` slot

The certification badge is inserted after the media-type badge and before the CEFR badge:

```tsx
{media.contentCertification ? (
  <Badge
    variant="secondary"
    className="border border-foreground/15 bg-white/85 text-foreground shadow-sm backdrop-blur-md dark:border-white/15 dark:bg-background/70"
  >
    {media.contentCertification}
  </Badge>
) : null}
```

#### 4b. Sub_Meta_Row in the `children` slot

The Sub_Meta_Row is rendered above the existing genre/season row. It is omitted entirely when all four contributing fields are null or empty.

```tsx
{/* Sub_Meta_Row — rendered only when at least one field is present */}
{hasSubMeta ? (
  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-foreground/60">
    {showOriginalTitle ? (
      <span className="italic">{media.originalTitle}</span>
    ) : null}

    {media.originalLanguage ? (
      <span>{getLanguageName(media.originalLanguage)}</span>
    ) : null}

    {media.originCountryCodes?.length ? (
      <span>
        {media.originCountryCodes.map(getCountryName).join(", ")}
      </span>
    ) : null}

    {media.imdbId ? (
      <a
        href={`https://www.imdb.com/title/${media.imdbId}/`}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-foreground/70 underline-offset-2 hover:underline"
      >
        IMDb
      </a>
    ) : null}
  </div>
) : null}
```

The `hasSubMeta` and `showOriginalTitle` derived booleans are computed inline before the JSX:

```ts
const showOriginalTitle =
  Boolean(media.originalTitle) && media.originalTitle !== media.title;

const hasSubMeta =
  showOriginalTitle ||
  Boolean(media.originalLanguage) ||
  Boolean(media.originCountryCodes?.length) ||
  Boolean(media.imdbId);
```

The full `children` slot then wraps both the Sub_Meta_Row and the existing genre/season block inside a `flex flex-col gap-2` container.

---

## Data Models

### Updated `MediaDetailView` shape

```ts
type MediaDetailView = {
  // Identity
  tmdbId: number;
  mediaType: TMDBMediaType;
  title: string;
  subtitle: string | null;
  overview: string | null;

  // Primary metadata (Meta_Line)
  releaseYear: string | null;
  runtimeMinutes: number | null;
  voteAverage: number | null;
  voteCount: number | null;

  // Taxonomy
  genres: string[];

  // Images
  posterPath: string | null;
  backdropPath: string | null;

  // Season state (TV only)
  selectedSeasonNumber: number | null;
  availableSeasonCount: number | null;

  // ── NEW FIELDS ──────────────────────────────────────────────────────────────

  /** ISO 639-1 code, e.g. "en". Null when TMDB omits it. */
  originalLanguage: string | null;

  /**
   * Raw TMDB original_title / original_name.
   * De-duplication against `title` is deferred to render time.
   */
  originalTitle: string | null;

  /**
   * ISO 3166-1 alpha-2 codes from TMDB origin_country.
   * Always null for movies; null (not []) when the TV array is empty.
   */
  originCountryCodes: string[] | null;

  /**
   * Age rating string selected with US-first logic.
   * Null when no non-empty certification exists in the TMDB response.
   */
  contentCertification: string | null;

  /** IMDb title ID. Null when absent or external_ids sub-resource is missing. */
  imdbId: string | null;
};
```

### TMDB source mapping

| `MediaDetailView` field | Movie source | TV source |
|---|---|---|
| `originalLanguage` | `detail.original_language` | `detail.original_language` |
| `originalTitle` | `detail.original_title` | `detail.original_name` |
| `originCountryCodes` | `null` (hardcoded) | `detail.origin_country` (null when empty) |
| `contentCertification` | US-first from `detail.release_dates.results` | US-first from `detail.content_ratings.results` |
| `imdbId` | `detail.imdb_id` | `detail.external_ids?.imdb_id` |

---

## Error Handling

### Missing or partial TMDB sub-resources

Both `release_dates` (movies) and `content_ratings` / `external_ids` (TV) are appended via `append_to_response` and may be absent from the TMDB response. The mapper handles this with optional chaining throughout:

- `detail.release_dates?.results` — if undefined, `extractMovieCertification` returns `null`
- `detail.content_ratings?.results` — if undefined, `extractTvCertification` returns `null`
- `detail.external_ids?.imdb_id` — if undefined, the expression evaluates to `undefined`, coerced to `null` via `?? null`

No `try/catch` is needed in the mapper because all access paths are optional-chained.

### Null fields at render time

Every new field on `MediaDetailView` is typed as `T | null`. The client component guards each fragment individually:

- `media.contentCertification` — badge rendered only when truthy
- `media.originalTitle` — shown only when truthy and `!== media.title`
- `media.originalLanguage` — language name shown only when truthy
- `media.originCountryCodes` — country names shown only when the array is non-empty
- `media.imdbId` — anchor rendered only when truthy

The entire Sub_Meta_Row container is omitted when `hasSubMeta` is false, so no empty wrapper element is ever rendered.

### `Intl.DisplayNames` availability

`Intl.DisplayNames` is supported in all modern browsers and in Node.js 12+. The helpers wrap the call in a `try/catch` and fall back to `code.toUpperCase()` to handle any edge case (unsupported runtime, unrecognised code, or a code that `Intl.DisplayNames.of()` returns `undefined` for).

### Badge_Row stability

The media-type badge is always rendered. The certification badge and CEFR badge are both conditional. The Badge_Row renders correctly with any combination of zero, one, or two optional badges present alongside the always-present media-type badge.

---

## Implementation Notes

### Why de-duplication of `originalTitle` is at render time, not in the mapper

The mapper's job is to faithfully project TMDB data into the view type. Suppressing `originalTitle` when it equals `title` is a display concern, not a data concern. Keeping the raw value in the view type means:

1. The mapper stays a pure projection with no conditional logic based on other fields.
2. If the display title ever changes (e.g., a localization layer is added later), the original title is still available without re-fetching.
3. The render-time check (`media.originalTitle !== media.title`) is a single boolean expression with no ambiguity.

### Why `Intl.DisplayNames` instead of a static lookup table

`Intl.DisplayNames` is built into every modern JavaScript runtime and covers the full ISO 639-1 and ISO 3166-1 alpha-2 namespaces without any bundle cost. A static table would need to be maintained, would add bundle weight, and would still be incomplete for less common codes. The `try/catch` fallback to `code.toUpperCase()` ensures the component never breaks even in environments where the API behaves unexpectedly.

### Why `originCountryCodes` is `null` (not `[]`) for movies

Using `null` for movies and `string[] | null` for TV makes the type self-documenting: `null` means "this field does not apply to this media type", while an empty array would be ambiguous (does it mean "TV show with no country data" or "not a TV show"?). The render guard `media.originCountryCodes?.length` handles both the `null` and empty-array cases identically, so there is no practical cost to this distinction.

### Why certification selection is US-first with a non-US fallback

The app's primary audience is English-language learners, and the US rating system (MPAA for movies, TV Parental Guidelines for TV) is the most widely recognised. Falling back to the first non-empty entry rather than returning `null` means that non-US titles (e.g., a Korean drama with a KMRB rating) still surface a certification rather than showing nothing. The country code used for selection is not stored on the view type because the UI only needs the rating string, not its provenance.

### Placement of `locale-display.ts` in `features/media/lib/`

Following the feature module shape documented in `apps/web/AGENTS.md`, pure feature logic lives in `features/<feature>/lib/`. These helpers are specific to the media detail rendering concern and have no reason to live in `src/lib` (which is reserved for cross-cutting infrastructure). If a future feature needs locale display helpers, they can be promoted to `src/lib` at that point.

### No changes to `MediaPosterBanner`

The `children` prop of `MediaPosterBanner` already accepts arbitrary `ReactNode`. The Sub_Meta_Row and the existing genre/season block are both rendered as children of the banner from `media-detail-client.tsx`. No changes to the shared component are needed, which keeps the primitive stable per the guidance in `apps/web/AGENTS.md`.

---

## Correctness Properties

These properties describe invariants that must hold across all inputs and should guide both manual review and any future automated tests.

### Property 1: Mapper null safety

`mapMovieToView` and `mapTvToView` must never throw when any of `release_dates`, `content_ratings`, or `external_ids` is absent from the TMDB response. All five new fields must be `null` rather than `undefined` when their source data is missing.

**Validates: Requirements 3.9, 4.5, 5.4**

### Property 2: Movie/TV field exclusivity

`originCountryCodes` must always be `null` in the output of `mapMovieToView`, regardless of the input. `mapTvToView` must never produce `null` for `originCountryCodes` when `detail.origin_country` is a non-empty array.

**Validates: Requirements 2.1, 2.2**

### Property 3: Certification US-first selection

When `release_dates.results` (movies) or `content_ratings.results` (TV) contains a US entry with a non-empty certification/rating, the mapper must return that value and must not return any other country's value.

**Validates: Requirements 3.1, 3.2, 3.5**

### Property 4: Certification non-US fallback

When no US entry exists or the US entry has an empty certification, the mapper must return the first non-empty certification found in the results array (not `null`), provided at least one non-empty entry exists.

**Validates: Requirements 3.6, 3.7**

### Property 5: IMDb null coercion

`imdbId` must be `null` (not `undefined`) when `detail.imdb_id` is `null` (movies) or when `detail.external_ids` is absent or `detail.external_ids.imdb_id` is `null` (TV).

**Validates: Requirements 4.1, 4.2, 4.5**

### Property 6: Original title raw projection

`originalTitle` must equal the raw TMDB value (`original_title` for movies, `original_name` for TV) without any transformation or de-duplication. The mapper must not compare it against `title`.

**Validates: Requirements 1.1, 1.2**

### Property 7: Sub_Meta_Row omission when all fields absent

The Sub_Meta_Row container must not appear in the DOM when `originalTitle === media.title` (or `originalTitle` is null), `originalLanguage` is null, `originCountryCodes` is null or empty, and `imdbId` is null — all four conditions simultaneously.

**Validates: Requirements 5.2**

### Property 8: Original title de-duplication at render time

The original title fragment must not render when `media.originalTitle === media.title` (exact string equality), even if `originalTitle` is non-null.

**Validates: Requirements 1.4, 1.5**

### Property 9: IMDb link safety

The IMDb anchor element must not be rendered when `imdbId` is null or empty. No `href` pointing to `https://www.imdb.com/title/null/` or similar must ever appear in the DOM.

**Validates: Requirements 4.3, 4.4**

### Property 10: Certification badge position

The certification badge must appear after the media-type badge and before the CEFR badge in DOM order within the `badges` slot.

**Validates: Requirements 3.4, 6.1**

### Property 11: Locale helper no-throw guarantee

`getLanguageName` and `getCountryName` must never throw for any string input, including empty strings, invalid codes, and codes not recognised by `Intl.DisplayNames`.

**Validates: Requirements 1.8, 2.5**

### Property 12: Locale helper fallback format

When `Intl.DisplayNames` cannot resolve a code, the returned string must be the input code converted to uppercase (e.g., `"xx"` → `"XX"`).

**Validates: Requirements 1.8, 2.5**

---

## Testing Strategy

There is no established automated test suite for the web app at the time of writing (see `apps/web/AGENTS.md`). The minimum useful verification for this feature is:

### Type checking and linting

```
task web:typecheck
task web:lint
```

These must pass with zero errors after all changes are applied. TypeScript will catch any mapper field mismatches against the updated `MediaDetailView` type.

### Manual browser verification

Verify the following scenarios in the browser against live TMDB data:

| Scenario | What to check |
|---|---|
| English-language movie (e.g., a US blockbuster) | Certification badge present; Sub_Meta_Row omitted (original title = display title, language = "en" still shown, no country for movies) |
| Foreign-language movie (e.g., a French or Japanese film) | Original title shown (differs from display title); language name shown in English; no country fragment |
| US TV show | Certification badge; country "United States"; language "English"; IMDb link |
| Multi-country TV show (e.g., a UK/US co-production) | Both country names shown, comma-separated |
| Title with no TMDB certification data | No certification badge; rest of card unaffected |
| Title with no IMDb ID | No IMDb link in Sub_Meta_Row |
| Title where all Sub_Meta_Row fields are null | Sub_Meta_Row container absent from DOM (inspect element to confirm) |

### Unit-testable helpers

`getLanguageName` and `getCountryName` in `features/media/lib/locale-display.ts` are pure functions with no dependencies and are straightforward to unit-test with Vitest if a test suite is introduced:

- Known code → expected English name (e.g., `"en"` → `"English"`, `"US"` → `"United States"`)
- Unknown code → uppercased fallback (e.g., `"xx"` → `"XX"`)
- Empty string → `""` uppercased (i.e., `""`)

The certification extraction helpers (`extractMovieCertification`, `extractTvCertification`) are also pure functions and can be unit-tested by passing mock `TMDBMovieDetails` / `TMDBTvDetails` objects covering: US entry present, US entry absent, all entries empty, `release_dates`/`content_ratings` absent entirely.
