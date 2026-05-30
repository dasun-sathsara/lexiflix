# OOP Pillars in LexiFlix

This document explains how the four pillars of Object-Oriented Programming (OOP) — **Encapsulation**, **Abstraction**, **Inheritance**, and **Polymorphism** — are implemented and utilized in the LexiFlix codebase.

LexiFlix uses a hybrid paradigm: Python for the FastAPI NLP service, and TypeScript/Next.js for the main web application. Because TypeScript relies on structural typing (duck typing) and Python supports multiple inheritance and dynamic typing, the pillars manifest in modern, idiomatic ways rather than strict classical Java-style OOP.

---

## 1. Encapsulation

**Encapsulation** is the bundling of data and the methods that operate on that data inside a single unit (like a class or a module boundary), while restricting direct access to some of the object's components (information hiding).

### How LexiFlix uses it
While TypeScript uses module-export restrictions and boundary tools like `server-only`, a **textbook example of encapsulation** can be found in the Python NLP service: `apps/nlp_service/app/services/cefr.py`.

In Python, there are no access modifier keywords like `private` or `protected`. Instead, the language uses module boundaries and the leading underscore (`_`) naming convention to enforce private scope, protect state, and perform information hiding.

### Code Excerpt

```python
# apps/nlp_service/app/services/cefr.py

from __future__ import annotations

from cefrpy import CEFRAnalyzer  # type: ignore[import-untyped]
from cefrpy.CEFRLevel import CEFRLevel  # type: ignore[import-untyped]

# Module-private constants (not exported by design)
LABEL_TO_NUM: dict[str, int] = {"A1": 1, "A2": 2, "B1": 3, "B2": 4, "C1": 5, "C2": 6}
NUM_TO_LABEL: dict[int, str] = {v: k for k, v in LABEL_TO_NUM.items()}

_COARSE_TO_PTB: dict[str, str] = {
    "NOUN": "NN",
    "VERB": "VB",
    "ADJ": "JJ",
    "ADV": "RB",
    "PROPN": "NN",
}

# Module-private state (the analyzer instance is instantiated once and encapsulated)
_analyzer = CEFRAnalyzer()


def coarse_to_base_ptb(pos: str | None) -> str | None:
    """Map spaCy coarse POS to the base Penn Treebank tag used by cefrpy."""
    return _COARSE_TO_PTB.get((pos or "").upper())


# Module-private helper functions (prefixed with _ to indicate private visibility)
def _level_to_pair(level: CEFRLevel | None) -> tuple[int | None, str | None]:
    if level is None:
        return None, None
    num = int(level)
    return num, NUM_TO_LABEL.get(num)


def _lookup_pos(word: str, pos_ptb: str) -> tuple[int | None, str | None]:
    try:
        return _level_to_pair(_analyzer.get_word_pos_level_CEFR(word, pos_ptb))
    except Exception:
        return None, None


def _lookup_average(word: str) -> tuple[int | None, str | None]:
    try:
        return _level_to_pair(_analyzer.get_average_word_level_CEFR(word))
    except Exception:
        return None, None


# Public entry point exposing the capability, hiding all implementation
def resolve_cefr(lemma: str, pos: str | None) -> tuple[int | None, str | None]:
    """Resolve CEFR for an aggregated lemma: POS lookup, then average fallback."""
    lemma = lemma.casefold().strip()
    if not lemma:
        return None, None

    pos_ptb = coarse_to_base_ptb(pos)
    if pos_ptb:
        num, label = _lookup_pos(lemma, pos_ptb)
        if num is not None:
            return num, label

    return _lookup_average(lemma)
```

### Why this is Encapsulation
1. **Information Hiding**: Callers of the NLP service (like the pipeline steps) import and call `resolve_cefr(lemma, pos)`. They have no knowledge of `cefrpy` (the third-party library), how `CEFRAnalyzer` computes values, or the Penn Treebank mapping.
2. **Access Control (Module Scope)**: The helper functions (`_level_to_pair`, `_lookup_pos`, `_lookup_average`), the mapping constant `_COARSE_TO_PTB`, and the instance state `_analyzer` are prefixed with `_`. In Python, this is a formal signal to tooling (like linters and IDE auto-imports) that these members are module-private. It also prevents them from being imported when using wildcards (`from cefr import *`).
3. **State Protection**: The `_analyzer` instance is created once at module load and is protected from external modification. The module acts as an implicit singleton encapsulating this analyzer state.

