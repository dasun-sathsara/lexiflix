# Prompt

You are tasked with implementing three key user-facing pages for the **LexiFlix** application: **Login**, **Signup**, and **User Preferences**.

### Context

-   The app is a **Next.js 15 + TailwindCSS + shadcn/ui** web application.
-   Authentication is handled using **better-auth** (refer to provided docs/examples).
-   The project architecture relies on **Next.js as the only HTTP surface**, with Postgres as the source of truth for users and preferences.
-   User identity and preferences are stored in the **`users`** and **`user_prefs`** tables (email, display_name, username, password, CEFR level, study_lang, UI lang, notifications, etc.).
-   Major use cases include **Sign Up / Sign In** and **Manage Profile & Preferences**.
-   Design must match the **modern, elegant aesthetic** of the existing codebase (consistent with components like `Card`, `Button`, `Input`, `Label`, etc. already in use).

### Requirements

#### 1. **Login Page**

-   Implement a login form similar to the example from better-auth docs (email + password).
-   Include:

    -   Email + password fields.
    -   “Remember Me” checkbox.
    -   “Forgot Password?” link (placeholder for now).
    -   Primary login button with loading state.
    -   Social login button (Google) using `signIn.social`.

-   Wrap in a `Card` component, styled consistently with the sample.

#### 2. **Signup Page**

-   Implement a signup form similar to better-auth’s example.
-   Include:

    -   First name, last name, email, password, confirm password.
    -   Optional profile image upload with live preview + clear option.
    -   Primary “Create Account” button with loading state.

-   On submit: call `signUp.email` from better-auth.
-   Redirect to `/dashboard` after success (use `useRouter`).
-   Show error notifications using the existing toast system.

#### 3. **User Preferences Page**

-   Implement a settings page where a logged-in user can update their profile and preferences.
-   Sections should include:

    -   **Account Settings:** Change username, display name, email (disabled if email should not be changed), password (with confirmation).
    -   **Language & Learning Settings:** Native speaking language
    -   **Notifications & Goals:** Toggle email/app notifications, set daily review goal (numeric input).

-   Layout: use `Card` or tabbed sections to keep it clean and elegant.
-   Include Save/Update buttons with loading and success states.
-   Backend functionality (saving changes) can be stubbed for now—focus on frontend UI consistent with existing design system.

### General Guidelines

-   Review the existing codebase to ensure consistency in **styling, layout, and component usage**.
-   Use **shadcn/ui components** (`Card`, `Button`, `Input`, `Label`, `Checkbox`, etc.).
-   Ensure **responsiveness and accessibility** (mobile-first, semantic HTML).
-   Keep designs modern, minimal, and elegant—matching the LexiFlix aesthetic.
-   Do **not** implement backend persistence yet; stub out handlers where needed.
