# GEMINI.md

## Project Overview

This is a Next.js web application for LexiFlix, a service that helps users learn English vocabulary from movies and TV shows. The application is built with React, TypeScript, and Tailwind CSS. It uses Radix UI for accessible components and Biome for linting and formatting.

The main purpose of this web application is to serve as a marketing and landing page for LexiFlix, explaining its features and encouraging users to sign up.

## Building and Running

To build and run this project, use the following commands:

-   **Installation:**

    ```bash
    pnpm install
    ```

-   **Development:**

    ```bash
    pnpm run dev
    ```

    This will start the development server at `http://localhost:3000`.

-   **Building for Production:**

    ```bash
    pnpm run build
    ```

    This will create a production-ready build in the `.next` directory.

-   **Running in Production:**

    ```bash
    pnpm run start
    ```

    This will start the production server.

-   **Linting and Formatting:**
    ```bash
    pnpm run lint
    pnpm run format
    ```

## Development Conventions

-   **Styling:** The project uses Tailwind CSS for styling. Utility classes are combined using the `cn` function in `src/lib/utils.ts`.
-   **Components:** Reusable components are located in the `src/components` directory. UI components built with Radix UI are in `src/components/ui`.
-   **Linting:** The project uses Biome for linting and formatting. Please run `pnpm run lint` and `pnpm run format` before committing any changes.
-   **Fonts:** The project uses `next/font` to load the Inter, Geist, and Ubuntu Mono fonts.
