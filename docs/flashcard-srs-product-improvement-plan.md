# Flashcard And SRS Product Improvement Plan

## Status

Finalized implementation plan.

## Objective

Make LexiFlix flashcards and spaced repetition feel like a complete learner product, not a persisted demo loop. The current implementation has the right durable primitives: `pack_item`, `review_event`, `user_term_state`, `user_streak`, `user_preferences`, and `notification`. The gap is product behavior around those primitives: study workload, session shape, cross-pack knowledge coherence, learner control, and feedback.

The implementation stays inside `apps/web`. Do not introduce a second scheduler service, a queue, Redis, or a separate public backend for SRS. Postgres remains the durable source of truth, and Next.js Server Actions remain the app-owned write boundary.

## Finalized Decisions

- Rename the learner workload preference from `dailyWordsGoal` to `newCardsPerDay`.
- `newCardsPerDay` limits only newly introduced cards. Due reviews are scheduled debt and are not capped by this preference.
- The default dashboard CTA runs due reviews first. New cards are offered only after due reviews are cleared.
- `mark known` updates `user_term_state` and marks matching active cards for the same learner and canonical term as mastered. Do not rely only on read-model hiding for this state transition.
- Globally ignored terms are in scope for this implementation.
- A globally known term is demoted back to learning only by an `again` rating or an explicit `mark learning` action.
- Study session persistence is deferred. Do not add a `study_session` table or `review_event.studySessionId` in this slice.
- Durable undo is not in scope. Keep the current failed-save rollback behavior and do not advertise saved-review undo as a product feature.
- Leech handling and auto-suspend are deferred.
- Streak credit continues to mean at least one completed review on an app day. Daily plan completion can be shown separately but must not redefine streaks in this slice.
- Do not add a test runner in this slice. Validation is typecheck, lint, targeted manual checks, and database invariant checks.
- Do not migrate to FSRS in this slice.

## Current State

The current product already has these foundations:

- `/pack/[id]`, `/decks`, `/study/[id]`, and `/dashboard` read persisted learner-owned pack and review state.
- Study ratings write immutable `review_event` rows and update `pack_item`, `user_term_state`, `user_streak`, and the parent `pack`.
- Effective due state is computed from `dueAt <= now` for active non-new, non-mastered cards.
- `pack_item.state = 'due'` is guarded against persistence.
- Learner preferences already include the old `dailyWordsGoal`, generation defaults, notification toggles, and vocabulary type preferences.
- Due-review notifications can be reconciled into the `notification` table and deduped by app day.

The current product still feels incomplete because:

- The saved daily goal is not used to shape study workload.
- The default study queue includes future learning cards after due and new cards, so a learner can be pushed into reviews before their scheduled time.
- There is no explicit session policy: due review, learning new cards, previewing a card, and cramming are blended into one route.
- Cross-pack term state is only partly coherent. Mastering a canonical term in one pack updates `user_term_state`, but duplicate active cards for that term in other packs can still remain in normal queues.
- Learners can remove a card from one pack but cannot mark a term as known, ignore a term globally, restore a removed card, or reset a single card.
- The review UI does not preview scheduling consequences or expose keyboard review ergonomics.
- Streaks and daily new-card plans are not connected in a way that gives the learner a clear daily study state.
- SRS behavior has no dedicated automated regression surface, and this slice will not add one.

## Product Direction

The next slice should not replace the scheduler with FSRS. FSRS is useful when the product has enough review volume, retention targets, and a stable review event model. LexiFlix first needs a coherent study contract around the existing Anki-inspired SM-2 baseline.

The goal is a disciplined V1.5:

- due reviews are respected
- new cards are intentionally introduced
- learning steps happen only when scheduled
- learner actions have clear product meaning
- cross-pack knowledge does not contradict itself
- the UI makes the next action obvious
- the implementation remains legible for a university demo

## Recommended Changes

### 1. Create A Shared Study Queue Engine

Add a pure queue builder under `apps/web/src/features/packs/lib/` or `apps/web/src/features/packs/server/` that all study entry points use.

Inputs:

- user id
- optional pack id
- current app time
- mode
- `newCardsPerDay`
- optional requested card id

Modes:

