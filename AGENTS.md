# LA PERSONA — Agent Guide

Nuxt 4 + Vue 3 + Nuxt UI + Tailwind + Better Auth + Drizzle + TanStack Vue Query digital business card platform.

Prefer project MCPs over guessing: **Nuxt**, **Nuxt UI**, **Figma**, **Tailwind**, **GSAP**, **Swiper**, **Better Auth**. Use them when implementing UI, motion, or auth.

## Stack & layout

- **App**: `app/` — pages, layouts, components, composables, middleware, plugins, emails
- **Server**: `server/` — Nitro API (`server/api`), Drizzle (`server/db`), auth, services
- **Shared**: `shared/` — cross-cutting utils, types, constants, permissions (safe for client + server)
- Package manager: **bun**
- UI: **@nuxt/ui** (`U*` components) + Tailwind v4 (`app/assets/css/main.css` `@theme`)
- Data fetching: **TanStack Vue Query** (`useQuery` / `useMutation`) and/or Nuxt `useFetch` / `$fetch`
- Auth: **better-auth** via `authClient` — do not invent auth flows
- Client state: Vue `ref` / `reactive` / composables / Nuxt `useState`. No Zustand, no Pinia unless already present

## Nuxt conventions

- Pages live in `app/pages/` and stay route/orchestration-focused. Prefer extracting interactive UI into `app/components/`.
- Drive data and props from the page (or parent) down — avoid deep prop drilling via ad-hoc global stores.
- Rely on Nuxt auto-imports for Vue APIs, components, composables, and `#imports`. Do not add barrel `index.ts` re-exports under `components/` unless one already exists.
- Use `app/composables/` for reusable client logic; `app/utils/` for pure helpers; put shared cross-boundary code in `shared/`.
- API routes: `server/api/**`. Keep DB access in `server/db` / services — pages and components call APIs, not Drizzle directly.
- Route groups already used: `(public)`, `platform`, `thakhin`. Match existing SSR rules in `nuxt.config.ts` (`/platform/**` and `/thakhin/**` are CSR).
- Prefer `<script setup lang="ts">` and typed props/emits. Keep everything type-safe and DRY.

## Logging

Follow [Logging Sucks](https://loggingsucks.com/): one wide event per API request, not a diary of log lines. Log what happened to the request (high-cardinality ids you would search), not each step the code took. Structured JSON is not enough if the line has no user, email, or business id.

Pino writes a single canonical line at the end of the request. Do not call `logger` or `console.log` / `console.error` from handlers.

- Logger: `server/utils/logger.ts` (JSON in production, pretty in dev).
- Request event: `server/middleware/00.wide-event.ts` starts it for `/api/**`. `server/plugins/wide-event.ts` emits it once.
- Handlers add fields with `enrichLog(event, { ... })` from `server/utils/wide-event.ts`. Nested objects merge.

The canonical line already has `request_id`, `method`, `route` (param names, so join tokens stay out of the path), `status_code`, `duration_ms`, `outcome`, `user_id`, `user_email`, and `organization_id`. A line is written for mutations (`POST`, `PUT`, `PATCH`, `DELETE`), any 4xx/5xx, and anything slower than 1000ms. Successful fast `GET`s are skipped. Successful `/api/auth/get-session`, `/api/analytics`, and `/api/s3/image-proxy` are skipped too; failures and slow calls on those routes are kept.

On a new or changed API route, call `enrichLog` with the ids and addresses you would search when a user reports the action failed. Put them on a nested object so you do not overwrite `request_id`:

- Card create/update/delete: `card.id`, slug, owner email.
- Payments, requests, invitations, contact exchange, registration, check-in: the same kind of ids already used on those handlers (payment id, plan, decision, invitation id, invited email, event id, registration id, result).

Do not log passwords, cookies, auth headers, invitation or join tokens, email HTML, or request bodies. Do log email addresses (`user_email`, `email.to`, payer, requester, invited address). Validation failures should name the fields, not the submitted values.

Email that outlives the response: notification helpers return `{ ok, template, to, error? }`. Set `email.attempted` and `email.to` before returning, then `trackEmailSends(event, promise)`. A failure after the response emits one extra error line with the same `request_id`. Do not `console.error` inside `.catch`.

No client logger. No per-query SQL logs. CLI scripts are not requests.

## Data-driven UI

- Build UI from **data objects + props**, not hardcoded copy scattered in templates.
- **Page owns the data.** Define (or fetch) the shape at page level and pass it down into components. Components stay presentational / interactive — they should not invent their own source-of-truth content.
- **Backend not ready yet?** Use a typed mock/fixture object on the page (same shape the API will later return). Swap the mock for `useQuery` / `$fetch` later without rewriting the component tree.
- Do not hardcode lists, labels, stats, or section content inside child components “just for the demo” — put them in the page-level mock so wiring real data is a drop-in.

## Components

- Organize under `app/components/` by domain (`landing/`, `form/`, `analytics/`, `icon/`, etc.).
- Nest at most one extra level (e.g. `icon/founder/`). Do not create deep trees.
- Keep components simple and scalable — no over-abstraction.
- Semantic, accessible HTML. Prefer Nuxt UI primitives for forms, menus, dialogs, etc. when they fit.

## Styling

- Always use **rem** (or Tailwind scale equivalents).
- Prefer Tailwind design tokens / scale classes over arbitrary values when a warning says so (e.g. `px-[1.5rem]` → `px-6`). Fix Tailwind warnings; do not leave them.
- Aspect ratio: keep one side `1` and derive the other (e.g. `aspect-[1/1.25]`, not huge integers).
- Responsive: use project breakpoints already in use (`sm:`, etc.) unless asked otherwise. Brand tokens: `--color-dark`, `--color-gold` in `main.css`.
- Color mode defaults to **dark** (`nuxt.config` `colorMode.preference`).

## Motion & media

- GSAP (+ ScrollTrigger), Lenis, Swiper, Spline appear on marketing/public surfaces — use existing patterns before inventing new ones.
- Prefer GSAP / Swiper MCPs when adding or debugging animation/carousel behavior.
- Respect `prefers-reduced-motion` when adding scroll/motion (see public landing patterns).

## Efficiency rules

- Read existing similar pages/components before writing new ones; match file naming and folder placement.
- Do not overcomplicate — simplest scalable solution wins.
- Do not expand scope (extra refactors, docs, drive-by cleanups) unless asked.
- When unsure about Nuxt / Nuxt UI / Better Auth APIs, check MCP docs rather than assuming Next.js or older Nuxt patterns.
