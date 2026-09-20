# Typeahead Search — Expert Listing Screening Task

A debounced, keyboard-navigable search built with Next.js (App Router), TypeScript, and Tailwind CSS, using [Wikipedia's OpenSearch API](https://www.mediawiki.org/wiki/API:Opensearch).

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000

## What it handles

- **Debounced input** — 300ms delay after the user stops typing before firing a request
- **Loading / empty / error states** — each rendered distinctly, with a retry option on error
- **Keyboard navigation** — Arrow Up/Down to move through results, Enter to select, Escape to close
- **Stale / out-of-order responses** — every keystroke aborts the previous in-flight request (`AbortController`) _and_ checks a monotonically increasing request-id before applying any response to state, so a slow earlier response can never overwrite a newer one

## About the project

I originally built this against the REST Countries API, but its unauthenticated endpoint was retired mid-project in favor of a version requiring an API key — a good real-world reminder that a takehome shouldn't force a reviewer to create an account just to run it. I swapped to Wikipedia's OpenSearch API instead: it's the same endpoint that powers Wikipedia's own search box, is officially documented by the MediaWiki team, requires no key, and has stayed stable for years — a safer bet for a demo meant to run untouched on someone else's machine.

Key tradeoffs: I debounce input at 300ms, balancing responsiveness against unnecessary requests; on a slower connection I'd consider 400–500ms. To handle out-of-order responses, I combined two safeguards: an `AbortController` that cancels the previous in-flight request on every keystroke, and a monotonically increasing request-id ref checked before any response is applied to state — so even a stale request that resolves after being aborted is still discarded. I kept results as component-local state rather than reaching for React Query/SWR, since the task didn't call for caching or shared server state — but for production I'd use one of those for caching, retry, and stale-while-revalidate behavior for free.

To scale or harden this for high traffic, I'd add: client-side result caching keyed by query, a minimum-character threshold before firing requests, rate-limit-aware backoff, and a thin backend proxy for server-side caching so the upstream API isn't exposed directly to client abuse.

For testing, I'd write unit tests (Jest + React Testing Library) around debounce timing, keyboard navigation, and the stale-response guard by mocking `fetch` with out-of-order resolving promises — plus integration tests covering the empty/error/loading states end-to-end.
