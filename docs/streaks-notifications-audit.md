# Streaks & Notifications — Audit & Fix Plan

> Generated 2026-05-01. Hand this to an implementing agent.

## Audit Verdict

Streak tracking and the notification infrastructure are **mostly correct** and align with the SRS for the features that are implemented. Two gaps exist that need fixing to match the demo-level scope defined in `business-rules.md` and `srs.md`.

---

## What Is Correct (no action needed)

| Area                                      | SRS / Rule                    | Status                                                                                   |
| ----------------------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------- |
| `user_streak` table schema                | SRS §8.4                      | Implemented — `currentStreakDays`, `longestStreakDays`, `lastStudyAt`, `streakStartedAt` |
| Shared app-day helper                     | SRS §8.14, biz-rules §168     | Implemented — `getAppDateKey()` in `study-time.ts`, used exclusively                     |
| Streak compute logic                      | biz-rules §151–168            | Correct — same-day skip, yesterday increment, gap reset to 1                             |
| Streak written atomically with review     | SRS §8.5–8, decision-log §185 | Implemented — single `db.transaction` in `ratePackItemAction`                            |
| Dashboard reads streak from `user_streak` | SRS §9.2                      | Implemented — `getDashboardView` exposes `currentStreakDays`                             |
| Notification table + types                | SRS §10.2                     | Implemented — `pack_ready`, `reviews_due`, `streak_risk`, `system`                       |
| Due-review notification dedup by app day  | SRS §10.3                     | Implemented — `reconcileDueReviewNotificationForUser`                                    |
| Read/dismiss does not mutate study state  | SRS §10.4                     | Correct — notification actions only touch `notification` table                           |
| `pack_ready` / pack-failed notifications  | biz-rules §181                | Implemented — created in content-generation workflow                                     |
| Notification bell UI                      | —                             | Implemented — sidebar, optimistic updates, mark-all-read                                 |
| `streakAlertsEnabled` preference toggle   | —                             | Implemented in settings, persisted to `user_preferences`                                 |

---

## Gap 1: No `streak_risk` notification creation

### Issue

The `streak_risk` notification type is fully scaffolded — it exists in:

- DB schema/enum: `apps/web/src/lib/server/db/schema.ts:120`
- Notification type union: `apps/web/src/features/notifications/types.ts:5`
- Migration: `apps/web/drizzle/0004_goofy_midnight.sql`

The `streakAlertsEnabled` user preference exists with a settings toggle at `apps/web/src/features/settings/components/preferences-settings-card.tsx:462`.

But **no code anywhere creates a `streak_risk` notification**. The enum value and preference are dead code.

### Context

`docs/business-rules.md:179–183`:

> The initial implementation scope includes a basic notification system and a basic streak system. Notifications should be sufficient for:
>
> - pack ready events
> - review due reminders
> - **streak risk nudges**

The `decision-log.md:37` confirms this was an explicit decision:

> "basic notifications and streak tracking remain in scope for the first real implementation pass"

### Fix

Add a `reconcileStreakRiskNotificationForUser` function to `apps/web/src/features/notifications/server/queries.ts`. It should:

1. Accept `{ userId }`.
2. Read `streakAlertsEnabled` from `user_preferences` — skip if disabled.
3. Read the current streak row from `user_streak`.
4. Determine if the streak is "at risk":
   - **Risk condition**: `lastStudyAt` is not today (per `getAppDateKey(now)`), but the streak was active yesterday (i.e. `lastStudyAt` was yesterday, meaning the streak will break if no study happens before the app-day boundary).
   - Skip if `currentStreakDays === 0` (never studied).
