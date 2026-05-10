# Code Review Q&A — 2026-06-22

## 1. Trigger.dev retry: `factor` and `randomize`

**Q:** What do `factor` and `randomize` do in Trigger.dev's retry configuration?

**A:**

- **`factor: 2`** — Exponential backoff multiplier. Each retry's delay = previous delay × 2, capped at `maxTimeoutInMs`. So delays go roughly 2s → 4s → 8s.

- **`randomize: true`** — Adds jitter (a random ± offset) to each computed delay. This prevents the **thundering herd** problem where many tasks retrying at the same interval all hammer the downstream service in lockstep.

---

## 2. Thundering herd

**Q:** What is the thundering herd problem?

**A:**

When many clients/workers all block waiting for the same resource, then all rush it simultaneously the moment it becomes available, overwhelming it.

**Classic examples:**

- 1000 web server processes hold a connection pool of 10 DB connections. A spike exhausts the pool — all 1000 block. One query finishes, releasing a connection. Every blocked process wakes up and fights for that single slot, causing a CPU meltdown.
- Multiple cron workers retry a failed API call at the same fixed interval. The API recovers at second 6. All workers retry at second 6 simultaneously — 500 requests at once, collapsing the API again.

**Fix:** Randomized delays (jitter) spread arrivals over a time window instead of clustering at `N × factor^attempt`.

---

## 3. Content-generation provider pattern

**Q:** How is "inheritance-like" behavior achieved in the content-generation providers? What's happening with `index.ts` and concrete providers like `aws-polly.ts` and `azure-mai.ts`? Why isn't the same pattern used in `text/`?

**A:** It's **not class-based inheritance**. There are no abstract classes, no `extends`. The pattern is a **facade/dispatcher module**.

### Speech (TTS) — dispatcher pattern (`speech/index.ts`)

```
workflow.ts
  └── import { generateSpeechArtifacts } from "speech/index.ts"  ← one import
        ├── checks audioConfig.audioProvider
        ├── "aws-polly"  → delegates to aws-polly.ts:  generateSpeechWithPolly(input)
        ├── "azure-mai"  → delegates to azure-mai.ts:  generateSpeechWithAzureMai(input)
        ├── "disabled"   → returns empty artifacts + warning
        └── unknown      → returns "not implemented" warning
```

`speech/index.ts` is the single entry point. It:

1. Imports all concrete provider modules.
2. Exports **one unified function** (`generateSpeechArtifacts`).
3. Routes internally via string match on `audioConfig.audioProvider`.
4. Centralizes cross-cutting concerns:
   - **Disabled check** — audio can be fully off.
   - **Config normalization** — Polly needs `audioEngine` (`"standard" | "neural"`), Azure MAI needs `audioStyle`. The dispatcher shapes the config before delegation.
   - **Error recovery** — each provider call is wrapped in try/catch, converting failures to `warnings` rather than crashing the job.
   - **Unknown provider fallback** — graceful warning instead of crash.
5. The contract between modules is enforced by **TypeScript types** (`GeneratedBinaryArtifact`, etc. from `contracts.ts`), not a base class. Shared logic lives in `speech/helpers.ts` as plain functions (`buildSpeechRequests`, `mapWithConcurrency`).

### Text — direct dispatch (no `text/index.ts`)

```
workflow.ts
  └── import generateTextContent as generateTextWithAzureFoundry from "text/azure-foundry.ts"
  └── import generateTextContent as generateTextWithGemini from "text/gemini.ts"
        └── env.TEXT_LLM_PROVIDER === "azure-foundry"
              ? generateTextWithAzureFoundry(input)
              : generateTextWithGemini(input)
```

A one-liner ternary at the callsite. No `text/index.ts` exists.

### Why the difference

| Concern                             | Speech                                                       | Text                                                              |
| ----------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------- |
| **Must handle "disabled"**          | Yes — audio is optional, generates empty artifacts + warning | No — text is always required                                      |
| **Config shapes differ**            | Yes — Polly (`audioEngine`) vs Azure MAI (`audioStyle`)      | No — both take identical `{ items, requestSnapshot, model }`      |
| **Error should degrade gracefully** | Yes — failure becomes a warning; job continues               | No — text failure is fatal, job stops                             |
| **Number of providers**             | 2+ with potential for more                                   | 2                                                                 |
| **Benefit from dispatcher**         | Yes — 4 cross-cutting concerns centralized in one place      | No — a wrapper would just restate the ternary with no added logic |

A `text/index.ts` dispatcher would be a pass-through wrapper adding indirection without centralizing any real behavior. The speech dispatcher **earns its existence** by owning real logic that would otherwise be duplicated in every caller.

---

## 4. Trigger.dev's role — why it exists despite local retries

