# Content-generation provider architecture

This document explains the provider pattern used by LexiFlix after the content-generation refactor. It is written as a review guide for someone who knows TypeScript but is unfamiliar with Facade, Strategy, Adapter, Factory, and Ports and Adapters terminology.

The short version is: the workflow calls one stable function, shared application code owns LexiFlix behavior, a small factory selects a provider, and each provider adapter translates between LexiFlix and one vendor SDK.

```text
workflow.ts
    |
    v
public facade: generateTextContent(...)
    |
    +--> shared application service: prompts, batching, validation, failure policy
    |
    +--> exhaustive factory: Gemini or Azure AI Foundry
             |
             +--> provider adapter: vendor SDK request and response translation
```

This replaces the older architecture described in section 3 of `code-review-qa-2026-06-22.md`, where text selection lived directly in `workflow.ts` and speech providers duplicated orchestration.

## Why the old structure needed refinement

The old code was directionally correct because vendor calls were already placed in provider modules rather than scattered through route handlers. The problem was that each modality applied a different abstraction.

Text generation selected Gemini or Azure AI Foundry with a conditional inside `workflow.ts`. Both provider files then duplicated the prompt, batch size, concurrency, logging, Zod validation, error handling, and result aggregation. Changing a prompt rule or batching policy required editing two files and keeping them synchronized.

Speech generation had a facade in `speech/index.ts`, but its provider functions duplicated request construction, concurrent execution, rejected-result handling, warning creation, artifact assembly, and completion logging. Its configuration also used one broad object with a string provider and fields for every vendor, so TypeScript could represent invalid combinations such as an Azure provider with a Polly engine.

Image generation had one real provider, Azure AI Foundry, but the parameter named `imageProvider` was used as a model or deployment name. That vocabulary would become misleading as soon as another image vendor was added.

The refactor keeps the good boundary while making each responsibility explicit.

## The pattern in one sentence

LexiFlix uses a modality-specific application-service Facade, provider Strategy ports, vendor Adapters, and an exhaustive Factory selected at the composition boundary.

These terms overlap, but each describes a different responsibility.

| Term                 | Meaning in this codebase                                                                                | Main benefit                                                      |
| -------------------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Facade               | The stable function imported by the workflow, such as `generateTextContent`                             | Callers do not know which provider is active                      |
| Application service  | Shared LexiFlix behavior such as prompting, batching, validation, warning policy, and artifact assembly | Business behavior has one implementation                          |
| Port                 | The TypeScript contract that describes what LexiFlix needs from a provider                              | Core code depends on a small internal contract rather than an SDK |
| Adapter              | Code that translates the internal port into Gemini, Azure, or AWS calls                                 | Vendor details stay isolated                                      |
| Strategy             | The interchangeable adapter selected for one execution                                                  | Providers can be swapped without changing orchestration           |
| Factory              | The exhaustive `switch` that constructs the selected strategy                                           | Selection is centralized and checked by TypeScript                |
| Composition boundary | The location where validated environment configuration becomes typed provider configuration             | Configuration knowledge does not spread through the workflow      |

This is a lightweight form of Ports and Adapters, also called Hexagonal Architecture. There is no dependency-injection container, class hierarchy, abstract base class, or runtime plugin system. Plain TypeScript types and functions are enough.

## Why there is one port per modality

Text generation, speech synthesis, and image generation should not implement one universal `ContentProvider` interface. Their inputs, outputs, capabilities, and failure semantics are materially different.

Text is required for a pack, returns structured JSON, and fails the workflow if generation fails. Speech is optional, returns bytes, can produce several artifacts per vocabulary item, and degrades to warnings. Images are optional, apply only to eligible concrete words, and currently have one provider.

A universal interface would either contain many optional fields or erase useful types. Modality-specific ports keep each contract narrow and make invalid operations impossible to express.

## Text generation walkthrough

### 1. The workflow sees only the facade

`workflow.ts` no longer imports Gemini and Azure modules or chooses between them. It imports one function from `providers/text/index.ts`:

```ts
const textItems = await generateTextContent({
  items: selectedItems,
  requestSnapshot: job.requestSnapshot,
});
```

This is the Facade role. The workflow knows that it needs generated text, but it does not know which vendor will produce it, which model name belongs to that vendor, how batches are formed, or how structured output is parsed.

### 2. The facade is also the composition boundary

`providers/text/index.ts` converts validated environment configuration into a discriminated provider configuration, asks the factory for an adapter, and invokes the shared service:

