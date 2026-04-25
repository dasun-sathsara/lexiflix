# Learner Preferences And Due Notifications Implementation Plan

## Objective

Implement the next SRS-compliance slice after durable pack, study, dashboard, and generation-continuity work:

- learner settings should persist the generation defaults that the media generation dialog actually uses
- `/media/[id]` should hydrate the generation dialog from those persisted defaults, not from route-local constants
- notification records should cover due-review reminders, not only pack-generation outcomes
- the settings write path should move toward the app's typed Server Action pattern instead of route-local JSON handlers

This slice directly targets SRS section 10, "Notifications And Preferences", and tightens the already implemented generation and study requirements that depend on learner state.

## Current State

### Implemented Or Partly Implemented

- `user_preferences` exists and stores:
  - `studyLanguageCode`
  - `dailyWordsGoal`
  - `frequencyPreference`
  - `studyVocabularyTypes`
  - `emailRemindersEnabled`
  - `streakAlertsEnabled`
- `cefr_profile` exists and stores assessed and manual CEFR levels.
- `/settings` reads persisted CEFR and basic learning preferences.
- `/settings` can save manual CEFR override, daily words goal, email reminders, and streak alerts through `app/api/settings/preferences/route.ts`.
- The media detail page already reads `frequencyPreference` and `studyVocabularyTypes` from `user_preferences` when building generation dialog defaults.
- The current generation-continuity implementation work adds a persisted notification bell and pack-ready / pack-failed notification records.
- Dashboard and decks already have enough persisted due-state data to compute due review counts from active pack cards.

### Missing Or Weak

- Settings does not expose generation defaults for:
  - default pack size
  - CEFR window mode
  - known-term handling
  - example sentence count
  - optional default custom instructions
- The media generation dialog falls back to hard-coded defaults for those fields.
- The preferences write path is still a JSON route handler, while the newer app-internal direction prefers typed Server Actions.
- `notification` supports `reviews_due`, but no due-review notification records are created yet.
- The existing `emailRemindersEnabled` name is too email-specific for in-app reminders; in V1 it controls future email delivery only, not whether in-app due-review notification records exist.
- There is no dedupe rule for due-review notification rows, so a naive implementation could create notification spam.

## Recommendation

Implement **learner preference defaults and due-review notifications** next.

This is a better next slice than email delivery, notification scheduling, richer analytics, or SRS algorithm tuning because it closes a documented SRS gap without adding new infrastructure. The app already has the data it needs:

1. learner settings live in `user_preferences` and `cefr_profile`
2. generation defaults are already consumed by `/media/[id]`
3. due cards are already derived from persisted pack state
4. notification rows already exist

The practical missing piece is connecting those boundaries into one consistent user-owned read/write contract.

## Non-Goals

- Email sending for reminders
- scheduled reminder jobs or Vercel Cron
- push notifications
- mobile notifications
- FSRS or advanced scheduling changes
- notification preference center beyond the current settings surface
- redesigning the settings page
- rebuilding profile photo or account-management flows

## SRS Coverage

This slice mainly satisfies:

- SRS 3.3: learner can update or retake their level later
- SRS 6.2: generation preferences are learner-controlled before generation starts
- SRS 6.4: candidate selection uses learner state and preferences
- SRS 8.11: due status is computed from `dueAt <= now`
- SRS 9.3 and 9.4: dashboard/decks due counts come from persisted state
- SRS 10.1: learner preferences relevant to study and generation defaults are stored
- SRS 10.2: notification records support due-review events

## Product Rules

- `user_preferences` remains the durable row for user-owned learning and generation defaults.
- `cefr_profile` remains the durable row for assessed and manually overridden CEFR level.
- Generation requests still capture a per-job `requestSnapshot`; changing defaults later must not rewrite old jobs or old packs.
- Settings defaults are only defaults. The generation dialog can still override them per request.
- Due-review notifications are in-app records in V1.
- Dismissing or reading a due-review notification must not change card due state.
- Due-review notifications must be deduplicated.
- Due-review notifications should never be created for removed or mastered cards.
- Due-review counts should use the same effective due rule as `/dashboard`, `/decks`, and `/study/[id]`.
- `emailRemindersEnabled` controls future email delivery only. It must not suppress in-app `reviews_due` records in V1.
- Default custom generation instructions are optional, nullable, capped, and copied into each generation job's request snapshot when submitted.
- Due-review notification reconciliation should run from the notification query path in V1 because the notification bell is globally visible in the app shell.
- `/api/settings/preferences` should be removed once the settings client fully migrates to the typed Server Action.

## Data Model Changes

Extend `user_preferences` with generation-default fields:

- `generation_pack_size_default integer not null default 20`
- `generation_cefr_window_mode text not null default 'same_level'`
- `generation_known_term_handling text not null default 'exclude_known'`
- `generation_example_sentence_count integer not null default 1`
- `generation_custom_instructions_default text null`

Validation should enforce:

- pack size between `1` and `100`
- CEFR window mode in `same_level`, `one_level_above`, `all_levels_above`
- known-term handling in `exclude_known`, `downrank_known`, `include_known`
- example sentence count in `1`, `2`, `3`
- custom instructions trimmed and capped at the same limit used by generation requests

Keep `frequencyPreference` and `studyVocabularyTypes` as the existing generation-relevant preferences. Do not duplicate them with new column names.

## Feature Boundary

Use the existing settings feature, but make the boundary more complete:

