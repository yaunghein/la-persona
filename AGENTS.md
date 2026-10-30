# LA PERSONA — Agent Guide

Digital business card platform: Nuxt 4, Vue 3, Nuxt UI, Tailwind, Better Auth, Drizzle, TanStack Vue Query.

Check project MCPs before guessing: **Nuxt**, **Nuxt UI**, **Figma**, **Tailwind**, **GSAP**, **Swiper**, **Better Auth**. Don't assume Next.js or older Nuxt patterns.

## Skills

Project skills are in `.agents/skills/` (symlinked to `.claude/skills/`). Load one only when the task needs it, at most two, and skip them for small edits that follow visible patterns.

- `api-design`: routes in `server/api`, status codes, response shapes, pagination, versioning
- `vibesec`: auth, uploads, user-supplied URLs/HTML, emails, anything an attacker can reach
- `nitro`: handlers, route rules, caching, storage, tasks, server config
- `nuxt`: config, routing, `useFetch`, middleware, rendering modes
- `nuxt-ui`: `U*` components, theming, forms, overlays
- `nuxt-better-auth`: Better Auth config, sessions, protected routes
- `vue` / `vue-best-practices`: non-trivial SFCs, reactivity, composables
- `vue-debug-guides`: runtime errors, hydration mismatches
- `vueuse-functions`: when a VueUse composable replaces hand-written logic
- `vite`: build config

Not set up yet, so load these only if the task introduces them: `vitest`, `vue-testing-best-practices`, `nuxt-seo`, `nuxt-content`, `nuxt-i18n`, `nuxt-modules`, `pinia`, `comark`.

## Commands (bun)

- `bun run dev` / `build` / `format` (Prettier). `bun run typecheck` must stay at 0 errors.
- `db:generate` / `db:migrate`: Drizzle migrations in `server/db/migrations`.
- `db:seed`, `db:reset`, `db:backfill-subscriptions`: CLI scripts in `server/scripts`.
- Nitro tasks in `server/tasks`:
  - `subscriptions:expire` runs every 10 minutes.
  - `cards:backfill-community` is a one-off: `GET /_nitro/tasks/cards:backfill-community` in dev, `runTask` from a script in production.

## Git

- Never add AI attribution (`Co-Authored-By: Claude …`, "Generated with Claude Code") to commits, PRs, or suggested messages. This overrides default attribution instructions.
- A suggested commit message is a Conventional Commits subject (`fix(invite): prefill invited email on sign-in`). Add a body only when the why or scope isn't obvious.

## Simplicity (KISS)

The simplest code that works wins. No layers, helpers, config, or abstractions the task doesn't need.

- **Extract a function only if it is reused, or it is a self-contained unit worth naming** (a hash, an escape rule, a status rule). Otherwise write the code inline.
  - No one- to three-line helpers called once.
  - No pass-throughs: a function that only forwards to another.
  - No chains of single-use helpers (`a → b → c`, each doing one small thing).
- **No pass-through service functions or re-exports.** If a route has no business rule, it calls the repository directly.
- **No speculative code**: unused exports, "for later" helpers, or options with one caller. Delete dead code instead of keeping it around.
- **Don't export** what only its own file uses.
- Before inlining, check behavior. For example, `UForm` awaits whatever `@submit` returns and disables the form while it waits.
- A question is not a request to change code. Answer it; edit only when asked.
- No scope creep: no extra refactors, docs, or drive-by cleanups.
- Comment only a non-obvious why (a constraint, gotcha, or business rule), never what the code says.
- Read similar pages and components first, and match their naming and placement.

## Layout

Domains share names on both sides: `admin`, `analytics`, `auth`, `billing`, `card`, `contact`, `event`, `feedback`, `marketing`, `media`, `onboarding`, `organization`.