```ts
function getTextGenerationConfig(): TextGenerationProviderConfig {
  switch (env.TEXT_LLM_PROVIDER) {
    case "gemini":
      return {
        provider: "gemini",
        model: env.CONTENT_GENERATION_TEXT_MODEL,
      };
    case "azure-foundry":
      return {
        provider: "azure-foundry",
        model: env.AZURE_AI_FOUNDRY_MODEL ?? "gpt-5.6-luna",
      };
  }
}

export async function generateTextContent(input: {
  items: SelectedGenerationItem[];
  requestSnapshot: GenerationRequestSnapshot;
}) {
  const config = getTextGenerationConfig();
  const adapter = createTextGenerationAdapter(config);

  return generateTextContentWithAdapter({
    ...input,
    config,
    adapter,
  });
}
```

This is called composition because separate pieces are assembled here. Environment variables, a concrete adapter, and the shared service are composed into one working operation. Provider selection happens once instead of leaking into every caller.

### 3. The port describes the capability LexiFlix needs

`providers/text/port.ts` defines the internal contract:

```ts
export type TextGenerationProviderConfig =
  | {
    provider: "gemini";
    model: string;
  }
  | {
    provider: "azure-foundry";
    model: string;
  };

export type TextGenerationAdapter = {
  provider: TextGenerationProviderConfig["provider"];
  generateBatch: (request: TextBatchRequest) => Promise<unknown>;
};
```

The adapter returns `unknown` intentionally. Data from an external API is untrusted even when an SDK gives it a convenient static type. The application service validates the value with the shared Zod schema before treating it as generated content.

The union is discriminated by `provider`. When TypeScript sees `provider: "gemini"`, it knows that the value is the Gemini configuration variant. This is more precise than `{ provider: string; model: string }` because arbitrary provider names cannot enter the system.

### 4. The factory selects a Strategy

`providers/text/factory.ts` contains one exhaustive selection point:

```ts
export function createTextGenerationAdapter(
  config: TextGenerationProviderConfig,
): TextGenerationAdapter {
  switch (config.provider) {
    case "gemini":
      return createGeminiTextAdapter();
    case "azure-foundry":
      return createAzureFoundryTextAdapter();
    default:
      return assertNever(config);
  }
}
```

Each returned adapter is a Strategy: it provides the same capability through a different implementation. An exhaustive `switch` is preferable to a dynamic registry here because the set of providers is small, known at build time, and validated by the environment schema.

The `assertNever` branch protects future changes. If a third provider is added to the configuration union but not to this factory, TypeScript reports that the value passed to `assertNever` is no longer `never`. That turns a forgotten implementation branch into a compile-time failure.

### 5. The application service owns provider-independent policy

`providers/text/service.ts` owns the behavior that must remain identical regardless of vendor:

```ts
const settledResults = await mapWithConcurrency<
  SelectedGenerationItem[],
  GeneratedTextItem[]
>(
  batches,
  TEXT_CONCURRENCY,
  async (batch, index) => {
    const prompt = buildTextGenerationPrompt({
      items: batch,
      requestSnapshot: input.requestSnapshot,
    });

    const response = await input.adapter.generateBatch({
      model: input.config.model,
      prompt,
    });

    return generatedTextBatchSchema.parse(response).items;
  },
);
```

Prompt construction lives in `prompt.ts`, the output contract lives in `schema.ts`, and the service owns batching, concurrency, logs, validation, aggregation, and fatal error policy. A prompt or batching change now has one source of truth.

This placement is important. Batching is not a Gemini feature or an Azure feature; it is how LexiFlix chooses to process vocabulary packs. Structured output validation is also a LexiFlix requirement. Those rules belong above the vendor adapter.

### 6. Adapters translate vendor APIs

The Gemini adapter converts the internal request into a Gemini call and converts Gemini text into an untrusted JavaScript value:

```ts
export function createGeminiTextAdapter(): TextGenerationAdapter {
  return {
    provider: "gemini",
    async generateBatch(request) {
      const response = await geminiClient.models.generateContent({
        model: request.model,
        contents: request.prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema,
        },
      });

      if (!response.text) {
        throw new Error("Gemini returned empty content.");
      }

      return JSON.parse(response.text);
    },
  };
}
```

The Azure adapter implements the same port through a different SDK:

```ts
const response = await getOpenAIClient().chat.completions.create({
  model: request.model,
  messages: [{ role: "user", content: request.prompt }],
  response_format: zodResponseFormat(
    generatedTextBatchSchema,
    "generatedTextBatch",
  ),
});
```

The adapters do not build LexiFlix prompts, split vocabulary into batches, decide whether failures are fatal, or aggregate results. Their responsibility is vendor translation only.

## Speech generation walkthrough

Speech uses the same architecture but has a different port because it produces binary artifacts and has best-effort failure semantics.

### Discriminated configuration prevents invalid states

`providers/speech/port.ts` defines exactly which fields belong to each provider:

```ts
export type SpeechProviderConfig =
  | {
    provider: "disabled";
  }
  | {
    provider: "aws-polly";
    voice: string;
    engine: "standard" | "neural";
  }
  | {
    provider: "azure-mai";
    voice: string;
    style: string;
  };
```

