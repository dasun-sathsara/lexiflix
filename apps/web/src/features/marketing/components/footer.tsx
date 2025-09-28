export function Footer() {
  return (
    <footer className="px-6 pb-12 pt-10 text-sm text-muted-foreground">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 rounded-3xl border border-border/60 bg-white/70 px-6 py-6 backdrop-blur-sm dark:border-border/40 dark:bg-slate-950/60 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <span className="font-medium text-foreground">
            LexiFlix © 2025 — An open-source project for global learners.
          </span>
          <p className="text-xs sm:text-sm">
            Built to turn every episode into an immersive English lesson.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          <a href="#features" className="hover:text-foreground">
            Features
          </a>
          <a href="#contact" className="hover:text-foreground">
            Contact
          </a>
          <a href="#faq" className="hover:text-foreground">
            FAQ
          </a>
          <a href="mailto:support@lexiflix.app" className="hover:text-foreground">
            support@lexiflix.app
          </a>
          <a
            href="https://github.com/lexiflix"
            target="_blank"
            rel="noreferrer"
            className="hover:text-foreground"
          >
            github.com/lexiflix
          </a>
        </div>
      </div>
    </footer>
  );
}
