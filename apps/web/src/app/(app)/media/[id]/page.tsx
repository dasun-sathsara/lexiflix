"use client";

import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  BookOpen,
  Brain,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Film,
  Languages,
  Loader2,
  MessageSquareText,
  Play,
  Sparkles,
  Star,
  TrendingDown,
  TrendingUp,
  Tv,
  Zap,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { AppTopbar } from "@/features/sidebar/components/app-sidebar";
import { cn } from "@/lib/utils";

// Mock data for the media detail page - simulating an API response
const MOCK_MEDIA_DATA = {
  id: 157336, // Interstellar's TMDB ID
  title: "Interstellar",
  tagline: "Mankind was born on Earth. It was never meant to die here.",
  overview:
    "The adventures of a group of explorers who make use of a newly discovered wormhole to surpass the limitations on human space travel and conquer the vast distances involved in an interstellar voyage.",
  releaseDate: "2014-11-05",
  runtime: 169,
  genres: ["Adventure", "Drama", "Science Fiction"],
  voteAverage: 8.4,
  voteCount: 35842,
  posterPath: "/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
  backdropPath: "/rAiYTfKGqDCRIIqo664sY9XZIvQ.jpg",
  mediaType: "movie" as const,
};

// Mock linguistic analysis data (final state after analysis completes)
const MOCK_ANALYSIS_COMPLETE = {
  totalWords: 4823,
  uniqueVocabulary: 847,
  extractedTerms: 42,
  idioms: 15,
  phrasalVerbs: 8,
  slang: 6,
  cefrProfile: {
    A1: 5,
    A2: 8,
    B1: 22,
    B2: 35,
    C1: 25,
    C2: 5,
  },
  averageLevel: "B2" as const,
  speechRate: 142,
  estimatedDifficulty: "upperIntermediate" as
    | "beginner"
    | "lowerIntermediate"
    | "upperIntermediate"
    | "advanced",
};

// Mock user data
const MOCK_USER = {
  currentLevel: "B1",
  targetLevel: "B2",
};

type AnalysisStatus = "pending" | "pipeline1" | "pipeline2" | "complete";
type GenerationStatus = "idle" | "queued" | "analyzing" | "generating" | "complete";

