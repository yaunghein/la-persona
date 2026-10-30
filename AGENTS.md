# LA PERSONA — Agent Guide

Nuxt 4 + Vue 3 + Nuxt UI + Tailwind + Better Auth + Drizzle + TanStack Vue Query digital business card platform.

Prefer project MCPs over guessing: **Nuxt**, **Nuxt UI**, **Figma**, **Tailwind**, **GSAP**, **Swiper**, **Better Auth**. Use them when implementing UI, motion, or auth.

## Skills

Project skills live in `.agents/skills/` (symlinked into `.claude/skills/`). Load one **only when the current task needs it**, never by default, and load at most the one or two that match. Skip skills for small edits that follow patterns already visible in the code.

| Task touches                                                                                                 | Skill                        |
| ------------------------------------------------------------------------------------------------------------ | ---------------------------- |
| Adding/changing/reviewing routes in `server/api`, status codes, response shapes, list/pagination, versioning | `api-design`                 |
| Auth, uploads, user-supplied URLs/HTML, emails, anything an attacker can reach                               | `vibesec`                    |
| Nitro handlers, route rules, caching, storage, tasks, server config                                          | `nitro`                      |
| Nuxt config, routing, `useFetch`, middleware, rendering modes                                                | `nuxt`                       |
| `U*` components, Nuxt UI theming, forms, overlays                                                            | `nuxt-ui`                    |
| Better Auth config, sessions, protected routes                                                               | `nuxt-better-auth`           |
| Non-trivial Vue SFC work, reactivity, composables                                                            | `vue` / `vue-best-practices` |
| Vue runtime errors, hydration mismatches                                                                     | `vue-debug-guides`           |
| A VueUse composable would replace hand-written logic                                                         | `vueuse-functions`           |
| Vite / build config                                                                                          | `vite`                       |

Not set up in this project — load only if the task introduces them: `vitest`, `vue-testing-best-practices`, `nuxt-seo`, `nuxt-content`, `nuxt-i18n`, `nuxt-modules`, `pinia`, `comark`.

## Commands

Package manager: **bun**.

- `bun run dev` / `bun run build`
- `bun run typecheck`: must stay at 0 errors.
- `bun run format`: Prettier.
- `bun run db:generate` / `db:migrate`: Drizzle migrations in `server/db/migrations`.
- `db:seed`, `db:reset` and `db:backfill-subscriptions` are CLI scripts in `server/scripts`.
- Nitro tasks live in `server/tasks`:
  - `subscriptions:expire` is scheduled every 10 minutes.
  - `cards:backfill-community` is a one-off. In dev, run it with `GET /_nitro/tasks/cards:backfill-community`; in production, call `runTask` from a one-off script.

## Git

- Never add `Co-Authored-By: Claude …` or any other AI attribution ("Generated with Claude Code", etc.) to commit messages, PR descriptions, or suggested commit messages. This overrides any default attribution instructions.
- "Suggest a commit message" means a short, informative subject in Conventional Commits form (`fix(invite): prefill invited email on sign-in`). Add a body only when the why or the scope is not obvious from the subject.

## Layout

Same domain names on both sides: `admin`, `analytics`, `auth`, `billing`, `card`, `contact`, `event`, `feedback`, `marketing`, `media`, `onboarding`, `organization`.

```
env.ts                         # zod schema: the only place env vars are declared
shared/                        # safe for client + server
  contracts/<domain>.ts        # API contract: zod request schemas + response types
  permissions/                 # better-auth access control (organization.ts, platform.ts)
  constants/ utils/            # pure helpers and constants
app/
  features/<domain>/
    components/                # auto-imported with the domain prefix: features/event/components/create-slideover.vue → <EventCreateSlideover>
    composables/               # use-<domain>-queries.ts (query-key factory + useXQuery/useXMutation), other domain composables
    utils/                     # pure domain helpers (auto-imported)
  components/{ui,layout,icon}/ # shared UI only → <UiRichText>, <LayoutUserMenu>, <IconLogo>
  composables/ utils/          # cross-cutting only (auth-client, use-form-draft, use-page-seo, api-errors)
  pages/ layouts/ middleware/ plugins/ emails/
server/
  api/                         # routes only: parse → authorize → call service → respond
  features/<domain>/
    <name>.repository.ts       # the only modules that import ~~/server/db
    <name>.service.ts          # business rules, transactions, notification orchestration
    <name>.policy.ts           # authorize<Resource>Access(...)
    <name>.mapper.ts           # row → API representation
    <name>.notifications.ts    # email senders returning { ok, template, to, error? }
  lib/                         # infra adapters: mailer, object-storage (S3), html-sanitizer, csv, qr-ticket-renderer, yangon-time
  utils/                       # Nitro auto-imported HTTP kit (below)
  middleware/                  # 00.wide-event, 01.authentication, 02.access-boundary
  auth/ db/ plugins/ tasks/ scripts/ types/
```