5. Dedupe by app day the same way `reconcileDueReviewNotificationForUser` does (check `payload.kind === "streak_risk"` and `payload.appDay === appDay`).
6. If a notification is needed, insert a `streak_risk` row:
   - `type: "streak_risk"`
   - `channel: "in_app"`
   - `status: "sent"`
   - `title: "Don't lose your streak!"`
   - `body: "You have a {N}-day streak. Study today to keep it going."`
   - `href: "/dashboard"` (where they can click Start due reviews)
   - `payload: { kind: "streak_risk", appDay, currentStreakDays }`

Then wire the reconciliation call:

- **In `listUserNotifications`** (`queries.ts:29`): Add `await reconcileStreakRiskNotificationForUser({ userId });` alongside the existing `reconcileDueReviewNotificationForUser` call. This ensures the streak risk notification is created whenever the bell is opened.

- **In the dashboard page** (`apps/web/src/app/(app)/dashboard/page.tsx:33`): Add `reconcileStreakRiskNotificationForUser` to the `Promise.all` so it also fires on dashboard load.

- **In the decks page** (`apps/web/src/app/(app)/decks/page.tsx`): Optionally add here too, though dashboard + bell open should cover most cases.

- **After rating** (`ratePackItemAction` in `apps/web/src/features/packs/server/actions.ts`): Optionally call `reconcileStreakRiskNotificationForUser` after the transaction to clear the risk notification once the user has studied today. (The risk notification will naturally become stale since the streak is no longer at risk, but it won't auto-dismiss. The user would need to dismiss it manually or it stays until it's outside the list window.)

**Alternative (simpler, recommended for demo):** Instead of auto-clearing after rating, just let the risk notification be dismissed manually. For a demo app, this is acceptable — the notification is a nudge, not a state machine. The next time the bell opens, `listUserNotifications` will reconcile and the old `streak_risk` from yesterday's app day won't be duplicated (dedup prevents it), and the notification naturally ages off the list.

---

## Gap 2: `longestStreakDays` stored but never surfaced

### Issue

`longestStreakDays` is computed correctly in `computeNextStreak` (`actions.ts:89`) and persisted to `user_streak`, but:

1. It is **not** included in the `DashboardView` type (`queries.ts:38–60`).
2. It is **not** read in `getDashboardView` (`queries.ts:70–99`).
3. It is **not** rendered anywhere in the dashboard UI.

The user has no way to see their longest-ever streak.

### Context

This is not a hard SRS requirement (§9 only says "derive current streak from `user_streak`"), but it's a reasonable expectation for a demo app that tracks streaks. The data is already being collected; it just needs to be exposed.

### Fix

1. Add `longestStreakDays: number` to the `DashboardView.stats` type in `apps/web/src/features/dashboard/server/queries.ts:38`.

2. Read it from the existing streak query (the row is already fetched): add `longestStreakDays: streakRows[0]?.longestStreakDays ?? 0` to the stats object.

3. Render it on the dashboard page. Options:
   - **Option A (subtle)**: Add a small label under the Current Streak stat card (e.g. `"Best: {N} days"`).
   - **Option B (dedicated card)**: Add a 6th stat card for "Longest Streak" — but this makes the grid uneven (5 columns currently). Use `grid-cols-6` or keep 5 with a replacement.
   - **Option C (hint-driven)**: Change the `hint` prop from `"Server-tracked study days"` to something like `"Best: {N} days"`.

   **Recommendation: Option A** (least friction, useful info).

4. Export `longestStreakDays` from the `getDashboardView` return shape so the page can read it.

---

## Verification Checklist

After implementing, verify:

1. [ ] Open the settings page → Streak alerts toggle exists and toggles.
2. [ ] After reviewing cards, the streak counter increments correctly.
3. [ ] Skip a day without studying → a `streak_risk` notification appears in the bell.
4. [ ] Study on a day when a risk notification exists → no duplicate risk notification for the same app day.
5. [ ] Toggle `streakAlertsEnabled` off → no new `streak_risk` notifications are created.
6. [ ] The dashboard shows both current streak and longest streak.
7. [ ] `task web:typecheck` and `task web:lint` pass.
