# Content Generation Pipeline Plan

## Purpose

This document defines the preliminary implementation plan for the user-specific Content Generation Pipeline in LexiFlix.

This pipeline starts only after reusable analysis already exists for a `content` item and a learner explicitly requests pack generation from the media page. Its output is not reusable analysis. Its output is learner-specific study content attached to `pack`, `pack_item`, and `pack_item_content`.

The immediate goal is not to make flashcard rendering clever. That part is easy. The hard part is designing a generation pipeline that is:

- operationally simple enough for a university demo
- explicit about boundaries and ownership
- cheap enough to iterate on
- resilient to retries and provider failures
- swappable at the provider edge without leaking provider concerns into domain logic

## Existing Constraints From Current Architecture

The plan below is constrained by decisions already made elsewhere in the repo:

- Trigger.dev is the orchestration layer.
- Next.js remains the only public application surface.
- Postgres remains the durable product source of truth.
- R2 stores generated binary artifacts.
- reusable subtitle analysis stays separate from user-specific generation
- there is exactly one pack per user per content item
- regeneration replaces the existing pack instead of creating versions
- audio is first-class in V1
- images should be supported in the design but may stay optional in the first shipped pass
- pipeline-derived JSON contracts use one active contract at a time; rebuild beats backward-compatibility layers

Those are not optional preferences. The plan should fit them unless you explicitly change the product rules.

## Pipeline Scope

The Content Generation Pipeline should own four responsibilities only:

1. Select the final candidate items for this learner from stored `content_analysis_item` rows.
2. Generate learner-facing text content for those selected items.
3. Generate artifacts for those selected items, namely pronunciation audio and optional images.
4. Persist the resulting pack, pack items, pack item content, artifact metadata, and workflow/job state.

It should not:

- fetch subtitles again
- rerun the NLP pipeline
- rerun the analysis LLM phrase-extraction pipeline
- expose Trigger.dev state directly to the browser
- let provider-specific request/response shapes leak into product/domain code

## Product Decisions Incorporated

The following decisions are now treated as settled for this plan:

- pack composition is request-driven from a generation dialog, not fixed globally
- server-side `packSize` hard cap is `100` in V1
- audio reads only the vocabulary item itself in V1
- meanings stay English-only in V1
- one example sentence is the default; the generation dialog may allow `2` or `3`
- example sentences must be newly generated, not adapted from subtitle excerpts
- Gemini is fixed for text generation in V1
- image generation is best-effort and should run only for items that plausibly benefit from imagery
- image generation stays behind an env-controlled capability toggle in V1, not a learner-facing dialog option
- TTS is also best-effort; missing audio should produce warnings, not total pack failure
- the old pack remains usable until the replacement pack is fully ready
- learner history beyond CEFR does not affect tone in V1
- full-pack regeneration is the only supported regeneration mode in V1
- long-running generation progress should appear in both a dedicated progress view and the decks surface using one shared polling contract
- event-log visibility is enough for provider/debug visibility in V1

## Recommended High-Level Workflow

The Trigger.dev task should be separate from the reusable analysis task. Conceptually:

1. The web app validates the request, computes an idempotency key, creates or reuses `pack_generation_job`, and triggers a dedicated Trigger task.
2. The Trigger task loads the job, content, learner profile, learner preferences, and reusable analysis items.
3. The workflow selects the final study set.
4. The workflow generates text content in batches.
5. The workflow generates assets in bounded parallel waves.
6. The workflow persists the new pack atomically and marks the job complete.
7. The web app continues polling `pack_generation_job` and related events from Postgres.

Recommended coarse stages, aligned with the existing schema:

- `queued`
- `selecting_terms`
- `generating_content`
- `generating_assets`
- `saving_pack`
- `completed`
- `failed`

That stage model is enough. Do not invent fake percentage progress unless a real product need appears.

## Architectural Recommendation

Do not build one giant "AI provider abstraction."

That is the wrong level of abstraction here. LLM calls, TTS synthesis, and image generation have different request shapes, batching characteristics, retry behavior, latency profiles, and output types. Pretending they are the same "provider" will push complexity upward into application code.