- `due`: due review cards only, plus learning cards whose `dueAt <= now`
- `new`: new cards only, capped by the learner's remaining daily new-card allowance
- `preview`: one explicitly requested active card, no automatic queue expansion unless the user chooses to continue
- `cram`: active non-removed, non-mastered cards regardless of due time, clearly labeled as unscheduled practice

Default behavior:

- Dashboard primary CTA starts `due` mode when due cards exist.
- If no cards are due but new cards remain within the daily allowance, dashboard and decks surfaces offer `Learn new`.
- Pack staging exposes separate `Review due`, `Learn new`, `Preview`, and optional `Cram` actions where relevant.
- Future learning cards do not appear in a normal study queue until they are due.
- Cram mode is never the default path and is not used to calculate daily completion.

This is the highest-priority fix. A study product cannot feel trustworthy if it ignores its own due times.

### 2. Rename And Enforce The New-Card Workload Preference

Replace `dailyWordsGoal` with `newCardsPerDay`.

Implementation requirements:

- Rename the TypeScript preference field from `dailyWordsGoal` to `newCardsPerDay`.
- Rename the database column from `daily_words_goal` to `new_cards_per_day` through a Drizzle migration, preserving existing values.
- Keep the default value at `20`.
- Use a product-appropriate validation range of `1` to `100` for `newCardsPerDay`.
- Update settings copy to say this controls how many new cards can be introduced each app day.
- Do not cap due reviews with this value.

Daily plan rules:

- Due reviews are always shown because they are already scheduled.
- New cards are capped by remaining `newCardsPerDay` allowance.
- New cards completed today are counted from the first review of cards whose `firstStudiedAt` lands on the current app day.
- Daily completion means due reviews cleared plus today's new-card allowance reached or no new cards available.
- Streak credit remains separate and still requires at least one review on the app day.

UI changes:

- Dashboard shows due now, new available today, new completed today, and next learning step.
- `/decks` shows which decks have due cards versus new cards available.
- `/pack/[id]` shows pack-local counts for due, new available today, future learning, mastered, and hidden/removed.
- Settings presents `newCardsPerDay` under learning preferences.

This makes the existing settings meaningful and prevents a 100-card generated pack from immediately feeling like a wall of work.

### 3. Tighten The SRS Engine Contract

Keep the legacy SM-2 baseline, but make it explicit and learner-visible.

Behavior rules:

- Normal queues include future learning cards only when they become due.
- A non-again review must not shrink an interval.
- `again` resets the card into relearning, increments lapses, clears mastery, and demotes a globally known term back to learning.
- New-card learning steps stay under one day.
- Mastery remains a LexiFlix milestone reached by the existing repetition or interval threshold.
- `pack_item.state = 'due'` remains forbidden.

Implementation changes:

- Export the SRS constants as a named config from `srs.ts`.
- Add a pure interval-preview helper used by the study UI.
- Add interval preview labels to rating buttons, for example `Again 1m`, `Hard 6m`, `Good 10m`, `Easy 4d` for a new card.
- Keep server-side guards that reject ratings for unowned cards and removed cards.
- Do not add a test runner.

### 4. Add Learner Control Actions

Add deliberate card and term actions so learners can manage generated material.

Pack-local actions:

- remove from this pack
- restore removed card
- reset this card

Term-level actions:

- mark term known
- mark term learning
- ignore term globally
- unignore term

Semantics:

- Pack-local removal remains local and reversible.
- `restore removed card` reverses pack-local removal without changing global term state.
- `reset this card` clears mutable scheduling fields for one pack item only and does not delete review history.
- `mark known` updates `user_term_state.state = 'known'`, sets `knownAt`, clears `ignoredAt`, and marks matching active non-removed cards for the same user and term as mastered.
- `mark learning` updates `user_term_state.state = 'learning'`, clears `knownAt` only if the transition is explicit, and reopens matching non-removed cards unless they were pack-locally removed.
- `ignore term globally` updates `user_term_state.state = 'ignored'`, sets `ignoredAt`, excludes the term from future generation by default, and removes matching active cards from normal queues.
- `unignore term` returns the term to `learning` unless the term is already known through mastery.
- These actions use existing `user_term_state.source`, timestamps, and `lastPackItemId`. Do not add a separate audit table in this slice.