**Q:** What's the point of using Trigger.dev if we handle retries locally in `fetchWithRetry` and `Promise.allSettled`, and we don't even use checkpointing?

**A:** Trigger.dev is the **async execution infrastructure**, not primarily a retry mechanism. The retry config on each task is a bonus safety net, not the reason Trigger.dev exists. The real job is decoupling long-running work from the HTTP request-response cycle.

### The problem it solves

A server action handles an HTTP request. Vercel serverless functions time out. Even with longer timeouts, you can't block the browser for 60+ seconds while subtitles are fetched, NLP runs, and LLMs churn. You need something that:

1. Accepts a job request and returns immediately (browser stays responsive).
2. Runs the real work somewhere else.
3. Lets the frontend discover when the work is done.

Trigger.dev is that "somewhere else."

### The full flow (concrete trace)

```
1. User opens media page
   └── Browser → POST /api/... → startAnalysisAction()

2. Server action (runs in Vercel, ~ms)
   ├── Writes contentAnalysisRun row to Postgres (status: "queued")
   ├── Calls tasks.trigger("analyze-media-subtitles", { runId })
   │     └── Trigger.dev API receives job, returns immediately
   └── Returns { ok: true, data: { analysis: snapshot } } to browser

3. Browser polls every few seconds
   └── GET /api/... → getAnalysisStatusAction()
       └── Reads contentAnalysisRun from Postgres
       └── Returns { stage: "running_nlp", progressMessage: "..." }

4. Trigger.dev worker (runs in Trigger.dev Cloud, ~60s)
   └── Executes runMediaAnalysisWorkflow(runId)
       ├── Reads context from Postgres
       ├── Writes transitionRun("fetching_subtitles") to Postgres  ← frontend sees this
       ├── Fetches subtitles from OpenSubtitles
       ├── Writes transitionRun("running_nlp") to Postgres         ← frontend sees this
       ├── Calls analyzeWithNlpService() — Python FastAPI
       │     └── fetchWithRetry handles transient NLP failures locally
       ├── Writes transitionRun("running_llm") to Postgres
       ├── Calls LLM across chunks (Promise.allSettled — per-chunk failures → warnings)
       ├── Writes transitionRun("merging_analysis") to Postgres
       ├── Writes transitionRun("saving_analysis") to Postgres
       ├── persistAnalysisOutput() — writes results to Postgres
       └── Writes transitionRun("completed") to Postgres

5. Frontend's next poll picks up status: "completed"
   └── Shows results to user
```

### What Trigger.dev provides

| Capability                | How it's used                                                                                                                                                                          |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Async dispatch**        | `tasks.trigger()` enqueues work and returns. Browser never waits.                                                                                                                      |
| **Execution environment** | Workflows run in Trigger.dev Cloud, not inside Vercel's serverless function.                                                                                                           |
| **Environment isolation** | 30+ secrets (OpenSubtitles, AWS Polly, Azure Speech, R2, NLP service) are synced to Trigger.dev's env at build time (`trigger.config.ts`). The Next.js web process never touches them. |
| **Observability**         | Dashboard with run history, per-attempt logs via `logger.info/warn/error`, durations, success/failure rates. Debugging a failed run is a dashboard click, not a Vercel log grep.       |
| **Retry safety net**      | Task-level retries catch what local retries can't: unhandled code bugs, DB outages lasting >21s, catastrophic failures we didn't anticipate.                                           |
| **Concurrency**           | Trigger.dev manages worker capacity. We don't worry about how many analysis runs are executing simultaneously.                                                                         |
| **Platform consistency**  | Both async workflows (`analyze-media-subtitles`, `generate-content-pack`) use the same infrastructure, same dashboard, same pattern.                                                   |

### What Trigger.dev does NOT do (by design)

These are architectural choices, not omissions:

| Not provided                      | Why                                                                                                                                                     |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Checkpointing**                 | Not used. Whole-task retry is simpler and the stages are fast enough that re-running from scratch is cheaper than managing checkpoint state.            |
| **Progress reporting to browser** | The frontend polls **our** Postgres database, never Trigger.dev's API. Trigger.dev has no idea the browser exists.                                      |
| **Durable state**                 | Postgres owns product truth (run status, analysis results). Trigger.dev is stateless between runs — it reads and writes Postgres like any other client. |
| **Scheduling (cron)**             | Not used. Tasks are triggered by user actions, not timers.                                                                                              |

### The durable state pattern

This is the architectural centerpiece. From `docs/architecture.md`:

> _"The app records the request durably in Postgres. Trigger then executes the workflow behind the scenes. When the frontend polls for progress, it does not ask Trigger directly. It asks the app, and the app reads durable job state from the database."_

