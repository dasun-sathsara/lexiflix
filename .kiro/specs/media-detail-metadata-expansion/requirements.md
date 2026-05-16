# Requirements Document

## Introduction

The media detail page in `apps/web` shows a poster banner card for the selected title (movie or TV show). Today it surfaces a thin slice of TMDB metadata: media-type badge, title, release year, runtime (movies only), TMDB vote average and count, and genre badges. For a language-learning context, where the user is deciding whether a title is worth studying, the card feels under-informed. Information that affects that decision such as original language, native title, and content age rating is missing even though most of it is already fetched from TMDB on the server and discarded at the view-mapping layer.

This feature expands the media detail card with high-signal metadata sourced exclusively from TMDB v3 detail endpoints (`GET /movie/{id}` and `GET /tv/{id}`, both currently called via `getMovieDetails` and `getTvDetails` with `append_to_response=external_ids,release_dates|content_ratings`). The expansion covers both movies and TV shows, treats fields that only exist on one media type as conditional, and degrades gracefully when TMDB returns null, an empty array, or omits the appended sub-resource. No new external services are introduced; this feature only widens the projection from TMDB into the existing `MediaDetailView` and renders the new fields in the existing `MediaPosterBanner` slot structure.

The user has explicitly stated that the requirements must be informed by what TMDB actually returns for movie and TV detail endpoints. Each new field below is grounded in a confirmed TMDB response field documented at developer.themoviedb.org and already typed in `apps/web/src/lib/tmdb-shared.ts`.

## Glossary

- **Media_Detail_View**: The serialized view object passed from server to client for a single title, defined as `MediaDetailView` in `apps/web/src/features/media/types.ts`.
- **Media_Detail_Card**: The poster banner block at the top of the media detail page, rendered by `MediaPosterBanner` and populated by `media-detail-client.tsx`. Has three content slots: a badge row (top), a title block, and a meta line directly under the title. A genre row currently sits in the children slot below the meta line.
- **Badge_Row**: The horizontal row of small pill-shaped indicators rendered in the `badges` prop of `MediaPosterBanner`. Currently holds the media-type badge and the average CEFR level badge.
- **Meta_Line**: The horizontal row of icon-prefixed text fragments rendered in the `meta` prop of `MediaPosterBanner`. Currently holds release year, runtime, and TMDB vote score.
- **Sub_Meta_Row**: A new horizontal row, rendered in the children slot of `MediaPosterBanner` above or alongside the existing genre row, intended for secondary identity metadata (original title, original language, country of origin). Visual treatment is lighter than the meta line.
- **Server_Mapper**: The functions `mapMovieToView` and `mapTvToView` in `apps/web/src/features/media/server/analysis.ts` that project a TMDB detail response into a `Media_Detail_View`.
- **TMDB_Movie_Detail**: The response of `GET /movie/{id}` from TMDB v3, typed as `TMDBMovieDetails` in `apps/web/src/lib/tmdb-shared.ts`.
- **TMDB_TV_Detail**: The response of `GET /tv/{id}` from TMDB v3, typed as `TMDBTvDetails` in `apps/web/src/lib/tmdb-shared.ts`.
- **Content_Certification**: The age rating string returned by TMDB. For movies it lives in `release_dates.results[].release_dates[].certification`. For TV shows it lives in `content_ratings.results[].rating`. Both are scoped by ISO 3166-1 country code in `iso_3166_1`.
- **Original_Title**: For movies, the value of `original_title` on TMDB_Movie_Detail. For TV shows, the value of `original_name` on TMDB_TV_Detail. This is the title in the production's original language and may differ from the localized `title`/`name` field that the card already shows.
- **Original_Language_Code**: The two-letter ISO 639-1 code returned by TMDB in `original_language` on either detail response. May be null.
- **Origin_Country_Codes**: The array of ISO 3166-1 alpha-2 country codes returned by TMDB in `origin_country` on TMDB_TV_Detail. Movies do not expose a top-level equivalent on the detail endpoint.
- **External_IMDB_Id**: The IMDb identifier returned by TMDB. For movies it lives at the top level as `imdb_id`. For TV shows it is appended via `append_to_response=external_ids` and lives at `external_ids.imdb_id`.
- **Localized_Language_Name**: A human-readable language name (for example "English", "Japanese") derived from an Original_Language_Code. The mapping is performed inside the web app and does not require a new TMDB call.
- **Localized_Country_Name**: A human-readable country name (for example "Japan", "South Korea") derived from an ISO 3166-1 alpha-2 code. The mapping is performed inside the web app and does not require a new TMDB call.