This is the difference between a flashcard toy and a product a learner can correct when generation picks the wrong material.

### 5. Make Cross-Pack Knowledge Coherent

When a canonical term changes state, all learner surfaces should reflect that state.

Required changes:

- Generation excludes `ignored` terms by default.
- Existing known-term handling modes apply only to `known` terms.
- Default study queues exclude active cards whose canonical term is globally `ignored`.
- Default study queues exclude globally `known` terms because matching active cards should already be mastered by propagation.
- Preview mode may still open active non-removed cards directly by card id.
- When a review crosses the mastery threshold, update matching active non-removed cards for the same user and term to mastered.
- An `again` rating on a known term demotes `user_term_state` to `learning` and reopens matching active non-removed cards as learning according to the reviewed card's next schedule.
- A `hard` or `good` rating does not demote a known term unless the card was already reopened by `again` or explicit `mark learning`.

This prevents a learner from mastering "turn up" in one movie and then seeing it treated as brand new in another deck.

### 6. Improve The Study UI

Keep the current immersive study route, but make it more ergonomic and transparent.

Add:

- keyboard shortcuts: Space/Enter reveal, `1` again, `2` hard, `3` good, `4` easy
- interval preview on rating buttons
- mode label in the header: Due review, Learn new, Preview, or Cram
- next due summary after each rating
- per-card audio play control
- a clearer completion screen with reviewed count, new learned count, lapses, next learning step, and streak/new-card progress
- explicit `Continue with new cards` when due reviews are cleared and the learner still has new-card allowance

Do not add saved-review undo in this slice. The current client may continue to roll back optimistic UI when a save fails, but once a review is saved, it is final for this implementation pass.

Do not bury the review buttons behind explanatory copy. The study surface should stay fast.

### 7. Upgrade Dashboard And Decks Into A Study Command Center

Dashboard should answer:

- what should I do now?
- how long will it take?
- am I done for today?
- what comes due next?

Decks should answer:

- which pack needs review?
- which pack has new cards available?
- which packs are complete for now?
- where did I leave off?

Recommended read models:

- `getStudyPlanForUser(userId)` shared by dashboard, decks, topbar notification reconciliation, and future reminders
- `getPackStudyPlan(packId, userId)` for pack staging

These read models use the same queue engine and app-day helper. Avoid duplicating due/new/future-learning calculations across pages.

### 8. Make Notifications Depend On The Study Plan

Due-review notifications should be created from the shared study plan rather than a separate query that can drift.

Changes:

- Reconcile due-review notifications when dashboard, decks, and notification bell load.
- Keep app-day dedupe.
- Do not mark reviews done when a notification is read or dismissed.
- Do not add streak-risk notifications in this slice.
- Keep email reminder delivery out of this slice.

### 9. Add Validation And Manual Acceptance

Minimum automated validation after implementation:

- `task web:typecheck`
- `task web:lint`
- `cd apps/web && pnpm db:generate` when schema changes are made

Manual acceptance:

- Create or use a generated pack with at least five cards.
- Start a due session and confirm future learning cards do not appear early.
- Clear due reviews and confirm the UI then offers new cards.
- Learn new cards up to `newCardsPerDay` and confirm extra new cards remain held back.
- Rate cards with all four ratings and confirm due labels/intervals match the SRS engine.
- Mark a term known and confirm matching active cards in other packs become mastered.
- Ignore a term and confirm future generation/default queues exclude it.
- Rate a known term `again` after reopening it and confirm the term demotes to learning.
- Confirm due-review notifications reflect the shared study plan.
- Confirm this invariant remains true:

```sql
select count(*) as persisted_due_pack_items
from pack_item
where state = 'due';
```

Expected result: `0`.

## Implementation Stages

### Stage 1: Queue Engine And New-Card Plan

Deliver:

- shared queue engine
- shared user study-plan read model
- shared pack study-plan read model
- normal queues respect `dueAt`
- `newCardsPerDay` limits new cards only
- dashboard, decks, and pack staging show due/new/future-learning distinctions
- settings preference rename from `dailyWordsGoal` to `newCardsPerDay`
- Drizzle migration preserving existing preference values

