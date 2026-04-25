# Generation Continuity Implementation Plan

## Objective

Implement the next user-facing slice after real pack staging and durable study progress:

- pack-generation progress should be visible after the learner leaves the media detail page
- `/decks` should show active, failed, and recently completed generation jobs alongside generated packs
- a dedicated progress route should provide one durable place to inspect a generation job
- pack-ready notifications should come from persisted `notification` rows, not topbar mock state
- pack replacement should be hardened before we make long-running generation more visible

This is the next practical product slice because LexiFlix can now generate packs, display them, and persist reviews. The remaining demo-breaking gap is continuity around long-running generation: a learner can start generation, navigate away, and lose the visible job trail unless they return to the same media page.

## Current State

### Implemented

- `pack_generation_job` and `pack_generation_job_event` already exist.
- `startPackGenerationAction` creates or reuses generation jobs and triggers `generate-content-pack`.
- `MediaDetailClient` polls generation status while the user remains on the media detail page.
- The generation dialog already captures learner-controlled request fields:
  - `selectedVocabularyTypes`
  - `cefrWindowMode`
  - `packSize`
  - `knownTermHandling`
  - `exampleSentenceCount`
  - `customInstructions`
- `/pack/[id]`, `/decks`, `/study/[id]`, and `/dashboard` now read real pack and review state.
- `review_event`, `user_term_state`, and `user_streak` are updated by study reviews.
- The schema already contains a minimal `notification` table.

### Missing Or Weak

- There is no dedicated pack-generation progress route.
- `/decks` only lists completed generated packs; active jobs are invisible there.
- Generation polling logic is media-feature-specific instead of a shared pack-generation read contract.
- `PackGenerationSnapshot` does not include event history, content summary, timestamps, request summary, warnings, or a stable progress-route href.
- `AppTopbar` uses hard-coded local mock notifications.
- The sidebar `My Decks` badge is hard-coded to `"4"`.
- Pack generation deletes the existing pack before inserting the replacement pack. That contradicts the documented rule that the old pack remains usable until the replacement is fully ready.
- `task web:lint` is currently polluted by generated `.trigger/tmp` output because Biome does not exclude `.trigger`.

## Recommendation

Implement **generation continuity** next.

This is a better next slice than notification emails, analytics charts, or deeper SRS tuning because it closes a visible workflow gap in the core path:

1. choose content
2. analyze subtitles
3. generate pack
4. leave and return while generation runs
5. open the finished pack

Right now step 4 is the weak link. Fixing it also gives the real notification system a concrete first use case: pack ready and pack generation failed.

## Non-Goals

Do not include these in this slice:

- WebSockets or realtime streaming
- email delivery
- scheduled due-review reminder jobs
- detailed generation analytics
- admin observability dashboards
- changing the SRS scheduling algorithm
- implementing live non-mock audio or image providers
- redesigning the media detail page

The target is a durable app-owned polling and notification surface, not a new workflow platform.

## Product Rules

- The browser must still poll the Next.js app, not Trigger.dev.
- `pack_generation_job` remains the durable polling target for generation.
- `pack_generation_job_event` is the detailed event trail.
- A completed job should route to `/pack/${packId}`.
- A running or failed job should route to a dedicated progress route.
- `/decks` should show running generation jobs even before a `pack` row exists.
- Notifications are user-owned persisted rows.
- Marking a notification as read or dismissed must not affect the underlying job or pack.
- Pack-ready notifications should be created when generation completes.
- Pack-failed notifications should be created when generation fails after a user-triggered request.
- Review-due reminders remain a later notification use case.
- Existing packs must stay usable if regeneration fails.

## Proposed Route And Feature Boundary

Add a dedicated feature boundary:

- `apps/web/src/features/pack-generation/types.ts`
- `apps/web/src/features/pack-generation/server/queries.ts`
- `apps/web/src/features/pack-generation/server/actions.ts`
- `apps/web/src/features/pack-generation/components/generation-progress-client.tsx`
- `apps/web/src/features/pack-generation/components/deck-generation-jobs-client.tsx`

Add a dedicated route:

- `apps/web/src/app/(app)/generation/[jobId]/page.tsx`

The route should:

1. require a signed-in session
2. load the job by `jobId` and `userId`
3. return `notFound()` when the job is missing or belongs to another user
4. show current stage, status, safe error details, event history, request summary, and final pack CTA
5. poll through the shared action while the job is `queued` or `running`

Use `/generation/[jobId]` rather than putting this under `/media` because a generation job is user-specific product state, not a TMDB media route.

## Shared Read Model

Create a single generation progress read model used by media detail, `/decks`, and `/generation/[jobId]`.

Suggested type:

```ts
type PackGenerationProgressView = {
  jobId: string;
  contentId: string;
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  stage:
    | "queued"
    | "selecting_terms"
    | "generating_content"
    | "generating_assets"
    | "saving_pack"
    | "completed"
    | "failed";
  progressMessage: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  progressHref: string;
  packHref: string | null;
  packId: string | null;
  content: {
    title: string;
    subtitle: string | null;
    kind: "movie" | "season";
    posterUrl: string | null;
    mediaInfoHref: string | null;
  };
  request: {
    packSize: number;
    cefrWindowMode: string;
    knownTermHandling: string;
    exampleSentenceCount: number;
    selectedVocabularyTypes: string[];
  };
  events: PackGenerationProgressEvent[];
};
```

Rules:

- `events` should be included for the dedicated route.
- `/decks` can request a compact view without full event history.
- Media detail should use the same compact view rather than maintaining a separate snapshot shape.
- Do not expose raw event payloads blindly in learner UI. Render safe summaries and keep detailed payloads behind developer-only/debug affordances if needed.

## Decks Integration

Update `/decks` so it has two real data sets:

- completed/generated packs from `pack`
- active or recent generation jobs from `pack_generation_job`

Recommended behavior:

- Show active generation rows above generated decks.
- Active statuses: `queued`, `running`.
- Failed jobs should remain visible with a retry/open-progress CTA.
- Completed jobs without a visible pack should remain visible as a warning state.
- Completed jobs with a pack should show an `Open pack` CTA and can also appear in the normal deck list.
- Poll only while at least one visible job is `queued` or `running`.
- The top page stats should distinguish generated decks from active generation jobs.

This closes the documented requirement that generation progress appears both in a dedicated view and on the decks surface through one shared polling contract.

## Notifications Integration

Add a notification feature boundary:

- `apps/web/src/features/notifications/types.ts`
- `apps/web/src/features/notifications/server/queries.ts`
- `apps/web/src/features/notifications/server/actions.ts`
- `apps/web/src/features/notifications/components/notification-bell.tsx`

Replace hard-coded topbar notifications with persisted notifications.

V1 behavior:

- Fetch the latest user notifications for the bell.
- Show unread count from rows where `status` is not `read` or `dismissed`.
- Mark one notification as read.
- Mark all visible notifications as read.
- Dismiss a notification.
- Keep the empty state.

Generation workflow integration:

- On generation completion, create a `pack_ready` notification with `href = /pack/${packId}`.
- On generation failure, create a `system` or generation-failed notification if the enum is not expanded.
- Keep notification payload small:
  - `jobId`
  - `packId` when available
  - `contentId`
  - status/stage

Recommendation: use the existing enum values for the first pass:

- `pack_ready` for completed generation
- `system` for failed generation

Do not add enum values unless the current enum is clearly insufficient.

## Pack Replacement Hardening

The current generation workflow deletes the old pack before inserting the replacement pack. That is the wrong failure mode once generation state is user-visible.

Required improvement:

- old pack remains visible and usable until the new pack is fully saved
- replacement happens inside one database transaction if the current Drizzle/Neon setup supports it cleanly
- if the app cannot use a transaction with the current driver, use a single database-side transaction helper or switch the DB access path for this workflow to one that supports transactions
- do not pretend separate delete/insert statements are atomic

Recommended save flow:

1. Generate text and best-effort assets.
2. Upload artifacts to final object keys.
3. Start database transaction.
4. Delete old pack for `(userId, contentId)`.
5. Insert new `pack`.
6. Insert `pack_item` rows.
7. Insert `pack_item_content` rows.
8. Mark job completed.
9. Insert pack-ready notification.
10. Commit.
11. If the transaction fails after artifact upload, run best-effort R2 cleanup for uploaded objects and mark job failed.

