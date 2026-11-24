// Steps mirror tests/guides/02.invitations.md; keep the numbers in sync.
import { gotoHydrated, uniqueEmail } from './support/auth';
import {
  accept,
  draft,
  emailsTo,
  expectError,
  setEmailDown,
  sql,
  waitForEmail,
  type Person,
  type World,
} from './support/companies';
import {
  addMember,
  addOrganizer,
  communityCard,
  createCommunity,
  expect,
  inviteToCommunity,
  membership,
  pendingInvitationId,
  personalSpace,
  test,
  type Community,
} from './support/communities';

const ORGANIZER_SUBJECT = 'invited to organize';
const MEMBER_SUBJECT = 'invited to join';
const CARD_READY_SUBJECT = 'card is ready';

async function expireInvitation(invitationId: string) {
  await sql(
    `update invitation set expires_at = now() - interval '1 day' where id = $1`,
    [invitationId]
  );
}

async function invite(
  organizer: Person,
  community: Community,
  email: string,
  role: 'member' | 'volunteer' = 'member'
) {
  const response = await inviteToCommunity(organizer, community, email, role);
  expect(response.status(), await response.text()).toBe(201);
  return (await response.json()).id as string;
}

function cancel(organizer: Person, invitationId: string) {
  return organizer.api.patch(`/api/invitations/${invitationId}`, {
    data: { status: 'canceled' },
  });
}

async function joinToken(organizer: Person, community: Community) {
  const response = await organizer.api.get(
    `/api/organizations/${community.slug}/join-link`
  );
  expect(response.status()).toBe(200);
  return (await response.json()).url.split('/').pop() as string;
}

function joinByLink(person: Person, token: string) {
  return person.api.post(`/api/join-links/${token}/members`);
}

async function organizationCount(person: Person) {
  const response = await person.api.get('/api/me/organizations');
  return (await response.json()).items.length as number;
}

// ── Onboarding helpers ────────────────────────────────────────────────────

async function unclaimedCard(world: World) {
  const T = await world.thakhin();
  const response = await T.api.post('/api/admin/cards', { data: {} });
  expect(response.status(), await response.text()).toBe(201);
  return (await response.json()).id as string;
}

function createOnboarding(
  T: Person,
  email: string,
  cardId: string,
  overrides: Record<string, unknown> = {}
) {
  return T.api.post('/api/admin/onboarding-invitations', {
    data: {
      email,
      organizationName: 'Pat Space',
      cardId,
      subscriptionPlanCode: 'standard',
      amountMinor: 0,
      freeMonths: 3,
      expirationMinutes: 1440,
      sendNow: true,
      ...overrides,
    },
  });
}

async function onboarding(world: World, email: string) {
  const T = await world.thakhin();
  const cardId = await unclaimedCard(world);
  const response = await createOnboarding(T, email, cardId);
  expect(response.status(), await response.text()).toBe(201);
  const created = await response.json();
  return {
    T,
    cardId,
    id: created.id as string,
    organizationId: created.organizationId as string,
  };
}

function acceptOnboarding(person: Person, invitationId: string) {
  return person.api.patch(`/api/onboarding-invitations/${invitationId}`, {
    data: { status: 'accepted' },
  });
}

function cancelOnboarding(T: Person, invitationId: string) {
  return T.api.patch(`/api/admin/onboarding-invitations/${invitationId}`, {
    data: { status: 'canceled' },
  });
}

async function systemPayments(invitationId: string) {
  return sql(`select id from subscription_payment where receipt_url = $1`, [
    `system:onboarding-invitation:${invitationId}`,
  ]);
}

async function errorMessage(response: { json(): Promise<any> }) {
  const body = await response.json();
  return String(body.data?.message ?? body.message ?? body.statusMessage);
}

async function statuses(responses: { status(): number }[]) {
  return responses.map((response) => response.status()).sort();
}

