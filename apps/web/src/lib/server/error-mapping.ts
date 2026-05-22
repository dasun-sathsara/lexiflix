import "server-only";

const TECHNICAL_MESSAGE_PATTERN =
  /\b(neon|driver|transaction|constraint|database|sql|trigger|r2|s3|aws|api key|stack|exception)\b/i;

export function toUserFriendlyAnalysisError(rawMsg: string | null): string {
  if (!rawMsg) {
    return "Subtitle analysis could not be completed. Please try running the analysis again.";
  }

  const lowerMsg = rawMsg.toLowerCase();

  // 1. Subtitle availability / format errors
  if (
    lowerMsg.includes("no compatible english subtitles") ||
    lowerMsg.includes("no english subtitles")
  ) {
    return "We couldn't find any English subtitles for this title. Please try another movie or show.";
  }
  if (
    lowerMsg.includes("contained no usable dialogue lines") ||
    lowerMsg.includes("no dialogue") ||
    lowerMsg.includes("no usable lines")
  ) {
    return "The subtitle file we found didn't contain any readable dialogue. Please try another subtitle file or title.";
  }

  // 2. OpenSubtitles connection / API errors
  if (
    lowerMsg.includes("opensubtitles") ||
    lowerMsg.includes("open-subtitles") ||
    lowerMsg.includes("authenticate")
  ) {
    return "We had trouble connecting to the subtitle service. Please try running the analysis again.";
  }

  // 3. NLP service / Gemini service offline / busy
  if (
    lowerMsg.includes("nlp service") ||
    lowerMsg.includes("nlp_service") ||
    lowerMsg.includes("gemini") ||
    lowerMsg.includes("language model") ||
    lowerMsg.includes("llm")
  ) {
    return "Our language analysis system is temporarily busy or offline. Please try again in a few moments.";
  }

  // 4. Database / system errors
  if (TECHNICAL_MESSAGE_PATTERN.test(rawMsg)) {
    return "A system or database error occurred. Please try running the analysis again.";
  }

  // Fallback
  return "Subtitle analysis could not be completed. Please try running the analysis again.";
}

export function toUserFriendlyGenerationError(rawMsg: string | null): string {
  if (!rawMsg) {
    return "Pack generation could not be completed. Please adjust your settings and try again.";
  }

  const lowerMsg = rawMsg.toLowerCase();

  // 1. No vocabulary items matched selection criteria
  if (
    lowerMsg.includes("no selectable vocabulary items") ||
    lowerMsg.includes("no vocabulary items matched") ||
    lowerMsg.includes("no selectable vocabulary")
  ) {
    return "No new words matched your study settings for this title. Try selecting more word types or adjusting your target CEFR level.";
  }

  // 2. Speech/audio generation errors
  if (
    lowerMsg.includes("polly") ||
    lowerMsg.includes("aws polly") ||
    lowerMsg.includes("audio stream") ||
    lowerMsg.includes("audio generation") ||
    lowerMsg.includes("speech")
  ) {
    return "We had trouble generating the audio pronunciation. Please try generating the pack again.";
  }

  // 3. Gemini / text content generation errors
  if (
    lowerMsg.includes("gemini") ||
    lowerMsg.includes("text content generation") ||
    lowerMsg.includes("batch") ||
    lowerMsg.includes("empty content")
  ) {
    return "Our vocabulary generation system is temporarily busy. Please try generating the pack again.";
  }

  // 4. Trigger retry failed / starting job issues
  if (lowerMsg.includes("trigger pack generation") || lowerMsg.includes("trigger workflow")) {
    return "We had trouble starting the vocabulary generation. Please try generating the pack again.";
  }

  // 5. Database / system errors
  if (TECHNICAL_MESSAGE_PATTERN.test(rawMsg)) {
    return "A system or database error occurred. Please try generating the pack again.";
  }

  // Fallback
  return "Pack generation could not be completed. Please adjust your settings and try again.";
}