This stage should happen first because it fixes the core product contract.

Completion log:

- Implemented in `feat(web): add shared study queue plan`.
- Added shared study-plan and queue construction under `apps/web/src/features/packs/server/study-plan.ts`.
- Dashboard, decks, pack staging, and study route now distinguish due reviews, new cards available today, and future scheduled learning.
- Normal study queues no longer include future learning cards before `dueAt`.
- Renamed the learner workload preference to `newCardsPerDay` in TypeScript and database schema.
- Added Drizzle migration `apps/web/drizzle/0008_wonderful_titania.sql` to rename `daily_words_goal` to `new_cards_per_day`.
- Verified with `task web:typecheck`, `task web:lint`, and `cd apps/web && pnpm db:generate`.

### Stage 2: Study Session UX

Deliver:

- study modes in typed route search params
- due-first default flow
- new-card continuation only after due reviews are cleared
- interval preview labels
- keyboard shortcuts
- improved completion screen
- no saved-review undo

This stage makes the learner loop feel deliberate without adding session persistence.

### Stage 3: Learner Control Actions

Deliver:

- restore removed card
- reset one card
- mark known
- mark learning
- ignore term globally
- unignore term
- generation filtering for ignored terms

This stage gives learners control over generated content quality.

### Stage 4: Cross-Pack Coherence And Notifications

Deliver:

- known-term mastery propagation to matching active cards
- ignored-term exclusion from normal queues
- `again` demotion for globally known terms
- notification reconciliation through the shared study plan
- no streak-risk notifications
- no email delivery

This stage removes contradictions across packs and closes the study loop.

### Stage 5: Validation And Canonical Doc Consolidation

Deliver:

- `task web:typecheck`
- `task web:lint`
- Drizzle migration check if schema changed
- manual acceptance checklist above
- updated `docs/business-rules.md`
- updated `docs/decision-log.md`
- updated `docs/architecture.md`
- updated `docs/srs.md`
- retire or keep this plan depending on whether any future follow-up remains

Do this after implementation, not before, unless the user asks to finalize canonical docs first.

## Deferred Work

These are intentionally not part of the next implementation slice:

- FSRS migration
- `study_session` table
- `review_event.studySessionId`
- durable review undo
- leech handling
- auto-suspend after repeated lapses
- streak-risk notifications
- email reminder delivery
- new test runner
- full analytics or reporting

## Files And Boundaries

Likely implementation files:

- `apps/web/src/features/packs/server/srs.ts`
- `apps/web/src/features/packs/server/queries.ts`
- `apps/web/src/features/packs/server/actions.ts`
- `apps/web/src/features/packs/components/study-session-client.tsx`
- `apps/web/src/features/packs/components/pack-staging-client.tsx`
- `apps/web/src/features/dashboard/server/queries.ts`
- `apps/web/src/features/notifications/server/queries.ts`
- `apps/web/src/features/settings/server/preferences.ts`
- `apps/web/src/features/settings/actions.ts`
- `apps/web/src/features/settings/types.ts`
- `apps/web/src/app/(app)/settings/settings-client.tsx`
- `apps/web/src/app/(app)/dashboard/page.tsx`
- `apps/web/src/app/(app)/decks/page.tsx`
- `apps/web/src/app/(app)/study/[id]/page.tsx`
- `apps/web/src/lib/server/content-generation/selection.ts` or the current generation selection module
- `apps/web/src/lib/server/db/schema.ts`
- `apps/web/drizzle/*`

Boundary rules:

- Use Server Actions for SRS writes and learner preference writes.
- Keep route files thin.
- Keep queue calculation in a shared feature module.
- Do not move study state into the NLP service or Trigger.dev.
- Do not add WebSockets or realtime infrastructure for SRS.
- Do not persist `pack_item.state = 'due'`.
- Do not add a `study_session` table in this slice.

## Non-Goals

- No FSRS migration.
- No full analytics platform.
- No social leaderboard or broad gamification system.
- No durable undo.
- No leech handling.
- No email reminder delivery.
- No enterprise notification scheduler.
- No new test runner.
- No redesign of generation workflows except filtering ignored/known terms as required by learner state.