- `apps/web/src/features/settings/types.ts`
- `apps/web/src/features/settings/server/preferences.ts`
- `apps/web/src/features/settings/actions.ts`
- `apps/web/src/app/(app)/settings/settings-client.tsx`

Generation defaults should continue to be consumed from:

- `apps/web/src/features/media/server/analysis.ts`
- `apps/web/src/features/media/components/media-detail-client.tsx`

Due-review notification creation should live in the notification feature boundary:

- `apps/web/src/features/notifications/types.ts`
- `apps/web/src/features/notifications/server/queries.ts`
- `apps/web/src/features/notifications/server/actions.ts`
- `apps/web/src/features/notifications/components/notification-bell.tsx`

## Implementation Stages

### Stage 1: Preference Contract And Migration

- Add the generation-default columns to `user_preferences`.
- Update Drizzle schema and migration snapshots.
- Extend `SettingsPreferences` with the new fields.
- Update `getSettingsPreferences()` to return database values with validated fallbacks.
- Keep default values centralized in the settings server module.
- Include the new generation-default fields in any future docs once the plan is implemented.

### Stage 2: Typed Settings Save Action

- Add a typed `updateSettingsPreferencesAction` in `features/settings/actions.ts`.
- Validate the full settings payload with Zod.
- Persist both `user_preferences` and `cefr_profile` updates.
- Return a discriminated-union result rather than arbitrary JSON.
- Revalidate `/settings`, `/media`, `/dashboard`, and `/decks` where useful.
- Replace the `/api/settings/preferences` client fetch with the Server Action.
- Delete `app/api/settings/preferences/route.ts` after the settings client has no remaining caller.
- Keep `app/api/settings/profile/route.ts` for avatar upload unless a later pass moves file upload into a separate Server Action-safe path.

### Stage 3: Settings UI For Generation Defaults

- Add a compact "Generation defaults" section to the existing Preferences tab.
- Controls should match the generation dialog:
  - pack size input or stepper
  - CEFR window segmented/select control
  - known-term handling select
  - example sentence count control
  - vocabulary type checkboxes
  - frequency preference select
  - optional custom instruction textarea
- Keep the page operational and dense; do not redesign the settings shell.
- Save all preference fields through the typed action.

### Stage 4: Media Generation Defaults Wiring

- Update `getMediaDetailPageData()` generation defaults to read every generation-relevant preference.
- Keep learner CEFR level resolution as `manualOverrideLevel ?? assessedLevel ?? null`.
- Keep per-request overrides in `startPackGenerationAction`.
- Ensure a generation job stores the request snapshot at submit time so later setting changes do not mutate active or completed jobs.

### Stage 5: Due-Review Notification Records

- Add a notification helper such as `reconcileDueReviewNotificationForUser({ userId })`.
- Compute due cards from the same effective due rule used by packs and dashboard.
- If due count is `0`, do not create a new notification.
- If due count is positive, create at most one active `reviews_due` notification per user per app day.
- Use a small payload:
  - `kind: "reviews_due"`
  - `appDay`
  - `dueCount`
  - `firstPackId`
- Set `href` to `/study/${firstDuePackId}` when a due pack exists, otherwise `/decks`.
- Call reconciliation from the notification query path, not from dashboard load and not from a background scheduler.
- Do not create email notifications in this slice.

### Stage 6: Notification Bell Integration

- Ensure `NotificationBell` can display `reviews_due` records cleanly.
- Keep mark-read, mark-all-read, and dismiss behavior record-only.
- Dismissed due-review notifications should stay dismissed for that app day.
- A new app day with due cards may create a new notification.

### Stage 7: Validation

Run:

- `task web:typecheck`
- `task web:lint`

Manual browser checks:

- `/settings` loads existing preferences.
- changing generation defaults persists after reload.
- `/media/[id]` generation dialog reflects saved defaults.
- starting generation still stores a request snapshot independent of later settings edits.
- notification bell shows no due-review notification when no cards are due.
- notification bell creates and shows one due-review notification when cards are due.
- reading and dismissing due-review notifications does not alter card state.
- due-review notification dedupe prevents repeated rows on repeated dashboard/topbar loads.

## Risks And Constraints

- Adding generation-default columns changes persisted defaults. Bump schema carefully and keep fallbacks for existing rows.
- Notification reconciliation on every topbar query could add unnecessary database work. Keep the due-count query narrow and indexed around user-owned packs and effective card due state.
- Due-review notifications can become spammy if dedupe is weak. The app-day payload check is mandatory for V1.
- The current `emailRemindersEnabled` name may imply broader notification behavior. Treat it as email-only in this slice and keep in-app due-review records independent.
- File upload/profile settings still use a route handler. That is acceptable for this slice because avatar upload is not the SRS gap being targeted.

## Later Follow-Ups

- Email reminder delivery when notification preferences allow it.
- Dedicated notification preferences for in-app, email, and future channels.
- Scheduled reminder job if passive reminders become necessary.
- User-facing notification history page.
- Richer generation defaults per content type or per CEFR level.

## Finalized Decisions

- In-app due-review notifications do not respect `emailRemindersEnabled` in V1. That flag is reserved for future email delivery.
- Default custom generation instructions are stored as an optional nullable preference, capped to the same limit as generation requests, and copied into the job request snapshot when generation starts.
- Due-review notifications are reconciled from the notification query path because the notification bell is globally visible across the app shell.
- The JSON preferences route is removed once the settings client migrates to the typed Server Action. The profile upload route remains out of scope for this slice.
