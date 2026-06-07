"use client";

import * as React from "react";

type NavigationProgressContextValue = {
  /** True while at least one navigation or filter transition is in flight. */
  isNavigating: boolean;
  /** Registers or clears a pending source keyed by a stable id. */
  setPending: (key: string, pending: boolean) => void;
};

const NavigationProgressContext = React.createContext<NavigationProgressContextValue | null>(null);

/** Keeps the global bar visible briefly so consecutive transitions do not flicker. */
const HIDE_GRACE_MS = 150;

/**
 * Tracks app-wide navigation and filter pending state so a single progress indicator can
 * represent link navigations, router transitions, and debounced filter pushes.
 */
export function NavigationProgressProvider({ children }: { children: React.ReactNode }) {
  const [pendingCount, setPendingCount] = React.useState(0);
  const [isNavigating, setIsNavigating] = React.useState(false);
  const pendingKeysRef = React.useRef(new Set<string>());

  const setPending = React.useCallback((key: string, pending: boolean) => {
    const keys = pendingKeysRef.current;
    const wasPending = keys.has(key);

    if (pending === wasPending) {
      return;
    }

    if (pending) {
      keys.add(key);
    } else {
      keys.delete(key);
    }

    setPendingCount(keys.size);
  }, []);

  React.useEffect(() => {
    if (pendingCount > 0) {
      setIsNavigating(true);
      return;
    }

    const timer = setTimeout(() => setIsNavigating(false), HIDE_GRACE_MS);
    return () => clearTimeout(timer);
  }, [pendingCount]);

  const value = React.useMemo<NavigationProgressContextValue>(
    () => ({ isNavigating, setPending }),
    [isNavigating, setPending],
  );

  return (
    <NavigationProgressContext.Provider value={value}>
      {children}
    </NavigationProgressContext.Provider>
  );
}

/**
 * Reads the shared navigation progress state. Returns an inert value when no provider is
 * mounted so components stay usable outside the app shell.
 */
export function useNavigationProgress(): NavigationProgressContextValue {
  const context = React.useContext(NavigationProgressContext);

  if (context) {
    return context;
  }

  return NOOP_NAVIGATION_PROGRESS;
}

const NOOP_NAVIGATION_PROGRESS: NavigationProgressContextValue = {
  isNavigating: false,
  setPending: () => {},
};

let pendingKeySequence = 0;

/** Publishes a local pending flag (usually from `useTransition`) to the global indicator. */
export function useReportNavigationPending(pending: boolean) {
  const { setPending } = useNavigationProgress();
  const keyRef = React.useRef<string>("");

  if (!keyRef.current) {
    pendingKeySequence += 1;
    keyRef.current = `pending-${pendingKeySequence}`;
  }

  React.useEffect(() => {
    const key = keyRef.current;
    setPending(key, pending);

    return () => setPending(key, false);
  }, [pending, setPending]);
}
