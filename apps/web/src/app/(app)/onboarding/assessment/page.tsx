"use client";

import { Briefcase, Check, ChevronRight, Film, GraduationCap, Plane, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const TOTAL_STEPS = 2;

const GOALS = [
  {
    id: "travel",
    label: "For Travel",
    description: "Navigate new places confidently",
    icon: Plane,
    gradient: "from-sky-500/20 to-cyan-500/20",
    border: "border-sky-200/60 dark:border-sky-500/30",
  },
  {
    id: "work",
    label: "For Work",
    description: "Excel in professional settings",
    icon: Briefcase,
    gradient: "from-amber-500/20 to-orange-500/20",
    border: "border-amber-200/60 dark:border-amber-500/30",
  },
  {
    id: "movies",
    label: "To Enjoy Movies",
    description: "Watch without subtitles",
    icon: Film,
    gradient: "from-purple-500/20 to-pink-500/20",
    border: "border-purple-200/60 dark:border-purple-500/30",
  },
  {
    id: "academic",
    label: "Academic Success",
    description: "Prepare for exams & studies",
    icon: GraduationCap,
    gradient: "from-emerald-500/20 to-teal-500/20",
    border: "border-emerald-200/60 dark:border-emerald-500/30",
  },
] as const;

const WORDS = [
  { id: 1, word: "Ephemeral", difficulty: "hard" },
  { id: 2, word: "Ubiquitous", difficulty: "hard" },
  { id: 3, word: "Table", difficulty: "easy" },
  { id: 4, word: "Run", difficulty: "easy" },
  { id: 5, word: "Serendipity", difficulty: "hard" },
  { id: 6, word: "Eloquent", difficulty: "medium" },
  { id: 7, word: "Happy", difficulty: "easy" },
  { id: 8, word: "Pragmatic", difficulty: "medium" },
  { id: 9, word: "Water", difficulty: "easy" },
  { id: 10, word: "Cacophony", difficulty: "hard" },
] as const;

function ProgressStepper({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-2">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className={cn(
                "grid size-8 place-items-center rounded-full border-2 text-sm font-semibold transition-all duration-300",
                i + 1 < currentStep
                  ? "border-primary bg-primary text-primary-foreground"
                  : i + 1 === currentStep
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-muted bg-muted/50 text-muted-foreground",
              )}
            >
              {i + 1 < currentStep ? <Check className="size-4" /> : i + 1}
            </div>
            {i < TOTAL_STEPS - 1 && (
              <div
                className={cn(
                  "h-0.5 w-8 rounded-full transition-all duration-300",
                  i + 1 < currentStep ? "bg-primary" : "bg-muted",
                )}
              />
            )}
          </div>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        Step {currentStep} of {TOTAL_STEPS}
      </p>
    </div>
  );
}

