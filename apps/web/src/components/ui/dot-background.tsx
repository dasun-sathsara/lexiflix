import type React from "react";
import { cn } from "@/lib/utils";

type DotBackgroundProps = {
  children?: React.ReactNode;
  className?: string;
  contentClassName?: string;
  dotOpacity?: number | string;
  maskOpacity?: number | string;
};

export function DotBackground({
  children,
  className,
  contentClassName,
  dotOpacity = 1,
  maskOpacity = 1,
}: DotBackgroundProps) {
  const dotBgOpacity =
    typeof dotOpacity === "number" ? dotOpacity : (dotOpacity ?? 1);
  const maskBgOpacity =
    typeof maskOpacity === "number" ? maskOpacity : (maskOpacity ?? 1);

  return (
    <div
      className={cn(
        "relative flex w-full items-center justify-center overflow-hidden bg-white py-24 dark:bg-black",
        className,
      )}
    >
      <div
        className={cn(
          "absolute inset-0",
          "[background-size:20px_20px]",
          "[background-image:radial-gradient(#d4d4d4_1px,transparent_1px)]",
          "dark:[background-image:radial-gradient(#404040_1px,transparent_1px)]",
        )}
        style={{ opacity: dotBgOpacity }}
      />
      <div
        className="pointer-events-none absolute inset-0 bg-white [mask-image:radial-gradient(ellipse_at_center,transparent_18%,black)] dark:bg-black"
        style={{ opacity: maskBgOpacity }}
      />
      <div className={cn("relative z-20 w-full", contentClassName)}>
        {children}
      </div>
    </div>
  );
}
