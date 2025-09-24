"use client";

import { useCallback } from "react";

type ToastOptions = {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
};

type ToastApi = {
  toast: (options: ToastOptions) => void;
};

export function useToast(): ToastApi {
  const toast = useCallback((options: ToastOptions) => {
    const { title, description, variant } = options;
    const label = variant === "destructive" ? "[toast:error]" : "[toast]";

    if (typeof window !== "undefined") {
      const message = [title, description].filter(Boolean).join(" — ");
      if (message) {
        window.dispatchEvent(
          new CustomEvent("lexiflix:toast", {
            detail: { title, description, variant },
          }),
        );
      }
    }

    if (variant === "destructive") {
      console.error(label, title, description);
      return;
    }

    console.info(label, title, description);
  }, []);

  return { toast };
}