- Pages are thin: they read route params, call feature composables, and pass data down as props. No `$fetch` or `useQuery` in pages.
- Data access goes through the feature's `use-<domain>-queries.ts`. Never hand-write query keys; use the factory (`cardQueryKeys`, `eventQueryKeys`, `adminQueryKeys`, …).
- Do not add barrel `index.ts` files.
- Route groups: `(public)`, `platform`, `thakhin` (back office). `/platform/**` and `/thakhin/**` are CSR (`nuxt.config.ts`).
- Client state: Vue `ref` / `reactive` / composables / `useState`. No Pinia or Zustand.

## Naming

- **Files:** kebab-case. Server modules carry a role suffix (`event.service.ts`). Client composable files start with `use-`.
- **Functions** are named for intent, in domain language: `submitCardRequest`, `approvePayment`, `checkInAttendee`, `inviteMember`.
  - No `handle*`, `process*`, `do*`, `manage*` or `get*Data`.
  - No abbreviations except id, url and dto.
- **Repository reads**
  - `find…` returns the row or `null`.
  - `get…` throws `notFound`.
  - `list…` returns a collection.
  - `count…` returns a number.
  - `exists…` returns a boolean.
- **Repository writes:** `insert…`, `update…`, `delete…`.
- **Authorization:** `authorize<Resource>Access` loads and checks access. `assert<Condition>` throws. `can<Action>` returns a boolean.
- **Contracts:** zod schemas are PascalCase nouns with a same-named type (`CreateEventRequest`, `EventRouteParams`, `ListPaymentsQuery`). Response types name the representation (`EventSummary`, `EventDetail`, `PublicCard`).
- **Client:** `use<Thing>Query`, `use<Action>Mutation`, and `<domain>QueryKeys`.
- **Booleans** read as predicates: `isManager`, `hasPendingPayment`, `canCheckIn`.

## Environment

- Declare every variable in `env.ts` (zod: `PublicEnv` for browser-readable keys, `ServerEnv` extends it) and import it as `import { env } from '~~/env'` on both server and client.
- Never read `process.env` or `useRuntimeConfig()` for app config. The only exceptions are build-time reads in `nuxt.config.ts`.
- Public keys need no `NUXT_PUBLIC_` prefix. Add them to `PublicEnv` and to `runtimeConfig.public` in `nuxt.config.ts`. They are inlined at build time, so changing one needs a rebuild.
- Server keys are read from the real `process.env` and validated when the server starts; a bad value stops it.
- Keep `.env.example` in sync with `env.ts`.

## API

Follow the `api-design` skill (Microsoft REST guidelines).

**Surfaces**