```
┌───────────┐
│  Browser  │
└─────┬─────┘
      │ polls status
      ▼
┌───────────┐      ┌──────────────┐
│ Next.js   │      │ Trigger.dev  │
│ (Vercel)  │      │ Cloud        │
└─────┬─────┘      └──────┬───────┘
      │                   │
      │  reads/writes     │  reads/writes
      ▼                   ▼
┌──────────────────────────────┐
│        Neon Postgres         │
│  (contentAnalysisRun, etc.)  │
└──────────────────────────────┘
```

The database is the integration point. The browser and Trigger.dev never communicate directly. This means:

- **The product is not coupled to the workflow platform.** If we swapped Trigger.dev for Inngest or a custom queue, the browser code and database schema don't change.
- **Status is durable.** If Trigger.dev's dashboard is down, the user still sees progress because it lives in Postgres.
- **Authorization stays in the app.** The browser authenticates with Next.js (Better Auth), not Trigger.dev.

---

## 5. Feature slice architecture — the `/features` directory convention

**Q:** Why is the feature directory structured this way? Justify the pattern.

### The convention

Every feature with server code follows one shape:

```
feature/
├── types.ts           # Contract types — safe for client and server
├── server/            # Server-only boundary
│   ├── actions.ts     # "use server" — Next.js server actions
│   ├── queries.ts     # "server-only" — DB queries and mutations
│   └── utils.ts       # (optional) server-only helpers
├── utils.ts           # (optional) shared pure helpers
├── mutations.ts       # (optional) client-side React Query mutations
├── components/
│   ├── utils.ts       # Component-internal shared code
│   └── *.tsx          # React components
└── data/              # (optional) static data
```

Features without server code (sidebar, marketing, browse) are just `components/`.

### Rationale

#### 1. `types.ts` always at feature root

The import path for any feature's types is mechanical: `@/features/{name}/types`. No searching, no per-feature conventions. This follows the same principle Next.js uses for `page.tsx`, `layout.tsx`, and `route.ts` — file location is convention, not a per-developer decision.

Auth also has `schemas.ts` (Zod schemas as the validation source of truth). `types.ts` re-exports the inferred types, so the convention holds for consumers. The schema file is an implementation detail; the types file is the public contract.

#### 2. `server/` directory as the runtime boundary

`"use server"` and `import "server-only"` are compile-time guards, but they catch mistakes AFTER you've written the wrong import. The `server/` directory catches them BEFORE — a developer scanning the file tree sees the boundary without opening any file.

Defense in depth:

- **Layer 1 (visual):** The directory name tells you "this code cannot run on the client."
- **Layer 2 (compile-time):** The `"server-only"` import kills the build if a client component imports it anyway.

Without the directory, a flat feature folder is: `actions.ts`, `queries.ts`, `types.ts`, `utils.ts`, five `.tsx` components. Which are safe to import from a `"use client"` component? You'd have to open each file and read line 1. With `server/`, the answer is visible from the tree: everything outside `server/` is safe; everything inside is not.

#### 3. No `lib/` directories inside features

The project already has `@/lib` for shared utilities. A `features/media/lib/` path reads as "the project-level lib scoped to media" when it actually means "feature-internal helpers." That's a namespace collision that misleads.

The deeper problem: `lib/` communicates nothing about runtime constraints. A file at `lib/engine.ts` could be safe for client import or it could pull in server-only dependencies — you can't tell from the path. With `utils.ts` at feature root (client-safe) vs `server/utils.ts` (server-only), the location encodes the constraint. No ambiguity.

#### 4. No `_` prefix on component utilities

TypeScript's visibility model is module exports, not naming conventions. If a symbol isn't exported, it's inaccessible. If it IS exported, an underscore prefix is a social contract the language doesn't enforce and the tooling doesn't flag — it says "internal" while the export says "public."

`utils.ts` without the prefix is honest. If you need to hide a helper, don't export it.

#### 5. `queries.ts` as the standard file name

The domain context is already encoded in the parent directory: `curation/server/queries.ts` tells you it's curation queries. Encoding the domain in the filename too (`catalog.ts`, `analysis.ts`) sacrifices cross-feature navigability for zero information gain. When a developer jumps between features, muscle memory should work: the data layer is always `server/queries.ts`. One name for one role.

#### 6. All server code inside `server/`

Server actions live at `server/actions.ts`, not at the feature root. The rule is one sentence: "server code lives in `server/`." No exceptions. A developer writing a new feature doesn't have to study existing features to figure out where actions go — there's exactly one valid location.

#### 7. Why this matters for a university project

Production codebases have tribal knowledge — the same team maintains the code for years, and conventions live in people's heads. A university project has rotating contributors: students, TAs, collaborators who arrive without context. When tribal knowledge doesn't exist, the codebase IS the documentation. A consistent directory structure teaches the conventions by example — open any feature, see the same shape, know where things go.
