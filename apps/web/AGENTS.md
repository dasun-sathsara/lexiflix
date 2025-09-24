# Repository Guidelines

## Project Structure & Module Organization
The web app is a Next.js 15 project rooted in this directory. Route files, layouts, and server components live under `src/app`, reusable primitives reside in `src/components` (with design-system pieces inside `src/components/ui`), and shared utilities belong in `src/lib`. Public assets such as fonts and images are served from `public`. Configuration for the toolchain is kept at the root (`next.config.ts`, `tsconfig.json`, `biome.json`, `postcss.config.mjs`), so update those here to keep the workspace consistent.

## Build, Test, and Development Commands
Install dependencies with `pnpm install`, then start the development server via `pnpm dev` (hot reloads on http://localhost:3000). Use `pnpm build` to produce an optimized production bundle and `pnpm start` to run that build locally. Run `pnpm lint` for type-aware linting and static checks, and `pnpm format` to apply Biome formatting. 

## Coding Style & Naming Conventions
TypeScript is the default; favor `.tsx` for React entries and `.ts` for utilities. Follow the alias `@/` for imports that map to `src`. Components and hooks should be PascalCase (`Button`, `useAuth`), helpers camelCase, and route segments kebab-case to match the file-system router. The codebase uses two-space indentation and Tailwind CSS utility classes for styling, so keep layout logic declarative and avoid inline styles when Tailwind tokens exist. Let Biome manage linting and formatting—avoid manual formatting.

## Testing Guidelines
Automated tests are not yet wired into the scripts. When adding tests, colocate them next to the feature using the `.test.ts(x)` suffix or a `__tests__` folder, and prefer React Testing Library with a Vitest runner for component coverage. Until a permanent harness lands, document manual verifications in your pull request and ensure `pnpm lint` passes as a guardrail.

## Commit & Pull Request Guidelines
Follow the conventional commit pattern already in history (`type: short summary`, e.g., `feat: add signup form`). Keep messages imperative and scoped to a single change. Pull requests should describe the problem, summarize the solution, link any tracking issue, and include screenshots or clips for UI-facing updates. 

## Environment & Tooling Notes
Use Node.js 18.18 or newer (required by Next.js 15) and pnpm 8+. Tailwind CSS 4 and the Radix-based UI system drive styling; generate new primitives with the configuration in `components.json`.
