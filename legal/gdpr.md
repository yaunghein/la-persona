# Privacy & GDPR Readiness: Functional Specification

Status: Draft · Owner: Duo Design Lab · Last updated: 2026-11-27

---

## 1. In plain words (read this first)

LA PERSONA stores personal data about two groups of people:

1. **Our users**: people who sign in, make cards, join communities and companies, register for events, and pay for subscriptions.
2. **People who are not our users**: visitors who type their name, phone, and email into the "Exchange Contact" form on someone's card. They never made an account, but we still keep their details.

GDPR (the EU privacy law) and most modern privacy laws give both groups the same basic rights:

- **Know** what we collect and why (a clear privacy policy).
- **Get a copy** of their data (export).
- **Have it deleted** (erasure), properly and everywhere, including uploaded photos.
- **Not have it kept forever** when it is no longer needed (retention).

Today the app does some of this well (no app permissions, careful logging, keys instead of bucket URLs). The gaps are:

- Users **cannot delete their own account**, even though our privacy policy promises they can.
- When an account is deleted, **photos stay in S3** and **community cards keep the person's name, phone, and email** (the card is only hidden, not wiped).
- Visitors who exchange contacts **are not told** what happens to their details, and **have no way to remove them**.
- Users **cannot download** their data.
- Old sessions, login tokens, and analytics **are never cleaned up**.
- The privacy policy is **too vague**: it does not name our service providers, what we collect, or how long we keep it.
- Google Analytics loads **without asking for consent** (only matters for EU visitors).

This document is the plan to close those gaps. Part A is the code work, Part B is the non-code work.

**Does GDPR legally apply to us?** Only if we offer the service to people in the EU or monitor their behaviour. LA PERSONA is Myanmar-focused today, so most of this is good practice rather than a legal must. The work below is cheap, protects users, keeps our own privacy policy honest, and is required anyway the day we sign an EU customer.

---

## 2. Scope

### In scope

| ID  | Workstream                                       | Priority |
| --- | ------------------------------------------------ | -------- |
| W1  | Self-serve account deletion + complete erasure   | P0       |
| W2  | Privacy notice on the contact-exchange form      | P0       |
| W3  | Privacy policy rewrite                           | P0       |
| W4  | Visitor self-removal link in the visitor email   | P1       |
| W5  | Data retention task                              | P1       |
| W6  | Personal data export                             | P2       |
| W7  | Analytics consent (only if serving EU traffic)   | P2       |
| W8  | Erasure in organization and card deletes         | P1       |

### Out of scope

- EU data hosting / region migration (decision in Part B).
- SOC 2 / ISO 27001 certification.
- Tests: none are added unless requested (per `AGENTS.md`).

---

## 3. Current state (verified in code)

| Area | Today | Gap |
| --- | --- | --- |
| Account deletion | Admin-only: `DELETE /api/admin/users/{userId}` → `deleteAccount` in `server/features/auth/user-admin.service.ts`. It explicitly forbids self-delete (`self_delete`). | No self-serve path. |
| Personal cards on delete | `deletePersonalOrganizationsForUser` deletes personal orgs; `card` rows cascade (`card.organizationId` → `onDelete: cascade`). | S3 objects under `organizations/{orgId}/` are never deleted. |
| Community cards on delete | `removeCommunityCardsOfUser` only sets `card.removedAt`; `card.userId` becomes `NULL` via FK `set null`. | `name`, `title`, `company`, `phone`, `email`, `website`, `avatarUrl`, `socials` stay in the DB. Contacts collected on that card stay too. |
| Company cards on delete | `vacateCompanyCards` ends the `card_assignment`. Card stays with the company (correct: it's the company's card). | Verify the holder's personal fields are cleared or left for the company to reassign. See W1.6. |
| Card delete (`DELETE /api/cards/{cardSlug}`) | `removeCard` soft-removes (keeps contacts). | Avatar remains in S3 forever. |
| Contact exchange (form) | `server/api/public/cards/[cardSlug]/contact-exchanges.post.ts` → `exchangeContactViaForm` saves to `contact_exchange` and emails both sides (`ContactExchange`, `ContactExchangeVisitor`). | No notice on the form (`app/pages/(public)/c/[slug].vue` ~line 1019). No removal link in the email. |
| Legacy table | `contact_exchange_before_platform` (name, phone, email, ownerEmail). | No retention decision. |
| Sessions / tokens | `session` stores `ipAddress`, `userAgent`. `verification` stores magic-link tokens. | Expired rows are never purged. |
| Analytics | `analytics` table (card views/clicks), `user_daily_activity`. Viewer is anonymous; view cookie `lp_viewed_{cardId}` is 10 min and holds no personal data. | Kept forever. |
| Google Analytics | `nuxt-gtag` in `nuxt.config.ts`, configured in `app/plugins/analytics.client.ts`. | Loads without consent. |
| Leads | `POST /api/public/leads` forwards to HubSpot. | HubSpot not disclosed in the policy. |
| Payments | `subscription_payment.receiptUrl` (S3 key), `paidByUserId` → `set null` on delete. | Retention period for receipts not defined. |
| Privacy policy | `app/pages/(public)/privacy-policy.vue`, data-driven sections. | Vague. No processors, retention, contact, or date. |
| Logs | Wide events include `user_email`, contact emails. | Log retention on Railway not documented. |