## Requirements

### Requirement 1: Surface original-language identity on both media types

**User Story:** As a language learner browsing a title, I want to see the production's original language and native title, so that I can judge whether the title matches the language I am studying without leaving the page.

#### Acceptance Criteria

1. THE Server_Mapper SHALL include the Original_Language_Code on the Media_Detail_View for both movies (sourced from TMDB_Movie_Detail.original_language) and TV shows (sourced from TMDB_TV_Detail.original_language).
2. THE Server_Mapper SHALL include the Original_Title on the Media_Detail_View for both movies (sourced from TMDB_Movie_Detail.original_title) and TV shows (sourced from TMDB_TV_Detail.original_name).
3. WHEN the Original_Language_Code is present on the Media_Detail_View, THE Media_Detail_Card SHALL render the corresponding Localized_Language_Name in the Sub_Meta_Row.
4. WHEN the Original_Title is present on the Media_Detail_View AND the Original_Title differs from the title already displayed by the Media_Detail_Card, THE Media_Detail_Card SHALL render the Original_Title in the Sub_Meta_Row.
5. WHEN the Original_Title equals the title already displayed by the Media_Detail_Card under exact string comparison (no whitespace, encoding, or unicode normalization is applied), THE Media_Detail_Card SHALL omit the Original_Title from the Sub_Meta_Row to avoid duplicate rendering.
6. IF the Original_Language_Code is null or missing, THEN THE Media_Detail_Card SHALL omit the language fragment from the Sub_Meta_Row without rendering an empty placeholder.
7. IF the Original_Title is null or empty, THEN THE Media_Detail_Card SHALL omit the original-title fragment from the Sub_Meta_Row without rendering an empty placeholder.
8. IF a known mapping from the Original_Language_Code to a Localized_Language_Name is unavailable, THEN THE Media_Detail_Card SHALL render the uppercased ISO 639-1 code as a fallback.

### Requirement 2: Surface country of origin for TV shows

**User Story:** As a language learner choosing a TV show, I want to see which country produced it, so that I can distinguish regional variants of the same language (for example, US vs UK English, Spain vs Mexico Spanish) at a glance.

#### Acceptance Criteria

1. THE Server_Mapper SHALL include the Origin_Country_Codes array on the Media_Detail_View for TV shows, sourced from TMDB_TV_Detail.origin_country.
2. THE Server_Mapper SHALL set the Origin_Country_Codes field to null on the Media_Detail_View for movies, since TMDB_Movie_Detail does not expose an equivalent field on the detail endpoint.
3. WHEN the media type is TV AND the Origin_Country_Codes array is non-empty, THE Media_Detail_Card SHALL render each entry as a Localized_Country_Name fragment in the Sub_Meta_Row.
4. WHILE the Origin_Country_Codes array contains more than one entry, THE Media_Detail_Card SHALL render every entry, separated by a comma, in the order returned by TMDB.
5. IF a known mapping from a country code to a Localized_Country_Name is unavailable, THEN THE Media_Detail_Card SHALL render the uppercased ISO 3166-1 code as a fallback.
6. IF the Origin_Country_Codes array is null or empty, THEN THE Media_Detail_Card SHALL omit the country fragment from the Sub_Meta_Row without rendering an empty placeholder.
7. WHERE the media type is movie, THE Media_Detail_Card SHALL omit the country fragment from the Sub_Meta_Row, since this field does not apply to movies.

### Requirement 3: Surface content certification (age rating) on both media types

**User Story:** As a language learner deciding whether a title is suitable for me or for a younger study group, I want to see the content age rating, so that I do not have to leave the page to check parental guidance.

#### Acceptance Criteria