test.describe('Part 1: Organizer invites (Thakhin)', () => {
  test('1.1 create a community with an organizer', async ({ world }) => {
    const T = await world.thakhin();
    const email = uniqueEmail('org');
    const response = await T.api.post('/api/admin/organizations', {
      data: {
        name: `Yangon Devs ${crypto.randomUUID().slice(0, 6)}`,
        type: 'community',
        ownerEmail: email,
      },
    });
    expect(response.status(), await response.text()).toBe(201);
    const created = await response.json();
    world.communityIds.push(created.id);
    expect(created.memberCount).toBe(0);
    await waitForEmail(email, ORGANIZER_SUBJECT);

    const [row] = await sql(
      `select role, status, expires_at from invitation where organization_id = $1`,
      [created.id]
    );
    expect(row).toMatchObject({ role: 'admin', status: 'pending' });
    const days = (row!.expires_at.getTime() - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(6.9);
    expect(days).toBeLessThan(7.1);
  });

  test('1.2 organizer accepts as a brand-new account', async ({ world }) => {
    const T = await world.thakhin();
    const email = uniqueEmail('org');
    const response = await T.api.post('/api/admin/organizations', {
      data: {
        name: `Yangon Devs ${crypto.randomUUID().slice(0, 6)}`,
        type: 'community',
        ownerEmail: email,
      },
    });
    const community = await response.json();
    world.communityIds.push(community.id);
    const invitationId = await pendingInvitationId(community, email);

    const O = await world.person('org', email);
    const accepted = await accept(O, invitationId);
    expect(accepted.status(), await accepted.text()).toBe(200);
    expect((await accepted.json()).redirectTo).toContain(community.slug);

    expect((await membership(community, O))?.role).toBe('admin');
    expect(await communityCard(community, O)).not.toBeNull();
    await personalSpace(O);
  });

  test('1.3 invite a second organizer later', async ({ world }) => {
    const { community } = await createCommunity(world);
    const O2 = await addOrganizer(world, community);
    expect((await membership(community, O2))?.role).toBe('admin');
  });

  test('1.3a inviting the same organizer twice refreshes the invite', async ({
    world,
  }) => {
    const T = await world.thakhin();
    const { community } = await createCommunity(world);
    const email = uniqueEmail('org2');
    const path = `/api/admin/organizations/${community.id}/invitations`;

    const first = await (await T.api.post(path, { data: { email } })).json();
    await sql(
      `update invitation set expires_at = now() + interval '1 day' where id = $1`,
      [first.id]
    );
    const again = await T.api.post(path, { data: { email } });
    expect(again.status()).toBe(201);
    expect((await again.json()).id).toBe(first.id);

    const rows = await sql(
      `select expires_at from invitation where organization_id = $1 and email = $2 and status = 'pending'`,
      [community.id, email]
    );
    expect(rows).toHaveLength(1);
    expect(
      (rows[0]!.expires_at.getTime() - Date.now()) / 86_400_000
    ).toBeGreaterThan(6.9);
    await expect.poll(() => emailsTo(email, ORGANIZER_SUBJECT)).toBe(2);

    const O2 = await world.person('org2', email);
    expect((await accept(O2, first.id)).status()).toBe(200);
  });

  test('1.4 organizer invite to someone already in the community', async ({
    world,
  }) => {
    const T = await world.thakhin();
    const { community, O } = await createCommunity(world);
    const response = await T.api.post(
      `/api/admin/organizations/${community.id}/invitations`,
      {
        data: { email: O.email },
      }
    );
    await expectError(
      response,
      409,
      'This person is already a member of this community.'
    );
  });

  test('1.5 organizer invites only exist for communities', async ({
    world,
  }) => {
    const T = await world.thakhin();
    const company = await world.company();
    const response = await T.api.post(
      `/api/admin/organizations/${company.id}/invitations`,
      {
        data: { email: uniqueEmail('x') },
      }
    );
    await expectError(response, 409, 'Only communities have organizers.');
  });

  test('1.6 expired organizer invite', async ({ world }) => {
    const T = await world.thakhin();
    const { community } = await createCommunity(world);
    const email = uniqueEmail('new');
    const invited = await (
      await T.api.post(`/api/admin/organizations/${community.id}/invitations`, {
        data: { email },
      })
    ).json();
    await expireInvitation(invited.id);
    const N = await world.person('new', email);

    const preview = await (
      await N.api.get(`/api/invitations/${invited.id}`)
    ).json();
    expect(preview.expired).toBe(true);
    await expectError(
      await accept(N, invited.id),
      409,
      'expired or was already processed'
    );
  });

  test('1.7 nobody else can accept an organizer invite', async ({ world }) => {
    const T = await world.thakhin();
    const { community, O } = await createCommunity(world);
    const email = uniqueEmail('new');
    const invited = await (
      await T.api.post(`/api/admin/organizations/${community.id}/invitations`, {
        data: { email },
      })
    ).json();
    await expectError(
      await accept(O, invited.id),
      403,
      'Only the invitee can accept this invitation.'
    );
    const [row] = await sql(`select status from invitation where id = $1`, [
      invited.id,
    ]);
    expect(row?.status).toBe('pending');
  });
});

test.describe('Part 2: Member and volunteer invites (Organizer)', () => {
  test('2.1 invite a member', async ({ world }) => {
    const { community, O } = await createCommunity(world);
    const email = uniqueEmail('member');
    await invite(O, community, email);
    await waitForEmail(email, MEMBER_SUBJECT);
    const members = await (
      await O.api.get(`/api/organizations/${community.slug}/members`)
    ).json();
    expect(members.items).toContainEqual(
      expect.objectContaining({ email, status: 'pending', kind: 'invitation' })
    );
  });

  test('2.2 invite a volunteer', async ({ world }) => {
    const { community, O } = await createCommunity(world);
    const email = uniqueEmail('vol');
    await invite(O, community, email, 'volunteer');
    await waitForEmail(email, 'invited to volunteer');
    const members = await (
      await O.api.get(`/api/organizations/${community.slug}/members`)
    ).json();
    expect(members.items).toContainEqual(
      expect.objectContaining({
        email,
        memberRole: 'volunteer',
        status: 'pending',
      })
    );
  });

  test('2.3 existing user accepts', async ({ world }) => {
    const { community, O } = await createCommunity(world);
    const M = await world.person('member');
    const space = await personalSpace(M);
    await sql(
      `insert into card (id, first_name, slug, position, phone, email, organization_id, user_id)
       values ($1, 'Mya', $1, 'Engineer', '091234567', $2, $3, $4)`,
      [`p${crypto.randomUUID().slice(0, 12)}`, M.email, space.id, M.userId]
    );
    const id = await invite(O, community, M.email);
    expect((await accept(M, id)).status()).toBe(200);

    expect((await membership(community, M))?.role).toBe('member');
    const [card] = await sql(
      `select first_name, position, phone from card where organization_id = $1 and user_id = $2`,
      [community.id, M.userId]
    );
    expect(card).toMatchObject({
      first_name: 'Mya',
      position: 'Engineer',
      phone: '091234567',
    });
    const personal = await sql(
      `select id from card where organization_id = $1`,
      [space.id]
    );
    expect(personal).toHaveLength(1);
  });

  test('2.4 new user accepts', async ({ world }) => {
    const { community, O } = await createCommunity(world);
    const email = uniqueEmail('new');
    const id = await invite(O, community, email);
    const N = await world.person('new', email);
    expect((await accept(N, id)).status()).toBe(200);
    expect((await membership(community, N))?.role).toBe('member');
    expect(await communityCard(community, N)).not.toBeNull();
    await personalSpace(N);
  });

  test('2.5 volunteer accepts', async ({ world }) => {
    const { community, O } = await createCommunity(world);
    const VOL = await addMember(world, community, O, 'vol', 'volunteer');
    expect((await membership(community, VOL))?.role).toBe('volunteer');
    expect(
      (
        await VOL.api.get(`/api/organizations/${community.slug}/members`)
      ).status()
    ).toBe(403);
    expect(
      (
        await VOL.api.get(`/api/organizations/${community.slug}/insights`)
      ).status()
    ).toBe(403);
  });

  test('2.6 wrong account sees a masked address', async ({ world }) => {
    const { community, O } = await createCommunity(world);
    const email = uniqueEmail('member');
    const id = await invite(O, community, email);
    const X = await world.person('outsider');

    const preview = await X.api.get(`/api/invitations/${id}`);
    expect(preview.status()).toBe(403);
    const message = await errorMessage(preview);
    expect(message).toContain('@test.local');
    expect(message).not.toContain(email);

    await expectError(
      await accept(X, id),
      403,
      'Only the invitee can accept this invitation.'
    );
    expect(await membership(community, X)).toBeNull();
  });

  test("2.7 email case doesn't matter", async ({ world }) => {
    const { community, O } = await createCommunity(world);
    const email = uniqueEmail('case');
    const id = await invite(O, community, email.toUpperCase());
    const [row] = await sql(`select email from invitation where id = $1`, [id]);
    expect(row?.email).toBe(email);
    const person = await world.person('case', email);
    expect((await accept(person, id)).status()).toBe(200);
  });

  test('2.8 re-sending an invite replaces it', async ({ world }) => {
    const { community, O } = await createCommunity(world);
    const email = uniqueEmail('vol2');
    const first = await invite(O, community, email);
    const second = await invite(O, community, email);
    expect(second).toBe(first);
    const rows = await sql(
      `select id from invitation where organization_id = $1 and email = $2 and status = 'pending'`,
      [community.id, email]
    );
    expect(rows).toHaveLength(1);
    await expect.poll(() => emailsTo(email, MEMBER_SUBJECT)).toBe(2);
  });

  test('2.9 invite someone already in the community', async ({ world }) => {
    const { community, O } = await createCommunity(world);
    const M = await addMember(world, community, O, 'member');
    const before = await emailsTo(M.email, MEMBER_SUBJECT);
    const response = await inviteToCommunity(O, community, M.email);
    await expectError(response, 400, 'already a member');
    expect(await emailsTo(M.email, MEMBER_SUBJECT)).toBe(before);
  });

  test("2.10 organizers can't grant Organizer", async ({ world }) => {
    const { community, O } = await createCommunity(world);
    const email = uniqueEmail('x');
    const response = await O.api.post(
      `/api/organizations/${community.slug}/invitations`,
      {
        data: { email, role: 'admin' },
      }
    );
    await expectError(response, 400);
    expect(JSON.stringify(await response.json())).toContain('role');
    expect(
      await sql(`select id from invitation where email = $1`, [email])
    ).toHaveLength(0);
  });

  test('2.11 cancel an invite', async ({ world }) => {
    const { community, O } = await createCommunity(world);
    const email = uniqueEmail('vol2');
    const id = await invite(O, community, email);
    const cancelled = await cancel(O, id);
    expect(cancelled.status()).toBe(200);
    const person = await world.person('vol2', email);
    expect(
      (await (await person.api.get(`/api/invitations/${id}`)).json()).status
    ).toBe('canceled');
    await expectError(await accept(person, id), 409);
  });

  test('2.12 expired member invite', async ({ world }) => {
    const { community, O } = await createCommunity(world);
    const email = uniqueEmail('late');
    const id = await invite(O, community, email);
    await expireInvitation(id);
    const person = await world.person('late', email);
    await expectError(await accept(person, id), 409);

    const fresh = await invite(O, community, email);
    expect((await accept(person, fresh)).status()).toBe(200);
  });

  test('2.13 accept twice', async ({ world }) => {
    const { community, O } = await createCommunity(world);
    const email = uniqueEmail('member');
    const id = await invite(O, community, email);
    const M = await world.person('member', email);
    expect((await accept(M, id)).status()).toBe(200);
    expect(
      (await (await M.api.get(`/api/invitations/${id}`)).json()).alreadyMember
    ).toBe(true);
    expect((await accept(M, id)).status()).toBe(200);
  });

  test('2.14 signed-out preview stays private', async ({ world }) => {
    const { community, O } = await createCommunity(world);
    const email = uniqueEmail('member');
    const id = await invite(O, community, email);
    const visitor = await world.anonymous();

    expect((await visitor.request.get(`/api/invitations/${id}`)).status()).toBe(
      401
    );
    const open = await visitor.request.get(`/api/public/invitations/${id}`);
    expect(await open.json()).toEqual({ email });

    expect((await cancel(O, id)).status()).toBe(200);
    expect(
      (await visitor.request.get(`/api/public/invitations/${id}`)).status()
    ).toBe(404);
  });
});

test.describe('Part 3: Only the invitee joins', () => {
  test('3.1 resend a pending invite', async ({ world }) => {
    test.slow();
    const { community, O } = await createCommunity(world);
    const email = uniqueEmail('later');
    await invite(O, community, email);
    const page = await O.context.newPage();
    await gotoHydrated(page, `/platform/${community.slug}/members`);
    await page
      .locator('tr', { hasText: email })
      .locator('button')
      .last()
      .click();
    await page.getByRole('menuitem', { name: 'Resend invite' }).click();
    await expect(page.getByText('Invite sent again').first()).toBeVisible();
    await expect.poll(() => emailsTo(email, MEMBER_SUBJECT)).toBe(2);
    const rows = await sql(
      `select id from invitation where organization_id = $1 and email = $2 and status = 'pending'`,
      [community.id, email]
    );
    expect(rows).toHaveLength(1);
  });

  test("3.2 organizers can't accept for an existing user", async ({
    world,
  }) => {
    const { community, O } = await createCommunity(world);
    const X = await world.person('outsider');
    const id = await invite(O, community, X.email);
    await expectError(
      await accept(O, id),
      403,
      'Only the invitee can accept this invitation.'
    );
    expect(await membership(community, X)).toBeNull();
    expect(await communityCard(community, X)).toBeNull();
  });

  test('3.3 expired invite, resent', async ({ world }) => {
    const { community, O } = await createCommunity(world);
    const X = await world.person('outsider');
    const id = await invite(O, community, X.email);
    await expireInvitation(id);
    await expectError(await accept(O, id), 403);
    const fresh = await invite(O, community, X.email);
    expect((await accept(X, fresh)).status()).toBe(200);
  });

  test('3.4 company invites', async ({ world }) => {
    const company = await world.company();
    const A = await world.person('admin');
    await world.hire(company, A, { role: 'admin' });
    const invited = await world.invite(company, draft(uniqueEmail('m1')));
    await expectError(
      await accept(A, invited.invitationId),
      403,
      'Only the invitee can accept this invitation.'
    );
  });

  test('3.5 organizer invites have no resend here', async ({ world }) => {
    test.slow();
    const T = await world.thakhin();
    const { community, O } = await createCommunity(world);
    const email = uniqueEmail('org2');
    await T.api.post(`/api/admin/organizations/${community.id}/invitations`, {
      data: { email },
    });
    const page = await O.context.newPage();
    await gotoHydrated(page, `/platform/${community.slug}/members`);
    await page
      .locator('tr', { hasText: email })
      .locator('button')
      .last()
      .click();
    await expect(page.getByRole('menuitem', { name: 'Cancel' })).toBeVisible();
    await expect(
      page.getByRole('menuitem', { name: 'Resend invite' })
    ).toHaveCount(0);
  });
});

test.describe('Part 4: Join links', () => {
  test('4.1 copy the link', async ({ world }) => {
    const { community, O } = await createCommunity(world);
    const first = await joinToken(O, community);
    expect(await joinToken(O, community)).toBe(first);
  });

  test('4.2 preview signed out', async ({ world }) => {
    const { community, O } = await createCommunity(world);
    const token = await joinToken(O, community);
    const visitor = await world.anonymous();

    const html = await (
      await visitor.request.get(`/invite/community/join/${token}`)
    ).text();
    expect(html).toContain(community.name);

    const preview = await visitor.request.get(
      `/api/public/join-links/${token}`
    );
    const body = await preview.json();
    expect(body.alreadyMember).toBeNull();
    expect(body.organizationName).toBe(community.name);
    expect(JSON.stringify(body)).not.toContain(O.email);
  });

  test('4.3 join', async ({ world }) => {
    const { community, O } = await createCommunity(world);
    const X = await world.person('outsider');
    const joined = await joinByLink(X, await joinToken(O, community));
    expect(joined.status()).toBe(201);
    expect((await joined.json()).redirectTo).toBe(
      `/platform/${community.slug}`
    );
    expect((await membership(community, X))?.role).toBe('member');
    expect(await communityCard(community, X)).not.toBeNull();
  });

  test('4.4 join again', async ({ world }) => {
    const { community, O } = await createCommunity(world);
    const X = await world.person('outsider');
    const token = await joinToken(O, community);
    expect((await joinByLink(X, token)).status()).toBe(201);
    const again = await joinByLink(X, token);
    expect(again.status()).toBe(200);
    expect((await again.json()).redirectTo).toBe(`/platform/${community.slug}`);
  });

  test('4.5 bad tokens', async ({ world }) => {
    const { O } = await createCommunity(world);
    const company = await world.company();
    const visitor = await world.anonymous();
    expect(
      (await visitor.request.get('/api/public/join-links/not-a-token')).status()
    ).toBe(404);
    expect(
      (await O.api.get(`/api/organizations/${company.slug}/join-link`)).status()
    ).toBe(404);
  });

  test('4.6 who can see the link', async ({ world }) => {
    const { community, O } = await createCommunity(world);
    const M = await addMember(world, community, O, 'member');
    const VOL = await addMember(world, community, O, 'vol', 'volunteer');
    const X = await world.person('outsider');
    const path = `/api/organizations/${community.slug}/join-link`;
    expect((await M.api.get(path)).status()).toBe(403);
    expect((await VOL.api.get(path)).status()).toBe(403);
    expect((await X.api.get(path)).status()).toBe(404);
  });

  test('4.7 a removed member rejoins', async ({ world }) => {
    const { community, O } = await createCommunity(world);
    const X = await world.person('outsider');
    const token = await joinToken(O, community);
    await joinByLink(X, token);
    const oldCard = (await communityCard(community, X))!;
    const removed = await O.api.delete(
      `/api/members/${(await membership(community, X))!.id}`
    );
    expect(removed.status()).toBe(204);

    expect((await joinByLink(X, token)).status()).toBe(201);
    const newCard = (await communityCard(community, X))!;
    expect(newCard.slug).not.toBe(oldCard.slug);
    const visitor = await world.anonymous();
    expect(
      (await visitor.request.get(`/api/public/cards/${oldCard.slug}`)).status()
    ).toBe(404);
  });
});

test.describe('Part 5: Onboarding invites', () => {
  test('5.1 create and send', async ({ world }) => {
    const email = uniqueEmail('onboard');
    const { id, cardId, organizationId } = await onboarding(world, email);
    await waitForEmail(email, CARD_READY_SUBJECT);
    const [invitation] = await sql(
      `select status, resend_count from onboarding_invitation where id = $1`,
      [id]
    );
    expect(invitation).toMatchObject({ status: 'pending', resend_count: 1 });
    const [card] = await sql(`select organization_id from card where id = $1`, [
      cardId,
    ]);
    expect(card?.organization_id).toBe(organizationId);
    expect(
      await sql(`select id from member where organization_id = $1`, [
        organizationId,
      ])
    ).toHaveLength(0);
  });

  test('5.2 new user accepts', async ({ world }) => {
    const email = uniqueEmail('onboard');
    const { id, cardId, organizationId } = await onboarding(world, email);
    const P = await world.person('onboard', email);
    expect(await organizationCount(P)).toBe(0);

    const accepted = await acceptOnboarding(P, id);
    expect(accepted.status(), await accepted.text()).toBe(200);
    const [member] = await sql(
      `select role from member where organization_id = $1 and user_id = $2`,
      [organizationId, P.userId]
    );
    expect(member?.role).toBe('admin');
    const [card] = await sql(
      `select c.user_id, s.status, s.current_period_end_at from card c
       join card_subscription s on s.card_id = c.id where c.id = $1`,
      [cardId]
    );
    expect(card).toMatchObject({ user_id: P.userId, status: 'active' });
    const months =
      (card!.current_period_end_at.getTime() - Date.now()) / (30 * 86_400_000);
    expect(months).toBeGreaterThan(2.9);
    expect(months).toBeLessThan(3.2);
    expect(await systemPayments(id)).toHaveLength(1);
  });

  test('5.3 existing user accepts', async ({ world }) => {
    const M = await world.person('member');
    const space = await personalSpace(M);
    const { id, cardId, organizationId } = await onboarding(world, M.email);
    expect((await acceptOnboarding(M, id)).status()).toBe(200);
    const [card] = await sql(`select organization_id from card where id = $1`, [
      cardId,
    ]);
    expect(card?.organization_id).toBe(space.id);
    expect(
      await sql(`select id from organization where id = $1`, [organizationId])
    ).toHaveLength(0);
    const spaces = await sql(
      `select o.id from organization o join member m on m.organization_id = o.id
       where m.user_id = $1 and o.type = 'personal'`,
      [M.userId]
    );
    expect(spaces).toHaveLength(1);
  });

  test('5.4 wrong account', async ({ world }) => {
    const { id } = await onboarding(world, uniqueEmail('onboard'));
    const X = await world.person('outsider');
    await expectError(
      await X.api.get(`/api/onboarding-invitations/${id}`),
      403
    );
    await expectError(await acceptOnboarding(X, id), 403);
  });

  test('5.5 accept twice', async ({ world }) => {
    const email = uniqueEmail('onboard');
    const { id } = await onboarding(world, email);
    const P = await world.person('onboard', email);
    expect((await acceptOnboarding(P, id)).status()).toBe(200);
    await expectError(
      await acceptOnboarding(P, id),
      409,
      'Invitation has already been processed'
    );
    expect(await systemPayments(id)).toHaveLength(1);
  });

  test('5.6 expired, then resent', async ({ world }) => {
    const email = uniqueEmail('onboard');
    const { T, id } = await onboarding(world, email);
    await sql(
      `update onboarding_invitation set expires_at = now() - interval '1 minute' where id = $1`,
      [id]
    );
    const P = await world.person('onboard', email);
    await expectError(
      await acceptOnboarding(P, id),
      409,
      'Invitation has expired'
    );

    const resent = await T.api.post(
      `/api/admin/onboarding-invitations/${id}/deliveries`
    );
    expect(resent.status()).toBe(201);
    expect((await resent.json()).resendCount).toBe(2);
    expect((await acceptOnboarding(P, id)).status()).toBe(200);
  });

  test('5.7 cancel', async ({ world }) => {
    const { T, id, cardId, organizationId } = await onboarding(
      world,
      uniqueEmail('onboard')
    );
    expect((await cancelOnboarding(T, id)).status()).toBe(200);
    const [card] = await sql(
      `select organization_id, user_id from card where id = $1`,
      [cardId]
    );
    expect(card).toMatchObject({
      organization_id: process.env.PLACEHOLDER_ORGANIZATION_ID,
      user_id: null,
    });
    expect(
      await sql(`select id from organization where id = $1`, [organizationId])
    ).toHaveLength(0);

    const email = uniqueEmail('onboard');
    const accepted = await onboarding(world, email);
    const P = await world.person('onboard', email);
    await acceptOnboarding(P, accepted.id);
    await expectError(
      await cancelOnboarding(T, accepted.id),
      409,
      'Only pending invitations can be cancelled.'
    );
  });

  test('5.8 one open invite per card', async ({ world }) => {
    const { T, cardId } = await onboarding(world, uniqueEmail('onboard'));
    await expectError(
      await createOnboarding(T, uniqueEmail('other'), cardId),
      409,
      'Card already has an active onboarding invitation'
    );

    const email = uniqueEmail('onboard');
    const claimed = await onboarding(world, email);
    const P = await world.person('onboard', email);
    await acceptOnboarding(P, claimed.id);
    await expectError(
      await createOnboarding(T, uniqueEmail('other'), claimed.cardId),
      409,
      'Selected card is already linked to a user'
    );

    await expectError(
      await createOnboarding(
        T,
        uniqueEmail('other'),
        await unclaimedCard(world),
        {
          subscriptionPlanCode: 'no-such-plan',
        }
      ),
      409,
      'Selected subscription plan is invalid'
    );
  });

  test('5.9 validation', async ({ world }) => {
    const T = await world.thakhin();
    const cardId = await unclaimedCard(world);
    for (const overrides of [
      { freeMonths: 121 },
      { freeMonths: -1 },
      { expirationMinutes: 0 },
      { expirationMinutes: 60 * 24 * 90 + 1 },
      { organizationName: 'P' },
      { amountMinor: -1 },
      { amountMinor: 1.5 },
    ]) {
      const response = await createOnboarding(
        T,
        uniqueEmail('v'),
        cardId,
        overrides
      );
      expect(response.status(), JSON.stringify(overrides)).toBe(400);
    }
  });

  test('5.10 zero free months', async ({ world }) => {
    const T = await world.thakhin();
    const response = await createOnboarding(
      T,
      uniqueEmail('v'),
      await unclaimedCard(world),
      {
        freeMonths: 0,
      }
    );
    await expectError(response, 400);
    expect(JSON.stringify(await response.json())).toContain('freeMonths');
  });

  test('5.12 cancelled or expired invite for a new user', async ({ world }) => {
    test.slow();
    const email = uniqueEmail('n2');
    const { T, id } = await onboarding(world, email);
    const N2 = await world.person('n2', email);
    expect((await cancelOnboarding(T, id)).status()).toBe(200);
    expect(await organizationCount(N2)).toBe(0);

    const page = await N2.context.newPage();
    await gotoHydrated(page, '/platform');
    await expect(page.getByText('Workspace unavailable')).toBeVisible();
    await expect(
      page.getByText('No organization is linked to your account yet.', {
        exact: false,
      })
    ).toBeVisible();

    const second = await onboarding(world, email);
    await sql(
      `update onboarding_invitation set expires_at = now() - interval '1 minute' where id = $1`,
      [second.id]
    );
    await gotoHydrated(page, `/invite/card/${second.id}`);
    await expect(page.getByText('This invitation has expired.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'View cards' })).toHaveCount(
      0
    );

    expect(
      (
        await second.T.api.post(
          `/api/admin/onboarding-invitations/${second.id}/deliveries`
        )
      ).status()
    ).toBe(201);
    expect((await acceptOnboarding(N2, second.id)).status()).toBe(200);
    expect(await organizationCount(N2)).toBe(1);
  });
});

test.describe('Part 6: Company card invites', () => {
  test('6.1 company invite and community invite for the same person', async ({
    world,
  }) => {
    const { community, O } = await createCommunity(world);
    const company = await world.company();
    const M = await world.person('member');
    const companyInvite = await world.invite(company, draft(M));
    const communityInvite = await invite(O, community, M.email);

    expect((await accept(M, communityInvite)).status()).toBe(200);
    expect((await accept(M, companyInvite.invitationId)).status()).toBe(200);
    expect(await membership(community, M)).not.toBeNull();
    expect((await world.card(company, companyInvite.id)).userId).toBe(M.userId);
  });

  test('6.2 company invite link on another account', async ({ world }) => {
    const company = await world.company();
    const email = uniqueEmail('member');
    const invited = await world.invite(company, draft(email));
    const X = await world.person('outsider');
    const preview = await X.api.get(`/api/invitations/${invited.invitationId}`);
    expect(preview.status()).toBe(403);
    expect(await errorMessage(preview)).not.toContain(email);
  });
});

test.describe('Part 7: Access checks (API)', () => {
  test('7.1 signed out', async ({ world }) => {
    const { community, O } = await createCommunity(world);
    const id = await invite(O, community, uniqueEmail('m'));
    const token = await joinToken(O, community);
    const visitor = (await world.anonymous()).request;
    expect((await visitor.get(`/api/invitations/${id}`)).status()).toBe(401);
    expect(
      (
        await visitor.patch(`/api/invitations/${id}`, {
          data: { status: 'accepted' },
        })
      ).status()
    ).toBe(401);
    expect(
      (await visitor.post(`/api/join-links/${token}/members`)).status()
    ).toBe(401);
    expect(
      (await visitor.get('/api/onboarding-invitations/any')).status()
    ).toBe(401);
    expect(
      (
        await visitor.post(`/api/organizations/${community.slug}/invitations`, {
          data: { email: 'a@b.co' },
        })
      ).status()
    ).toBe(401);
    expect(
      (
        await visitor.post(
          `/api/admin/organizations/${community.id}/invitations`,
          { data: { email: 'a@b.co' } }
        )
      ).status()
    ).toBe(404);
  });

  test('7.2 member and volunteer', async ({ world }) => {
    const { community, O } = await createCommunity(world);
    const pending = await invite(O, community, uniqueEmail('p'));
    for (const role of ['member', 'volunteer'] as const) {
      const person = await addMember(world, community, O, role, role);
      expect(
        (await inviteToCommunity(person, community, uniqueEmail('x'))).status()
      ).toBe(403);
      expect((await cancel(person, pending)).status()).toBe(403);
      const self = (await membership(community, person))!;
      expect(
        (
          await person.api.patch(`/api/members/${self.id}`, {
            data: { role: 'volunteer' },
          })
        ).status()
      ).toBe(403);
    }
  });

  test('7.3 organizer of another community', async ({ world }) => {
    const { O } = await createCommunity(world);
    const beta = await createCommunity(world);
    const betaInvite = await invite(beta.O, beta.community, uniqueEmail('b'));
    expect(
      (await inviteToCommunity(O, beta.community, uniqueEmail('x'))).status()
    ).toBe(404);
    expect((await cancel(O, betaInvite)).status()).toBe(404);
  });

  test("7.4 organizer can't escalate", async ({ world }) => {
    const { community, O } = await createCommunity(world);
    const M = await addMember(world, community, O, 'member');
    const O2 = await addOrganizer(world, community);
    const m = (await membership(community, M))!;
    const o2 = (await membership(community, O2))!;
    await expectError(
      await O.api.patch(`/api/members/${m.id}`, { data: { role: 'admin' } }),
      400
    );
    await expectError(
      await O.api.patch(`/api/members/${o2.id}`, { data: { role: 'member' } }),
      403,
      'The organizer role cannot be changed here.'
    );
    const bypass = await O.api.post('/api/auth/organization/invite-member', {
      data: {
        email: uniqueEmail('x'),
        role: 'admin',
        organizationId: community.id,
      },
    });
    expect(bypass.status()).toBe(404);
  });

  test('7.5 personal and company workspaces have no email invites', async ({
    world,
  }) => {
    const A = await world.person('alice');
    const space = await personalSpace(A);
    await expectError(
      await A.api.post(`/api/organizations/${space.slug}/invitations`, {
        data: { email: uniqueEmail('x') },
      }),
      403,
      'This is only available for community organizations.'
    );
    const company = await world.company();
    const admin = await world.person('admin');
    await world.hire(company, admin, { role: 'admin' });
    await expectError(
      await admin.api.post(`/api/organizations/${company.slug}/invitations`, {
        data: { email: uniqueEmail('x') },
      }),
      403
    );
  });

  test('7.6 onboarding admin routes', async ({ world }) => {
    const { id } = await onboarding(world, uniqueEmail('onboard'));
    const M = await world.person('member');
    expect(
      (await M.api.get('/api/admin/onboarding-invitations')).status()
    ).toBe(404);
    expect(
      (
        await M.api.post(`/api/admin/onboarding-invitations/${id}/deliveries`)
      ).status()
    ).toBe(404);
    expect((await cancelOnboarding(M, id)).status()).toBe(404);
  });
});

test.describe('Part 8: Reliability (API)', () => {
  test('8.1 accept a community invite in two tabs at once', async ({
    world,
  }) => {
    const { community, O } = await createCommunity(world);
    const email = uniqueEmail('member');
    const id = await invite(O, community, email);
    const M = await world.person('member', email);
    const results = await Promise.all([accept(M, id), accept(M, id)]);
    for (const status of await statuses(results))
      expect([200, 409]).toContain(status);
    expect(results.some((result) => result.status() === 200)).toBe(true);
  });

  test('8.2 join link double-click', async ({ world }) => {
    const { community, O } = await createCommunity(world);
    const X = await world.person('outsider');
    const token = await joinToken(O, community);
    const results = await Promise.all([
      joinByLink(X, token),
      joinByLink(X, token),
    ]);
    for (const status of await statuses(results))
      expect([200, 201]).toContain(status);
  });

  test('8.3 join link and email invite at once', async ({ world }) => {
    const { community, O } = await createCommunity(world);
    const email = uniqueEmail('outsider');
    const id = await invite(O, community, email);
    const X = await world.person('outsider', email);
    const token = await joinToken(O, community);
    const results = await Promise.all([accept(X, id), joinByLink(X, token)]);
    for (const status of await statuses(results))
      expect([200, 201, 409]).toContain(status);
    expect((await membership(community, X))?.role).toBe('member');
  });

  test('8.4 cancel while the invitee accepts', async ({ world }) => {
    const { community, O } = await createCommunity(world);
    const email = uniqueEmail('vol2');
    const id = await invite(O, community, email);
    const person = await world.person('vol2', email);
    const [accepted, cancelled] = await Promise.all([
      accept(person, id),
      cancel(O, id),
    ]);
    const isMember = Boolean(await membership(community, person));
    if (isMember) {
      expect(accepted.status()).toBe(200);
      expect([200, 409]).toContain(cancelled.status());
    } else {
      expect(cancelled.status()).toBe(200);
      expect(accepted.status()).toBe(409);
    }
  });

  test('8.5 onboarding accept twice at once', async ({ world }) => {
    const email = uniqueEmail('onboard');
    const { id } = await onboarding(world, email);
    const P = await world.person('onboard', email);
    const results = await Promise.all([
      acceptOnboarding(P, id),
      acceptOnboarding(P, id),
    ]);
    expect(await statuses(results)).toEqual([200, 409]);
    expect(await systemPayments(id)).toHaveLength(1);
  });

  test('8.6 create two onboarding invites for one card at once', async ({
    world,
  }) => {
    const T = await world.thakhin();
    const cardId = await unclaimedCard(world);
    const results = await Promise.all([
      createOnboarding(T, uniqueEmail('a'), cardId, { sendNow: false }),
      createOnboarding(T, uniqueEmail('b'), cardId, { sendNow: false }),
    ]);
    expect(await statuses(results)).toEqual([201, 409]);
    const pending = await sql(
      `select id from onboarding_invitation where card_id = $1 and status = 'pending'`,
      [cardId]
    );
    expect(pending).toHaveLength(1);
  });

  test('8.6a cancel while the invitee accepts (onboarding)', async ({
    world,
  }) => {
    const email = uniqueEmail('onboard');
    const { T, id, cardId } = await onboarding(world, email);
    const P = await world.person('onboard', email);
    const [accepted, cancelled] = await Promise.all([
      acceptOnboarding(P, id),
      cancelOnboarding(T, id),
    ]);
    expect(await statuses([accepted, cancelled])).toContain(409);
    const [card] = await sql(
      `select c.user_id, o.id as organization_id from card c
       left join organization o on o.id = c.organization_id where c.id = $1`,
      [cardId]
    );
    expect(
      card?.organization_id,
      'card points at a deleted workspace'
    ).toBeTruthy();
    if (accepted.status() === 200) expect(card?.user_id).toBe(P.userId);
    else expect(card?.user_id).toBeNull();
  });

  test('8.7 email is down', async ({ world }) => {
    const T = await world.thakhin();
    const { community, O } = await createCommunity(world);
    await setEmailDown(true);
    try {
      const organizerEmail = uniqueEmail('org2');
      const organizer = await T.api.post(
        `/api/admin/organizations/${community.id}/invitations`,
        {
          data: { email: organizerEmail },
        }
      );
      expect(organizer.status()).toBe(201);

      const memberEmail = uniqueEmail('member');
      expect(
        (await inviteToCommunity(O, community, memberEmail)).status()
      ).toBe(201);
      await pendingInvitationId(community, memberEmail);
      expect(await emailsTo(memberEmail)).toBe(0);

      const cardId = await unclaimedCard(world);
      const onboardEmail = uniqueEmail('onboard');
      await expectError(
        await createOnboarding(T, onboardEmail, cardId),
        502,
        'The invitation email could not be sent.'
      );
      const [pending] = await sql(
        `select id, resend_count from onboarding_invitation where card_id = $1 and status = 'pending'`,
        [cardId]
      );
      expect(pending?.resend_count).toBe(0);
      await expectError(
        await createOnboarding(T, onboardEmail, cardId),
        409,
        'Card already has an active onboarding invitation'
      );

      await setEmailDown(false);
      expect(
        (
          await T.api.post(
            `/api/admin/organizations/${community.id}/invitations`,
            { data: { email: organizerEmail } }
          )
        ).status()
      ).toBe(201);
      await waitForEmail(organizerEmail, ORGANIZER_SUBJECT);
      expect(
        (await inviteToCommunity(O, community, memberEmail)).status()
      ).toBe(201);
      await waitForEmail(memberEmail, MEMBER_SUBJECT);
      expect(
        (
          await T.api.post(
            `/api/admin/onboarding-invitations/${pending!.id}/deliveries`
          )
        ).status()
      ).toBe(201);
      await waitForEmail(onboardEmail, CARD_READY_SUBJECT);
    } finally {
      await setEmailDown(false);
    }
  });
});