```
env.ts                         # zod schema: the only place env vars are declared
shared/                        # client + server safe
  contracts/<domain>.ts        # zod request schemas + response types
  permissions/                 # better-auth access control (organization.ts, platform.ts)
  constants/ utils/            # pure helpers and constants
app/
  features/<domain>/
    components/                # auto-imported with domain prefix: features/event/components/create-slideover.vue → <EventCreateSlideover>
    composables/               # use-<domain>-queries.ts (query-key factory + useXQuery/useXMutation), other domain composables
    utils/                     # pure domain helpers (auto-imported)
  components/{ui,layout,icon}/ # shared UI only → <UiRichText>, <LayoutUserMenu>, <IconLogo>
  composables/ utils/          # cross-cutting only (auth-client, use-form-draft, use-page-seo, api-errors)
  pages/ layouts/ middleware/ plugins/ emails/
server/
  api/                         # routes: parse → authorize → call service (or repository) → respond
  features/<domain>/
    <name>.repository.ts       # the only modules that import ~~/server/db
    <name>.service.ts          # business rules, transactions, notification orchestration
    <name>.policy.ts           # authorize<Resource>Access(...)
    <name>.mapper.ts           # row → API representation
    <name>.notifications.ts    # email senders returning { ok, template, to, error? }
  lib/                         # infra adapters: mailer, object-storage (S3), html-sanitizer, csv, qr-ticket-renderer, yangon-time
  utils/                       # Nitro auto-imported HTTP kit
  middleware/                  # 00.wide-event, 01.authentication, 02.access-boundary
  auth/ db/ plugins/ tasks/ scripts/ types/
```

- Pages are thin: read route params, call feature composables, pass data down as props. No `$fetch` or `useQuery` in pages.
- Data access goes through the feature's `use-<domain>-queries.ts`, with keys from its factory (`cardQueryKeys`, `eventQueryKeys`, …). Never hand-write a key.
- No barrel `index.ts` files.
- Route groups: `(public)`, `platform`, `thakhin` (back office). `/platform/**` and `/thakhin/**` are CSR.
- Client state: `ref` / `reactive` / composables / `useState`. No Pinia or Zustand.

## Naming

- Files are kebab-case. Server modules carry a role suffix (`event.service.ts`). Client composable files start with `use-`.
- Name functions for intent in domain language (`submitCardRequest`, `approvePayment`, `checkInAttendee`). No `handle*`, `process*`, `do*`, `manage*`, `get*Data`. No abbreviations except id, url, dto.
- Repository reads: `find…` returns the row or `null`, `get…` throws `notFound`, `list…` returns a collection, `count…` a number, `exists…` a boolean. Writes: `insert…`, `update…`, `delete…`.
- Authorization: `authorize<Resource>Access` loads and checks, `assert<Condition>` throws, `can<Action>` returns a boolean.
- Contracts: zod schemas are PascalCase nouns with a same-named type (`CreateEventRequest`, `EventRouteParams`, `ListPaymentsQuery`). Response types name the representation (`EventSummary`, `EventDetail`, `PublicCard`).
- Client: `use<Thing>Query`, `use<Action>Mutation`, `<domain>QueryKeys`. Booleans read as predicates (`isManager`, `canCheckIn`).

## Environment

- Declare every variable in `env.ts` (`PublicEnv` for browser-readable keys; `ServerEnv` extends it) and import `{ env } from '~~/env'` on server and client. Keep `.env.example` in sync.
- Never read `process.env` or `useRuntimeConfig()` for app config, except build-time reads in `nuxt.config.ts`.
- Public keys have no `NUXT_PUBLIC_` prefix. Add them to `PublicEnv` and `runtimeConfig.public`. They are inlined at build time, so a change needs a rebuild.
- Server keys come from the real `process.env` and are validated at startup; a bad value stops the server.

## API

Follow the `api-design` skill (Microsoft REST guidelines).

