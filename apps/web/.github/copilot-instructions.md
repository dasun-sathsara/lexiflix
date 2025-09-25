# Copilot instructions for lexiflix-web

## Project snapshot

-   Next.js 15 App Router + React 19 with TypeScript; entry layout lives in `src/app/layout.tsx` and fonts come from `next/font`.
-   Styling runs on Tailwind CSS v4; global design tokens are defined in `src/app/globals.css` with `@theme` custom properties.
-   UI primitives are shadcn-inspired components in `src/components/ui`, extended with variants via `class-variance-authority` (see `ui/button.tsx`).

## Layout & routing

-   Route folders under `src/app` are kebab-case and export server components by default. Client interactivity (`"use client"`) is isolated to leaf components such as the auth forms.
-   Marketing pages (`page.tsx`, `components/*`) compose shared sections like `MarketingNavbar`, `ShapeHero`, and `CallToActionSection`.
-   Auth flows (`/login`, `/signup`, `/forgot-password`) compose from `src/components/auth/*`; `AuthTabs` swaps `LoginForm` and `SignupForm` with Motion animations.
-   Account preferences live in `/preferences` and reuse `PreferencesForm`, which demonstrates how to split large forms across multiple cards and simulated submit handlers.

## State, data & services

-   Authentication is currently mocked via `useAuthClient` (`src/hooks/use-auth-client.ts`), which delays and logs requests. When wiring real APIs, preserve the method signatures (`signIn.email`, `signIn.social`, `signUp.email`) so existing forms still compile.
-   Toasts rely on the lightweight dispatcher in `src/components/ui/use-toast.ts`, which emits a `lexiflix:toast` window event. Keep this contract intact if you swap in a visual toasting layer.
-   Database access uses Drizzle over Neon (`src/db/index.ts`), expecting a schema module at `src/db/schema.ts` and SQL migrations in `/drizzle`. Generate types with `pnpm db:generate` once the schema file is created, then apply migrations via `pnpm db:migrate` against `DATABASE_URL`.

## Styling patterns

-   Always compose class names with the `cn` helper (`src/lib/utils.ts`) so Tailwind utilities dedupe correctly.
-   Prefer augmenting existing component variants (e.g., `buttonVariants`, `elegantButtonVariants`) instead of hard-coding classes inside pages.
-   Dark mode is handled via the `.dark` class on `<html>`; respect the CSS custom properties defined in `globals.css` instead of introducing new hard-coded colors.

## Workflows & tooling

-   Install dependencies with `pnpm install` (Node >= 18.18). Use `pnpm dev` for local development, `pnpm build`/`pnpm start` for production checks, and `pnpm lint` or `pnpm format` (Biome) before committing.
-   Database utilities live behind `pnpm db:generate`, `pnpm db:migrate`, and `pnpm db:studio`; ensure `DATABASE_URL` is set when running them.
-   Place new tests next to their targets using `*.test.ts(x)` filenames or a `__tests__` folder, following the guidance in `AGENTS.md`.

## Extension tips

-   When adding new client components, keep them tree-shakeable by exporting functions directly and colocating local hooks/utilities beside the component.
-   Reuse shared surfaces from `src/components/ui` and marketing sections to maintain visual consistency; promote generic pieces into `src/components` rather than duplicating markup under `src/app`.
-   Document any manual test steps or feature flags in PR descriptions to match existing contribution practices.