function GoalsStep({
  selectedGoals,
  onToggle,
}: {
  selectedGoals: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold tracking-tight">Why are you learning?</h2>
        <p className="mt-2 text-muted-foreground">
          Select all that apply—we'll personalize your experience.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {GOALS.map((goal) => {
          const isSelected = selectedGoals.has(goal.id);
          const Icon = goal.icon;
          return (
            <button
              key={goal.id}
              type="button"
              onClick={() => onToggle(goal.id)}
              className={cn(
                "group relative overflow-hidden rounded-2xl border-2 p-5 text-left transition-all duration-200",
                isSelected
                  ? `${goal.border} bg-gradient-to-br ${goal.gradient} ring-2 ring-primary/30`
                  : "border-muted hover:border-muted-foreground/30 hover:bg-muted/50",
              )}
            >
              <div className="flex items-start gap-4">
                <div
                  className={cn(
                    "grid size-12 shrink-0 place-items-center rounded-xl transition-colors",
                    isSelected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                  )}
                >
                  <Icon className="size-6" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{goal.label}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{goal.description}</p>
                </div>
                <div
                  className={cn(
                    "grid size-6 shrink-0 place-items-center rounded-full border-2 transition-all",
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted",
                  )}
                >
                  {isSelected && <Check className="size-3.5" />}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function QuickCheckStep({
  knownWords,
  onToggle,
}: {
  knownWords: Set<number>;
  onToggle: (id: number) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold tracking-tight">Quick vocabulary check</h2>
        <p className="mt-2 text-muted-foreground">Check the words you already know.</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {WORDS.map((item) => {
          const isKnown = knownWords.has(item.id);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onToggle(item.id)}
              className={cn(
                "relative flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl border-2 p-3 text-center transition-all duration-200",
                isKnown
                  ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/30"
                  : "border-muted hover:border-muted-foreground/30 hover:bg-muted/30",
              )}
            >
              {isKnown && (
                <div className="absolute right-2 top-2">
                  <div className="grid size-5 place-items-center rounded-full bg-primary text-primary-foreground">
                    <Check className="size-3" />
                  </div>
                </div>
              )}
              <span className="text-sm font-semibold">{item.word}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CalculatingState() {
  return (
    <div className="flex flex-col items-center gap-6 py-12">
      <div className="relative">
        <div className="size-20 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
        <div className="absolute inset-0 grid place-items-center">
          <Sparkles className="size-8 text-primary animate-pulse" />
        </div>
      </div>
      <div className="space-y-4 text-center">
        <h2 className="text-2xl font-semibold tracking-tight">Analyzing your responses...</h2>
        <p className="text-muted-foreground">We're calibrating your personalized learning path.</p>
      </div>
      <div className="w-full max-w-sm space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  );
}

function ResultState() {
  return (
    <div className="flex flex-col items-center gap-8 py-8">
      <div className="relative">
        <div className="absolute -inset-4 animate-pulse rounded-full bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 blur-xl" />
        <div className="relative grid size-28 place-items-center rounded-full border-4 border-primary bg-gradient-to-br from-indigo-500/10 to-purple-500/10">
          <span className="text-4xl font-bold text-primary">B2</span>
        </div>
      </div>
      <div className="space-y-3 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
          <Sparkles className="size-4" />
          Assessment Complete
        </div>
        <h2 className="text-3xl font-semibold tracking-tight">Your Level: B2</h2>
        <p className="text-lg text-muted-foreground">Upper Intermediate</p>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">
          You have a solid foundation and can handle most everyday situations. Your personalized
          learning path will focus on advancing your vocabulary and fluency.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button asChild size="lg" className="gap-2">
          <Link href="/dashboard">
            Go to Dashboard
            <ChevronRight className="size-4" />
          </Link>
        </Button>
        <Button variant="outline" size="lg" asChild>
          <Link href="/browse">Explore Content</Link>
        </Button>
      </div>
    </div>
  );
}

export default function AssessmentPage() {
  const [step, setStep] = useState(1);
  const [selectedGoals, setSelectedGoals] = useState<Set<string>>(new Set());
  const [knownWords, setKnownWords] = useState<Set<number>>(new Set());
  const [isCalculating, setIsCalculating] = useState(false);
  const [showResult, setShowResult] = useState(false);

  const toggleGoal = (id: string) => {
    setSelectedGoals((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleWord = (id: number) => {
    setKnownWords((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleNext = () => {
    if (step < TOTAL_STEPS) {
      setStep(step + 1);
    } else {
      setIsCalculating(true);
      setTimeout(() => {
        setIsCalculating(false);
        setShowResult(true);
      }, 2000);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const canProceed = (step === 1 && selectedGoals.size > 0) || step === 2;

  const progressValue = showResult
    ? 100
    : isCalculating
      ? 95
      : ((step - 1) / TOTAL_STEPS) * 100 + (canProceed ? 100 / TOTAL_STEPS / 2 : 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 py-8">
        <div className="mb-8 space-y-4">
          <Progress value={progressValue} className="h-2" />
          {!isCalculating && !showResult && <ProgressStepper currentStep={step} />}
        </div>

        <Card className="flex-1 border-2">
          <CardContent className="p-6 sm:p-8">
            <AnimatePresence mode="wait">
              {showResult ? (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <ResultState />
                </motion.div>
              ) : isCalculating ? (
                <motion.div
                  key="calculating"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <CalculatingState />
                </motion.div>
              ) : (
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                >
                  {step === 1 && <GoalsStep selectedGoals={selectedGoals} onToggle={toggleGoal} />}
                  {step === 2 && <QuickCheckStep knownWords={knownWords} onToggle={toggleWord} />}
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>

        {!isCalculating && !showResult && (
          <div className="mt-6 flex items-center justify-between">
            <Button variant="ghost" onClick={handleBack} disabled={step === 1}>
              Back
            </Button>
            <Button onClick={handleNext} disabled={!canProceed} className="gap-2">
              {step === TOTAL_STEPS ? "Complete Assessment" : "Continue"}
              <ChevronRight className="size-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