If notification creation fails, do not fail the pack save. In that case, record a workflow event warning and keep the pack.

## Biome And Generated Trigger Output

Fix source validation before or during this slice.

Current issue:

- `task web:lint` scans `.trigger/tmp` generated files and fails on generated bundled code.

Recommended fix:

- update `apps/web/biome.json` `files.includes` to exclude `.trigger`
- keep touched-file Biome checks as a fallback, but restore `task web:lint` as a meaningful repo command

This is not product work, but it is required to keep the validation loop honest.

## Implementation Stages

### Stage 1: Shared Generation Progress Read Model

- Add pack-generation feature types.
- Add `getPackGenerationProgressView({ userId, jobId, includeEvents })`.
- Add `listPackGenerationProgressForDecks({ userId })`.
- Normalize content title, subtitle, poster, media route, pack route, and progress route.
- Return only user-owned jobs.
- Replace duplicated generation snapshot mapping in `features/media/server/analysis.ts` where practical.

### Stage 2: Dedicated Progress Route

- Add `/generation/[jobId]`.
- Render a compact operational progress page.
- Include event timeline, request summary, status banner, retry/open-pack actions.
- Add client polling through `getPackGenerationProgressAction` while queued/running.
- Keep failed states actionable and honest.

### Stage 3: Decks Job Visibility

- Extend `/decks` read model to include active/recent generation jobs.
- Add a small client component for polling visible active jobs.
- Show active jobs above deck rows.
- Remove the hard-coded sidebar deck badge or replace it with a real count if the layout can fetch it without broad churn.

### Stage 4: Persisted Notifications

- Add notification query/action helpers.
- Replace `createInitialNotifications()` in `AppTopbar`.
- Add read/dismiss/mark-all actions.
- Create pack-ready notification from the generation workflow.
- Create pack-failed notification from the generation workflow failure path.

### Stage 5: Pack Replacement Hardening

- Verify transaction support against the current Drizzle/Neon driver.
- Make final pack replacement atomic.
- Add best-effort artifact cleanup on post-upload persistence failure.
- Keep old pack untouched until the transaction commits.
- Record warnings in `pack_generation_job_event` instead of burying them in logs only.

### Stage 6: Validation

Minimum checks:

- `task web:typecheck`
- `task web:lint` after excluding `.trigger`
- source-scoped Biome check for touched files if full lint is still blocked
- browser verification of `/decks` with no jobs
- browser verification of `/decks` with a queued/running job
- browser verification of `/generation/[jobId]` queued/running/completed/failed states
- browser verification that media detail and `/generation/[jobId]` report the same job status
- notification bell shows persisted pack-ready notification
- mark one notification as read
- mark all notifications as read
- dismiss a notification
- regenerate a pack and verify old pack remains visible if the job fails

If local Trigger.dev cannot run because of auth, use direct database fixtures for job states and verify the read models/UI against those fixtures. Do not claim end-to-end workflow verification unless Trigger actually runs.

## Risks And Constraints

- `AppTopbar` is currently client-owned and instantiated by many pages. Replacing notification mocks should be done through a small notification component or server action boundary rather than moving the whole app shell in one pass.
- Pack-generation progress rows can become noisy if every event payload is rendered. Keep event UI summarized.
- Transaction support must be verified instead of assumed.
- The unique `pack_user_content_unique` constraint means pack replacement must be designed carefully; inserting a replacement before deleting the old pack will conflict unless the transaction orders operations correctly.
- Failed notification writes should not break successful pack generation.
- Trigger.dev local verification may remain environment-blocked. Treat that as a validation boundary, not a reason to reintroduce mocks.

## Later Follow-Ups

- Due-review notification records from SRS state.
- Email delivery for notifications when preferences allow it.
- Admin generation health view.
- Richer generation event payload inspection for debugging.
- Review-history page.
- Real TTS provider implementation beyond mock mode.
- Real image provider implementation behind existing env gate.

## Recommended Execution Prompt

Implement `docs/generation-continuity-implementation-plan.md` one stage at a time.

Start with Stage 1 only. Use the existing pack-generation and media feature boundaries where possible, add the shared read model, run typecheck and touched-file Biome validation, then stop for confirmation before Stage 2.