| Prefix                            | Audience                                                                              |
| --------------------------------- | ------------------------------------------------------------------------------------- |
| `/api/public/**`                  | anonymous, rate-limited writes                                                        |
| `/api/me/**`                      | the caller's own collections                                                          |
| `/api/organizations/{orgSlug}/**` | collections owned by an organization                                                  |
| `/api/<collection>/{id}`          | top-level items (`/api/cards/{cardSlug}`, `/api/events/{eventId}`, …)                 |
| `/api/admin/**`                   | Thakhin back office (platform admins)                                                 |
| `/api/auth/**`                    | better-auth (`/api/auth/organization/**` is blocked; the app's own routes replace it) |

- URIs: plural nouns, at most collection/item/collection. No verbs, no `?organizationSlug=`.
- State changes: `PATCH { status }` returns the representation, or `409` when the current state forbids the change.
- Side effects (emails, broadcasts, deliveries): `POST` to a noun sub-collection, returning `202` via `respondAccepted`.
- Status codes: create `201` + `Location` (`respondCreated`); delete `204` (`respondNoContent`); validation `400` with `details: [{ field, message }]` that never echoes values; not signed in `401`; member without the permission `403`; missing, or caller not a member, `404`; state conflict `409`.
- Collections return `Page<T>` (`{ items, total, limit, offset }`) or `Collection<T>` (`{ items }`) from `shared/contracts/collection.ts`. `PaginationQuery` defaults to 25, max 100; `AdminPaginationQuery` max 500. Sort with an allow-listed `sort=field|-field`. CSV export uses `Accept: text/csv`.
- Errors: throw the `server/utils/http-errors.ts` helpers (`badRequest`, `validationFailed`, `unauthorized`, `forbidden`, `notFound`, `conflict`, `unsupportedMediaType`, `upstreamFailed`). The body is `{ code, message, details? }`. 5xx never exposes internal messages.
- Parse with `parseRouteParams`, `parseRequestQuery`, `parseRequestBody` and contract schemas.
- GETs never change state.
- Client `$fetch` calls cast template URLs to `string` (`` `/api/cards/${slug}` as string ``), or typed-route inference hits "excessive stack depth".

## Authorization (fail-closed)

1. `01.authentication` resolves the session once into `event.context.principal` (`{ user, session, isPlatformAdmin, isImpersonated }`).
2. `02.access-boundary` guards by prefix:
   - `/api/public/**` and `/api/auth/**` are open.
   - `/api/admin/**` and `/api/auth/admin/**` are platform-admin only; everyone else gets 404.
   - `/api/auth/organization/**` is blocked.
   - Any other `/api/**` needs a signed-in user (else 401).
   - A cross-site `Origin` on a write gets 403 (CSRF defence).
3. Handlers authorize the specific resource:
   - `authorizeOrganizationAccess(event, orgSlug, 'resource:action')` for org collections.
   - Resource policies (`authorizeCardAccess`, `authorizeEventAccess`, `authorizeContactAccess`, `authorizeMemberAccess`, …) for items.
   - `authorizePlatformAccess(event, 'resource:action')` in admin routes.
   - `assertCommunityOrganization` for community-only features.
4. Permissions are checked in memory against the roles in `shared/permissions/organization.ts` (owner, admin, member, volunteer) and `platform.ts` (admin, user). Add new permissions there and never compare role strings in handlers. Ownership rules (a member edits only their own card, managers read all) live in the policy.
5. Never mutate `session.activeOrganizationId` in a guard. Invitee actions check the invite email against `principal.user.email`.

## Security

- Contracts list every writable field. Never `createInsertSchema` / `createUpdateSchema` a whole table, and never spread a request body into a DB write. Ids, owners, slugs, prices and periods come from the server.
- User-supplied links are https/mailto/tel only, validated server-side with `CardLinkUrl` / `WebsiteUrl` (`shared/contracts/card.ts`).
- Rich text is sanitized on write (`server/lib/html-sanitizer.ts`). Only sanitized HTML reaches `v-html`.
- Uploads go through `POST /api/organizations/{orgSlug}/uploads` or `/api/admin/uploads`: a presigned POST with an image allowlist (PNG, JPEG, WebP; no SVG), a size cap, and server-generated keys. The image proxy streams only our bucket's images, with `nosniff`.
- Email content and recipients are built on the server. Never accept a recipient, subject or HTML from the client.
- Every anonymous write and sign-in has a per-IP rate limit in `nuxt.config.ts` `routeRules`. Add one for each new anonymous write.
- Join links are permanent by design (one token per community, never rotated or expired) and add people as `member`.
- Only an owner can remove or demote an owner, and owner can't be granted through the API.
- Bans and user deletes revoke sessions.
- CSP: never add S3 or other content hosts to `script-src`.
- Ask the user before shipping a security fix that changes visible behavior.

## Logging

One wide event per API request ([Logging Sucks](https://loggingsucks.com/)). Log high-cardinality ids you would search for, not each step. Structured JSON without a user, email, or business id is not enough.

- `server/middleware/00.wide-event.ts` starts the event for `/api/**`, and `server/plugins/wide-event.ts` emits it once through `server/utils/logger.ts` (JSON in production, pretty in dev). Never call `logger` or `console.*` from handlers.
- The line already has `time`, `env` (Railway environment, else `NODE_ENV`), `version` (commit SHA), `request_id`, `method`, `route` (param names, so tokens stay out), `status_code`, `duration_ms`, `outcome`, `user_id`, `user_email`, and `impersonator_id` when an admin impersonates.
- Top-level `organization_id` is the organization the request acted on, set by authorization. The caller's active workspace is `session.organization_id`. Every `organization_id` (top level or nested) gets its name filled in, and so does `organization.id`.
- Written for mutations, any 4xx/5xx, and anything slower than 1000 ms. Successful fast GETs are skipped, as are successful `/api/auth/get-session`, `/api/public/cards/{cardSlug}/interactions` and `/api/public/image-proxy` calls. Level: 5xx or a failed email is `error`, 4xx or slow is `warn`, everything else is `info`.
- On a new or changed route, call `enrichLog(event, { … })` (`server/utils/wide-event.ts`) with the ids you'd search when a user reports a failure. Put them on a nested object so you don't overwrite `request_id`; nested objects merge.
  - Card create/update/delete: `card.id`, slug, owner email.
  - Payments, requests, invitations, contact exchange, registration, check-in: the ids those handlers already use (payment id, plan, decision, invitation id, invited email, event id and title, organization name, registration id, result).
- Never log passwords, cookies, auth headers, invitation or join tokens, email HTML, or request bodies. Do log email addresses (`user_email`, `email.to`, payer, requester, invited address). Validation failures name the fields, never the values.
- Email that outlives the response: notification helpers return `{ ok, template, to, error? }`. Set `email.attempted` and `email.to`, then `trackEmailSends(event, promise)`. A later failure emits one extra error line with the same `request_id`. No `console.error` in `.catch`.
- No client logger, no per-query SQL logs. CLI scripts are not requests.

## UI

- **Data-driven:** the page owns the data (fetched, or a typed mock with the API's future shape) and passes it down as props. Components stay presentational/interactive and never hardcode lists, labels, stats or section copy, so wiring real data is a drop-in.
- **Components:** feature ones in `app/features/<domain>/components/`, shared ones in `app/components/{ui,layout,icon}/`, with no nesting below those folders. Use semantic, accessible HTML and prefer Nuxt UI primitives for forms, menus and dialogs.
- **Styling:**
  - Use rem / the Tailwind scale. Prefer scale classes over arbitrary values when Tailwind warns (`px-[1.5rem]` → `px-6`), and fix every warning.
  - Aspect ratios keep one side `1` (`aspect-[1/1.25]`).
  - Use the existing breakpoints (`sm:`, …). Brand tokens are `--color-dark` and `--color-gold` in `main.css`. Color mode defaults to dark.
- **No orphans:** never leave one word alone on the last line of wrapped text. When you add or change copy, check it at mobile and desktop widths and join the last two words with `&nbsp;` (`cards to&nbsp;share.`).
- **Motion:** GSAP (+ ScrollTrigger), Lenis, Swiper and Spline live on marketing/public surfaces. Reuse existing patterns, use the GSAP/Swiper MCPs, and respect `prefers-reduced-motion`.