The disabled configuration has no fake voice. Polly requires an engine and cannot contain an Azure style. Azure requires a style and cannot contain a Polly engine. This property is often summarized as making invalid states unrepresentable.

The configuration builder in `providers/speech/config.ts` translates the environment and the learner's selected voice gender into one valid variant. The workflow passes that typed value to the facade and never imports a concrete speech adapter.

### The speech port is intentionally lower-level

```ts
export type SpeechSynthesisAdapter = {
  provider: ActiveSpeechProviderConfig["provider"];
  voice: string;
  concurrency: number;
  synthesize: (target: SpeechArtifactTarget) => Promise<SpeechSynthesisResult>;
};
```

An adapter synthesizes one target. The application service decides which targets exist, how many run concurrently, how rejected requests become warnings, and how successful bytes become `GeneratedBinaryArtifact` values.

This is more useful than a high-level port such as `generateSpeechForPack(...)`. A high-level port would force every provider to duplicate pack traversal and artifact assembly, which was the main problem in the old implementation.

### Best-effort behavior remains in the application service

The speech facade treats disabled audio and provider failures differently from required text generation. Disabled audio returns no artifacts and a capability warning. A fatal provider integration failure also returns warnings instead of failing the whole pack. Individual synthesis failures are collected per request while successful requests are preserved.

```ts
if (input.config.provider === "disabled") {
  return {
    artifacts: [],
    warnings: ["Audio generation is disabled by server capability config."],
  };
}

try {
  const adapter = createSpeechSynthesisAdapter(input.config);
  return await generateWithAdapter({
    selectedItems: input.selectedItems,
    textItems: input.textItems,
    adapter,
  });
} catch (error) {
  // Convert a fatal optional-provider failure into a pack warning.
}
```

Retry decisions remain in each adapter because retryability is vendor-specific. AWS exposes named exceptions, while Azure MAI exposes HTTP status codes and `Retry-After`. The shared service should not pretend those protocols are identical.

## Image generation uses the same boundary

Image generation now follows the same facade, service, port, factory, and adapter shape as text and speech, even though Azure AI Foundry is currently the only image provider. The uniform boundary is useful here because image generation is optional and its best-effort failure policy must include provider setup failures as well as individual image failures.

The image port in `providers/image/port.ts` expresses the one-image capability:

```ts
export type ImageGenerationProviderConfig = {
  provider: "azure-foundry";
  model: string;
};

export type ImageGenerationAdapter = {
  provider: ImageGenerationProviderConfig["provider"];
  generate: (request: { prompt: string }) => Promise<ImageGenerationResult>;
};
```

The shared service filters eligible vocabulary, applies request pacing, converts successful results into artifacts, and turns individual failures into warnings. The Azure adapter owns client construction, SDK invocation, response decoding, provider metadata, model selection, and output-size details.

The facade constructs the configured adapter inside its best-effort boundary:

```ts
export async function generateImageArtifacts(input: {
  textItems: GeneratedTextItem[];
}): Promise<{ artifacts: GeneratedBinaryArtifact[]; warnings: string[] }> {
  const config = getImageGenerationConfig();

  try {
    const adapter = createImageGenerationAdapter(config);
    return await generateImageArtifactsWithAdapter({
      textItems: input.textItems,
      config,
      adapter,
    });
  } catch (error) {
    // Convert a fatal optional-provider setup failure into a pack warning.
  }
}
```

Constructing the adapter inside `try` matters because missing Azure credentials can fail before the first item request. Without this boundary, enabling optional images could fail the entire pack. Individual SDK request failures are handled by the shared service, while initialization failures are handled once by the facade.

The input is called a model rather than a provider because the value is passed to Azure as the model or deployment name. The existing environment variable remains `CONTENT_GENERATION_IMAGE_PROVIDER` for compatibility, but the composition boundary maps it to `ImageGenerationProviderConfig.model`. A future migration can introduce a correctly named environment variable without leaking that legacy name through the application service.

A one-case exhaustive factory may look redundant, but it gives all three modalities the same extension point and makes adding a second image provider mechanical. It is still intentionally lightweight: one union, one `switch`, and plain function objects rather than a plugin registry or dependency-injection container.

## Dependency direction

The most important architectural rule is the direction of dependencies:

```text
workflow
  -> facade / application service
      -> internal port types
      <- provider adapters implement those port types
          -> vendor SDKs
```

The application service does not import a vendor SDK. Adapters import the internal port and the vendor SDK. This is dependency inversion in practical terms: high-level LexiFlix policy does not depend directly on low-level vendor APIs; both meet at a small internal contract.

The factory necessarily imports concrete adapters because constructing concrete implementations is its job. Keeping that knowledge in one file prevents it from spreading through orchestration code.

