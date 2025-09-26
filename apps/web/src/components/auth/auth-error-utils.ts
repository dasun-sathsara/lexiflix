interface BetterFetchLikeError {
  status: number;
  message?: string;
  data?: unknown;
}

export interface AuthErrorDetails {
  message: string;
  status?: number;
  code?: string;
  cause?: unknown;
}

const FALLBACK_MESSAGE = "We couldn't process your request. Please try again.";

export function parseAuthError(error: unknown): AuthErrorDetails {
  if (!error) {
    return { message: "" };
  }

  if (typeof error === "string") {
    return { message: error };
  }

  if (isBetterFetchLikeError(error)) {
    const message = extractErrorMessage(error) ?? error.message ?? FALLBACK_MESSAGE;
    return {
      message,
      status: error.status,
      code: readErrorCode(error.data),
      cause: error,
    };
  }

  if (error instanceof Error) {
    return { message: error.message || FALLBACK_MESSAGE, cause: error };
  }

  if (typeof error === "object") {
    const genericMessage = extractMessageFromUnknown(error) ?? FALLBACK_MESSAGE;
    return { message: genericMessage, cause: error };
  }

  return { message: FALLBACK_MESSAGE };
}

export function requiresEmailVerification(error: unknown): boolean {
  const { status, code } = parseAuthError(error);
  return status === 403 || code === "EMAIL_NOT_VERIFIED";
}

function extractErrorMessage(error: BetterFetchLikeError): string | undefined {
  if (!error.data || typeof error.data !== "object") {
    return undefined;
  }

  const payload = error.data as Record<string, unknown>;

  if (typeof payload.message === "string" && payload.message.trim().length > 0) {
    return payload.message;
  }

  if (Array.isArray(payload.errors)) {
    for (const entry of payload.errors) {
      if (entry && typeof entry === "object" && "message" in entry) {
        const value = (entry as { message?: unknown }).message;
        if (typeof value === "string" && value.trim().length > 0) {
          return value;
        }
      }
    }
  }

  return undefined;
}

function readErrorCode(data: unknown): string | undefined {
  if (!data || typeof data !== "object") {
    return undefined;
  }

  const payload = data as Record<string, unknown>;
  const code = payload.code ?? payload.errorCode;

  return typeof code === "string" ? code : undefined;
}

function extractMessageFromUnknown(value: unknown): string | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  if ("message" in value) {
    const message = (value as { message?: unknown }).message;
    if (typeof message === "string" && message.trim().length > 0) {
      return message;
    }
  }

  return undefined;
}

function isBetterFetchLikeError(error: unknown): error is BetterFetchLikeError {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as { status?: unknown };
  return typeof candidate.status === "number";
}
