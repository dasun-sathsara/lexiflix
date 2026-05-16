import { describe, expect, it } from "vitest";
import type { PackGenerationProgressView } from "./types";
import {
  formatGenerationLabel,
  getGenerationProgressState,
  getGenerationStatusMessage,
  isGenerationActive,
  PUBLIC_GENERATION_FAILURE_MESSAGE,
} from "./utils";

describe("formatGenerationLabel", () => {
  it("maps known labels correctly", () => {
    expect(formatGenerationLabel("word")).toBe("Words");
    expect(formatGenerationLabel("phrasal_verb")).toBe("Phrasal verbs");
    expect(formatGenerationLabel("all_levels_above")).toBe("All levels above");
    expect(formatGenerationLabel("balanced")).toBe("Balanced");
  });

  it("falls back to replacing underscores with spaces for unknown values", () => {
    expect(formatGenerationLabel("some_unknown_label")).toBe("some unknown label");
    expect(formatGenerationLabel("foo_bar_baz")).toBe("foo bar baz");
  });
});

describe("isGenerationActive", () => {
  it("returns true for queued", () => {
    expect(isGenerationActive("queued")).toBe(true);
  });

  it("returns true for running", () => {
    expect(isGenerationActive("running")).toBe(true);
  });

  it("returns false for completed", () => {
    expect(isGenerationActive("completed")).toBe(false);
  });

  it("returns false for failed", () => {
    expect(isGenerationActive("failed")).toBe(false);
  });

  it("returns false for cancelled", () => {
    expect(isGenerationActive("cancelled")).toBe(false);
  });
});

function makeGeneration(
  status: PackGenerationProgressView["status"],
  stage: PackGenerationProgressView["stage"] = "queued",
  errorMessage: string | null = null,
): PackGenerationProgressView {
  return {
    jobId: "job-1",
    status,
    stage,
    progressMessage: null,
    errorCode: null,
    errorMessage,
    warnings: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    startedAt: null,
    completedAt: null,
    content: {
      contentId: "c1",
      title: "Test",
      subtitle: null,
      posterUrl: null,
      mediaHref: null,
    },
    request: {
      learnerCefrLevel: "B1",
      frequencyPreference: "balanced",
      selectedVocabularyTypes: ["word"],
      cefrWindowMode: "same_level",
      packSize: 10,
      knownTermHandling: "exclude_known",
      audioVoiceGender: "female",
      exampleSentenceCount: 1,
      hasCustomInstructions: false,
      forceRegenerate: false,
    },
    packId: null,
    packHref: null,
    progressHref: "/progress",
    events: [],
  };
}

describe("getGenerationProgressState", () => {
  it("returns stage copy for running with specific stage", () => {
    const gen = makeGeneration("running", "selecting_terms");
    const state = getGenerationProgressState(gen);
    expect(state.label).toBe("Selecting Vocabulary");
  });

  it("returns queued stage copy when status is queued", () => {
    const gen = makeGeneration("queued");
    const state = getGenerationProgressState(gen);
    expect(state.label).toBe("Queued");
  });

  it("returns status copy for completed", () => {
    const gen = makeGeneration("completed");
    const state = getGenerationProgressState(gen);
    expect(state.label).toBe("Ready");
    expect(state.tone).toBe("success");
  });
});

describe("getGenerationStatusMessage", () => {
  it("returns errorMessage for failed status when present", () => {
    const gen = makeGeneration("failed", "failed", "Something broke");
    expect(getGenerationStatusMessage(gen)).toBe("Something broke");
  });

  it("returns public failure message for failed status without errorMessage", () => {
    const gen = makeGeneration("failed");
    expect(getGenerationStatusMessage(gen)).toBe(PUBLIC_GENERATION_FAILURE_MESSAGE);
  });

  it("returns description from progress state for other statuses", () => {
    const gen = makeGeneration("queued");
    expect(getGenerationStatusMessage(gen)).toBe("Waiting for generation to start.");
  });
});