---

# PART A: Code implementation

Conventions for all workstreams: follow `AGENTS.md` (routes parse → authorize → service/repository → respond; errors via `server/utils/http-errors.ts`; `enrichLog` on every new or changed route; repositories are the only DB importers; no barrel files; no orphans in copy).

## W1. Self-serve account deletion + complete erasure (P0)

### User story

As a signed-in user, I can delete my account from my account menu. After confirming, I'm signed out. My personal cards, photos, contacts, labels, registrations, and feedback are gone, and my community cards no longer show my details.

### W1.1 Refactor the existing deletion into one erasure service

File: `server/features/auth/user-admin.service.ts` (or move the shared part to `server/features/auth/account.service.ts`, which already owns `deletePersonalOrganizationsForUser`).

Split `deleteAccount` into:

- `assertAccountDeletable(userId)`: the guards. Existing last-company-admin check (`last_company_admin`, 409), plus the new guards below.
- `eraseAccount(event, { userId, actorUserId })`: the erasure itself, used by **both** the admin route and the new self-serve route.

Keep the admin route's `self_delete` 403. Admins delete their own account through the self-serve route like everyone else.

New guards (all `409 conflict`):

| Code | Condition | Message |
| --- | --- | --- |
| `last_company_admin` | Existing check. | (unchanged) |
| `last_community_admin` | User is the only `admin` of a community (`countOwners(orgId) <= 1`). | "You're the only organizer of {name}. Ask LA PERSONA to add another organizer before deleting your&nbsp;account." |
| `platform_admin` | `user.role === 'admin'` (Thakhin). Self-serve only. | "Platform admins can't delete their own account. Ask another admin." |

### W1.2 Erasure order inside `eraseAccount`