1. WHERE the media type is movie, THE Server_Mapper SHALL select a single Content_Certification string by scanning TMDB_Movie_Detail.release_dates.results for the entry whose iso_3166_1 equals "US" and choosing the first non-empty `certification` value within its `release_dates` array.
2. WHERE the media type is TV, THE Server_Mapper SHALL select a single Content_Certification string by scanning TMDB_TV_Detail.content_ratings.results for the entry whose iso_3166_1 equals "US" and using its `rating` value.
3. THE Server_Mapper SHALL include the selected Content_Certification on the Media_Detail_View together with the iso_3166_1 country code that was used to select it.
4. WHEN a Content_Certification is present on the Media_Detail_View, THE Media_Detail_Card SHALL render the certification value as a dedicated badge in the Badge_Row, positioned after the media-type badge.
5. WHEN the US entry exists with a non-empty certification value, THE Server_Mapper SHALL use the US certification value without consulting any fallback entries.
6. IF the US entry is absent from the TMDB response or its certification value is empty, THEN THE Server_Mapper SHALL fall back to the first entry in the response whose certification value is non-empty.
7. IF no entry in the TMDB response carries a non-empty certification value, THEN THE Server_Mapper SHALL set the Content_Certification field to null on the Media_Detail_View.
8. IF the Content_Certification field on the Media_Detail_View is null, THEN THE Media_Detail_Card SHALL omit the certification badge from the Badge_Row without rendering an empty placeholder.
9. IF the appended sub-resource (`release_dates` for movies, `content_ratings` for TV) is missing from the TMDB response, THEN THE Server_Mapper SHALL set the Content_Certification field to null on the Media_Detail_View without throwing.

### Requirement 4: Surface IMDb cross-link on both media types

**User Story:** As a language learner who wants to dig deeper into a title's reputation, I want a link to the IMDb page, so that I can read reviews and check additional context without copying the title into a search engine.

#### Acceptance Criteria

1. THE Server_Mapper SHALL include the External_IMDB_Id on the Media_Detail_View for movies, sourced from TMDB_Movie_Detail.imdb_id.
2. THE Server_Mapper SHALL include the External_IMDB_Id on the Media_Detail_View for TV shows, sourced from TMDB_TV_Detail.external_ids.imdb_id.
3. WHEN the External_IMDB_Id is present and non-empty on the Media_Detail_View, THE Media_Detail_Card SHALL render an "IMDb" affordance in the Sub_Meta_Row that links to `https://www.imdb.com/title/{External_IMDB_Id}/` and opens in a new tab.
4. IF the External_IMDB_Id is null or empty, THEN THE Media_Detail_Card SHALL omit the IMDb affordance from the Sub_Meta_Row entirely, with no anchor element rendered, so that no broken link is exposed.
5. IF the appended `external_ids` sub-resource is missing from a TV detail response, THEN THE Server_Mapper SHALL treat the External_IMDB_Id as null without throwing.

### Requirement 5: Preserve graceful degradation when TMDB metadata is partially missing

**User Story:** As a user opening any media detail page, I want the card to render cleanly even when TMDB has incomplete data for the title, so that the experience is never broken or visually empty.

#### Acceptance Criteria

1. THE Media_Detail_Card SHALL render the Badge_Row, Meta_Line, and Sub_Meta_Row independently of one another, so that a missing field in one row does not affect the others.
2. WHILE every Sub_Meta_Row field is null or missing, THE Media_Detail_Card SHALL omit the entire Sub_Meta_Row container from the rendered output.
3. WHILE the Badge_Row contains only the always-present media-type badge, THE Media_Detail_Card SHALL still render the Badge_Row in its current position without inserting placeholder badges.
4. IF the TMDB detail response omits any optional appended sub-resource (`release_dates`, `content_ratings`, `external_ids`), THEN THE Server_Mapper SHALL produce a Media_Detail_View whose corresponding fields are null without raising an error.
5. THE Server_Mapper SHALL NOT introduce any new TMDB request beyond the existing `getMovieDetails` and `getTvDetails` calls; all new fields must be derived from data already available in the current TMDB detail response.

### Requirement 6: Maintain visual hierarchy of the Media_Detail_Card

**User Story:** As a designer responsible for the card layout, I want the new metadata to slot into a clear visual hierarchy, so that the card stays scannable and does not feel like a wall of text.

#### Acceptance Criteria

1. THE Media_Detail_Card SHALL place identity-shaping classifiers (media type, content certification) in the Badge_Row.
2. THE Media_Detail_Card SHALL place primary numeric and temporal metadata (release year, runtime for movies, TMDB vote score) in the Meta_Line.
3. THE Media_Detail_Card SHALL place secondary identity metadata (original title, original language, country of origin, IMDb cross-link) in the Sub_Meta_Row.
4. THE Media_Detail_Card SHALL render the Sub_Meta_Row above the existing genre row when both are present.
5. THE Media_Detail_Card SHALL apply a visually lighter treatment to the Sub_Meta_Row than to the Meta_Line, so that it reads as supporting information rather than primary metadata.