## Concrete benefits in LexiFlix

### One source of truth for product behavior

The text prompt and batching rules are no longer duplicated. Speech request construction and artifact assembly are no longer duplicated. A policy change affects every provider consistently.

### Safer provider additions

Provider names are unions rather than arbitrary strings. Exhaustive factories force a developer to handle every configured provider. Discriminated configuration prevents provider-specific fields from being mixed accidentally.

### Smaller vendor modules

Adapters are easier to review because they answer a narrow question: how does this vendor perform one batch or one synthesis request? Product selection, persistence, pack creation, and warning policy are elsewhere.

### Stable orchestration

`workflow.ts` asks for text and speech without knowing concrete providers. Switching from Gemini to Azure changes configuration and factory output rather than the workflow's control flow.

### Better failure ownership

Required text fails the pack. Optional speech and images degrade to warnings. Retryability stays near the vendor protocol. These decisions are visible in the application service instead of being repeated or hidden inside SDK wrappers.

### Easier focused testing later

The shared services accept adapter objects, so a small fake can return deterministic data without calling an external API. The repository does not currently have a mature automated test suite, but the boundary now makes future tests straightforward:

```ts
const fakeAdapter: TextGenerationAdapter = {
  provider: "gemini",
  async generateBatch() {
    return {
      items: [
        {
          analysisItemId: "analysis-item-1",
          termId: "term-1",
          meaning: "A test meaning.",
          exampleSentences: ["A test sentence."],
          imageBrief: null,
          imageEligibility: { eligible: false, reason: "Abstract term" },
          warnings: [],
        },
      ],
    };
  },
};
```

No Gemini or Azure mocking library is required because the test double implements the internal port rather than a large external SDK interface.

## Tradeoffs and limits

This structure creates more small files. That cost is justified for text and speech because multiple providers exist and shared logic was duplicated. It is also justified for image generation because the boundary now enforces optional best-effort behavior consistently, including failures that occur while constructing the Azure client.

The port must stay narrow. If every vendor option is added to the shared request, the port becomes a disguised union of SDKs and loses its value. Provider-specific options belong in discriminated configuration or inside the adapter.

The facade should not become a catch-all manager. Pack persistence, database transitions, notifications, and artifact uploads remain in the workflow because they are workflow responsibilities, not provider responsibilities.

A dynamic registry or dependency-injection container is unnecessary at this scale. Providers are known at build time, and an exhaustive `switch` is simpler to navigate and safer to refactor.

Automatic fallback between text providers is intentionally not introduced by this pattern. Fallback changes cost, latency, output consistency, and observability semantics. It should be an explicit product policy rather than an accidental consequence of having interchangeable adapters.

## How to add another text provider

1. Add the provider name and its required configuration as another member of `TextGenerationProviderConfig`.
2. Add environment validation for its credentials and model.
3. Create an adapter under `providers/text/adapters/` that implements `TextGenerationAdapter`.
4. Add the adapter to the exhaustive factory.
5. Add the environment-to-config mapping in `providers/text/index.ts`.
6. Do not copy the prompt, batching loop, schema parsing, or aggregation into the adapter.
7. Run `task web:typecheck` and `task web:lint`, then perform a provider-specific manual generation check.

## How to decide where new logic belongs

Use this decision rule during review:

- If the rule should be identical for every vendor, place it in the application service, prompt module, shared schema, or shared helper.
- If the rule translates a request or response for one SDK or protocol, place it in that provider's adapter.
- If the rule chooses which implementation exists, place it in the factory or composition boundary.
- If the rule coordinates pack stages, persistence, notifications, or durable job state, keep it in the workflow.
- If only one implementation exists, add a port only when it enforces a meaningful boundary such as image best-effort failure handling; do not add one merely for visual symmetry.

## Review checklist

- Does `workflow.ts` import only modality facades and shared helpers, never concrete provider adapters?
- Does each factory handle every member of its provider configuration union?
- Are provider-specific settings represented by discriminated configuration rather than optional fields on one broad object?
- Is provider-independent behavior implemented once?
- Do adapters contain only SDK or protocol translation, credentials, provider metadata, and provider-specific retry behavior?
- Is untrusted provider output validated before becoming a domain value?
- Are required and optional modality failures handled according to their intended product semantics?
- Has a new abstraction earned its complexity through multiple implementations or duplicated policy?

## Final mental model

Think of a wall socket. LexiFlix defines the socket shape through a port. Gemini, Azure AI Foundry, AWS Polly, and Azure MAI each need a different physical adapter to fit that socket. The factory chooses which adapter is plugged in. The application service decides what the powered machine should do. The workflow only presses the machine's start button.

That separation is beneficial because changing the power company should not require redesigning the machine, and changing how the machine performs its job should not require editing every power adapter.