Instead, use capability-specific ports:

- `TextGenerationProvider`
- `SpeechSynthesisProvider`
- `ImageGenerationProvider`

The domain workflow talks only to those ports. Each port returns LexiFlix-native normalized outputs. Provider-specific SDKs, endpoints, auth headers, rate-limit handling, and response parsing stay inside adapter implementations.

This is the key design rule if you want provider swapping without business-logic churn.

## Proposed Code Structure

Recommended new module family under `apps/web/src/lib/server/content-generation/`:

- `contracts.ts`
  - zod schemas and TypeScript types for generation inputs, outputs, batch payloads, job transitions, and provider-normalized artifact results
- `workflow.ts`
  - top-level orchestration logic for the content-generation workflow
- `jobs.ts`
  - create/reuse/reset/update helpers for `pack_generation_job` and `pack_generation_job_event`
- `selection.ts`
  - candidate filtering, ranking, pack-size enforcement, and inclusion reasons
- `prompting.ts`
  - content-context builder, learner-context builder, prompt assembly, and prompt version constants
- `persistence.ts`
  - final transactional pack replacement/save logic
- `fingerprint.ts`
  - content-generation pipeline fingerprint/version helpers
- `providers/text/`
  - `types.ts`
  - `index.ts`
  - `gemini.ts`
  - optional future `openai.ts`, etc.
- `providers/speech/`
  - `types.ts`
  - `index.ts`
  - one adapter per TTS provider
- `providers/image/`
  - `types.ts`
  - `index.ts`
  - one adapter per image provider
- `artifacts/`
  - upload-to-R2 helpers, checksum helpers, artifact metadata normalization, cleanup helpers
- `mocking/`
  - deterministic mock/replay fixtures for local development

Recommended Trigger entrypoint:

- `apps/web/src/trigger/generate-pack-content.ts`

This should mirror the current `analyze-media-subtitles` task shape: thin Trigger entrypoint, real logic in a server-only workflow module.

## Provider Boundary Design

### 1. Text generation

The text generation port should accept batches of selected vocabulary items plus shared job context and return normalized item-level outputs.

Suggested interface shape:

```ts
type GenerateTextBatchInput = {
  content: ContentPromptContext;
  learner: LearnerPromptContext;
  items: SelectedPackItemInput[];
  promptVersion: string;
};

type GeneratedTextItem = {
  contentAnalysisItemId: string;
  meaning: string;
  exampleSentences: string[];
  notes?: string | null;
  imageEligibility?: {
    shouldGenerate: boolean;
    rationale?: string | null;
    promptHint?: string | null;
  } | null;
};
```

Important rule: the adapter returns one normalized object per requested item keyed by `contentAnalysisItemId`. The business layer must never care whether the provider returned raw JSON, tool output, or model-native schema output.

Gemini is a fixed business choice for V1, but it should still live behind this port. The reason is not multi-LLM flexibility right now. The reason is keeping Gemini request construction, schema enforcement, replay/mock behavior, and model-specific parsing out of domain logic.

### 2. Speech synthesis

The speech port should accept item-level scripts to synthesize and return binary or upload-ready results plus metadata.

Suggested interface shape:

```ts
type SynthesizeSpeechInput = {
  contentAnalysisItemId: string;
  text: string;
  voice: string;
  speakingRate?: number;
  format: "mp3" | "wav";
};

type SynthesizedSpeechResult = {
  contentAnalysisItemId: string;
  mimeType: string;
  bytes: Uint8Array;
  provider: string;
  providerAssetId?: string | null;
  metadata?: Record<string, unknown>;
};
```

If the chosen provider offers true batch synthesis, the adapter may batch internally. If it only supports one synthesis call at a time, the adapter can still satisfy a batch-oriented application API by fanning out internally. The workflow should not change.

### 3. Image generation

The image port should accept item-level image briefs and return normalized binary outputs plus metadata.

Suggested interface shape:

```ts
type GenerateImageInput = {
  contentAnalysisItemId: string;
  prompt: string;
  aspectRatio?: "1:1" | "4:3";
  style?: string;
};

type GeneratedImageResult = {
  contentAnalysisItemId: string;
  mimeType: string;
  bytes: Uint8Array;
  provider: string;
  providerAssetId?: string | null;
  metadata?: Record<string, unknown>;
};
```