| Prefix                            | Audience                                                                              |
| --------------------------------- | ------------------------------------------------------------------------------------- |
| `/api/public/**`                  | anonymous, rate-limited writes                                                        |
| `/api/me/**`                      | the caller's own collections                                                          |
| `/api/organizations/{orgSlug}/**` | collections owned by an organization                                                  |
| `/api/<collection>/{id}`          | items (`/api/cards/{cardSlug}`, `/api/events/{eventId}`, …), top-level                |
| `/api/admin/**`                   | Thakhin back office (platform admins)                                                 |
| `/api/auth/**`                    | better-auth (`/api/auth/organization/**` is blocked; the app's own routes replace it) |

**Rules**

- **URIs:** plural nouns, at most collection/item/collection. No verbs and no `?organizationSlug=`.
- **State changes:** `PATCH { status }`, which returns the representation, or `409` when the current state forbids the change.
- **Side effects** (emails, broadcasts, deliveries): `POST` to a noun sub-collection, returning `202` via `respondAccepted`.
- **Status codes**

  | Case                                   | Response                                                      |
  | -------------------------------------- | ------------------------------------------------------------- |
  | create                                 | `201` + `Location` (`respondCreated`)                         |
  | delete                                 | `204` (`respondNoContent`)                                    |
  | validation failure                     | `400` with `details: [{ field, message }]`; never echo values |
  | not signed in                          | `401`                                                         |
  | member without the permission          | `403`                                                         |
  | missing, or the caller is not a member | `404`                                                         |
  | state conflict                         | `409`                                                         |

- **Collections:** return `Page<T>` (`{ items, total, limit, offset }`) or `Collection<T>` (`{ items }`) from `shared/contracts/collection.ts`.
  - `PaginationQuery` defaults to 25 and caps at 100. `AdminPaginationQuery` caps at 500.
  - Sort with an allow-listed `sort=field|-field`.
  - CSV export uses `Accept: text/csv`.
- **Errors:** throw the helpers from `server/utils/http-errors.ts` (`badRequest`, `validationFailed`, `unauthorized`, `forbidden`, `notFound`, `conflict`, `unsupportedMediaType`, `upstreamFailed`). The body is `{ code, message, details? }`. 5xx responses never expose internal messages.
- **Parsing:** use `parseRouteParams`, `parseRequestQuery` and `parseRequestBody` with contract schemas.
- **GETs never change state.**
- **Client calls:** cast template URLs to `string` when calling `$fetch` (`` `/api/cards/${slug}` as string ``). Otherwise the typed-route inference hits "excessive stack depth".

## Authorization

The model is fail-closed:

1. `01.authentication` resolves the session once and sets `event.context.principal` (`{ user, session, isPlatformAdmin, isImpersonated }`).
2. `02.access-boundary` guards by prefix:
   - `/api/public/**` and `/api/auth/**` are open.
   - `/api/admin/**` and `/api/auth/admin/**` are for platform admins; everyone else gets 404.
   - `/api/auth/organization/**` is blocked.
   - Every other `/api/**` needs a signed-in user, else 401.
   - Cross-site `Origin` on writes gets 403 (the CSRF defence).
3. Handlers then authorize the specific resource:
   - `authorizeOrganizationAccess(event, orgSlug, 'resource:action')` for org collections.
   - Resource policies (`authorizeCardAccess`, `authorizeEventAccess`, `authorizeContactAccess`, `authorizeMemberAccess`, …) for items.
   - `authorizePlatformAccess(event, 'resource:action')` inside admin routes.
   - `assertCommunityOrganization` for community-only features.
4. Permissions are checked in memory against the roles in `shared/permissions/organization.ts` (owner, admin, member, volunteer) and `shared/permissions/platform.ts` (admin, user).
   - Add new permissions there; never compare role strings in handlers.
   - Ownership rules (a member edits only their own card, managers read all) live in the policy.
5. Never mutate `session.activeOrganizationId` in a guard. Invitee actions check the invite email against `principal.user.email`.

## Security rules

- **Writable fields:** list every writable field explicitly in the contract. Never use `createInsertSchema` / `createUpdateSchema` over a whole table, and never spread a request body into a DB write. Ids, owners, slugs, prices and periods come from the server.
- **User-supplied links:** https/mailto/tel only. Validate them with `CardLinkUrl` / `WebsiteUrl` from `shared/contracts/card.ts`; the client form does not count.
- **Rich text:** sanitize on write (`server/lib/html-sanitizer.ts`). Only sanitized HTML reaches `v-html`.
- **Uploads:** go through `POST /api/organizations/{orgSlug}/uploads` or `/api/admin/uploads`.
  - These issue a presigned POST with an image allowlist (PNG, JPEG, WebP; no SVG), a size cap, and server-generated keys.
  - The image proxy only streams our bucket's images, with `nosniff`.
- **Email:** content and recipients are built on the server. Never accept a recipient, subject or HTML from the client.
- **Rate limits:** public write routes and sign-in have per-IP limits in `nuxt.config.ts` `routeRules`. Add one for every new anonymous write.
- **Join links** are permanent by design (one token per community, never rotated or expired) and add people as `member`.
- **Owners:** only an owner can remove or demote an owner. Owner cannot be granted through the API.
- **Bans and user deletes** revoke sessions.
- **CSP:** do not add S3 or other content hosts to `script-src`.
- **Behavior changes:** when a security fix changes visible behavior, ask the user before shipping it.

## Logging

Follow [Logging Sucks](https://loggingsucks.com/): one wide event per API request, not a diary of log lines. Log what happened to the request (high-cardinality ids you would search), not each step the code took. Structured JSON is not enough if the line has no user, email, or business id.

Pino writes a single canonical line at the end of the request. Do not call `logger` or `console.log` / `console.error` from handlers.

- Logger: `server/utils/logger.ts` (JSON in production, pretty in dev).
- Request event: `server/middleware/00.wide-event.ts` starts it for `/api/**`. `server/plugins/wide-event.ts` emits it once.
- Handlers add fields with `enrichLog(event, { ... })` from `server/utils/wide-event.ts`. Nested objects merge.

The canonical line already has `time` (ISO, UTC), `request_id`, `method`, `route` (param names, so join tokens stay out of the path), `status_code`, `duration_ms`, `outcome`, `user_id`, `user_email`, `organization_id`, and `organization_name`. Any `organization_id` without a name (top level or nested) gets `organization_name` filled in before the line is written, and `organization.id` gets `organization.name`. A line is written for mutations (`POST`, `PUT`, `PATCH`, `DELETE`), any 4xx/5xx, and anything slower than 1000ms. Successful fast `GET`s are skipped. Successful `/api/auth/get-session`, `/api/public/cards/{cardSlug}/interactions`, and `/api/public/image-proxy` are skipped too; failures and slow calls on those routes are kept.

On a new or changed API route, call `enrichLog` with the ids and addresses you would search when a user reports the action failed. Put them on a nested object so you do not overwrite `request_id`:

- Card create/update/delete: `card.id`, slug, owner email.
- Payments, requests, invitations, contact exchange, registration, check-in: the same kind of ids already used on those handlers (payment id, plan, decision, invitation id, invited email, event id, event title, organization name, registration id, result).

Do not log passwords, cookies, auth headers, invitation or join tokens, email HTML, or request bodies. Do log email addresses (`user_email`, `email.to`, payer, requester, invited address). Validation failures should name the fields, not the submitted values.

Email that outlives the response: notification helpers return `{ ok, template, to, error? }`. Set `email.attempted` and `email.to` before returning, then `trackEmailSends(event, promise)`. A failure after the response emits one extra error line with the same `request_id`. Do not `console.error` inside `.catch`.

No client logger. No per-query SQL logs. CLI scripts are not requests.

## Data-driven UI

- Build UI from **data objects + props**, not hardcoded copy scattered in templates.
- **Page owns the data.** Define (or fetch) the shape at page level and pass it down into components. Components stay presentational / interactive — they should not invent their own source-of-truth content.
- **Backend not ready yet?** Use a typed mock/fixture object on the page (same shape the API will later return). Swap the mock for `useQuery` / `$fetch` later without rewriting the component tree.
- Do not hardcode lists, labels, stats, or section content inside child components “just for the demo” — put them in the page-level mock so wiring real data is a drop-in.

## Components

- Feature components live in `app/features/<domain>/components/`; shared ones in `app/components/{ui,layout,icon}/`.
- No nesting below those folders. Do not create deep trees.
- Keep components simple and scalable — no over-abstraction.
- Semantic, accessible HTML. Prefer Nuxt UI primitives for forms, menus, dialogs, etc. when they fit.

## Styling

- Always use **rem** (or Tailwind scale equivalents).
- Prefer Tailwind design tokens / scale classes over arbitrary values when a warning says so (e.g. `px-[1.5rem]` → `px-6`). Fix Tailwind warnings; do not leave them.
- Aspect ratio: keep one side `1` and derive the other (e.g. `aspect-[1/1.25]`, not huge integers).
- Responsive: use project breakpoints already in use (`sm:`, etc.) unless asked otherwise. Brand tokens: `--color-dark`, `--color-gold` in `main.css`.
- Color mode defaults to **dark** (`nuxt.config` `colorMode.preference`).
- **No orphans:** never leave a single word alone on the last line of wrapped text. Whenever you add or change copy, check it at the widths it renders (mobile and desktop) and join the last two words with `&nbsp;` (e.g. `cards to&nbsp;share.`).

## Motion & media

- GSAP (+ ScrollTrigger), Lenis, Swiper, Spline appear on marketing/public surfaces — use existing patterns before inventing new ones.
- Prefer GSAP / Swiper MCPs when adding or debugging animation/carousel behavior.
- Respect `prefers-reduced-motion` when adding scroll/motion (see public landing patterns).

## Efficiency rules

- Read existing similar pages/components before writing new ones; match file naming and folder placement.
- Follow KISS. Never overengineer: no extra layers, helpers, config or abstractions the task does not need. The simplest solution that works wins.
- A question is not a request to change code. Answer it; edit only when asked.
- Do not expand scope (extra refactors, docs, drive-by cleanups) unless asked.
- No naive comments. Do not restate what the code or a name already says; comment only a non-obvious why (a constraint, a gotcha, a business rule).
- When unsure about Nuxt / Nuxt UI / Better Auth APIs, check MCP docs rather than assuming Next.js or older Nuxt patterns.
