# Browse Page Architectural Deep-Dive: Rendering, Search, Fetching & Mutation Lifecycles

A technical architectural analysis of the `/browse` page in LexiFlix (`apps/web`). This document details the hybrid Server-First rendering model, interactive search reconciliation, server data orchestration, and mutation lifecycles under the Next.js 15 App Router and React 19 architecture.

---

## Architecture Overview & Core Stack

The `/browse` route allows users to explore movies and TV shows, filtering by search query, media type (movie vs. TV), genre, release decade, and sorting criteria.

| System Layer | Architectural Pattern | Primary Responsibility |
|---|---|---|
| **Page Route (`page.tsx`)** | Async Server Component | Server-side request orchestration & RSC payload generation. |
| **Server Queries (`queries.ts`)** | `server-only` Data Module | Upstream API integration, parameter parsing & parallel queries. |
| **Interactive Controls (`browse-controls.tsx`)** | Client Component (`"use client"`) | Local input state, 500ms debouncing, URL parameter mutation. |
| **Grid & Cards (`media-grid.tsx`)** | Server/Client Presentation | Rendering media posters, difficulty signals, and navigation links. |
| **State Authority** | Browser URL (`URLSearchParams`) | Single Source of Truth (SSOT) for all search/filter states. |

---

## 1. Initial Load & Rendering Strategy (Hybrid Server-First RSC)

LexiFlix uses a **Hybrid Server-First React Server Component (RSC)** strategy for the `/browse` page. The page is executed on the server per request (or revalidated dynamically), producing a light initial HTML shell alongside an RSC payload stream.

```
                    INITIAL LOAD & HYDRATION LIFECYCLE
                    
Browser               Next.js Server (Node.js)             TMDB API
   │                             │                            │
   │─── HTTP GET /browse ───────>│                            │
   │                             │─── getSessionOrNull() ────>│
   │                             │─── Promise.all([           │
   │                             │      getGenres("movie"),   │
   │                             │      getGenres("tv")       │
   │                             │    ]) ────────────────────>│
   │                             │<── Genre Payloads ─────────│
   │                             │                            │
   │                             │─── discoverMedia() ───────>│
   │                             │<── Media Items ────────────│
   │                             │                            │
   │                             │ (Render HTML + RSC Payload)│
   │<── HTML + RSC Payload ──────│                            │
   │    (Instant First Paint)    │                            │
   │                             │                            │
   │ (Hydrate BrowseControls)    │                            │
   │ Interactive UI Ready        │                            │
```

### 1.1 Server Component Execution (`page.tsx`)

In Next.js 15, dynamic route properties like `searchParams` are passed as Promises. The Server Component awaits `searchParams` and the user session concurrently:

```tsx
// apps/web/src/app/(app)/browse/page.tsx
export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Concurrently resolve searchParams Promise and user session
  const [params] = await Promise.all([searchParams, getSessionOrNull()]);

  // Orchestrate server-side data fetching
  const { results, genreMap, currentGenres, currentPage, totalPages } =
    await getBrowseView({ searchParams: params });

  return (
    <>
      <AppTopbar title="Browse" />
      <AppPageShell className="gap-6">
        <section className="space-y-2">
          <AppPageHeader
            heading="Browse"
            description="Explore movies and TV shows, then narrow the catalog by title, genre, and release window."
          />
          <BrowseControls genres={currentGenres} />
        </section>
        <section>
          <MediaGrid results={results} genreMap={genreMap} />
        </section>
        <section className="flex justify-center">
          <PaginationControls currentPage={currentPage} totalPages={totalPages} />
        </section>
      </AppPageShell>
    </>
  );
}
```

### 1.2 Parallel Server Data Orchestration (`queries.ts`)

Inside `getBrowseView`, the server fetches genre definitions for movies and TV shows in parallel using `Promise.all`:

