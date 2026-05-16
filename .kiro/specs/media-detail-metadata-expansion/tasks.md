# Implementation Plan: Media Detail Metadata Expansion

## Overview

Expand `MediaDetailView` with five new TMDB fields (original language, original title, country of origin, content certification, IMDb ID), wire them through the server mappers, add locale-display helpers, and render them in the media detail card. All data is already fetched — this is a projection and rendering expansion only.

## Tasks

- [ ] 1. Add five new fields to `MediaDetailView` in `apps/web/src/features/media/types.ts`
  - Open `apps/web/src/features/media/types.ts` and locate the `MediaDetailView` type
  - Add `originalLanguage: string | null` with a JSDoc comment noting it is an ISO 639-1 code (e.g. `"en"`, `"ja"`) that is null when TMDB omits it
  - Add `originalTitle: string | null` with a JSDoc comment noting it is the raw TMDB value and that de-duplication against `title` is deferred to render time
  - Add `originCountryCodes: string[] | null` with a JSDoc comment noting it is TV-only and always null for movies
  - Add `contentCertification: string | null` with a JSDoc comment noting US-first selection and null when absent
  - Add `imdbId: string | null` with a JSDoc comment noting it is null when absent or when the `external_ids` sub-resource is missing
  - **Files:** `apps/web/src/features/media/types.ts`
  - **Requirements:** Req 1.1, 1.2, 2.1, 2.2, 3.3, 4.1, 4.2

- [ ] 2. Create `locale-display.ts` with `getLanguageName` and `getCountryName` helpers
  - Create the new file `apps/web/src/features/media/lib/locale-display.ts`
  - Implement `export function getLanguageName(code: string): string` using `new Intl.DisplayNames(["en"], { type: "language" })`, returning `display.of(code) ?? code.toUpperCase()` inside a `try/catch` that falls back to `code.toUpperCase()`
  - Implement `export function getCountryName(code: string): string` using `new Intl.DisplayNames(["en"], { type: "region" })`, returning `display.of(code) ?? code.toUpperCase()` inside a `try/catch` that falls back to `code.toUpperCase()`
  - Confirm the file has no imports from the rest of the app (pure utility, no side effects)
  - **Files:** `apps/web/src/features/media/lib/locale-display.ts`
  - **Requirements:** Req 1.3, 1.8, 2.3, 2.5

- [ ] 3. Add `extractMovieCertification` private helper to `analysis.ts`
  - Open `apps/web/src/features/media/server/analysis.ts` and add a private function `extractMovieCertification(detail: TMDBMovieDetails): string | null`
  - Guard against a missing sub-resource: `const results = detail.release_dates?.results; if (!results?.length) return null;`
  - Implement US-first selection: find the entry where `iso_3166_1 === "US"` and return the first `release_dates` entry whose `certification` is non-empty
  - Implement the non-US fallback: iterate `results` and return the first non-empty `certification` found across any country's `release_dates` array
  - Return `null` when no non-empty certification exists anywhere in the results
  - **Files:** `apps/web/src/features/media/server/analysis.ts`
  - **Requirements:** Req 3.1, 3.5, 3.6, 3.7, 3.9, 5.4

- [ ] 4. Add `extractTvCertification` private helper to `analysis.ts`
  - In `apps/web/src/features/media/server/analysis.ts`, add a private function `extractTvCertification(detail: TMDBTvDetails): string | null`
  - Guard against a missing sub-resource: `const results = detail.content_ratings?.results; if (!results?.length) return null;`
  - Implement US-first selection: find the entry where `iso_3166_1 === "US"` and return its `rating` if non-empty
  - Implement the non-US fallback: find the first entry in `results` whose `rating` is non-empty and return it
  - Return `null` when no non-empty rating exists anywhere in the results
  - **Files:** `apps/web/src/features/media/server/analysis.ts`
  - **Requirements:** Req 3.2, 3.5, 3.6, 3.7, 3.9, 5.4

- [ ] 5. Extend `mapMovieToView` with the five new fields
  - In `apps/web/src/features/media/server/analysis.ts`, update `mapMovieToView` to include `originalLanguage: detail.original_language ?? null`
  - Add `originalTitle: detail.original_title ?? null`
  - Add `originCountryCodes: null` (hardcoded — movies do not expose an equivalent field on the detail endpoint)
  - Add `contentCertification: extractMovieCertification(detail)` (calls the helper added in task 3)
  - Add `imdbId: detail.imdb_id ?? null`
  - **Files:** `apps/web/src/features/media/server/analysis.ts`
  - **Requirements:** Req 1.1, 1.2, 2.2, 3.1, 3.3, 4.1, 5.5