Again, the workflow should not know whether the provider is polling an async job, calling a synchronous endpoint, or generating multiple candidates before selecting one.

## Configuration Strategy

Provider swapping should be config-driven at the capability layer, not at the workflow layer.

Important refinement after your answers:

- text generation does not currently need business-level provider swappability; Gemini is the fixed choice
- TTS and image generation still should remain swappable behind capability-specific adapters
- keeping a text-generation port is still correct because it isolates Gemini specifics and preserves replay/mock ergonomics

Recommended env shape:

- `CONTENT_TEXT_MODEL=gemini-2.5-flash`
- `CONTENT_TEXT_MODE=live|record|replay|mock`
- `CONTENT_TEXT_RECORDING_DIR=...`
- `CONTENT_SPEECH_PROVIDER=<provider-name>`
- `CONTENT_SPEECH_MODE=live|record|replay|mock`
- `CONTENT_SPEECH_VOICE=<default-voice>`
- `CONTENT_SPEECH_FORMAT=mp3`
- `CONTENT_IMAGE_PROVIDER=<provider-name>`
- `CONTENT_IMAGE_MODE=live|record|replay|mock`
- `CONTENT_IMAGE_ENABLED=true|false`

Recommended rule:

- one config resolver per capability
- one adapter factory per capability
- zero provider branching in domain/workflow code

That means switching TTS or image providers should be a config and adapter concern. If changing those providers requires edits in selection logic, persistence logic, or Trigger workflow code, the boundary is wrong.

For text generation, model changes should still remain config-only within the Gemini adapter.

## Trigger.dev Workflow Design

The Trigger workflow should stay stage-driven and idempotent.

Recommended task contract:

```ts
type GeneratePackContentPayload = {
  jobId: string;
};
```

Recommended workflow shape:

1. Load and validate job context.
2. Transition job to `selecting_terms`.
3. Select final items.
4. Transition job to `generating_content`.
5. Run batched text generation.
6. Transition job to `generating_assets`.
7. Run TTS generation.
8. Optionally run image generation.
9. Transition job to `saving_pack`.
10. Replace existing pack and persist outputs in one transaction.
11. Mark job `completed`.

If any stage fails, record:

- a durable job transition
- an error code
- an error message safe for logs and UI
- enough event payload context to diagnose the failure later

Recommended failure code families:

- `INVALID_JOB`
- `ANALYSIS_NOT_READY`
- `TERM_SELECTION_FAILED`
- `TEXT_GENERATION_FAILED`
- `SPEECH_GENERATION_FAILED`
- `IMAGE_GENERATION_FAILED`
- `ARTIFACT_UPLOAD_FAILED`
- `PERSISTENCE_FAILED`
- `WORKFLOW_TRIGGER_FAILED`

## Selection Stage

Selection should remain separate from generation. Do not mix "which items should go into the pack?" with "generate content for these items."

Recommended selection inputs:

- `pack_generation_job.request_snapshot`
- `user_preferences`
- effective learner CEFR level
- `user_term_state`
- stored `content_analysis_item`
- stored `vocabulary_term`

The request snapshot needs to become richer than the current placeholder shape. The generation dialog should drive at least these fields:

- selected vocabulary kinds
- target pack size
- CEFR filter mode
- known-term handling mode
- example sentence count
- custom generation instructions

Recommended selection rules:

- only use stored reusable analysis rows for the chosen `analysis_run_id`
- respect selected vocabulary kinds
- filter out non-selectable items
- rank by relevance to learner level, frequency preference, and current knowledge state
- cap the final pack size before any expensive generation starts
- produce an explicit `includedReason` for each chosen item

Refined selection rules based on your answers:

- selection should support a CEFR-window mode from the generation dialog
- at minimum, support:
  - `same_level`
  - `one_level_above`
  - `all_levels_above`
- known-term handling should be explicit in the request, not inferred silently
- at minimum, support:
  - `exclude_known`
  - `downrank_known`
  - `include_known`