```ts
// apps/web/src/features/browse/server/queries.ts
import "server-only";

export async function getBrowseView({ searchParams }: GetBrowseViewParams) {
  const type = searchParams.type === "tv" ? "tv" : "movie";

  // Parallel fetch: fetch genre mappings for both media types concurrently
  const [movieGenres, tvGenres] = await Promise.all([
    getGenres("movie"),
    getGenres("tv"),
  ]);

  // Build a unified lookup map (genre ID -> genre name)
  const genreMap: Record<number, string> = {};
  [...movieGenres.genres, ...tvGenres.genres].forEach((g) => {
    genreMap[g.id] = g.name;
  });

  const currentGenres = type === "movie" ? movieGenres.genres : tvGenres.genres;
  const q = typeof searchParams.q === "string" ? searchParams.q : undefined;
  const page = typeof searchParams.page === "string" ? Number.parseInt(searchParams.page, 10) : 1;

  // Fetch results based on query mode (Search vs. Discovery filter)
  const data = q
    ? await searchMedia(q, type, page)
    : await discoverMedia(type, buildDiscoverParams(searchParams, page));

  return {
    results: data.results,
    genreMap,
    currentGenres,
    currentPage: data.page,
    totalPages: Math.min(data.totalPages, 500),
  };
}
```

### 1.3 Step-by-Step Initial Load Stages

1. **Request Ingestion:** The browser issues `GET /browse?type=movie&sort_by=popularity.desc`.
2. **Server-Side Parallel Fetching:** The Node.js server resolves the `searchParams` Promise and executes parallel queries to TMDB for genres and media discovery.
3. **RSC Serialization & HTML Stream:** Next.js renders the component tree into static HTML (containing the preliminary layout and `MediaGrid`) and serializes the React Server Component (RSC) payload.
4. **First Paint:** The browser receives the initial HTML shell and renders the layout instantly.
5. **Selective Hydration:** Client Components (`BrowseControls`, `<Select />`, `<Tabs />`) download their JS bundles and hydrate, enabling interactivity without blocking initial content rendering.

---

## 2. Interactive Search & Filter Flow

When a user types into the search input or modifies a filter dropdown, the page executes a **Soft RSC Navigation Flow**.

```
                DEBOUCED SEARCH & DOM RECONCILIATION
                
User              BrowseControls (Client)      Next.js Router           Server Component
 │                          │                        │                          │
 │─ Types "Inception" ─────>│                        │                          │
 │                          │ (setState: "Inception")│                          │
 │                          │ (Start 500ms Timer)    │                          │
 │                          │                        │                          │
 │                          │ ── Timer Elapses ────> │                          │
 │                          │                        │── GET /browse?q=Inception>│
 │                          │                        │   (RSC Fetch Header)     │
 │                          │                        │                          │── getBrowseView({ q: "Inception" })
 │                          │                        │                          │<── New RSC Payload Stream
 │                          │                        │<── RSC Stream ───────────│
 │                          │                        │                          │
 │                          │<── Reconcile DOM ──────│                          │
 │                          │    (Keep Input Focus)  │                          │
 │                          │    (Update MediaGrid)  │                          │
```

### 2.1 Debounced Search State (`browse-controls.tsx`)

To prevent firing network requests on every keystroke, `BrowseControls` maintains a local input state and wraps URL updates in a 500ms `setTimeout`:

```tsx
// apps/web/src/features/browse/components/browse-controls.tsx
"use client";

export function BrowseControls({ genres }: BrowseControlsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchTerm, setSearchTerm] = useState(searchParams.get("q") || "");
  const [, startTransition] = useTransition();

  // Debounce search input changes
  useEffect(() => {
    const timer = setTimeout(() => {
      const currentQ = searchParams.get("q") || "";
      if (searchTerm !== currentQ) {
        const params = new URLSearchParams(searchParams.toString());
        if (searchTerm) {
          params.set("q", searchTerm);
          // Clear conflicting discovery filters when executing text search
          params.delete("sort_by");
          params.delete("with_genres");
          params.delete("decade");
        } else {
          params.delete("q");
        }
        params.delete("page"); // Reset to page 1

        startTransition(() => {
          router.push(`${pathname}?${params.toString()}`, { scroll: false });
        });
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm, pathname, router, searchParams]);
```

### 2.2 React 19 Transition & Soft Navigation

Wrapping `router.push()` in `startTransition()` provides critical UI advantages:

* **Non-Blocking Navigation:** The browser UI remains responsive while the new RSC payload is requested over the network.
* **Preserved Input Focus:** React does not unmount or rebuild `<BrowseControls />`. The cursor focus, text selection, and active input state remain intact.
* **Partial DOM Reconciliation:** React receives the new RSC payload, identifies that only `MediaGrid` and `PaginationControls` have changed, and mutates only those DOM nodes.

---

## 3. Data Fetching & Caching Mechanisms