- [ ] 6. Extend `mapTvToView` with the five new fields
  - In `apps/web/src/features/media/server/analysis.ts`, update `mapTvToView` to include `originalLanguage: detail.original_language ?? null`
  - Add `originalTitle: detail.original_name ?? null`
  - Add `originCountryCodes: detail.origin_country?.length ? detail.origin_country : null` (null rather than `[]` when the array is empty)
  - Add `contentCertification: extractTvCertification(detail)` (calls the helper added in task 4)
  - Add `imdbId: detail.external_ids?.imdb_id ?? null` (safe optional chain for the missing sub-resource case)
  - **Files:** `apps/web/src/features/media/server/analysis.ts`
  - **Requirements:** Req 1.1, 1.2, 2.1, 3.2, 3.3, 4.2, 4.5, 5.4, 5.5

- [ ] 7. Add certification badge to the `badges` slot in `media-detail-client.tsx`
  - Open `apps/web/src/features/media/components/media-detail-client.tsx`
  - Inside the `badges` prop of `<MediaPosterBanner>`, insert a conditional `<Badge>` for `media.contentCertification` positioned after the media-type badge and before the CEFR badge
  - Apply `variant="secondary"` with backdrop-blur styling matching the existing secondary badges: `border border-foreground/15 bg-white/85 text-foreground shadow-sm backdrop-blur-md dark:border-white/15 dark:bg-background/70`
  - Render `{media.contentCertification}` as the badge text
  - Wrap in `{media.contentCertification ? (...) : null}` so it is omitted when null
  - **Files:** `apps/web/src/features/media/components/media-detail-client.tsx`
  - **Requirements:** Req 3.4, 3.8, 5.3, 6.1

- [ ] 8. Add Sub_Meta_Row and derived booleans to `media-detail-client.tsx`
  - In `apps/web/src/features/media/components/media-detail-client.tsx`, add an import for `getLanguageName` and `getCountryName` from `@/features/media/lib/locale-display`
  - Before the JSX return, compute `const showOriginalTitle = Boolean(media.originalTitle) && media.originalTitle !== media.title;`
  - Compute `const hasSubMeta = showOriginalTitle || Boolean(media.originalLanguage) || Boolean(media.originCountryCodes?.length) || Boolean(media.imdbId);`
  - In the `children` slot of `<MediaPosterBanner>`, wrap the existing genre/season block and the new Sub_Meta_Row in a `<div className="flex flex-col gap-2">` container; update the outer condition so the wrapper renders when `hasSubMeta` is true OR the existing genre/season conditions are met
  - Render the Sub_Meta_Row above the genre/season block: `{hasSubMeta ? (<div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-foreground/60">...</div>) : null}`
  - Inside the Sub_Meta_Row, render `{showOriginalTitle ? (<span className="italic">{media.originalTitle}</span>) : null}`
  - Render `{media.originalLanguage ? (<span>{getLanguageName(media.originalLanguage)}</span>) : null}`
  - Render `{media.originCountryCodes?.length ? (<span>{media.originCountryCodes.map(getCountryName).join(", ")}</span>) : null}`
  - Render the IMDb anchor: `{media.imdbId ? (<a href={\`https://www.imdb.com/title/${media.imdbId}/\`} target="_blank" rel="noopener noreferrer" className="font-medium text-foreground/70 underline-offset-2 hover:underline">IMDb</a>) : null}`
  - **Files:** `apps/web/src/features/media/components/media-detail-client.tsx`
  - **Requirements:** Req 1.3, 1.4, 1.5, 1.6, 1.7, 2.3, 2.4, 2.6, 2.7, 4.3, 4.4, 5.1, 5.2, 6.3, 6.4, 6.5

- [ ] 9. Verify with typecheck and lint
  - Run `task web:typecheck` from the repository root and confirm zero TypeScript errors
  - Run `task web:lint` from the repository root and confirm zero Biome lint errors
  - Fix any errors before marking this task complete
  - **Files:** `apps/web/src/features/media/types.ts`, `apps/web/src/features/media/server/analysis.ts`, `apps/web/src/features/media/lib/locale-display.ts`, `apps/web/src/features/media/components/media-detail-client.tsx`
  - **Requirements:** Req 5.1, 5.4, 5.5

## Task Dependency Graph

```json
{
  "waves": [
    [1, 2],
    [3, 4],
    [5, 6],
    [7, 8],
    [9]
  ]
}
```

## Notes

- Tasks 3 and 4 can be implemented in parallel; tasks 5 and 6 can be implemented in parallel after their respective helpers exist.
- Task 2 is independent of all mapper tasks and can be done at any point before task 8.
- No changes are needed to `lib/tmdb.ts`, `lib/tmdb-shared.ts`, or `MediaPosterBanner` — the existing types already cover all required TMDB fields and the `children` prop already accepts arbitrary `ReactNode`.
- `originCountryCodes` is typed as `string[] | null` (not `string[]`) so that `null` unambiguously means "does not apply to this media type" rather than "empty array".
- De-duplication of `originalTitle` against `title` is intentionally deferred to render time (task 8), not the mapper (tasks 5–6), to keep the mapper a pure projection.