- pack size is not a fixed system default; it is a request parameter bounded by a server-side maximum

Recommended output:

- ordered selected item list
- inclusion rationale
- any selection warnings

This stage should be pure business logic and fully testable without any external providers.

## Batching Strategy

### Text generation batching

The user’s instinct is correct: one LLM request per word is the wrong design.

Recommended default:

- batch size target: `50-100` items per LLM call
- initial default: `75`
- concurrent LLM batches per workflow: `2`

Why:

- smaller than that wastes request overhead and makes costs worse
- much larger than that makes prompt size, schema failure, and retry blast radius worse
- keeping concurrency at `2` avoids quota spikes while still shortening wall-clock time

Each LLM batch should ask for all textual outputs for each item in the batch in one structured response:

- learner-facing meaning
- example sentences
- optional lightweight notes if later needed

Do not split meaning generation and example generation into separate LLM passes unless a real quality problem forces that split.

The actual pack size can vary per request, but this batching default remains reasonable as the internal execution chunk size.

### TTS batching

TTS behavior should depend on provider capability, but the workflow should apply bounded waves.

Recommended default:

- logical batch size: `20-30` items
- concurrent syntheses per wave: `8-12`
- initial default concurrency: `10`

Why:

- TTS is usually lighter than image generation but still produces binary outputs and can bottleneck on upload/storage
- too much concurrency will turn one job into a rate-limit spike

If the provider exposes native batch synthesis, let the adapter exploit it. If not, keep the workflow-level wave size and let the adapter issue individual requests internally.

### Image generation batching

Image generation is the highest-risk stage for cost and latency. Treat it accordingly.

Recommended default:

- disabled by default in the first shipped pass unless server-side capability config enables it
- if enabled, concurrency `2-4`
- initial default concurrency: `3`

Do not start with "generate one image per item no matter what." That is a weak default for both pedagogy and cost. Many vocabulary items are abstract enough that image generation adds little value.

The better baseline is:

- support image generation in the architecture now
- ship with the stage optional
- gate actual image generation behind explicit product rules and server-side capability config

Refined rule from your answer:

- do not generate images for every selected item
- use a per-item eligibility field in the main text-generation response to mark whether an item would materially benefit from a contextual image and whether the meaning is practically illustratable
- only image-eligible items proceed to the image provider

## Context Passed To The LLM

Each text-generation batch should include two shared contexts plus item-level evidence.

### Content context

Recommended fields:

- content title
- content kind (`movie` or `season`)
- release year when available
- overview
- genres
- original language
- optional tone/style cues derived directly from metadata

This should help the model keep meanings and examples thematically aligned with the selected title without overfitting to exact subtitle quotations.

Do not add a separate "summarize the movie first" LLM call unless metadata proves insufficient. That would add cost and another failure point before there is evidence it helps.

### Learner context

Recommended fields:

- effective learner CEFR level
- selected vocabulary types for this pack
- frequency preference
- any relevant generation preferences from the request snapshot
- custom generation instructions from the request snapshot

Do not use learner familiarity buckets such as `unseen` or `learning` to change explanation tone in V1. Your product decision is simpler: CEFR level plus explicit custom instructions control the generation style.

### Item-level context

Each item in the batch should include:

- `contentAnalysisItemId`
- vocabulary kind
- display text
- normalized text / lemma
- representative subtitle context
- a few deduped contexts if available
- occurrence count / frequency rank
- stored CEFR signal

This is enough to keep generation grounded in actual subtitle evidence instead of inventing generic dictionary content.

## Prompting Strategy

Recommended text-generation prompt requirements:

- produce only structured JSON
- return exactly one output per requested item
- keep meanings CEFR-appropriate for the learner
- keep example sentences natural and easy to understand
- use the title context to stay thematically aligned
- do not reuse or lightly adapt subtitle excerpts as example sentences
- keep slang/idiom explanations explicit rather than dictionary-vague
- follow any custom generation instructions from the request

Recommended example-sentence behavior:

- generate new learner-friendly examples
- keep them thematically aligned with the title context without spoiling the story
- default to one example sentence
- allow the generation dialog to request `2` or `3`

