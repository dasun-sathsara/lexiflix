# Streaming HTML, React Suspense & Selective Hydration: An Architectural Primer

A technical primer detailing the low-level protocols, server-side streaming mechanisms, React Fiber concurrent primitives, and client hydration strategies used in LexiFlix (`apps/web`).

---

## 1. Foundational Protocol & Runtime Mechanics (Prerequisite Concepts)

To understand React Suspense and streaming SSR, we must first examine how HTTP networking protocols, browser HTML layout engines, and legacy server-side rendering pipelines interact.

---

### 1.1 HTTP Streaming Protocols (`Transfer-Encoding: chunked` vs HTTP/2 DATA Frames)

In traditional HTTP/1.1 responses, the server must calculate and include a `Content-Length` header indicating the exact byte size of the payload:

```http
HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8
Content-Length: 45210
```

To include `Content-Length`, the server **must finish generating the entire response payload in memory before sending the first byte to the network socket**.

#### HTTP/1.1 Chunked Transfer Encoding
HTTP/1.1 introduced **Chunked Transfer Encoding** (`Transfer-Encoding: chunked`), which removes the `Content-Length` requirement. It allows a persistent TCP connection to send dynamically generated data in a series of self-delimiting hex-formatted chunks:

```http
HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8
Transfer-Encoding: chunked

1D
<!DOCTYPE html><html><head>
2E
<title>Browse - LexiFlix</title></head><body>
0
```

1. **Header Phase:** The server immediately sends `HTTP 200 OK` and initial `<head>` tags (CSS links, fonts, metadata) without knowing how long the body will be.
2. **Chunk Emission:** As async operations (database queries, microservice RPCs) resolve on the server, additional HTML subtrees are flushed down the open socket.
3. **Termination Chunk (`0\r\n\r\n`):** A zero-length chunk signals the end of the stream without closing the TCP connection.

#### HTTP/2 Binary DATA Frames
In HTTP/2, `Transfer-Encoding` is explicitly forbidden. Instead, HTTP/2 natively handles streaming via multiplexed **DATA frames** over a single TCP connection. The server streams HTML chunks wrapped in HTTP/2 DATA frames without requiring pre-declared content lengths, enabling identical progressive streaming behavior with lower protocol overhead.

---

### 1.2 Browser HTML Engine & Speculative Pre-parsing

Modern browser rendering engines (Blink in Chromium, Gecko in Firefox, WebKit in Safari) parse HTML **incrementally as bytes arrive over the network**:

1. **Byte Stream Tokenization:** The browser tokenizes arriving HTML bytes into DOM nodes (`<div>`, `<script>`, `<link>`) immediately without waiting for `EOF`.
2. **Speculative Pre-parser:** A background thread scans ahead in the byte stream for external resources (`<link rel="stylesheet">`, `<script src="...">`, `<img src="...">`) and triggers parallel network fetches long before the main DOM tree parser reaches those tags.
3. **Progressive Layout & Paint:** The browser constructs partial DOM and CSSOM trees, enabling First Contentful Paint (FCP) while remaining chunks are still in transit on the network.

---

### 1.3 Traditional SSR Bottlenecks (The "All-or-Nothing" Waterfall)

In classic React SSR (React 16/17 `renderToString`), rendering was synchronous and blocking across three sequential phases:

```
                  TRADITIONAL SSR WATERFALL (BLOCKING)

Server:  [--- Fetch Data ---][--- renderToString() ---]
Network:                                              [--- Stream Full HTML ---]
Client:                                                                       [--- Download JS ---][--- Hydrate Tree ---]
                                                                                                    ^ Interactive
```

1. **Fetch Everything:** The server must await **all** database queries and API calls across every component on the page before emitting the first byte. A single slow database query in a footer or comment section delays the initial HTTP response header (high Time-To-First-Byte / TTFB).
2. **Render Everything:** `renderToString()` walks the entire component tree synchronously. It cannot pause or yield execution.
3. **Hydrate Everything:** The client must download the JavaScript bundle for the whole page and walk the entire DOM tree to attach event listeners before **any** part of the page becomes interactive.