1. **Collect S3 keys before any DB delete** (after deletion they can't be found):
   - For each personal org returned by `listOwnedPersonalOrganizationIds(userId)` (excluding `env.PLACEHOLDER_ORGANIZATION_ID`): prefix `organizations/{orgId}/`.
   - For community cards held by the user: `avatarUrl` (only if the key starts with `organizations/`, never `uploads/` defaults), passed through `objectStorageKey`.
   - `user.image` if it is one of our keys (social-login avatars are external URLs; skip those).
   - **Do not** collect `subscription_payment.receiptUrl` (kept for accounting, see Part B decision D3).
2. **DB work in one transaction** (`db.transaction`):
   1. `vacateCompanyCards({ userId, actorUserId }, tx)` (existing).
   2. **Scrub community cards** (new repository function `scrubCommunityCardsOfUser(userId, tx)` in `server/features/organization/community.repository.ts`, replacing `removeCommunityCardsOfUser` in this path). It does the same `removedAt` update, plus sets:
      `name = 'Deleted user'`, and `title`, `company`, `phone`, `phoneCountryCode`, `email`, `website`, `avatarUrl` set to `NULL`, `socials = []`, plus any bio/about rich-text column set to `NULL`. Keep `slug` (slug stays reserved) and `organizationId`.
   3. **Delete contacts collected on those community cards**: `DELETE FROM contact_exchange WHERE card_id IN (<scrubbed card ids>)`. They are the deleted user's address book. Labels cascade via `contact_label_assignment`.
   4. `deletePersonalOrganizationsForUser(userId)` (existing). Cards, contacts on them, events, etc. cascade.
   5. `auth.api.removeUser({ body: { userId } })` (existing). Sessions, accounts, memberships, `user_daily_activity`, `event_registration`, `feedback_submission`, `card_request`, `contact_label` cascade. `analytics.userId`, `card.userId`, `contact_exchange.laPersonaUserId`, `subscription_payment.paidByUserId` become `NULL`.

      Note: `auth.api.removeUser` uses its own DB connection, not `tx`. Run it **after** the transaction commits, as the last DB step. If it fails, the transaction work is already safe to re-run (idempotent).
3. **Delete S3 objects after commit**, best effort: `listObjectKeys(prefix)` + `deleteObject(key)` from `server/lib/object-storage.ts`. Wrap in `Promise.allSettled`. Count failures and return them. Never fail the request because of S3.
4. **Return** `{ account, deletedOrganizationIds, communityOrganizationIds, scrubbedCardIds, deletedObjectCount, failedObjectKeys }`.

What we intentionally **keep**, documented in the privacy policy:

- `contact_exchange` rows in **other users'** address books that hold the deleted user's details (`laPersonaUserId` is set to null). The deleted user shared them with that person, and that person's copy is their own record, the same as a paper card.
- `subscription_payment` rows and receipt files, for the accounting retention period (D3).
- Analytics rows (no personal data once `userId` is null; aggregated counts for the org).

### W1.3 New route

`server/api/me.delete.ts` → `DELETE /api/me`

Before writing it, check that no existing `server/api/me/index.*` conflicts.

```ts
export default defineEventHandler(async (event) => {
  const principal = requirePrincipal(event);
  if (principal.isImpersonated) throw forbidden('Impersonated sessions cannot delete the account.', 'impersonated');
  await parseRequestBody(event, DeleteOwnAccountRequest);
  const result = await deleteOwnAccount(event, principal);
  enrichLog(event, { account_deletion: { user_id, email, deleted_organization_ids, scrubbed_card_ids, deleted_object_count, failed_object_keys } });
  deleteCookie(...) // or rely on better-auth sign-out on the client
  return respondNoContent(event);
});
```

- **Request contract** (`shared/contracts/account.ts`): `DeleteOwnAccountRequest = z.object({ confirmEmail: z.email() })`. The server compares `confirmEmail` (trim, lowercase) with `principal.user.email`. On a mismatch it returns `400` with `details: [{ field: 'confirmEmail', message: 'Email does not match' }]`, never echoing the value.
- **Fresh session:** if `principal.session.createdAt` is older than 24 h, return `403 reauthentication_required`. The client then signs out and sends the user to `/sign-in?redirect=...` with a toast.
- **Service:** `deleteOwnAccount(event, principal)` in `user-admin.service.ts` (or `account.service.ts`): `assertAccountDeletable` + the `platform_admin` guard + `eraseAccount(event, { userId, actorUserId: userId })`.
- **Rate limit:** none needed (authenticated). CSRF is already covered by `02.access-boundary` (cross-site origin on a write → 403).
- **Status codes:** `204` success; `400` validation; `401` not signed in; `403` impersonated / reauth; `409` guards.

The admin route `server/api/admin/users/[userId].delete.ts` changes only to call the refactored `eraseAccount` and to log the new fields.

### W1.4 Confirmation email (optional, recommended)

- New template `app/emails/AccountDeleted.vue`, matching the style of existing templates.
- Sender `sendAccountDeletedEmail({ to })` in a new `server/features/auth/account.notifications.ts`, returning `{ ok, template, to, error? }`.
- Capture `principal.user.email` before deletion. Set `email.attempted` and `email.to`, then call `trackEmailSends(event, promise)`.
- Copy: "Your LA PERSONA account and its data have been deleted. If this wasn't you, reply to this&nbsp;email."

### W1.5 UI

- **Entry point:** `app/components/layout/user-menu.vue`. Add an item "Delete account" (`i-lucide-trash-2`, `color: 'error'`) above "Log out", in its own group.
- **Component:** `app/features/auth/components/delete-account-modal.vue` (folder is new; it auto-imports as `<AuthDeleteAccountModal>`). Use `UModal` + `UForm` with `DeleteOwnAccountRequest`.
  - Title: "Delete your account?"
  - Body: a list of what will be deleted (cards, photos, contacts, labels, event registrations) and what stays (copies other people saved of your card, payment records for accounting).
  - Input: "Type your email to confirm".
  - Button: `color="error"` "Delete account". It is disabled until the input matches; `UForm` disables while the request is awaited.
- **Mutation:** `useDeleteOwnAccountMutation` in `app/features/auth/composables/use-auth-queries.ts`. Create the file only if no auth queries file exists; otherwise add it to the existing one. On success: `authClient.signOut()`, `queryClient.clear()`, `navigateTo('/')`, toast "Your account was&nbsp;deleted."
- **Errors:** map the `409` codes and `reauthentication_required` to toasts with the server message (`api-errors` util).

### W1.6 Verify: company card fields on vacate

Read the rest of `vacateCompanyCards` (`server/features/organization/company.service.ts:307`). If the card keeps the departed holder's `name`, `phone`, `email`, `avatarUrl`, decide with the business (D4):

- (a) clear those fields on vacate, or
- (b) leave them for the company admin to overwrite and state that in the policy.

The recommendation is (a) for `phone`, `email`, and `avatarUrl`.

### W1 acceptance criteria

- [ ] User with a personal card + avatar deletes their account → the user row, personal org, cards, and contacts are gone, the S3 prefix `organizations/{personalOrgId}/` is empty, and the session is invalid.
- [ ] The user's community card returns the "unavailable" state; the DB row shows `name = 'Deleted user'`, the personal fields are null, and contacts collected on it are gone.
- [ ] Sole community organizer / sole company admin / Thakhin admin gets a 409 with a clear message, and nothing is deleted.
- [ ] Wrong confirm email → 400, nothing deleted.
- [ ] Impersonated session → 403.
- [ ] Admin delete (`DELETE /api/admin/users/{id}`) produces the same erasure.
- [ ] The wide event shows `account_deletion.*` and no tokens.
- [ ] `bun run typecheck` passes with 0 errors.

---

## W2. Privacy notice on the contact-exchange form (P0)

File: `app/pages/(public)/c/[slug].vue`, directly under the submit button (~line 1019, `type="submit"`, "Continue").

- Add one line of small text (`text-xs text-ink/60`, matching nearby muted text):

  > Your details go to {firstName} and you'll get their card by email. See our [Privacy&nbsp;Policy](/privacy-policy).

- `{firstName}` comes from the card data already loaded on the page (props/computed, not hardcoded).
- Link with `<NuxtLink :to="ROUTES...privacy">` if `shared/utils/routes.ts` has the route; otherwise add `privacyPolicy: '/privacy-policy'` there.
- Show it only in the **form** mode (anonymous visitor), not in seamless exchange.
- Check for orphans at 375 px and desktop widths.

No backend change. We rely on legitimate interest + the visitor's own action (they chose to share), so no consent checkbox is needed (decision D1).

Acceptance: the notice is visible on the form, the link opens the policy, and there's no orphan word at mobile or desktop width.

---

## W3. Privacy policy rewrite (P0)

File: `app/pages/(public)/privacy-policy.vue`. Keep the existing data-driven `sections` array; only the content changes. Final wording needs owner / legal sign-off (Part B).

Add or replace these sections:

1. **Who we are**: legal entity name, address, privacy contact email (D2).
2. **What we collect**:
   - Account: name, email, profile photo, sign-in provider (Google / LinkedIn / GitHub / magic link).
   - Card content you enter: name, title, company, phone, email, website, social links, photos.
   - Contact exchanges: details visitors type in (name, phone, email, company, position) and the card they used.
   - Event registrations and check-ins.
   - Payments: plan, amount, payment reference, receipt image.
   - Technical: IP address and browser info on sign-in sessions, card views and link clicks (anonymous), a 10-minute cookie to count views, and sign-in cookies.
   - Google Analytics (if enabled).
   - Landing-page enquiries.
3. **Why we use it (legal basis)**: run the service (contract); share your card and exchanged contacts (legitimate interest / your action); billing (legal obligation); analytics (legitimate interest or consent for EU, see W7); marketing enquiries (consent).
4. **Who we share it with (processors)**: Railway (hosting + database), Amazon Web Services S3 (`{AWS_REGION}`, file storage), Resend (email), HubSpot (landing-page enquiries), Google (sign-in, Calendar sync if you connect it, Analytics), LinkedIn and GitHub (sign-in), and the payment channel (D5). We do not sell data.
5. **Where it's stored**: region(s) and countries; international transfers.
6. **How long we keep it** (matches W5):
   - Account data until you delete your account.
   - Expired sessions: purged after 30 days.
   - Sign-in links: deleted after expiry.
   - Card analytics: 25 months.
   - Payment records and receipts: {D3} years.
   - Server logs: {D6} days.
7. **Contact exchange (visitors)**: what is shared, that the card holder keeps their copy, and how to remove it (W4 link, or email us).
8. **Your rights**: access/export (W6), correction (edit your card/profile), deletion (W1, in-app), objection, complaint to a supervisory authority. Response within 30 days.
9. **What deleting your account does**: the keep/delete list from W1.2.
10. **Cookies**: sign-in session cookie (required), `lp_viewed_*` (10 min, view counting, no personal data), Google Analytics cookies (if enabled; consent for EU, W7).
11. **Children**: not for under-16s.
12. **Changes**, plus a visible **"Last updated: {date}"**.

Also: split "Terms" and "Privacy" anchors so `/privacy-policy#privacy` works as a deep link from W2 and the emails.

---

## W4. Visitor self-removal link (P1)

Lets a non-user remove the contact they left on someone's card, without an account.

### Token

- New env var `PRIVACY_LINK_SECRET` (`ServerEnv`, `z.string().min(32)`). Declare it in `env.ts` and `.env.example`, and set it on Railway (staging + production).
- Token = `base64url(contactId) + '.' + base64url(HMAC-SHA256(PRIVACY_LINK_SECRET, 'contact-removal:' + contactId))`.
- Put the helpers in a self-contained module `server/lib/signed-token.ts`: `signContactRemovalToken(contactId)` and `verifyContactRemovalToken(token) → contactId | null`. Use `timingSafeEqual`.
- No expiry: the visitor may want removal months later, and the token only grants deleting that one row.

### Email

`app/emails/ContactExchangeVisitor.vue`: add a footer line:

> Don't want {ownerName} to keep your details? [Remove them](BASE_URL/contact-removal?token=…).

`sendContactExchangeVisitorEmail` (in `server/features/contact/contact.notifications.ts`) receives `contactId` (from `exchangeContactViaForm`'s `saved.id`) and builds the URL with `env.BASE_URL`.

### Page

`app/pages/(public)/contact-removal.vue` (public, SSR fine). It reads `token` from the query. Since a GET never changes state, it shows a confirm screen ("Remove your details from {ownerName}'s contacts?" + button). Data access goes through a new `useRemoveContactMutation` in `app/features/contact/composables/use-contact-queries.ts`. On success it shows "Your details were removed." Keep the page thin; put the UI in `app/features/contact/components/removal-confirm.vue`.

To show `{ownerName}` without leaking data, skip a lookup and use generic copy ("Remove your details from this card holder's contacts?"). This avoids a GET endpoint that resolves tokens.

### API

`server/api/public/contact-removals.post.ts` → `POST /api/public/contact-removals`

- Body contract `CreateContactRemovalRequest = z.object({ token: z.string().min(10).max(512) })` in `shared/contracts/contact.ts`.
- `verifyContactRemovalToken` → null → `400 invalid_token`.
- Repository `deleteContact(contactId)` (reuse the existing one used by `server/api/contacts/[contactId].delete.ts` if it exists). If the row is already gone, still `204` (idempotent; no existence oracle).
- Only rows with `source = 'public_form'` may be removed this way. Otherwise `204` with no-op, and log `result: 'skipped'`.
- Response: `204 No Content`.
- `enrichLog(event, { contact_removal: { contact_id, card_id, result: 'removed' | 'not_found' | 'skipped' } })`. Never log the token.
- **Rate limit** in `nuxt.config.ts` `routeRules`: `'/api/public/contact-removals': { security: { rateLimiter: rateLimit(5) } }`.

Do we notify the card owner? No (decision D1 default). The contact silently disappears from their list.

### Acceptance

- [ ] New form exchanges send an email with a working removal link; removal deletes exactly that `contact_exchange` row and its label assignments.
- [ ] A tampered token → 400; a reused token → 204 and nothing breaks.
- [ ] Seamless (member) exchanges are not removable via this path.

Older exchanges (before W4 ships) have no link. Those visitors use the privacy email (Part B runbook).

---

## W5. Data retention task (P1)

New Nitro task `server/tasks/privacy/retention.ts`, following the `subscriptions:expire` pattern (`defineTask`, `logger.info({ task, ...counts })` only when something was deleted).

Schedule in `nuxt.config.ts` `nitro.scheduledTasks`:

```ts
// 03:00 Yangon (UTC+6:30): off-peak.
'30 20 * * *': ['privacy:retention'],
```

The task must be idempotent and safe to run on every instance, like `subscriptions:expire`.

| Data | Rule | Repository function (new) |
| --- | --- | --- |
| `session` | `expires_at < now() - 30 days` | `deleteExpiredSessions(before)` in `server/features/auth/account.repository.ts` |
| `verification` (magic links) | `expires_at < now()` | `deleteExpiredVerifications(now)` in the same file |
| `analytics` | `created_at < now() - 25 months` | `deleteCardInteractionsBefore(date)` in `server/features/analytics/card-interaction.repository.ts` |
| `user_daily_activity` | `day < now() - 25 months` | `deleteUserActivityBefore(date)` in `server/features/analytics/user-activity.repository.ts` |
| `contact_exchange_before_platform` | Per D7: purge or migrate, then drop the table. | One-off script, not part of this task. |
| Removed cards with no holder (`removed_at IS NOT NULL AND user_id IS NULL`) | Ensure personal fields are null (the W1 scrub, catches older deletions). | `scrubOrphanedRemovedCards()` in `server/features/card/card.repository.ts` |

- Delete in batches (`DELETE ... WHERE id IN (SELECT id ... LIMIT 5000)` in a loop) so locks stay short.
- Before turning on the analytics rule, check that no analytics UI offers a range longer than 24 months (`server/features/analytics/card-analytics.service.ts`, `community-insights.repository.ts`).
- **One-time backfill:** run `scrubOrphanedRemovedCards` for accounts deleted before W1 shipped. Run it via the task, or `GET /_nitro/tasks/privacy:retention` in dev, and `runTask` from a script in production (same as `cards:backfill-community`).

Acceptance: running the task twice in a row deletes nothing the second time; counts appear in the logs; analytics charts for the last 24 months are unchanged.

---

## W6. Personal data export (P2)

Route: `server/api/me/data-export.get.ts` → `GET /api/me/data-export`

- Signed-in only. Returns `application/json` with `Content-Disposition: attachment; filename="la-persona-data-{yyyy-mm-dd}.json"`.
- Service `exportAccountData(userId)` in `server/features/auth/account.service.ts`. It reads through the existing repositories (add `list…ByUser` functions where missing):
  - `profile`: id, name, email, image (resolved URL), createdAt, sign-in providers (provider id only, **never** tokens from `account`).
  - `organizations`: name, type, role, joinedAt.
  - `cards`: all fields incl. removed ones, image URLs resolved with `resolveObjectStorageUrl`.
  - `contacts`: `contact_exchange` rows on the user's cards + labels.
  - `contactLabels`
  - `eventRegistrations`: event title, date, status, check-in time.
  - `payments`: plan, amount, status, reference, createdAt, receipt URL.
  - `feedback`
  - `sharedWithOthers`: count of contacts in other people's books where `laPersonaUserId = userId` (count only; the rows belong to others).
- No pagination (one person's data). If it's ever slow, the wide event will flag it (>1000 ms).
- `enrichLog(event, { data_export: { user_id, sections: { cards: n, contacts: n, ... } } })`.
- UI: user menu item "Download my data" → `window.location.href = '/api/me/data-export'` (a plain link with `download`; no query needed).

Acceptance: the file downloads; it contains no tokens, password hashes, or other users' account data; typecheck is clean.

---

## W7. Analytics consent (P2, only if serving EU visitors)

Today `nuxt-gtag` loads GA on every page. For EU/UK visitors this needs prior consent (ePrivacy).

- Set `gtag: { initMode: 'manual' }` in `nuxt.config.ts`, then initialise it in `app/plugins/analytics.client.ts` only after consent (or use Google Consent Mode v2 defaults `analytics_storage: 'denied'`).
- New shared component `app/components/ui/cookie-consent.vue`, rendered from the public layout: "We use Google Analytics to understand how cards are used. [Accept] [Decline]". Store the choice in a first-party cookie `lp_consent` (1 year) via `useCookie`.
- Show it only on public/marketing surfaces; respect `prefers-reduced-motion` for any entrance animation.
- Our own `analytics` table is first-party, anonymous, and not a tracking cookie. No consent is needed; disclose it in the policy.

Alternative (simpler): skip the banner and turn GA off for EU countries. Decide in D8.

---

## W8. Erasure in organization and card deletes (P1)

- **`DELETE /api/admin/organizations/{organizationId}`**: after the DB delete commits, delete S3 prefix `organizations/{organizationId}/` (best effort, as in W1.2 step 3). Brand assets `uploads/{kind}-{orgSlug}.*` already have their own delete route. Also delete them here via `brand-asset.service.ts` `deleteBrandAsset` for each kind present (`listBrandAssets`). Log `deleted_object_count`.
- **`DELETE /api/me/organizations/{orgSlug}`** (leave org): if that path removes the user's card (community leave → soft remove), apply the same scrub as W1.2 step 2 for that one card **only if** the business agrees that leaving = forgetting (D9). Otherwise leave as is.
- **`DELETE /api/cards/{cardSlug}`** (personal card soft-remove): delete the card's `avatarUrl` object if it's an `organizations/` key and no other card references it, and null the column. Keep the row (contacts survive, per the existing comment).

Acceptance: deleting an org in Thakhin leaves no objects under its prefix; deleting a personal card removes its avatar file.

---

## Implementation order

1. **W2 + W3**: copy only, ships in a day, and makes the policy honest.
2. **W1** (+ W1.6 decision) and **W8**: the core erasure work.
3. **W5**: retention task + one-time backfill scrub.
4. **W4**: needs the env var on Railway before deploy.
5. **W6**
6. **W7** (only if EU traffic matters)

Each step: `bun run typecheck` (0 errors), `bun run format`, manual check on staging (`railway run -e staging …` for tasks), then promote.

Suggested commits:

- `feat(auth): let users delete their own account`
- `feat(contact): add privacy notice to the exchange form`
- `docs(privacy): rewrite the privacy policy`
- `feat(contact): let visitors remove an exchanged contact`
- `feat(privacy): add data retention task`
- `feat(auth): add personal data export`

---

# PART B: Non-code work

These need a person (owner / ops / legal), not a developer.

## Decisions to make before or while coding

| ID | Decision | Recommendation |
| --- | --- | --- |
| D1 | Legal basis for contact exchange: legitimate interest + notice (no checkbox) vs consent checkbox. Notify the owner when a visitor removes themselves? | Legitimate interest + notice. No owner notification. |
| D2 | Privacy contact address. | A shared inbox, e.g. `privacy@<domain>`, monitored weekly. |
| D3 | How long to keep payment records and receipt images. | Check Myanmar tax rules with an accountant; typically 5–7 years. |
| D4 | Company card on member departure: clear personal fields or leave them to the company? | Clear phone, email, photo. |
| D5 | List of payment channels/providers to name in the policy. | — |
| D6 | Server log retention (logs contain user emails). | Check Railway's log retention; 30–90 days. |
| D7 | `contact_exchange_before_platform` legacy data: migrate into `contact_exchange`, or delete. | Delete if older than 2 years and never migrated. |
| D8 | EU visitors: consent banner or no GA for EU. | Decide only once there is real EU traffic. |
| D9 | Does leaving a community erase that card's personal fields? | Yes. |

## Documents and process

1. **Privacy policy sign-off**: have W3 wording reviewed by a lawyer (Myanmar + GDPR basics if selling to the EU). Add the effective date.
2. **Record of Processing Activities (RoPA)**: a spreadsheet listing each data category (accounts, cards, contacts, events, payments, analytics, logs, leads), purpose, legal basis, processor, location, and retention. One page. GDPR Art. 30.
3. **Sub-processor list**: Railway, AWS, Resend, HubSpot, Google, LinkedIn, GitHub, payment provider(s). For each: what data, region, and a link to their DPA.
4. **Sign / accept processor DPAs**: most (AWS, Resend, HubSpot, Google) offer click-through DPAs in their dashboards. Accept them and save PDFs in a shared drive.
5. **Our own DPA template**: for company and community customers (they are the controller for their members' cards; we are the processor). Only urgent once a business customer asks. A lawyer can adapt a standard template.
6. **Data subject request runbook** (internal doc):
   - Where requests arrive (D2 inbox), who owns them, and the 30-day deadline.
   - Deletion for non-users / pre-W4 visitors: how to find `contact_exchange` rows by email in Thakhin or via a Railway DB query, and delete them.
   - Export for users who can't sign in.
   - Log each request (date, type, done date).
7. **Breach response plan** (one page):
   - Who decides; how to assess.
   - Notify affected customers within 24–48 h and the authority within 72 h where GDPR applies.
   - Template email.
   - Contacts at Railway/AWS.
8. **Access review**: quarterly check of who has Thakhin admin (`ADMIN_EMAILS`), Railway, AWS, Resend, and HubSpot access. Remove ex-staff. Enable 2FA on all of them.
9. **Secrets hygiene**: rotate `AWS_SECRET_ACCESS_KEY`, `RESEND_API_KEY`, and `BETTER_AUTH_SECRET` when someone leaves. Store `PRIVACY_LINK_SECRET` only in Railway.
10. **Data location decision**: write down the current DB (Railway region) and S3 (`AWS_REGION`) locations. If EU customers come, decide between EU hosting and Standard Contractual Clauses + Transfer Impact Assessment.
11. **Staff awareness**: a short note to the team: don't export contact lists to personal tools, don't paste user data into chat or AI tools, and route privacy requests to the inbox.
12. **Customer-facing answers**: prepare a short "Security & Privacy" FAQ (hosting, encryption, deletion, DPA available, sub-processors) for sales to send to business customers.
13. **Annual review**: re-check this document, the policy, the sub-processors, and the retention numbers once a year.

---

## Glossary

- **Controller**: decides why and how personal data is used (a company using LA PERSONA for its staff cards; LA PERSONA itself for its own users).
- **Processor**: handles data on a controller's behalf (LA PERSONA for a company customer; Resend for us).
- **DPA (Data Processing Agreement)**: the contract between controller and processor about how data is handled.
- **Erasure**: deleting personal data everywhere it lives, including files and copies we control.
- **Retention**: how long we keep data before deleting it automatically.
- **DSAR (Data Subject Access Request)**: a person asking what data we hold about them.
- **RoPA**: Record of Processing Activities, the internal list of what data we process and why.
- **SCCs**: Standard Contractual Clauses, EU contract terms that allow data to be stored outside the EU.