---

## 2. Abstraction

**Abstraction** is the practice of filtering out the noise and complex details of an implementation, exposing only the essential interface to the user. It allows programmers to work with a "mental model" of what an object does, rather than how it does it.

### How LexiFlix uses it
LexiFlix applies abstraction at two key levels:
1. **Ports (TypeScript)**: Abstracting third-party LLM vendors behind uniform interfaces.
2. **Model Management (Python)**: Abstracting the lifecycle and loading of heavy NLP models behind a manager singleton.

### Code Excerpt 1: TypeScript Ports
In `text/port.ts`, we abstract the behavior of LLM text generation down to a single function interface that accepts a generic text prompt:

```typescript
// apps/web/src/lib/server/content-generation/providers/text/port.ts

export type TextGenerationProviderConfig =
  | {
      provider: "gemini";
      model: string;
    }
  | {
      provider: "azure-foundry";
      model: string;
    };

export type TextBatchRequest = {
  model: string;
  prompt: string;
};

// The Abstraction boundary
export type TextGenerationAdapter = {
  provider: TextGenerationProviderConfig["provider"];
  generateBatch: (request: TextBatchRequest) => Promise<unknown>;
};
```

### Code Excerpt 2: Python Model Manager
In the NLP service, the manager class `SpaCyModelManager` abstracts the instantiation, installation checks, and load process of the heavy spaCy transformer pipeline:

```python
# apps/nlp_service/app/services/spacy_models.py

import spacy  # type: ignore[import-untyped]
from spacy.language import Language  # type: ignore[import-untyped]
from app.core.exceptions import SpaCyModelError

_MODEL_NAME = "en_core_web_trf"

class SpaCyModelManager:
    """Singleton-ish manager for the loaded spaCy pipeline.

    Call ``load()`` once at application startup. The ``nlp`` property then
    provides the ready-to-use ``Language`` instance on every request.
    """

    def __init__(self) -> None:
        self._nlp: Language | None = None

    @property
    def is_loaded(self) -> bool:
        return self._nlp is not None

    @property
    def nlp(self) -> Language:
        if self._nlp is None:
            raise SpaCyModelError("spaCy model has not been loaded yet.")
        return self._nlp

    def load(self) -> None:
        """Load the ``en_core_web_trf`` pipeline."""
        if self._nlp is not None:
            return

        if not spacy.util.is_package(_MODEL_NAME):
            raise SpaCyModelError(
                f"Model '{_MODEL_NAME}' is not installed.",
                detail=f"Run: python -m spacy download {_MODEL_NAME}",
            )

        try:
            nlp = spacy.load(_MODEL_NAME)
        except OSError as exc:
            raise SpaCyModelError(
                f"Could not load model '{_MODEL_NAME}'.",
                detail=str(exc),
            ) from exc

        self._nlp = nlp


# Module-level singleton
model_manager = SpaCyModelManager()
```

### Why this is Abstraction
1. **Simplified Interface**:
   - In TS, instead of exposing the complex configurations of `GoogleGenAI` (Vertex AI SDK) or `AzureOpenAI` (OpenAI SDK), we abstract LLM generation to `generateBatch` returning a `Promise<unknown>`.
   - In Python, instead of having API routes check if package `en_core_web_trf` is installed, handle model-specific exceptions, or call `spacy.load()`, callers simply query the property `model_manager.nlp` or check `model_manager.is_loaded`.
2. **Decoupled Business Logic**:
   - The TS compiler enforces that the caller (`generateTextContentWithAdapter`) only deals with the abstracted interface.
   - The Python NLP orchestrator only relies on the abstraction of `model_manager`. The underlying filesystem checks, library loading details, and specific OSError translations are isolated behind the abstraction boundary.

---

## 3. Inheritance

