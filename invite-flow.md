Full Flow (Updated and aligned)

1. Admin invitation management page
   @app/pages/thakhin/invitations/index.vue becomes a management page like your contacts page:

Main table shows all created invitations.
Columns (suggested): email, org name, card, plan, free months, status, expires at, created at.
Top-right button: Create Invitation.
Clicking opens right-side slide-over with form. 2) Create Invitation form (slide-over)
Fields:

email (new, required)
organization name (required)
card (select from DB, required)
subscription plan (select from DB, required)
free month period (number, required; this controls period)
expiration in minutes (number, required)
On submit:

create organization now
create custom invitation row linked to:
email
organizationId
cardId
subscriptionPlanId
freeMonths
expiresAt
status=pending
token/id for URL
show generated link /platform/invitations/{token} in table row (or computed). 3) Send email action from table row
Row action button Send Email.
Sends invitation link to stored email.
Track sentAt (optional but recommended).
Can also support resend. 4) Signup/signin behavior (default-org prevention)
During user creation:

if there is a pending + unexpired custom invitation for user.email:
skip personal org creation (setupDefaultOrganization)
else:
existing behavior (create personal org + default card)
This avoids FK deletion cleanup in most cases.

5. Recipient clicks invite link
   Route: /platform/invitations/{token}

If not logged in:
redirect to sign in
preserve return path so user comes back to same URL after login
If logged in:
run accept flow (server-side API) 6) Accept flow (transactional)
Server validates:

invitation exists
status is pending
not expired
not consumed
optional: logged-in user email matches invitation email (recommended strict mode)
Then:

attach user to invitation organization (member row)
link user to invitation card context
create subscription/card-subscription records using:
selected subscriptionPlanId
period based only on freeMonths (per your latest rule)
set invite status accepted + acceptedAt + acceptedByUserId 7) Legacy fallback cleanup (only if needed)
If personal org exists anyway (old data/race):

safely remove/archive before finalizing acceptance.
this is fallback, not primary path. 8) Post-accept UX
On invitation page show fancy state:

pending/valid -> “Accept”
accepted -> success
expired/invalid/used -> proper error state
optional redirect button to org dashboard
Proposed invitation statuses
pending
accepted
expired (derived or materialized)
cancelled
