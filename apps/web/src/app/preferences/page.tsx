import { PreferencesForm } from "@/components/preferences/preferences-form";
import { Badge } from "@/components/ui/badge";

export default function PreferencesPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-14 px-6 py-24">
      <header className="space-y-6 text-center sm:text-left">
        <div className="flex flex-wrap items-center justify-center gap-3 text-sm sm:justify-start">
          <Badge
            variant="secondary"
            className="bg-white/70 backdrop-blur dark:bg-slate-950/60"
          >
            LexiFlix Labs
          </Badge>
          <span className="text-sm font-medium uppercase tracking-[0.3em] text-indigo-500">
            Preferences
          </span>
        </div>
        <div className="space-y-4">
          <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Shape your LexiFlix experience
          </h1>
          <p className="mx-auto max-w-2xl text-base text-muted-foreground sm:mx-0">
            Update account details, pick the languages you are focused on, and
            fine-tune the nudges that keep you on track before the backend
            wiring arrives.
          </p>
        </div>
      </header>
      <PreferencesForm />
    </main>
  );
}