**Inheritance** is a mechanism where a new class is created from an existing class. The new class (subclass) inherits the attributes and methods of the parent class, allowing for hierarchical classification and code reuse.

### How LexiFlix uses it
We use inheritance in the Python NLP service (`apps/nlp_service/`) for:
1. **Domain Exception Hierarchy**: Structuring custom domain errors.
2. **Framework Integration**: Subclassing Pydantic's `BaseModel` for request/response serialization, and Pydantic's `BaseSettings` for settings.

### Code Excerpt
In the NLP service's exception module, we create an exception taxonomy:

```python
# apps/nlp_service/app/core/exceptions.py

class NLPServiceError(Exception):
    """Base exception for all NLP service errors."""

    def __init__(self, message: str, *, detail: str | None = None) -> None:
        super().__init__(message)
        self.detail = detail


class SRTParsingError(NLPServiceError):
    """Raised when SRT content cannot be parsed."""


class PipelineError(NLPServiceError):
    """Raised when the NLP pipeline fails during processing."""


class EmptyContentError(NLPServiceError):
    """Raised when the input content yields no processable text."""
```

### Why this is Inheritance
1. **Behavior Reuse**: The subclasses (`SRTParsingError`, `PipelineError`, `EmptyContentError`) inherit Python's built-in `Exception` machinery via `NLPServiceError`. They also inherit the `__init__` constructor that accepts `message` and assigns the `detail` attribute.
2. **Type Taxonomy**: They form an `is-a` relationship. A `SRTParsingError` *is a* `NLPServiceError`. This allows exception handlers to catch the base `NLPServiceError` to handle all NLP domain errors uniformly.

---

## 4. Polymorphism

**Polymorphism** (specifically subtyping polymorphism) is the ability of different classes or objects to be treated as instances of a parent class or interface, responding to the same method calls with their own specialized behavior.

### How LexiFlix uses it
TypeScript uses **structural subtyping** (duck typing). We pass different concrete adapter objects into the core generator function. At runtime, the invocation resolves to the implementation matching the selected provider.

### Code Excerpt
The shared application service executes polymorphism by invoking `generateBatch` on whichever adapter is passed to it:

```typescript
// apps/web/src/lib/server/content-generation/providers/text/service.ts

export async function generateTextContentWithAdapter(input: {
  items: SelectedGenerationItem[];
  requestSnapshot: GenerationRequestSnapshot;
  config: TextGenerationProviderConfig;
  adapter: TextGenerationAdapter; // Reference to the interface
}) {
  // ... batch preparation ...

  const response = await input.adapter.generateBatch({
    model: input.config.model,
    prompt,
  });

  // ... response validation and mapping ...
}
```

Two concrete adapters provide their own polymorphic implementations of `generateBatch`:

**Gemini Adapter Implementation:**
```typescript
// apps/web/src/lib/server/content-generation/providers/text/adapters/gemini.ts

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
      // ...
      return JSON.parse(response.text);
    },
  };
}
```

**Azure Foundry Adapter Implementation:**
```typescript
// apps/web/src/lib/server/content-generation/providers/text/adapters/azure-foundry.ts

export function createAzureFoundryTextAdapter(): TextGenerationAdapter {
  return {
    provider: "azure-foundry",
    async generateBatch(request) {
      const response = await getOpenAIClient().chat.completions.create({
        model: request.model,
        messages: [{ role: "user", content: request.prompt }],
        response_format: zodResponseFormat(generatedTextBatchSchema, "generatedTextBatch"),
      });
      // ...
      return JSON.parse(text);
    },
  };
}
```

### Why this is Polymorphism
1. **Dynamic Method Dispatch**: When `generateTextContentWithAdapter` executes `input.adapter.generateBatch()`, it doesn't run a conditional branch to determine the provider. It invokes the method directly. The runtime object (Gemini or Azure Foundry) resolves this call to its specific implementation.
2. **Interface Interchangeability**: Both adapters are interchangeable. Adding a third provider (e.g., Anthropic Claude) only requires building an adapter matching the `TextGenerationAdapter` shape — the core service code remains completely unchanged.