function clampToInt(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function formatRuntime(minutes: number) {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
}

function getCefrColor(level: string) {
  const letter = level[0];
  if (letter === "A") {
    return "bg-emerald-500/10 text-emerald-700 border-emerald-200/60 dark:text-emerald-200 dark:border-emerald-500/20";
  }
  if (letter === "B") {
    return "bg-amber-500/10 text-amber-800 border-amber-200/60 dark:text-amber-200 dark:border-amber-500/20";
  }
  return "bg-rose-500/10 text-rose-700 border-rose-200/60 dark:text-rose-200 dark:border-rose-500/20";
}

function getDifficultyInfo(difficulty: string, userLevel: string) {
  const levels = ["A1", "A2", "B1", "B2", "C1", "C2"];
  const difficultyMap: Record<string, string> = {
    beginner: "A2",
    lowerIntermediate: "B1",
    upperIntermediate: "B2",
    advanced: "C1",
  };

  const contentLevel = difficultyMap[difficulty];
  const userIndex = levels.indexOf(userLevel);
  const contentIndex = levels.indexOf(contentLevel);
  const diff = contentIndex - userIndex;

  if (diff <= 0) {
    return {
      label: "Within your comfort zone",
      icon: TrendingDown,
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-500/10",
      borderColor: "border-emerald-200/60 dark:border-emerald-500/20",
      description:
        "This content aligns with or is below your current level. Great for building confidence!",
    };
  }
  if (diff === 1) {
    return {
      label: "Optimal challenge",
      icon: Zap,
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-500/10",
      borderColor: "border-amber-200/60 dark:border-amber-500/20",
      description: "Perfect for learning! Challenging enough to grow, but not overwhelming.",
    };
  }
  return {
    label: "Above your level",
    icon: TrendingUp,
    color: "text-rose-600 dark:text-rose-400",
    bgColor: "bg-rose-500/10",
    borderColor: "border-rose-200/60 dark:border-rose-500/20",
    description:
      "This content is quite advanced. Consider pre-learning vocabulary before watching.",
  };
}

// Animated number component for counting up
function AnimatedNumber({ value, duration = 1000 }: { value: number; duration?: number }) {
  const [displayValue, setDisplayValue] = React.useState(0);

  React.useEffect(() => {
    const startTime = performance.now();
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Easing function for smooth deceleration
      const eased = 1 - (1 - progress) ** 3;
      setDisplayValue(Math.round(value * eased));
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }, [value, duration]);

  return <>{displayValue.toLocaleString()}</>;
}

// CEFR Distribution Chart with animation support
function CefrDistributionChart({
  profile,
  isLoading,
  isAnimating,
}: {
  profile: typeof MOCK_ANALYSIS_COMPLETE.cefrProfile;
  isLoading?: boolean;
  isAnimating?: boolean;
}) {
  const total = Object.values(profile).reduce((a, b) => a + b, 0);
  const levels = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    if (isAnimating) {
      const timer = setTimeout(() => setMounted(true), 100);
      return () => clearTimeout(timer);
    }
    setMounted(!isLoading);
  }, [isAnimating, isLoading]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {levels.map((level) => (
          <div key={level} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-10" />
              <Skeleton className="h-4 w-8" />
            </div>
            <Skeleton className="h-2 w-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {levels.map((level, idx) => {
        const pct = clampToInt((profile[level] / total) * 100);
        const barColor =
          level[0] === "A" ? "bg-emerald-500" : level[0] === "B" ? "bg-amber-500" : "bg-rose-500";

        return (
          <div
            key={level}
            className={cn(
              "space-y-1.5 transition-all duration-500",
              mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2",
            )}
            style={{ transitionDelay: `${idx * 80}ms` }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge className={"border text-xs " + getCefrColor(level)}>{level}</Badge>
              </div>
              <span className="text-sm font-medium tabular-nums">{pct}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-all ease-out",
                  barColor,
                  mounted ? "duration-1000" : "duration-0",
                )}
                style={{
                  width: mounted ? `${pct}%` : "0%",
                  transitionDelay: `${idx * 80 + 200}ms`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Pipeline status indicator
function PipelineStep({
  title,
  description,
  status,
  progress,
  icon: Icon,
}: {
  title: string;
  description: string;
  status: "pending" | "running" | "complete";
  progress?: number;
  icon: React.ElementType;
}) {
  return (
    <div className={cn("relative flex gap-4 pb-6 last:pb-0", status === "pending" && "opacity-50")}>
      {/* Connecting line */}
      <div className="absolute left-[19px] top-10 h-[calc(100%-32px)] w-0.5 bg-border last:hidden" />

      {/* Step indicator */}
      <div
        className={cn(
          "relative z-10 grid size-10 shrink-0 place-items-center rounded-xl border-2 transition-all duration-500",
          status === "complete"
            ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            : status === "running"
              ? "border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
              : "border-muted bg-muted text-muted-foreground",
        )}
      >
        {status === "complete" ? (
          <CheckCircle2 className="size-5 animate-in zoom-in duration-300" />
        ) : status === "running" ? (
          <Loader2 className="size-5 animate-spin" />
        ) : (
          <Icon className="size-5" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 space-y-2 pt-1">
        <div className="flex items-center gap-2">
          <h4 className="font-medium">{title}</h4>
          {status === "complete" && (
            <Badge
              variant="secondary"
              className="border border-emerald-200/60 bg-emerald-500/10 text-emerald-700 dark:border-emerald-500/20 dark:text-emerald-300 animate-in fade-in slide-in-from-left-2 duration-300"
            >
              Complete
            </Badge>
          )}
          {status === "running" && (
            <Badge
              variant="secondary"
              className="border border-indigo-200/60 bg-indigo-500/10 text-indigo-700 dark:border-indigo-500/20 dark:text-indigo-300"
            >
              Processing
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
        {status === "running" && progress !== undefined && (
          <div className="space-y-1 pt-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{progress}%</span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>
        )}
      </div>
    </div>
  );
}

// Analysis Status Card with pipeline visualization
function AnalysisStatusCard({
  analysisStatus,
  pipeline1Progress,
  pipeline2Progress,
  onStartGeneration,
  generationStatus,
  generationProgress,
  analysisData,
  mediaId,
}: {
  analysisStatus: AnalysisStatus;
  pipeline1Progress: number;
  pipeline2Progress: number;
  onStartGeneration: () => void;
  generationStatus: GenerationStatus;
  generationProgress: number;
  analysisData: typeof MOCK_ANALYSIS_COMPLETE | null;
  mediaId: string;
}) {
  const isGenerating = generationStatus === "analyzing" || generationStatus === "generating";
  const isComplete = generationStatus === "complete";
  const analysisComplete = analysisStatus === "complete";

  const pipeline1Status =
    analysisStatus === "pending"
      ? "pending"
      : analysisStatus === "pipeline1"
        ? "running"
        : "complete";

  const pipeline2Status =
    analysisStatus === "pending" || analysisStatus === "pipeline1"
      ? "pending"
      : analysisStatus === "pipeline2"
        ? "running"
        : "complete";

  return (
    <Card className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-purple-500/5" />
      <CardHeader>
        <div className="flex items-center gap-2">
          {analysisComplete ? (
            <div className="grid size-8 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 animate-in zoom-in duration-300">
              <CheckCircle2 className="size-4" />
            </div>
          ) : (
            <div className="grid size-8 place-items-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Loader2 className="size-4 animate-spin" />
            </div>
          )}
          <div>
            <CardTitle className="text-base">Subtitle Analysis</CardTitle>
            <CardDescription>
              {analysisComplete
                ? "Analysis complete"
                : analysisStatus === "pipeline1"
                  ? "Extracting vocabulary..."
                  : analysisStatus === "pipeline2"
                    ? "Extracting phrases & idioms..."
                    : "Preparing analysis..."}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Pipeline visualization */}
        {!analysisComplete && (
          <div className="rounded-xl border bg-card/60 p-4">
            <PipelineStep
              title="Vocabulary Extraction"
              description="Analyzing subtitles to extract unique words and their CEFR levels"
              status={pipeline1Status}
              progress={pipeline1Status === "running" ? pipeline1Progress : undefined}
              icon={Languages}
            />
            <PipelineStep
              title="Phrase Analysis"
              description="Identifying phrasal verbs, idioms, and colloquial expressions"
              status={pipeline2Status}
              progress={pipeline2Status === "running" ? pipeline2Progress : undefined}
              icon={MessageSquareText}
            />
          </div>
        )}

        {/* Results after analysis */}
        {analysisComplete && analysisData && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border bg-card/60 p-3 transition-all duration-500 animate-in fade-in slide-in-from-bottom-2">
                <div className="text-2xl font-semibold text-foreground">
                  <AnimatedNumber value={analysisData.extractedTerms} duration={800} />
                </div>
                <div className="text-xs text-muted-foreground">Terms extracted</div>
              </div>
              <div
                className="rounded-xl border bg-card/60 p-3 transition-all duration-500 animate-in fade-in slide-in-from-bottom-2"
                style={{ animationDelay: "100ms" }}
              >
                <div className="text-2xl font-semibold text-foreground">
                  <AnimatedNumber
                    value={analysisData.idioms + analysisData.phrasalVerbs + analysisData.slang}
                    duration={800}
                  />
                </div>
                <div className="text-xs text-muted-foreground">Idioms & phrases</div>
              </div>
            </div>

            {generationStatus === "idle" && (
              <Button
                className="w-full gap-2 animate-in fade-in slide-in-from-bottom-2 duration-500"
                size="lg"
                onClick={onStartGeneration}
                style={{ animationDelay: "200ms" }}
              >
                <Sparkles className="size-4" />
                Start Generation
              </Button>
            )}

            {isGenerating && (
              <div className="space-y-3 animate-in fade-in duration-300">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {generationStatus === "analyzing"
                      ? "Analyzing content..."
                      : "Generating flashcards..."}
                  </span>
                  <span className="font-medium">{generationProgress}%</span>
                </div>
                <Progress value={generationProgress} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  This content has been added to your library. You can leave this page and check
                  progress later.
                </p>
              </div>
            )}

            {isComplete && (
              <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="flex items-center gap-2 rounded-xl border border-emerald-200/60 bg-emerald-500/10 p-3 dark:border-emerald-500/20">
                  <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <div className="font-medium text-emerald-700 dark:text-emerald-300">
                      Generation complete!
                    </div>
                    <div className="text-xs text-emerald-600/80 dark:text-emerald-400/80">
                      Your flashcards are ready to study
                    </div>
                  </div>
                </div>
                <Button className="w-full gap-2" size="lg" asChild>
                  <Link href={`/pack/${mediaId}`}>
                    <Play className="size-4" />
                    Start Learning
                  </Link>
                </Button>
              </div>
            )}
          </>
        )}

        {analysisStatus === "pending" && (
          <div className="flex items-center gap-2 rounded-xl border border-amber-200/60 bg-amber-500/10 p-3 dark:border-amber-500/20">
            <AlertCircle className="size-5 text-amber-600 dark:text-amber-400" />
            <div className="text-sm text-amber-700 dark:text-amber-300">
              Preparing to analyze subtitle file...
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Stats card with loading state
function StatsGrid({
  data,
  isLoading,
  isAnimating,
}: {
  data: typeof MOCK_ANALYSIS_COMPLETE;
  isLoading: boolean;
  isAnimating: boolean;
}) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    if (isAnimating && !isLoading) {
      const timer = setTimeout(() => setMounted(true), 100);
      return () => clearTimeout(timer);
    }
    setMounted(!isLoading);
  }, [isAnimating, isLoading]);

  const stats = [
    { label: "Total words", value: data.totalWords },
    { label: "Unique vocab", value: data.uniqueVocabulary },
    { label: "Words/min", value: data.speechRate },
    { label: "Phrasal verbs", value: data.phrasalVerbs },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border bg-card/60 p-3 text-center">
            <Skeleton className="mx-auto h-7 w-12" />
            <Skeleton className="mx-auto mt-1 h-3 w-16" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map((stat, idx) => (
        <div
          key={stat.label}
          className={cn(
            "rounded-xl border bg-card/60 p-3 text-center transition-all duration-500",
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2",
          )}
          style={{ transitionDelay: `${idx * 100}ms` }}
        >
          <div className="text-xl font-semibold">
            {mounted ? <AnimatedNumber value={stat.value} duration={1000} /> : 0}
          </div>
          <div className="text-xs text-muted-foreground">{stat.label}</div>
        </div>
      ))}
    </div>
  );
}

export default function MediaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);

  const media = MOCK_MEDIA_DATA;
  const user = MOCK_USER;

  // Analysis state
  const [analysisStatus, setAnalysisStatus] = React.useState<AnalysisStatus>("pending");
  const [pipeline1Progress, setPipeline1Progress] = React.useState(0);
  const [pipeline2Progress, setPipeline2Progress] = React.useState(0);
  const [analysisData, setAnalysisData] = React.useState<typeof MOCK_ANALYSIS_COMPLETE | null>(
    null,
  );

  // Generation state
  const [generationStatus, setGenerationStatus] = React.useState<GenerationStatus>("idle");
  const [generationProgress, setGenerationProgress] = React.useState(0);

  // Simulate analysis on mount
  React.useEffect(() => {
    // Start Pipeline 1 after a short delay
    const startDelay = setTimeout(() => {
      setAnalysisStatus("pipeline1");

      // Simulate Pipeline 1 progress
      let p1Progress = 0;
      const p1Interval = setInterval(() => {
        p1Progress += Math.random() * 12 + 3;
        if (p1Progress >= 100) {
          p1Progress = 100;
          setPipeline1Progress(100);
          clearInterval(p1Interval);

          // Start Pipeline 2 after Pipeline 1 completes
          setTimeout(() => {
            setAnalysisStatus("pipeline2");

            let p2Progress = 0;
            const p2Interval = setInterval(() => {
              p2Progress += Math.random() * 15 + 5;
              if (p2Progress >= 100) {
                p2Progress = 100;
                setPipeline2Progress(100);
                clearInterval(p2Interval);

                // Complete analysis
                setTimeout(() => {
                  setAnalysisStatus("complete");
                  setAnalysisData(MOCK_ANALYSIS_COMPLETE);
                }, 500);
              } else {
                setPipeline2Progress(Math.round(p2Progress));
              }
            }, 300);
          }, 400);
        } else {
          setPipeline1Progress(Math.round(p1Progress));
        }
      }, 350);
    }, 800);

    return () => clearTimeout(startDelay);
  }, []);

  const analysisComplete = analysisStatus === "complete";
  const difficultyInfo = analysisData
    ? getDifficultyInfo(analysisData.estimatedDifficulty, user.currentLevel)
    : null;

  const posterUrl = media.posterPath ? `https://image.tmdb.org/t/p/w500${media.posterPath}` : null;
  const backdropUrl = media.backdropPath
    ? `https://image.tmdb.org/t/p/original${media.backdropPath}`
    : null;

  function handleStartGeneration() {
    setGenerationStatus("queued");
    setGenerationProgress(0);

    setTimeout(() => {
      setGenerationStatus("analyzing");
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress >= 40) {
          setGenerationStatus("generating");
        }
        if (progress >= 100) {
          progress = 100;
          setGenerationProgress(100);
          clearInterval(interval);
          setTimeout(() => {
            setGenerationStatus("complete");
          }, 500);
        } else {
          setGenerationProgress(Math.round(progress));
        }
      }, 400);
    }, 800);
  }

  return (
    <>
      <AppTopbar title="Media" />

      <div className="relative mx-auto w-full max-w-6xl">
        {/* Hero backdrop section */}
        <div className="relative h-[320px] w-full overflow-hidden sm:h-[400px]">
          {backdropUrl && (
            <>
              <Image
                src={backdropUrl}
                alt={`${media.title} backdrop`}
                fill
                priority
                sizes="100vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/20" />
              <div className="absolute inset-0 bg-gradient-to-r from-background/60 via-transparent to-transparent" />
            </>
          )}

          {/* Back button */}
          <div className="absolute left-4 top-4 z-10 sm:left-6 sm:top-6">
            <Button
              variant="secondary"
              size="sm"
              className="gap-2 bg-background/80 backdrop-blur-sm hover:bg-background/90"
              asChild
            >
              <Link href="/browse">
                <ArrowLeft className="size-4" />
                Back to Browse
              </Link>
            </Button>
          </div>
        </div>

        {/* Content section */}
        <div className="relative -mt-32 space-y-6 px-4 pb-8 sm:-mt-40 sm:px-6">
          {/* Header with poster and title */}
          <div className="flex flex-col gap-6 sm:flex-row">
            {/* Poster */}
            <div className="relative mx-auto h-[240px] w-[160px] shrink-0 overflow-hidden rounded-xl border-2 border-white/20 shadow-2xl sm:mx-0 sm:h-[280px] sm:w-[187px]">
              {posterUrl ? (
                <Image
                  src={posterUrl}
                  alt={media.title}
                  fill
                  priority
                  sizes="187px"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-muted p-4 text-center text-muted-foreground">
                  {media.title}
                </div>
              )}
            </div>

            {/* Title and meta */}
            <div className="flex-1 space-y-4 text-center sm:pt-20 sm:text-left">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                  <Badge
                    variant="secondary"
                    className="border border-indigo-200/60 bg-white/60 text-indigo-700 backdrop-blur-sm dark:border-indigo-500/20 dark:bg-indigo-950/30 dark:text-indigo-200"
                  >
                    {media.mediaType === "movie" ? (
                      <Film className="mr-1 size-3.5" />
                    ) : (
                      <Tv className="mr-1 size-3.5" />
                    )}
                    {media.mediaType === "movie" ? "Movie" : "TV Series"}
                  </Badge>
                  {analysisData ? (
                    <Badge
                      className={cn(
                        "border transition-all duration-500 animate-in fade-in",
                        getCefrColor(analysisData.averageLevel),
                      )}
                    >
                      {analysisData.averageLevel} — Upper Intermediate
                    </Badge>
                  ) : (
                    <Skeleton className="h-5 w-32" />
                  )}
                </div>

                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{media.title}</h1>

                {media.tagline && (
                  <p className="text-sm italic text-muted-foreground">{media.tagline}</p>
                )}

                <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground sm:justify-start">
                  <span className="flex items-center gap-1">
                    <Calendar className="size-4" />
                    {new Date(media.releaseDate).getFullYear()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="size-4" />
                    {formatRuntime(media.runtime)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Star className="size-4 fill-yellow-400 text-yellow-400" />
                    {media.voteAverage.toFixed(1)}
                    <span className="text-xs">({media.voteCount.toLocaleString()} votes)</span>
                  </span>
                </div>

                <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
                  {media.genres.map((genre) => (
                    <Badge
                      key={genre}
                      variant="secondary"
                      className="border border-muted-foreground/20 bg-muted/50"
                    >
                      {genre}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Main content grid */}
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            {/* Left column */}
            <div className="space-y-6">
              {/* Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="size-5 text-muted-foreground" />
                    Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="leading-relaxed text-muted-foreground">{media.overview}</p>
                </CardContent>
              </Card>

              {/* Difficulty Recommendation */}
              {difficultyInfo ? (
                <Card
                  className={cn(
                    "relative overflow-hidden border transition-all duration-500 animate-in fade-in slide-in-from-bottom-2",
                    difficultyInfo.borderColor,
                  )}
                >
                  <div
                    className={cn("pointer-events-none absolute inset-0", difficultyInfo.bgColor)}
                  />
                  <CardContent className="relative flex items-start gap-4 p-6">
                    <div
                      className={cn(
                        "grid size-12 shrink-0 place-items-center rounded-xl",
                        difficultyInfo.bgColor,
                        difficultyInfo.color,
                      )}
                    >
                      <difficultyInfo.icon className="size-6" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className={cn("font-semibold", difficultyInfo.color)}>
                          {difficultyInfo.label}
                        </h3>
                      </div>
                      <p className="text-sm text-muted-foreground">{difficultyInfo.description}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Your level:{" "}
                        <Badge variant="outline" className="ml-1">
                          {user.currentLevel}
                        </Badge>
                        <span className="mx-2">→</span>
                        Content level:{" "}
                        <Badge
                          className={cn("ml-1 border", getCefrColor(analysisData!.averageLevel))}
                        >
                          {analysisData!.averageLevel}
                        </Badge>
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="relative overflow-hidden border">
                  <CardContent className="flex items-start gap-4 p-6">
                    <Skeleton className="size-12 shrink-0 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-40" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Linguistic Profile */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="size-5 text-muted-foreground" />
                    Linguistic Profile
                  </CardTitle>
                  <CardDescription>
                    CEFR vocabulary distribution based on subtitle analysis
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <CefrDistributionChart
                    profile={analysisData?.cefrProfile ?? MOCK_ANALYSIS_COMPLETE.cefrProfile}
                    isLoading={!analysisComplete}
                    isAnimating={analysisComplete}
                  />

                  <StatsGrid
                    data={analysisData ?? MOCK_ANALYSIS_COMPLETE}
                    isLoading={!analysisComplete}
                    isAnimating={analysisComplete}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Right column - Sticky sidebar */}
            <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
              {/* Analysis Status & Generation */}
              <AnalysisStatusCard
                analysisStatus={analysisStatus}
                pipeline1Progress={pipeline1Progress}
                pipeline2Progress={pipeline2Progress}
                onStartGeneration={handleStartGeneration}
                generationStatus={generationStatus}
                generationProgress={generationProgress}
                analysisData={analysisData}
                mediaId={id}
              />

              {/* Quick tips */}
              <Card className="border-indigo-200/60 bg-gradient-to-br from-indigo-500/5 via-transparent to-purple-500/5 dark:border-indigo-500/20">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="grid size-8 shrink-0 place-items-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                      <Sparkles className="size-4" />
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm font-medium">Pro tip</div>
                      <p className="text-xs text-muted-foreground">
                        Pre-learn vocabulary before watching to maximize comprehension. Studies show
                        you need 95% word coverage for comfortable viewing.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </aside>
          </div>
        </div>
      </div>
    </>
  );
}