## Swappability Without Over-Abstraction

The right swappable boundary is:

- provider adapters can change
- env/config can change
- capability factories can change
- workflow/domain logic should not change

The wrong swappable boundary is:

- business logic switches on provider names
- prompting code knows which SDK is used
- persistence code knows which provider produced the artifact
- selection logic changes when a provider changes

Provider metadata should still be persisted where operationally useful, but that belongs in `artifact_object.metadata`, event payloads, and request fingerprints, not in business conditionals.

## Persistence Plan

Recommended persistence model:

### During execution

Persist only durable workflow meaning during execution:

- `pack_generation_job`
- `pack_generation_job_event`

Do not partially persist half-built pack rows unless there is a strong UX requirement for draft inspection. That would complicate regeneration and failure cleanup.

### After successful generation

Persist in a final save step:

- replace old pack for `(user_id, content_id)`
- create new `pack`
- create `pack_item` rows for the selected ordered items
- create `pack_item_content` rows with generated text and artifact references
- create `artifact_object` rows for uploaded audio/images

Recommended save behavior:

- build all normalized outputs first
- preallocate artifact IDs and object keys before upload
- upload artifacts to their final keys before the final DB transaction
- run one transaction that replaces the previous pack and inserts the new one
- if the transaction fails after upload, run compensating best-effort deletion for every uploaded object before surfacing the failure

This keeps the learner-visible state clean: either the old pack still exists, or the new pack fully exists. Do not leave the user with a half-replaced pack. The compensating-delete step also keeps the workflow from leaking orphaned R2 objects whenever persistence fails after artifact upload.

### Artifact metadata

Use `artifact_object.metadata` for provider-level details such as:

- provider name
- provider model/voice/style
- original provider asset ID
- generation request fingerprint
- generation prompt version if relevant
- any provider-side duration/sample-rate details for audio

That avoids polluting core product tables while keeping debugging possible.

## Request Snapshot Expansion

The current `GenerationRequestSnapshot` type is too thin for the product you described. It should expand to represent the generation dialog explicitly.

Recommended additions:

- `packSize`
- `cefrWindowMode`
- `cefrLevelsIncluded`
- `knownTermHandling`
- `exampleSentenceCount`
- `customInstructions`
- `forceRegenerate`

Recommended supporting enums:

- `cefrWindowMode`: `same_level` | `one_level_above` | `all_levels_above`
- `knownTermHandling`: `exclude_known` | `downrank_known` | `include_known`

The goal is not to over-model the UI. The goal is to persist the actual user request that drove the pack so regeneration, support, and debugging remain explainable.

## Effective Capability Set

The learner request and the effective generation capability set are not the same thing.

The request snapshot should persist only learner-controlled intent. Server-controlled capability flags such as image enablement should be computed separately at job start from environment/config state.

Recommended effective capability fields:

- `textGenerationEnabled`
- `audioGenerationEnabled`
- `imageGenerationEnabled`
- `imageSelectionMode`
- `textModel`
- `speechProvider`
- `imageProvider`

Recommended rule:

- persist learner intent in `requestSnapshot`
- derive effective capability state in workflow code at execution time
- include the effective capability fingerprint in job reuse/idempotency decisions
- include the effective capability set in event payloads and artifact metadata where operationally useful

This avoids leaking env-gated features into the learner-facing API while still making job behavior reproducible and debuggable.

## Idempotency And Regeneration

The pack-generation request should remain idempotent at the job level.

Recommended rule:

- the web app computes an idempotency key from `userId`, `contentId`, effective learner preferences, content-generation pipeline version, effective capability fingerprint, and explicit regenerate intent
- if the same request is already queued/running/completed and still valid, reuse the job
- if the user explicitly requests regeneration with changed preferences or a forced rerun, create a new job with a new idempotency key

Recommended regeneration semantics:

- do not delete the previous pack at job start
- delete/replace the previous pack only inside the final successful save transaction

That is the simplest way to avoid destructive partial failure.

## Retry Strategy

Retries should be stage-aware.

Recommended behavior:

- selection failures are usually deterministic; fix input or code, then rerun
- LLM, TTS, and image calls should have bounded retries with exponential backoff inside adapters
- workflow-level retries should be conservative to avoid duplicating large generation waves
- if a batch repeatedly fails, fail the job with a useful event payload instead of silently dropping items

Initial recommendation:

- provider call retries: `2-3`
- workflow retry attempts: `1`

This matches the current bias in the analysis pipeline: keep retry behavior explicit and predictable instead of hiding large duplicate workloads behind aggressive automatic retries.

## Partial Failure Policy

The default recommendation is strict success for text generation and flexible success for assets.

Recommended rule set:

- if text generation fails for any selected item batch, fail the job
- if audio generation fails for a subset of items, save the pack and record warnings for the missing audio
- if audio generation fails for all items, still save the pack and record a prominent warning unless you later decide audio is a hard product requirement
- if optional image generation fails and images are configured as optional, continue with warnings and save the pack without images

This matches your current demo priority better than strict audio failure. The indispensable artifact is the generated pack content. Audio and images improve it, but should not destroy a successful run if the text content is already usable.

What should remain strict is text generation. A pack without meanings/examples is not a real pack.

## Local Development, Recording, And Mocking

The content-generation pipeline should follow the same practical approach already used for analysis LLM calls:

- `live`
- `record`
- `replay`
- `mock`

Recommended capability behavior:

- text generation: live/record/replay/mock
- speech generation: live/replay/mock, and record if storing fixtures is practical
- image generation: live/replay/mock, and record if fixture storage is practical

Recommended fixture keying:

- request fingerprint derived from prompt/version/model/input payload for text
- request fingerprint derived from provider/config/text/script for speech
- request fingerprint derived from provider/config/prompt/style for image

This matters because otherwise local development becomes expensive and nondeterministic exactly where iteration speed matters most.

## Observability

Each stage event payload should record enough context to debug batch behavior without dumping secrets or full copyrighted text.

Recommended event payload fields:

- batch counts
- selected item count
- completed asset count
- failed item IDs
- provider name
- request fingerprint
- model/voice identifier
- latency summary

Do not log full provider payloads by default in database events. That will become noisy and may create content-handling problems quickly.

For best-effort assets, event payloads should also include:

- attempted audio count
- successful audio count
- attempted image count
- successful image count
- warning summaries grouped by failure class

## Recommended Defaults For V1

If you want a strong initial operating posture, use these defaults:

- text provider: Gemini through a dedicated content-generation adapter
- text batch size: `75`
- text batch concurrency: `2`
- TTS enabled: `true`
- TTS concurrency: `10`
- images enabled: `false`
- image concurrency when enabled: `3`
- pack replacement: atomic on final save only
- strict requirement: text
- best-effort requirement: audio and images
- audio script: vocabulary item only
- explanation language: English only
- default example count: `1`
- supported regeneration mode: full-pack only

This keeps the first pass practical without painting the codebase into a corner.

## Implementation Sequence

Recommended order of implementation:

1. Expand `GenerationRequestSnapshot`, related enums, and pack-generation contracts to represent the generation dialog.
2. Implement item selection as pure domain logic.
3. Implement the text-generation provider port and Gemini adapter.
4. Implement the Trigger workflow for text generation and pack persistence.
5. Add TTS provider port, best-effort warning handling, and R2 artifact persistence.
6. Add optional image gating plus image provider port.
7. Add replay/mock support for all generation capabilities.
8. Add route handlers/UI polling integration and the generation dialog if not already present.

This order matters. Text generation plus pack persistence is the real backbone. Images should not block that backbone.

## Remaining Open Questions

No further product decisions appear blocked for the preliminary implementation plan.

The remaining work is implementation detail, not product ambiguity:

- define the exact request/response schemas for the generation dialog and polling endpoints
- decide the route shape for the dedicated progress view
- choose the concrete env names for image capability toggling
- choose the first TTS provider and voice defaults when implementation starts

## Recommended Next Decision

Turn this document into an implementation checklist next: request schema, Trigger task contract, DB helper boundaries, and the first slice of code to land.
