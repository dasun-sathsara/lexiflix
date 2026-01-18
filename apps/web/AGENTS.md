# Repository Guidelines

## Project Structure & Module Organization

- `src/app` holds Next.js 15 routes, layouts, and server components; use kebab-case folders for route segments.
- Shared UI lives in `src/components`, with design-system primitives under `src/components/ui`; centralized helpers sit in `src/lib`.
- Co-locate feature assets in `public` when they must be web-accessible; keep configuration at the root (`next.config.ts`, `tsconfig.json`, `biome.json`).
- Place tests beside the code they cover, using `.test.ts(x)` filenames or a `__tests__` directory within the relevant module.

## Build, Test, and Development Commands

- `pnpm install` — install project dependencies (Node 18.18+ required).
- `pnpm dev` — launch the Next.js dev server with HMR at http://localhost:3000.
- `pnpm build` — create the optimized production bundle used by deploys.
- `pnpm start` — run the previously built bundle for local production checks.
- `pnpm lint` — execute type-aware linting via Biome.
- `pnpm format` — apply Biome formatting to stabilize diffs.

## Coding Style & Naming Conventions

- TypeScript-first codebase; default to `.tsx` for React components and `.ts` for utilities.
- Follow two-space indentation, Tailwind CSS utility classes, and the `@/` alias for imports from `src`.
- Components/hooks use PascalCase (e.g., `SidebarMenu`, `useAuth`); helpers stay camelCase, and route folders use kebab-case.
- Let Biome handle linting/formatting—avoid manual whitespace tweaks.

## Testing Guidelines

- Prefer Vitest with React Testing Library for UI behaviour; document manual verification when automation is absent.
- Name tests `ComponentName.test.tsx` or place them in `__tests__`; keep imports relative to the unit under test.
- Ensure new code paths can be linted (`pnpm lint`) and describe manual test steps in PRs until CI harness arrives.

## Commit & Pull Request Guidelines

- Use conventional commits (`feat: add signup form`) with imperative summaries scoped to one change.
- PRs should explain the problem, summarize the solution, link relevant issues, and include UI screenshots or clips when visuals change.
- List manual verification steps and note any follow-up work; keep diffs focused to simplify review.

## Security & Configuration Tips

- Store secrets outside the repo; rely on environment variables managed by the deployment platform.
- Consult `components.json` when extending the design system, and confirm Tailwind tokens exist before adding custom CSS.