---

### 1.4 React Fiber & Concurrent Primitives

React 18/19 streaming SSR relies on the **React Fiber architecture**:

* **Interruptible Render Units:** Unlike the call stack-based `renderToString()`, Fiber breaks component rendering into discrete units of work (Fibers).
* **Work Loop & Prioritization:** React's concurrent scheduler can pause rendering a low-priority component subtree, yield to the event loop, and resume or discard work based on incoming user input or resolving promises.
* **Suspense Boundaries as Yield Points:** When a Fiber component throws a suspended Promise, React catches the Promise at the nearest `<Suspense>` boundary, pauses that subtree, and continues rendering independent sibling nodes.

---

## 2. React Suspense & Server Streaming Architecture

React Suspense combines **chunked HTTP streaming**, **Fiber concurrent rendering**, and **inline script execution** to eliminate the all-or-nothing SSR waterfall.

---

### 2.1 What `<Suspense>` Does on the Server

When React renders a page containing a `<Suspense>` boundary on the server:

```tsx
<Suspense fallback={<Skeleton />}>
  <SlowAsyncComponent />
</Suspense>
```

```
                  STREAMING SSR WITH SUSPENSE (NON-BLOCKING)

Server:  [Fast Shell][--- Slow Data Fetch ---]
                      [Emit Fallback HTML   ][Emit Suspense Script Payload]
Network: [Stream Shell & Fallback --------->][Stream Out-of-Order HTML ---->]
Client:  ^ TTFB / FCP                         ^ Selective Hydration / Interactive
```

1. **Initial Shell Flushing:** React renders the fast components and encounters `<Suspense>`. If `<SlowAsyncComponent />` throws a pending Promise, React immediately emits the `fallback` HTML wrapped in a special comment marker alongside a hidden template marker:

```html
<!--$-->
<div class="skeleton-loader"></div>
<!--/$-->
```

2. **Unblocked HTTP Response:** The initial HTML shell is flushed to the network socket immediately, yielding low TTFB and fast First Contentful Paint (FCP).
3. **Out-of-Order Streaming:** When the pending Promise for `<SlowAsyncComponent />` resolves on the server, React renders the component into a hidden `<div>` chunk accompanied by an inline `<script>` snippet:

```html
<div id="B:0" hidden>
  <div class="actual-content">Real Data Content</div>
</div>
<script>
  $RC = function(b, c) {
    var a = document.getElementById(b);
    var d = document.getElementById(c);
    a.parentNode.replaceChild(d.firstElementChild, a);
  };
  $RC("B:0", "S:0");
</script>
```

4. **DOM Replacement:** The browser executes the inline `$RC` script chunk immediately upon receipt, swapping the fallback skeleton with the real content DOM node **without re-rendering or reflowing the surrounding page shell**.

---

### 2.2 React Server Components (RSC) Wire Format

In Next.js App Router, the server does not stream raw HTML alone; it streams a unified payload containing **HTML** and the **RSC Wire Format Stream**.

The RSC Wire Format is a line-delimited JSON stream where lines correspond to tree nodes, client module references, and suspense boundaries:

```text
1:HL["/_next/static/css/app.css","style"]
2:I["node_modules/next/dist/client/app-index.js",["app-single"],""]
0:["$","main",null,{"children":[["$","$L3",null,{"fallback":["$","$L4",null,{}]}]]}]
3:{"results":[{"id":101,"title":"Inception"}],"currentPage":1}
```

* **`HL` / `I` Lines:** Hint links for CSS stylesheets and Client Component JavaScript module imports.
* **`0` Line:** The structural React element tree referencing layout components (`$L3`) and Suspense boundaries (`$L4`).
* **`3` Line:** Serialized props payload emitted when async server promises settle.

---

### 2.3 Selective Hydration & Hydration Interruption

Legacy React required hydrating the entire DOM tree sequentially. React 18+ introduces **Selective Hydration**:

1. **Independent Subtree Hydration:** Components inside `<Suspense>` boundaries are hydrated independently as their JS code and HTML chunks arrive.
2. **User Interaction Reprioritization:** If a user clicks on an unhydrated component $B$ while React is currently hydrating component $A$, React **pauses hydration of $A$, immediately hydrates component $B$ to process the user click event, and then resumes $A$**.

---

## 3. Next.js 15 Implementation & Codebase Case Studies (`apps/web`)

### 3.1 Route-Level Streaming via `loading.tsx`

Next.js App Router automatically wraps `page.tsx` routes in a `<Suspense>` boundary when a sibling `loading.tsx` file exists.

```
app/(app)/browse/
├── loading.tsx  <-- Automatic Suspense Fallback
└── page.tsx     <-- Async Server Component (Wrapped Target)
```

In `apps/web/src/app/(app)/browse/loading.tsx`:

```tsx
// apps/web/src/app/(app)/browse/loading.tsx
import { AppPageShell } from "@/components/common/app-page-shell";
import { Skeleton } from "@/components/ui/skeleton";

export default function BrowseLoading() {
  return (
    <AppPageShell className="gap-8">
      {/* Zone A Loading */}
      <div className="space-y-2">
        <Skeleton className="h-10 w-48" />
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <Skeleton className="h-10 w-full md:w-64" />
          <Skeleton className="h-10 w-full md:w-72" />
        </div>
        <div className="flex gap-4">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-40" />
        </div>
      </div>

      {/* Zone B Loading */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {Array.from({ length: 10 }, (_, index) => `browse-loading-${index}`).map((key) => (
          <div key={key} className="space-y-3">
            <Skeleton className="aspect-[2/3] w-full rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </AppPageShell>
  );
}
```

#### Execution Mechanics
When `GET /browse` is requested:
1. Next.js immediately streams `BrowseLoading` HTML skeleton down the connection.
2. The user sees instant layout structures (skeletons matching poster aspect ratios `aspect-[2/3]`).
3. Concurrently, `page.tsx` executes async queries (`getBrowseView`) on the Node.js server.
4. When `getBrowseView` resolves, Next.js streams the final `MediaGrid` HTML and replaces `BrowseLoading` DOM elements seamlessly.

---

### 3.2 Granular Component-Level Suspense (`admin-catalog-view.tsx`)

Beyond page-level `loading.tsx`, LexiFlix uses explicit inline `<Suspense>` boundaries to prevent slow sub-queries from blocking faster sibling elements.

In `apps/web/src/features/curation/components/admin-catalog-view.tsx`:

```tsx
// apps/web/src/features/curation/components/admin-catalog-view.tsx
export function AdminCatalogView({
  catalogFilter,
  catalogCounts,
  catalogEntries,
  allEntriesCount,
  discoverHref,
}: AdminCatalogViewProps) {
  const isFiltered = catalogFilter.mediaType !== "all" || catalogFilter.status !== "all";
  const draggable = !isFiltered && catalogEntries.length > 1;

  return (
    <div className="flex flex-col gap-4">
      {/* Granular Suspense Boundary wrapping search filters */}
      <Suspense fallback={<FiltersSkeleton />}>
        <AdminCatalogFilters filter={catalogFilter} counts={catalogCounts} />
      </Suspense>

      {catalogEntries.length > 0 ? (
        <Card className="gap-0 py-0 shadow-sm">
          <CardHeader className="border-b py-3.5">
            <CardTitle className="text-base">Catalog entries</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <AdminCatalogList entries={catalogEntries} draggable={draggable} />
          </CardContent>
        </Card>
      ) : (
        /* ... Empty State ... */
        null
      )}
    </div>
  );
}
```

---

### 3.3 Preventing Client Opt-Outs (`auth-split-layout.tsx`)

In Next.js App Router, calling client hooks like `useSearchParams()` inside a Client Component forces Next.js to **opt the entire page out of static pre-rendering** unless wrapped in a `<Suspense>` boundary.

In `apps/web/src/features/auth/components/auth-split-layout.tsx`:

```tsx
// apps/web/src/features/auth/components/auth-split-layout.tsx
export function AuthSplitLayout({
  badgeText,
  title,
  description,
  benefits,
  color = "indigo",
  useSuspense = false,
  children,
}: AuthSplitLayoutProps) {
  if (useSuspense) {
    return (
      <Suspense fallback={<AuthSplitLayoutFallback color={color} />}>
        <AuthSplitLayoutContent
          badgeText={badgeText}
          title={title}
          description={description}
          benefits={benefits}
          color={color}
        >
          {children}
        </AuthSplitLayoutContent>
      </Suspense>
    );
  }

  return (
    <AuthSplitLayoutContent
      badgeText={badgeText}
      title={title}
      description={description}
      benefits={benefits}
      color={color}
    >
      {children}
    </AuthSplitLayoutContent>
  );
}
```

* **Build Safety:** When `useSuspense` is set to `true`, wrapping `<AuthSplitLayoutContent>` (which contains forms that call `useSearchParams()`) in `<Suspense>` ensures Next.js can statically pre-render the surrounding authentication layout during build time without throwing static generation bailout errors.

---

## 4. Performance Metrics, Trade-offs & Diagnostic Checklist

### 4.1 Impact on Core Web Vitals

| Core Web Vital | Metric Impact | How Streaming/Suspense Improves It |
|---|---|---|
| **TTFB** (Time to First Byte) | **Significant Reduction** | Server flushes initial HTML `<head>` & shell immediately without waiting for database queries. |
| **FCP** (First Contentful Paint) | **Significant Reduction** | Skeletons and layout frames render within milliseconds of HTTP connection establishment. |
| **LCP** (Largest Contentful Paint) | **Nuanced Impact** | If the LCP element is inside a suspended boundary, LCP occurs when the streaming chunk arrives and swaps the skeleton. |
| **CLS** (Cumulative Layout Shift) | **Risk Area** | If fallback skeletons do not match the exact dimensions of final components, swapping causes layout shifts. |
| **INP** (Interaction to Next Paint) | **Significant Improvement** | Selective Hydration prioritizes event listeners on user-clicked elements over idle background subtrees. |

---

### 4.2 Architectural Trade-offs & Anti-Patterns

1. **Skeleton Dimension Misalignment (CLS Risk):**
   * *Anti-Pattern:* Rendering a 50px high skeleton fallback for a grid that expands to 400px when loaded.
   * *Solution:* Design skeletons with explicit aspect ratios matching real components (e.g. `aspect-[2/3]` for media posters).

2. **Nested Waterfall Suspense:**
   * *Anti-Pattern:* Nesting multiple async Server Components sequentially inside deeply nested `<Suspense>` boundaries, causing sequential network stream delays.
   * *Solution:* Initiate async data promises at top-level parent components using `Promise.all` before passing promises or data down.

3. **Missing Suspense around `useSearchParams()`:**
   * *Anti-Pattern:* Omitting `<Suspense>` around Client Components reading URL search parameters.
   * *Consequence:* Causes Next.js static build failures or forces entire route segments into dynamic client-side rendering.

---

### 4.3 Code Review Checklist for Streaming & Suspense

During code reviews in LexiFlix, evaluate all loading and suspense implementations against this checklist:

- [ ] **Route Skeletons (`loading.tsx`):** Does every major feature route (`/browse`, `/dashboard`, `/decks`) provide a dedicated `loading.tsx` skeleton UI?
- [ ] **Dimension Parity:** Do skeleton containers match the height, grid columns, and aspect ratios of final loaded components (`aspect-[2/3]`, `h-10`, `grid-cols-5`)?
- [ ] **`useSearchParams` Wrapping:** Is every Client Component accessing `useSearchParams()` wrapped in an explicit `<Suspense fallback="...">` boundary?
- [ ] **Server Data Parallelism:** Are server queries inside Server Components executed concurrently (`Promise.all`) rather than sequentially awaited?
- [ ] **No Hydration Warnings:** Does the fallback skeleton omit dynamic client-only state (e.g. `Math.random()`, `Date.now()`) that causes server/client HTML mismatches?