### 3.1 Server-Only Enforcement

Data-fetching functions in `queries.ts` are guarded with `import "server-only";`. If a developer accidentally imports a server query into a Client Component, the build fails immediately:

```ts
import "server-only";
```

### 3.2 Upstream Integration & HTTP Fetch Deduplication

LexiFlix's TMDB client leverages native `fetch` cache options:

```ts
// apps/web/src/lib/integrations/tmdb/client.ts
export async function tmdbFetch<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${TMDB_BASE_URL}${endpoint}`);
  url.searchParams.set("api_key", getTmdbApiKey());

  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    next: { revalidate: 3600 }, // Cache response for 1 hour
  });

  if (!response.ok) {
    throw new Error(`TMDB request failed: ${response.statusText}`);
  }

  return response.json();
}
```

* **Automatic Request Deduplication:** If `BrowsePage` calls `getGenres("movie")` multiple times during a single render tree, Next.js automatically dedupes the HTTP requests into a single network call.
* **Time-Based Revalidation:** Data is cached on the server for 3600 seconds (`next: { revalidate: 3600 }`), protecting upstream APIs from rate limits.

---

## 4. Mutation Lifecycle & Revalidation

While `/browse` is a read-heavy page, media cards link directly to detail pages (`/media/[id]`) where users execute mutations such as **generating study packs** or **saving items to curation lists**.

```
                       MUTATION & REVALIDATION LIFECYCLE
                       
Client Component (UI)        Server Action ("use server")        Database / Server Cache
        │                                 │                                 │
        │─── Exec (FormData / JSON) ─────>│                                 │
        │                                 │─── DB Insert / Update ─────────>│
        │                                 │<── Updated Record ──────────────│
        │                                 │                                 │
        │                                 │─── revalidatePath("/browse") ──>│
        │                                 │    (Invalidates Server Cache)   │
        │                                 │                                 │
        │<── ActionResult<T> { ok: true } │                                 │
        │                                 │                                 │
        │ (router.refresh())              │                                 │
        │ Refetch RSC Stream ────────────>│                                 │
        │<── Fresh Component Stream ──────│                                 │
        │                                 │                                 │
        │ Reconcile UI with fresh state   │                                 │
```

### 4.1 Server Action Execution (`"use server"`)

Mutations are declared using Server Actions that return structured `ActionResult<T>` contracts:

```ts
// apps/web/src/features/curation/server/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { type ActionResult, actionSuccess, actionError } from "@/lib/contracts/action-result";

export async function toggleCuratedStatusAction(
  mediaId: string,
): Promise<ActionResult<{ isCurated: boolean }>> {
  try {
    const session = await requireAdminSession();
    const result = await toggleCuratedEntryInDb(mediaId, session.user.id);

    // Invalidate cached RSC pages so the updated status renders across the app
    revalidatePath("/browse");
    revalidatePath("/curated");

    return actionSuccess({ isCurated: result.isCurated });
  } catch (error) {
    return actionError("Failed to update curation status.");
  }
}
```

### 4.2 Client Mutation Handling & Cache Invalidation

On the client side, components trigger Server Actions within a transition:

```tsx
const [isPending, startTransition] = useTransition();

const handleToggleCurated = (mediaId: string) => {
  startTransition(async () => {
    const result = await toggleCuratedStatusAction(mediaId);

    if (result.ok) {
      toast.success("Curation updated successfully.");
      router.refresh(); // Triggers a soft RSC re-fetch of current route
    } else {
      toast.error(result.error);
    }
  });
};
```

1. **`revalidatePath("/browse")`:** Tells Next.js server cache to throw away stored RSC HTML/payloads for `/browse`.
2. **`router.refresh()`:** Requests fresh RSC data for the current route from the server.
3. **DOM Update:** React receives the updated Server Component payload and smoothly updates badges/cards without losing client component state.

---

## 5. Architectural Takeaways

1. **URL as Single Source of Truth:** Relying on `searchParams` for search queries, filters, and pagination ensures deep-linkability and eliminates client-side state duplication.
2. **Unblocked Interactivity:** `useTransition` and debounced inputs ensure typing remains 60fps fast while server data streams asynchronously over the network.
3. **Server-First Boundary Protection:** `"server-only"` modules guarantee sensitive API keys and raw database utilities never bleed into browser JS bundles.
