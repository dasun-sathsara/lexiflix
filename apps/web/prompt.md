Implement the **entire authentication flow** in this project using **better-auth**.
Before coding, **analyze the existing codebase** and ensure your implementation is **consistent with the current architecture, design system, and UI components**.

#### Core Requirements

-   **Google OAuth login & signup** with a smooth, secure flow.
-   **Password reset** with token-based security, error handling, and clean UI states.
-   **Email verification** for new signups and email changes.
-   **Account settings management**:

    -   Update **username, display name, password**.
    -   Upload and change **profile picture** (with validation and storage best practices).

#### Expectations

-   ✅ Use the project’s **design tokens, styling conventions, and UI components** (shadcn/ui, aceternity ui, etc. if already present).
-   ✅ Implement **modern, user-friendly, and responsive** UI.
-   ✅ Include **loading, error, and success states** for every action.
-   ✅ Ensure **accessibility (a11y)** and a clean developer experience.
-   ✅ Handle **edge cases**: expired tokens, duplicate accounts, partial flows, network failures.
-   ✅ Write **modular, well-documented, and extensible code**.
-   ✅ Prioritize **security, scalability, and maintainability**.

#### Additional Notes

-   Review **how authentication is currently initialized and used** in the codebase.
-   Integrate with **routing, middleware, and protected pages** as appropriate.
-   Keep flows **consistent with better-auth best practices** and avoid custom hacks unless necessary.

**This implementation is mission-critical. Do your absolute best. Treat this as a production-ready system, not a prototype.**
