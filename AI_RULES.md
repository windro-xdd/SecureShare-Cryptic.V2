# AI Development Rules for SecureShare

This document outlines the technical stack and provides clear rules for the AI assistant (Dyad) to follow when developing this application. The goal is to maintain code quality, consistency, and predictability.

## Tech Stack

This project is built with a modern, type-safe, and efficient stack:

-   **Framework:** React with Vite for a fast and modern development experience.
-   **Language:** TypeScript for robust type safety and improved code quality.
-   **Styling:** Tailwind CSS for a utility-first approach to styling.
-   **UI Components:** shadcn/ui provides a set of reusable, accessible, and composable components.
-   **Routing:** React Router (`react-router-dom`) is used for all client-side routing.
-   **State Management:** A combination of React's built-in hooks (`useState`, `useContext`) for local/simple state and TanStack Query (`@tanstack/react-query`) for server state and caching.
-   **Forms:** React Hook Form is used for building performant forms, paired with Zod for schema validation.
-   **Icons:** Lucide React (`lucide-react`) is the exclusive icon library.
-   **Notifications:** The app uses the built-in `shadcn/ui` toaster (`useToast`) and `sonner` for notifications.

## Library Usage Rules

To ensure consistency, please adhere to the following rules:

### 1. UI and Styling

-   **Component Library:** ALWAYS use components from `shadcn/ui` located in `src/components/ui` whenever possible (e.g., `Button`, `Card`, `Input`, `Dialog`). Do not create custom components for elements that already exist in the library.
-   **Styling:** ALWAYS use Tailwind CSS utility classes for styling. Do not write custom CSS in `.css` files unless absolutely necessary for global styles (like in `src/index.css`).
-   **Class Merging:** Use the `cn` utility function from `src/lib/utils.ts` to conditionally apply or merge Tailwind CSS classes.

### 2. Routing

-   **Router:** All application routes MUST be defined within `src/App.tsx` using the `<BrowserRouter>`, `<Routes>`, and `<Route>` components from `react-router-dom`.
-   **Pages:** New pages should be created as components within the `src/pages/` directory.

### 3. State Management

-   **Local State:** For state that is confined to a single component, use React's `useState` hook.
-   **Server State / Data Fetching:** ALWAYS use TanStack Query (`@tanstack/react-query`) for fetching, caching, and managing data from APIs or any other asynchronous source. Do NOT use `useEffect` with `fetch` for this purpose.
-   **Global State:** For simple global state that needs to be shared across the app (e.g., theme, user authentication status), use React's `useContext` hook. Avoid complex state management libraries unless the app's complexity justifies it.

### 4. Forms

-   **Form Logic:** ALWAYS use `react-hook-form` to manage form state, validation, and submissions.
-   **Validation:** ALWAYS use `zod` to define validation schemas for forms. Integrate it with `react-hook-form` using `@hookform/resolvers`.

### 5. Icons

-   **Icon Set:** ONLY use icons from the `lucide-react` library. This ensures visual consistency across the entire application.

### 6. Notifications

-   **Toasts:** Use the custom `useToast` hook (from `src/hooks/use-toast.ts`) for displaying simple toast notifications. This hook is integrated with the `shadcn/ui` `Toaster`. `sonner` is also available for more complex notification needs if required.

### 7. File Structure

-   **Pages:** `src/pages/` - Components that represent a full page/route.
-   **Reusable Components:** `src/components/` - Custom, reusable components used across multiple pages.
-   **UI Primitives:** `src/components/ui/` - Base components from `shadcn/ui`. Do NOT modify these files directly.
-   **Hooks:** `src/hooks/` - Custom React hooks.
-   **Utilities & Libraries:** `src/lib/` - Helper functions, library configurations, and core logic (like `encryption.ts`).

By following these rules, we can ensure the codebase remains clean, maintainable, and easy to understand.