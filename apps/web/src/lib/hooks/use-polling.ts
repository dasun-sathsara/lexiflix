import * as React from "react";

export interface UsePollingOptions {
  enabled?: boolean;
  intervalMs: number;
  dependencies?: React.DependencyList;
}

/**
 * A client-safe hook for running a callback at a fixed interval.
 * Invokes the callback immediately when enabled, schedules an interval,
 * and passes an AbortSignal to the callback to handle cleanup/cancellation.
 */
export function usePolling(
  callback: (signal: AbortSignal) => void | Promise<void>,
  { enabled = true, intervalMs, dependencies = [] }: UsePollingOptions,
): void {
  const callbackRef = React.useRef(callback);

  React.useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  React.useEffect(() => {
    if (!enabled) {
      return;
    }

    const controller = new AbortController();
    const { signal } = controller;

    // Invoke immediately when enabled
    void callbackRef.current(signal);

    const intervalId = window.setInterval(() => {
      if (!signal.aborted) {
        void callbackRef.current(signal);
      }
    }, intervalMs);

    return () => {
      controller.abort();
      window.clearInterval(intervalId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, intervalMs, ...dependencies]);
}
