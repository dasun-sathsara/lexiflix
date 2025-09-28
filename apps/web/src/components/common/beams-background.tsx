"use client";

import { motion } from "motion/react";
import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

interface BeamsBackgroundProps {
  className?: string;
  children?: React.ReactNode;
  intensity?: "subtle" | "medium" | "strong";
}

interface Beam {
  x: number;
  y: number;
  width: number;
  length: number;
  angle: number;
  speed: number;
  opacity: number;
  hue: number;
  pulse: number;
  pulseSpeed: number;
}

const OPACITY_MULTIPLIER: Record<Required<BeamsBackgroundProps>["intensity"], number> = {
  subtle: 0.6,
  medium: 0.85,
  strong: 1,
};

function createBeam(width: number, height: number, isDarkMode: boolean): Beam {
  const baseHue = isDarkMode ? 200 : 210;
  const hueRange = isDarkMode ? 60 : 40;

  return {
    x: Math.random() * width,
    y: Math.random() * height,
    width: 60 + Math.random() * 80,
    length: height * 1.8,
    angle: -40 + Math.random() * 8,
    speed: 0.4 + Math.random() * 0.4,
    opacity: 0.12 + Math.random() * 0.12,
    hue: baseHue + Math.random() * hueRange,
    pulse: Math.random() * Math.PI * 2,
    pulseSpeed: 0.015 + Math.random() * 0.02,
  };
}

export function BeamsBackground({
  className,
  children,
  intensity = "subtle",
}: BeamsBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const beamsRef = useRef<Beam[]>([]);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const isDarkModeRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const updateDarkMode = () => {
      isDarkModeRef.current = document.documentElement.classList.contains("dark");
    };

    const observer = new MutationObserver(updateDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    updateDarkMode();

    const handleResize = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = window.innerWidth;
      const height = window.innerHeight;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      context.setTransform(1, 0, 0, 1, 0, 0);
      context.scale(dpr, dpr);

      const totalBeams = Math.max(14, Math.round((width * height) / 50000));
      beamsRef.current = Array.from({ length: totalBeams }, () =>
        createBeam(width, height, isDarkModeRef.current),
      );
    };

    const resetBeam = (beam: Beam, index: number, total: number) => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const baseHue = isDarkModeRef.current ? 200 : 210;
      const hueRange = isDarkModeRef.current ? 60 : 40;

      beam.x = (index / total) * width + width * 0.05 * (Math.random() - 0.5);
      beam.y = height + 120;
      beam.width = 80 + Math.random() * 90;
      beam.length = height * 1.9;
      beam.speed = 0.35 + Math.random() * 0.35;
      beam.hue = baseHue + (index / total) * hueRange;
      beam.opacity = 0.14 + Math.random() * 0.08;
      beam.pulse = Math.random() * Math.PI * 2;
      return beam;
    };

    const drawBeam = (ctx: CanvasRenderingContext2D, beam: Beam) => {
      ctx.save();
      ctx.translate(beam.x, beam.y);
      ctx.rotate((beam.angle * Math.PI) / 180);

      const pulsingOpacity =
        beam.opacity * (0.85 + Math.sin(beam.pulse) * 0.15) * OPACITY_MULTIPLIER[intensity];
      const saturation = isDarkModeRef.current ? "80%" : "70%";
      const lightness = isDarkModeRef.current ? "62%" : "48%";

      const gradient = ctx.createLinearGradient(0, 0, 0, beam.length);
      gradient.addColorStop(0, `hsla(${beam.hue}, ${saturation}, ${lightness}, 0)`);
      gradient.addColorStop(
        0.12,
        `hsla(${beam.hue}, ${saturation}, ${lightness}, ${pulsingOpacity * 0.5})`,
      );
      gradient.addColorStop(
        0.4,
        `hsla(${beam.hue}, ${saturation}, ${lightness}, ${pulsingOpacity})`,
      );
      gradient.addColorStop(
        0.7,
        `hsla(${beam.hue}, ${saturation}, ${lightness}, ${pulsingOpacity})`,
      );
      gradient.addColorStop(
        0.9,
        `hsla(${beam.hue}, ${saturation}, ${lightness}, ${pulsingOpacity * 0.4})`,
      );
      gradient.addColorStop(1, `hsla(${beam.hue}, ${saturation}, ${lightness}, 0)`);

      ctx.fillStyle = gradient;
      ctx.fillRect(-beam.width / 2, 0, beam.width, beam.length);
      ctx.restore();
    };

    const animate = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      context.clearRect(0, 0, width, height);
      context.filter = "blur(28px)";

      beamsRef.current.forEach((beam, index) => {
        beam.y -= beam.speed;
        beam.pulse += beam.pulseSpeed;

        if (beam.y + beam.length < -200) {
          resetBeam(beam, index, beamsRef.current.length);
        }

        drawBeam(context, beam);
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    animate();

    return () => {
      window.removeEventListener("resize", handleResize);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      observer.disconnect();
    };
  }, [intensity]);

  return (
    <div
      className={cn(
        "relative min-h-screen w-full overflow-hidden bg-neutral-100 dark:bg-neutral-950",
        className,
      )}
    >
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0" />
      <motion.div
        className="pointer-events-none absolute inset-0 bg-neutral-900/5 dark:bg-neutral-50/5"
        animate={{ opacity: [0.08, 0.16, 0.08] }}
        transition={{
          duration: 12,
          ease: "easeInOut",
          repeat: Number.POSITIVE_INFINITY,
        }}
        style={{ backdropFilter: "blur(50px)" }}
      />
      <div className="relative z-[1] flex min-h-screen flex-col">{children}</div>
    </div>
  );
}
