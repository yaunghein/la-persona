// Steps mirror tests/guides/03.personal.md; keep the numbers in sync.
import { uniqueEmail } from './support/auth';
import {
  emailsTo,
  expectError,
  givePersonalCard,
  setEmailDown,
  setPeriodEnd,
  sql,
  type Person,
  type World,
} from './support/companies';
import {
  createCommunity,
  communityCard,
  expect,
  personalSpace,
  test,
} from './support/communities';

const DAY = 86_400_000;
const PREMIUM_PRICE = 150_000;

async function space(person: Person) {
  return personalSpace(person);
}

function receipt(spaceId: string) {
  return `organizations/${spaceId}/receipt-${crypto.randomUUID().slice(0, 8)}.png`;
}

/** A personal card with an active standard period ending in `days`. */
async function activeCard(person: Person, days = 200) {
  const card = await givePersonalCard(person);
  await sql(
    `insert into card_subscription
       (id, card_id, plan_code, status, is_trial, current_period_start_at, current_period_end_at, activated_at)
     values ($1, $2, 'standard', 'active', false, now() - interval '100 days', $3, now() - interval '100 days')`,
    [
      `s${crypto.randomUUID().slice(0, 12)}`,
      card.id,
      new Date(Date.now() + days * DAY),
    ]
  );
  return card;
}

function requestCard(
  person: Person,
  slug: string,
  body: Record<string, unknown>
) {
  return person.api.post(`/api/organizations/${slug}/card-requests`, {
    data: body,
  });
}

async function newDesignRequest(person: Person) {
  const own = await space(person);
  const response = await requestCard(person, own.slug, {
    type: 'new_design',
    card: { name: 'Alice Lin', position: 'Designer', email: person.email },
    receiptUrl: receipt(own.id),
  });
  expect(response.status(), await response.text()).toBe(201);
  return (await response.json()) as {
    requestId: string;
    paymentId: string;
    cardSlug: string;
    planCode: string;
  };
}

function reviewRequest(
  T: Person,
  requestId: string,
  status: 'approved' | 'declined'
) {
  return T.api.patch(`/api/admin/card-requests/${requestId}`, {
    data: { status },
  });
}

function reviewPayment(
  T: Person,
  paymentId: string,
  status: 'approved' | 'rejected',
  reason?: string
) {
  return T.api.patch(`/api/admin/payments/${paymentId}`, {
    data: status === 'approved' ? { status } : { status, reason },
  });
}

async function submitRenewal(person: Person, slug: string, kind = 'renewal') {
  const own = await space(person);
  return person.api.post(`/api/cards/${slug}/payments`, {
    data: { kind, receiptUrl: receipt(own.id) },
  });
}

async function subscription(cardId: string) {
  const [row] = await sql(
    `select * from card_subscription where card_id = $1`,
    [cardId]
  );
  return row!;
}

async function publicCard(world: World, slug: string, viewer?: Person) {
  const request = viewer ? viewer.api : (await world.anonymous()).request;
  return request.get(`/api/public/cards/${slug}`);
}

async function availability(world: World, slug: string, viewer?: Person) {
  const response = await publicCard(world, slug, viewer);
  expect(response.status()).toBe(200);
  return ((await response.json()).availability ?? 'ok') as string;
}

function patchCard(
  person: Person,
  slug: string,
  data: Record<string, unknown>
) {
  return person.api.patch(`/api/cards/${slug}`, { data });
}

function exchangeSeamlessly(person: Person, slug: string, cardId?: string) {
  return person.api.post(`/api/public/cards/${slug}/contact-exchanges`, {
    data: { mode: 'seamless', ...(cardId ? { cardId } : {}) },
  });
}

async function exchangeByForm(world: World, slug: string, name = 'Walk In') {
  const visitor = await world.anonymous();
  return visitor.request.post(`/api/public/cards/${slug}/contact-exchanges`, {
    data: {
      mode: 'form',
      name,
      email: uniqueEmail('walkin'),
      phone: '91234567',
    },
  });
}

async function myContacts(person: Person) {
  const response = await person.api.get('/api/me/contacts?limit=100');
  expect(response.status()).toBe(200);
  return (await response.json()).items as {
    id: string;
    name: string;
    personaCardSlug: string | null;
    card: { id: string } | null;
  }[];
}

async function statuses(responses: { status(): number }[]) {
  return responses.map((response) => response.status()).sort();
}

test.describe('Part 1: The personal workspace', () => {
  test('1.1 created on first sign-in', async ({ world }) => {
    const A = await world.person('alice');
    const own = await space(A);
    const [organization] = await sql(
      `select name, slug from organization where id = $1`,
      [own.id]
    );
    expect(organization!.name).toMatch(/'s Space$/);
    expect(organization!.slug).toMatch(/-space-/);
    const members = await sql(
      `select user_id, role from member where organization_id = $1`,
      [own.id]
    );
    expect(members).toEqual([{ user_id: A.userId, role: 'admin' }]);
    const [session] = await sql(
      `select active_organization_id from session where user_id = $1 order by created_at desc limit 1`,
      [A.userId]
    );
    expect(session?.active_organization_id).toBe(own.id);
  });

  test('1.2 only one, ever', async ({ world }) => {
    const T = await world.thakhin();
    const A = await world.person('alice');
    await world.person('alice', A.email);
    const spaces = await sql(
      `select o.id from organization o join member m on m.organization_id = o.id
       where m.user_id = $1 and o.type = 'personal'`,
      [A.userId]
    );
    expect(spaces).toHaveLength(1);
    const created = await T.api.post('/api/admin/organizations', {
      data: { name: 'Again', type: 'personal', ownerUserId: A.userId },
    });
    await expectError(
      created,
      409,
      'User already has a personal organization.'
    );
  });

  test('1.3 private to its owner', async ({ world }) => {
    const A = await world.person('alice');
    const B = await world.person('bob');
    const own = await space(A);
    expect((await B.api.get(`/api/organizations/${own.slug}`)).status()).toBe(
      404
    );
    expect(
      (await B.api.get(`/api/organizations/${own.slug}/cards`)).status()
    ).toBe(404);
  });

  test('1.4 no members, no invites', async ({ world }) => {
    const A = await world.person('alice');
    const own = await space(A);
    const invited = await A.api.post(
      `/api/organizations/${own.slug}/invitations`,
      {
        data: { email: uniqueEmail('x') },
      }
    );
    await expectError(
      invited,
      403,
      'This is only available for community organizations.'
    );
    await expectError(
      await A.api.get(`/api/organizations/${own.slug}/join-link`),
      403
    );
  });
});

test.describe('Part 2: Requesting a card', () => {
  test('2.1 new design', async ({ world }) => {
    const A = await world.person('alice');
    const receiptOf = await newDesignRequest(A);
    expect(receiptOf.planCode).toBe('premium');
    await expect.poll(() => emailsTo(A.email)).toBeGreaterThan(0);

    const [card] = await sql(`select id from card where slug = $1`, [
      receiptOf.cardSlug,
    ]);
    expect((await subscription(card!.id)).status).toBe('pending_approval');
    const [payment] = await sql(
      `select p.status, i.amount_minor from subscription_payment p
       join subscription_payment_item i on i.payment_id = p.id where p.id = $1`,
      [receiptOf.paymentId]
    );
    expect(payment).toMatchObject({
      status: 'submitted',
      amount_minor: PREMIUM_PRICE,
    });
  });

  test('2.2 existing design', async ({ world }) => {
    const A = await world.person('alice');
    const own = await space(A);
    const source = await givePersonalCard(A);
    await sql(
      `update card set spline_url = 'https://prod.spline.design/x/scene.splinecode',
         wallpaper_url = 'uploads/w.webp', card_back_url = 'uploads/b.webp' where id = $1`,
      [source.id]
    );
    const response = await requestCard(A, own.slug, {
      type: 'existing_design',
      sourceCardId: source.id,
      card: { name: 'Alice Two' },
      receiptUrl: receipt(own.id),
    });
    expect(response.status(), await response.text()).toBe(201);
    const created = await response.json();
    expect(created.planCode).toBe('standard');
    const [card] = await sql(
      `select spline_url, wallpaper_url, card_back_url from card where slug = $1`,
      [created.cardSlug]
    );
    expect(card).toEqual({
      spline_url: 'https://prod.spline.design/x/scene.splinecode',
      wallpaper_url: 'uploads/w.webp',
      card_back_url: 'uploads/b.webp',
    });
  });

  test('2.3 prices come from the server', async ({ world }) => {
    const A = await world.person('alice');
    const B = await world.person('bob');
    const own = await space(A);
    const response = await requestCard(A, own.slug, {
      type: 'new_design',
      card: { name: 'Alice Lin' },
      receiptUrl: receipt(own.id),
      amountMinor: 1,
      planCode: 'standard',
      userId: B.userId,
    });
    expect(response.status()).toBe(201);
    const created = await response.json();
    expect(created.planCode).toBe('premium');
    const [card] = await sql(`select user_id from card where slug = $1`, [
      created.cardSlug,
    ]);
    expect(card?.user_id).toBe(A.userId);
    const [item] = await sql(
      `select amount_minor from subscription_payment_item where payment_id = $1`,
      [created.paymentId]
    );
    expect(item?.amount_minor).toBe(PREMIUM_PRICE);
  });

  test('2.4 design source must be yours', async ({ world }) => {
    const A = await world.person('alice');
    const B = await world.person('bob');
    const own = await space(A);
    const theirs = await givePersonalCard(B);
    const response = await requestCard(A, own.slug, {
      type: 'existing_design',
      sourceCardId: theirs.id,
      card: { name: 'Alice' },
      receiptUrl: receipt(own.id),
    });
    await expectError(response, 400, 'Selected card design is invalid.');
  });

  test('2.5 receipt must be our upload', async ({ world }) => {
    const A = await world.person('alice');
    const own = await space(A);
    for (const receiptUrl of [
      undefined,
      '',
      'https://evil.example/r.png',
      'javascript:alert(1)',
    ]) {
      const response = await requestCard(A, own.slug, {
        type: 'new_design',
        card: { name: 'Alice' },
        receiptUrl,
      });
      expect(response.status(), String(receiptUrl)).toBe(400);
    }
  });

  test('2.6 Thakhin approves', async ({ world }) => {
    const T = await world.thakhin();
    const A = await world.person('alice');
    const created = await newDesignRequest(A);
    expect(
      (await reviewRequest(T, created.requestId, 'approved')).status()
    ).toBe(200);
    const [card] = await sql(`select id from card where slug = $1`, [
      created.cardSlug,
    ]);
    const state = await subscription(card!.id);
    expect(state.status).toBe('active');
    const years =
      (state.current_period_end_at.getTime() - Date.now()) / (365 * DAY);
    expect(years).toBeGreaterThan(0.98);
    const [payment] = await sql(
      `select status from subscription_payment where id = $1`,
      [created.paymentId]
    );
    expect(payment?.status).toBe('approved');
  });

  test('2.7 Thakhin declines', async ({ world }) => {
    const T = await world.thakhin();
    const A = await world.person('alice');
    const created = await newDesignRequest(A);
    expect(
      (await reviewRequest(T, created.requestId, 'declined')).status()
    ).toBe(200);
    const [payment] = await sql(
      `select status from subscription_payment where id = $1`,
      [created.paymentId]
    );
    expect(payment?.status).toBe('rejected');
    expect(await availability(world, created.cardSlug)).toBe('paused');
    await expectError(
      await reviewRequest(T, created.requestId, 'approved'),
      409,
      'Only pending requests can be approved.'
    );
  });

  test('2.8 approve without a receipt', async ({ world }) => {
    const T = await world.thakhin();
    const A = await world.person('alice');
    const created = await newDesignRequest(A);
    await sql(
      `update card_request set payment_receipt_url = '' where id = $1`,
      [created.requestId]
    );
    await expectError(
      await reviewRequest(T, created.requestId, 'approved'),
      409,
      'Cannot approve a request without a payment receipt.'
    );
  });

  test('2.9 a new card is live while it waits for approval', async ({
    world,
  }) => {
    const T = await world.thakhin();
    const A = await world.person('alice');
    const created = await newDesignRequest(A);
    expect(await availability(world, created.cardSlug)).toBe('ok');
    await reviewRequest(T, created.requestId, 'declined');
    expect(await availability(world, created.cardSlug)).toBe('paused');
  });
});

test.describe('Part 3: Editing a card', () => {
  test('3.1 save contact info', async ({ world }) => {
    const A = await world.person('alice');
    const card = await givePersonalCard(A);
    const saved = await patchCard(A, card.slug, {
      firstName: 'Alice',
      position: 'Founder',
      company: 'Lin Studio',
      phone: '091234567',
      website: 'https://alice.example',
    });
    expect(saved.status(), await saved.text()).toBe(200);
    const shown = await (await publicCard(world, card.slug)).json();
    expect(shown).toMatchObject({
      firstName: 'Alice',
      position: 'Founder',
      company: 'Lin Studio',
    });
  });

  test('3.2 links', async ({ world }) => {
    const A = await world.person('alice');
    const card = await givePersonalCard(A);
    const link = (index: number) => ({
      label: `Link ${index}`,
      value: `https://example.com/${index}`,
    });
    const thirty = Array.from({ length: 30 }, (_, index) => link(index));
    const saved = await patchCard(A, card.slug, { socials: thirty });
    expect(saved.status()).toBe(200);
    expect(
      (await saved.json()).socials.map((item: { label: string }) => item.label)
    ).toEqual(thirty.map((item) => item.label));
    await expectError(
      await patchCard(A, card.slug, { socials: [...thirty, link(30)] }),
      400
    );
  });

  test('3.3 link and website validation', async ({ world }) => {
    const A = await world.person('alice');
    const card = await givePersonalCard(A);
    const social = (value: string) => ({ socials: [{ label: 'Link', value }] });
    const refused = [
      social('javascript:alert(1)'),
      social('data:text/html,<script>alert(1)</script>'),
      { website: 'ftp://x' },
      { website: 'mailto:a@b.co' },
      { email: 'not-an-email' },
    ];
    for (const body of refused) {
      const response = await patchCard(A, card.slug, body);
      const text = await response.text();
      expect(response.status(), JSON.stringify(body)).toBe(400);
      expect(text).not.toContain('alert(1)');
    }
    for (const value of [
      'mailto:a@b.co',
      'tel:+95912345678',
      'https://example.com',
    ]) {
      expect((await patchCard(A, card.slug, social(value))).status()).toBe(200);
    }
    const cleared = await patchCard(A, card.slug, { website: '' });
    expect((await cleared.json()).website).toBeNull();
  });

  test('3.4 photo', async ({ world }) => {
    const A = await world.person('alice');
    const own = await space(A);
    const card = await givePersonalCard(A);
    const upload = (contentType: string, contentLength = 1000) =>
      A.api.post(`/api/organizations/${own.slug}/uploads`, {
        data: { contentType, contentLength },
      });
    for (const [type, ext] of [
      ['image/png', 'png'],
      ['image/jpeg', 'jpg'],
      ['image/webp', 'webp'],
    ]) {
      const response = await upload(type!);
      expect(response.status(), await response.text()).toBe(201);
      expect((await response.json()).key).toMatch(
        new RegExp(`^organizations/${own.id}/[\\w-]+\\.${ext}$`)
      );
    }
    await expectError(await upload('image/svg+xml'), 400);
    await expectError(await upload('image/gif'), 400);
    await expectError(await upload('image/png', 6 * 1024 * 1024), 400);
    await expectError(
      await patchCard(A, card.slug, {
        avatarUrl: 'https://evil.example/a.png',
      }),
      400
    );
  });

  test("3.5 fields the owner can't set", async ({ world }) => {
    const A = await world.person('alice');
    const B = await world.person('bob');
    const card = await givePersonalCard(A);
    const saved = await patchCard(A, card.slug, {
      userId: B.userId,
      organizationId: (await space(B)).id,
      splineUrl: 'https://prod.spline.design/evil/scene.splinecode',
      wallpaperUrl: 'uploads/evil.webp',
      cardBackUrl: 'uploads/evil.webp',
      departmentId: 'dept',
    });
    expect(saved.status()).toBe(200);
    const [row] = await sql(
      `select user_id, organization_id, spline_url, wallpaper_url, card_back_url, department_id
       from card where id = $1`,
      [card.id]
    );
    expect(row).toMatchObject({
      user_id: A.userId,
      organization_id: (await space(A)).id,
      spline_url: null,
      wallpaper_url: null,
      card_back_url: null,
      department_id: null,
    });
  });

  test('3.6 change the card URL', async ({ world }) => {
    const A = await world.person('alice');
    const card = await givePersonalCard(A);
    const slug = `alice-${crypto.randomUUID().slice(0, 6)}`;
    expect((await patchCard(A, card.slug, { slug })).status()).toBe(200);
    expect((await publicCard(world, slug)).status()).toBe(200);
    expect((await publicCard(world, card.slug)).status()).toBe(404);
  });

  test('3.7 slug rules', async ({ world }) => {
    const A = await world.person('alice');
    const B = await world.person('bob');
    const card = await givePersonalCard(A);
    const theirs = await givePersonalCard(B);
    for (const slug of ['Alice Test', '-alice', 'alice-', 'a'.repeat(81)]) {
      expect((await patchCard(A, card.slug, { slug })).status(), slug).toBe(
        400
      );
    }
    const upper = `ALICE${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
    const saved = await patchCard(A, card.slug, { slug: upper });
    expect((await saved.json()).slug).toBe(upper.toLowerCase());
    await expectError(
      await patchCard(A, upper.toLowerCase(), { slug: theirs.slug }),
      409,
      'That card URL is already taken. Please choose a different slug.'
    );
  });

  test('3.8 visibility', async ({ world }) => {
    const A = await world.person('alice');
    const B = await world.person('bob');
    const card = await givePersonalCard(A);
    await patchCard(A, card.slug, { visibility: 'members' });
    await expectError(
      await publicCard(world, card.slug),
      401,
      'Sign in to view this card.'
    );
    expect((await publicCard(world, card.slug, B)).status()).toBe(200);
    await patchCard(A, card.slug, { visibility: 'public' });
    expect((await publicCard(world, card.slug)).status()).toBe(200);
  });

  test('3.9 phone normalization', async ({ world }) => {
    const A = await world.person('alice');
    const card = await givePersonalCard(A);
    await patchCard(A, card.slug, {
      phone: '09 123 456 789',
      phoneCountryCode: 'MM',
    });
    const [local] = await sql(
      `select phone, phone_country_code from card where id = $1`,
      [card.id]
    );
    expect(local).toEqual({
      phone: '09 123 456 789',
      phone_country_code: 'MM',
    });
    await patchCard(A, card.slug, {
      phone: '+959123456789',
      phoneCountryCode: null,
    });
    const [international] = await sql(`select phone from card where id = $1`, [
      card.id,
    ]);
    expect(international?.phone).toBe('+959123456789');
  });
});

test.describe('Part 4: Deleting a card', () => {
  test('4.1 delete own personal card', async ({ world }) => {
    const A = await world.person('alice');
    const B = await world.person('bob');
    const card = await givePersonalCard(A);
    const other = await givePersonalCard(B);
    expect((await A.api.delete(`/api/cards/${card.slug}`)).status()).toBe(204);

    const cards = await (await A.api.get('/api/me/cards')).json();
    expect(cards.items.map((item: { id: string }) => item.id)).not.toContain(
      card.id
    );
    expect((await publicCard(world, card.slug)).status()).toBe(404);
    expect((await A.api.get(`/api/cards/${card.slug}`)).status()).toBe(404);
    expect((await patchCard(A, card.slug, { firstName: 'X' })).status()).toBe(
      404
    );
    expect((await A.api.delete(`/api/cards/${card.slug}`)).status()).toBe(404);

    const [row] = await sql(
      `select removed_at, user_id from card where id = $1`,
      [card.id]
    );
    expect(row?.removed_at).not.toBeNull();
    expect(row?.user_id).toBe(A.userId);
    await expectError(await patchCard(B, other.slug, { slug: card.slug }), 409);
  });

  test('4.2 contacts stay after delete', async ({ world }) => {
    const A = await world.person('alice');
    const B = await world.person('bob');
    const card = await givePersonalCard(A);
    await givePersonalCard(B);
    expect((await exchangeSeamlessly(B, card.slug)).status()).toBe(201);
    expect((await A.api.delete(`/api/cards/${card.slug}`)).status()).toBe(204);

    const contact = (await myContacts(A)).find(
      (item) => item.card?.id === card.id
    );
    expect(contact, 'contact from the deleted card').toBeTruthy();
    expect(
      (
        await A.api.patch(`/api/contacts/${contact!.id}`, {
          data: { note: 'met at expo' },
        })
      ).status()
    ).toBe(200);

    const mine = (await myContacts(B)).find(
      (item) => item.personaCardSlug === card.slug
    );
    expect(mine, 'B should no longer link to the dead card').toBeUndefined();

    const csv = await (
      await A.api.get('/api/me/contacts', { headers: { accept: 'text/csv' } })
    ).text();
    expect(csv).toContain(contact!.name);
    expect((await A.api.delete(`/api/contacts/${contact!.id}`)).status()).toBe(
      204
    );
  });

  test('4.2a delete a card with a receipt waiting for review', async ({
    world,
  }) => {
    const A = await world.person('alice');
    const card = await activeCard(A);
    const submitted = await submitRenewal(A, card.slug);
    expect(submitted.status(), await submitted.text()).toBe(201);
    const { paymentId } = await submitted.json();
    expect((await A.api.delete(`/api/cards/${card.slug}`)).status()).toBe(204);
    const [payment] = await sql(
      `select status, note from subscription_payment where id = $1`,
      [paymentId]
    );
    expect(payment).toMatchObject({
      status: 'rejected',
      note: 'Card removed by its holder',
    });
  });

  test("4.3 community and company cards can't be deleted here", async ({
    world,
  }) => {
    const { community, O } = await createCommunity(world);
    const own = (await communityCard(community, O))!;
    const message = 'Community cards are removed when you leave the community.';
    await expectError(
      await O.api.delete(`/api/cards/${own.slug}`),
      403,
      message
    );

    const company = await world.company();
    const A = await world.person('alice');
    const held = await world.hire(company, A);
    // Company members lack `card:delete`, so they get the generic 403 first.
    await expectError(await A.api.delete(`/api/cards/${held.slug}`), 403);
  });

  test("4.4 someone else's card", async ({ world }) => {
    const A = await world.person('alice');
    const B = await world.person('bob');
    const card = await givePersonalCard(A);
    expect((await B.api.delete(`/api/cards/${card.slug}`)).status()).toBe(404);
    const [row] = await sql(`select removed_at from card where id = $1`, [
      card.id,
    ]);
    expect(row?.removed_at).toBeNull();
  });
});

test.describe('Part 5: Renewal and premium upgrade', () => {
  test('5.1 quote', async ({ world }) => {
    const A = await world.person('alice');
    const card = await activeCard(A);
    for (const kind of ['renewal', 'premium_upgrade']) {
      const response = await A.api.get(
        `/api/cards/${card.slug}/payment-quote?kind=${kind}`
      );
      expect(response.status(), await response.text()).toBe(200);
      expect((await response.json()).totalAmountMinor).toBeGreaterThan(0);
    }
    const { community, O } = await createCommunity(world);
    const own = (await communityCard(community, O))!;
    await expectError(
      await O.api.get(`/api/cards/${own.slug}/payment-quote?kind=renewal`),
      403,
      'Community cards are covered by the community.'
    );
  });

  test('5.2 submit a renewal', async ({ world }) => {
    const A = await world.person('alice');
    const card = await activeCard(A);
    const before = (
      await subscription(card.id)
    ).current_period_end_at.getTime();
    const submitted = await submitRenewal(A, card.slug);
    expect(submitted.status()).toBe(201);
    expect((await submitted.json()).status).toBe('submitted');
    const items = await sql(
      `select p.status from subscription_payment p join subscription_payment_item i on i.payment_id = p.id
       where i.card_id = $1`,
      [card.id]
    );
    expect(items).toEqual([{ status: 'submitted' }]);
    expect((await subscription(card.id)).current_period_end_at.getTime()).toBe(
      before
    );
  });

  test('5.3 Thakhin approves', async ({ world }) => {
    const T = await world.thakhin();
    const A = await world.person('alice');
    const card = await activeCard(A, 30);
    const before = (
      await subscription(card.id)
    ).current_period_end_at.getTime();
    const { paymentId } = await (await submitRenewal(A, card.slug)).json();
    expect((await reviewPayment(T, paymentId, 'approved')).status()).toBe(200);
    const after = await subscription(card.id);
    expect(after.status).toBe('active');
    expect(after.current_period_end_at.getTime()).toBeGreaterThan(
      before + 300 * DAY
    );
  });

  test('5.4 Thakhin rejects', async ({ world }) => {
    const T = await world.thakhin();
    const A = await world.person('alice');
    const card = await activeCard(A);
    const before = (
      await subscription(card.id)
    ).current_period_end_at.getTime();
    const { paymentId } = await (await submitRenewal(A, card.slug)).json();
    expect(
      (await reviewPayment(T, paymentId, 'rejected', 'Blurry receipt')).status()
    ).toBe(200);
    const [payment] = await sql(
      `select status, note from subscription_payment where id = $1`,
      [paymentId]
    );
    expect(payment?.status).toBe('rejected');
    expect(payment?.note).toContain('Blurry receipt');
    expect((await subscription(card.id)).current_period_end_at.getTime()).toBe(
      before
    );
  });

  test('5.5 premium upgrade', async ({ world }) => {
    const T = await world.thakhin();
    const A = await world.person('alice');
    const card = await activeCard(A);
    const submitted = await submitRenewal(A, card.slug, 'premium_upgrade');
    expect(submitted.status()).toBe(201);
    const { paymentId, cardRequestId } = await submitted.json();
    expect(cardRequestId).toBeTruthy();
    await expectError(
      await reviewPayment(T, paymentId, 'approved'),
      409,
      'This payment is linked to a card request.'
    );
    expect((await reviewRequest(T, cardRequestId, 'approved')).status()).toBe(
      200
    );
    expect((await subscription(card.id)).plan_code).toBe('premium');
  });

  test("5.6 expired card, owner's view", async ({ world }) => {
    const A = await world.person('alice');
    const B = await world.person('bob');
    const card = await activeCard(A);
    await setPeriodEnd(card.id, new Date(Date.now() - DAY));
    const anonymous = await (await publicCard(world, card.slug)).json();
    expect(anonymous).toMatchObject({
      availability: 'paused',
      renewPath: null,
    });
    const owner = await (await publicCard(world, card.slug, A)).json();
    expect(owner.renewPath).toContain(`/cards/${card.slug}?payment=renewal`);
    const other = await (await publicCard(world, card.slug, B)).json();
    expect(other.renewPath).toBeNull();
  });

  test("5.7 a receipt doesn't unpause an expired card", async ({ world }) => {
    const T = await world.thakhin();
    const A = await world.person('alice');
    const card = await activeCard(A);
    await setPeriodEnd(card.id, new Date(Date.now() - DAY));
    const { paymentId } = await (await submitRenewal(A, card.slug)).json();
    expect(await availability(world, card.slug)).toBe('paused');
    await expectError(
      await exchangeByForm(world, card.slug),
      409,
      'This card is currently unavailable.'
    );

    expect((await reviewPayment(T, paymentId, 'rejected')).status()).toBe(200);
    expect(await availability(world, card.slug)).toBe('paused');
    const again = await submitRenewal(A, card.slug);
    expect(again.status()).toBe(201);
    expect(
      (
        await reviewPayment(T, (await again.json()).paymentId, 'approved')
      ).status()
    ).toBe(200);
    expect(await availability(world, card.slug)).toBe('ok');
  });

  test('5.7a an active card stays live during review', async ({ world }) => {
    const A = await world.person('alice');
    const card = await activeCard(A);
    expect((await submitRenewal(A, card.slug)).status()).toBe(201);
    expect((await subscription(card.id)).status).toBe('pending_approval');
    expect(await availability(world, card.slug)).toBe('ok');
  });

  test('5.8 one payment waiting at a time', async ({ world }) => {
    const T = await world.thakhin();
    const A = await world.person('alice');
    const card = await activeCard(A);
    const first = await submitRenewal(A, card.slug);
    expect(first.status()).toBe(201);
    for (const kind of ['renewal', 'premium_upgrade']) {
      await expectError(
        await submitRenewal(A, card.slug, kind),
        409,
        'A payment for this card is already waiting for review.'
      );
    }
    await reviewPayment(T, (await first.json()).paymentId, 'rejected');

    const other = await activeCard(A);
    const results = await Promise.all([
      submitRenewal(A, other.slug),
      submitRenewal(A, other.slug),
    ]);
    expect(await statuses(results)).toEqual([201, 409]);
    expect((await submitRenewal(A, card.slug)).status()).toBe(201);
  });

  test('5.9 legacy cards', async ({ world }) => {
    const A = await world.person('alice');
    const card = await givePersonalCard(A);
    expect(await availability(world, card.slug)).toBe('ok');
    expect(
      (
        await A.api.get(`/api/cards/${card.slug}/payment-quote?kind=renewal`)
      ).status()
    ).toBe(200);
  });
});

test.describe('Part 6: The public card and contacts', () => {
  async function interactions(cardId: string, type: string) {
    return sql(`select id from analytics where card_id = $1 and type = $2`, [
      cardId,
      type,
    ]);
  }

  test('6.1 view and link clicks', async ({ world }) => {
    const A = await world.person('alice');
    const card = await givePersonalCard(A);
    const visitor = (await world.anonymous()).request;
    const record = (type: string, metadata = {}) =>
      visitor.post(`/api/public/cards/${card.slug}/interactions`, {
        data: { type, metadata },
      });
    expect((await record('view')).status()).toBe(204);
    await record('view');
    await record('link_click', { label: 'Website' });
    await record('save_action', { action: 'vcf_download' });
    expect(await interactions(card.id, 'view')).toHaveLength(1);
    expect(await interactions(card.id, 'link_click')).toHaveLength(1);
    expect(await interactions(card.id, 'save_action')).toHaveLength(1);
  });

  test('6.2 exchange contact by form', async ({ world }) => {
    const A = await world.person('alice');
    const card = await givePersonalCard(A);
    const before = await emailsTo(A.email);
    const name = '=HYPERLINK("http://evil.example")';
    expect((await exchangeByForm(world, card.slug, name)).status()).toBe(201);
    await expect.poll(() => emailsTo(A.email)).toBeGreaterThan(before);
    expect((await myContacts(A)).map((item) => item.name)).toContain(name);
    const csv = await (
      await A.api.get('/api/me/contacts', { headers: { accept: 'text/csv' } })
    ).text();
    expect(csv).toContain(`'=HYPERLINK`);
  });

  test('6.3 seamless exchange', async ({ world }) => {
    const A = await world.person('alice');
    const B = await world.person('bob');
    const card = await givePersonalCard(A);
    await givePersonalCard(B);
    expect((await exchangeSeamlessly(B, card.slug)).status()).toBe(201);
    expect((await exchangeSeamlessly(B, card.slug)).status()).toBe(201);
    expect(await myContacts(A)).toHaveLength(1);
    expect(await myContacts(B)).toHaveLength(1);

    const C = await world.person('carol');
    const carols = await givePersonalCard(C);
    await expectError(await exchangeSeamlessly(B, card.slug, carols.id), 404);
  });

  test('6.4 exchanging with yourself', async ({ world }) => {
    const A = await world.person('alice');
    const card = await givePersonalCard(A);
    await expectError(
      await exchangeSeamlessly(A, card.slug),
      400,
      'You cannot exchange contact with your own card.'
    );
    expect(await myContacts(A)).toHaveLength(0);
  });

  test('6.5 paused cards take nothing', async ({ world }) => {
    const A = await world.person('alice');
    const card = await activeCard(A);
    await setPeriodEnd(card.id, new Date(Date.now() - DAY));
    await expectError(
      await exchangeByForm(world, card.slug),
      409,
      'This card is currently unavailable.'
    );
    const visitor = (await world.anonymous()).request;
    await visitor.post(`/api/public/cards/${card.slug}/interactions`, {
      data: { type: 'view' },
    });
    expect(await interactions(card.id, 'view')).toHaveLength(0);
  });

  // test.skip('6.6 rate limits (checked by hand; e2e runs with rate limits off)', () => {});

  test('6.7 contacts are private', async ({ world }) => {
    const A = await world.person('alice');
    const B = await world.person('bob');
    const card = await givePersonalCard(A);
    await exchangeByForm(world, card.slug);
    const [contact] = await myContacts(A);
    expect(
      (
        await B.api.patch(`/api/contacts/${contact!.id}`, {
          data: { note: 'x' },
        })
      ).status()
    ).toBe(404);
    expect((await B.api.delete(`/api/contacts/${contact!.id}`)).status()).toBe(
      404
    );
    expect(await myContacts(A)).toHaveLength(1);

    const label = await A.api.post('/api/me/contact-labels', {
      data: { name: 'VIP', color: '#c8a97e' },
    });
    expect(label.status(), await label.text()).toBe(201);
    const labelId = (await label.json()).id;
    expect(
      (
        await B.api.patch(`/api/contact-labels/${labelId}`, {
          data: { name: 'Mine' },
        })
      ).status()
    ).toBe(404);
  });

  test('6.8 contacts list and export', async ({ world }) => {
    const A = await world.person('alice');
    const kept = await givePersonalCard(A);
    const removed = await givePersonalCard(A);
    await exchangeByForm(world, kept.slug, 'Kept Contact');
    await exchangeByForm(world, removed.slug, 'Removed Contact');
    await A.api.delete(`/api/cards/${removed.slug}`);
    const names = (await myContacts(A)).map((item) => item.name);
    expect(names).toEqual(
      expect.arrayContaining(['Kept Contact', 'Removed Contact'])
    );

    const B = await world.person('bob');
    expect(await myContacts(B)).toHaveLength(0);
  });
});

test.describe('Part 7: Access checks (API)', () => {
  test("7.1 someone else's things are not found", async ({ world }) => {
    const A = await world.person('alice');
    const B = await world.person('bob');
    const card = await activeCard(A);
    const own = await space(A);
    const visitor = (await world.anonymous()).request;
    const calls = [
      (api: Person['api']) => api.get(`/api/cards/${card.slug}`),
      (api: Person['api']) =>
        api.patch(`/api/cards/${card.slug}`, { data: { firstName: 'X' } }),
      (api: Person['api']) => api.delete(`/api/cards/${card.slug}`),
      (api: Person['api']) => api.get(`/api/cards/${card.slug}/subscription`),
      (api: Person['api']) =>
        api.get(`/api/cards/${card.slug}/payment-quote?kind=renewal`),
      (api: Person['api']) => api.get(`/api/cards/${card.slug}/holders`),
      (api: Person['api']) =>
        api.post(`/api/cards/${card.slug}/payments`, {
          data: { kind: 'renewal', receiptUrl: receipt(own.id) },
        }),
      (api: Person['api']) =>
        api.post(`/api/organizations/${own.slug}/card-requests`, {
          data: {
            type: 'new_design',
            card: { name: 'X' },
            receiptUrl: receipt(own.id),
          },
        }),
      (api: Person['api']) =>
        api.post(`/api/organizations/${own.slug}/uploads`, {
          data: { contentType: 'image/png', contentLength: 1000 },
        }),
    ];
    for (const call of calls) {
      expect((await call(B.api)).status()).toBe(404);
      expect((await call(visitor)).status()).toBe(401);
    }
    const [row] = await sql(
      `select first_name, removed_at from card where id = $1`,
      [card.id]
    );
    expect(row).toEqual({ first_name: 'Personal', removed_at: null });
  });
});

test.describe('Part 8: Reliability (API)', () => {
  test('8.1 two tabs edit the same card', async ({ world }) => {
    const A = await world.person('alice');
    const card = await givePersonalCard(A);
    const form = {
      firstName: 'Personal',
      position: 'Self',
      phone: '091111111',
      socials: [],
    };
    expect(
      (await patchCard(A, card.slug, { ...form, phone: '092222222' })).status()
    ).toBe(200);
    const second = await patchCard(A, card.slug, {
      ...form,
      socials: [{ label: 'Site', value: 'https://alice.example' }],
    });
    expect(second.status()).toBe(200);
    const saved = await second.json();
    expect(saved.phone).toBe('091111111');
    expect(saved.socials).toHaveLength(1);
  });

  test('8.2 two cards take the same slug at once', async ({ world }) => {
    const A = await world.person('alice');
    const B = await world.person('bob');
    const mine = await givePersonalCard(A);
    const theirs = await givePersonalCard(B);
    const slug = `same-${crypto.randomUUID().slice(0, 6)}`;
    const results = await Promise.all([
      patchCard(A, mine.slug, { slug }),
      patchCard(B, theirs.slug, { slug }),
    ]);
    expect(await statuses(results)).toEqual([200, 409]);
  });

  test('8.3 approve and reject the same payment at once', async ({ world }) => {
    const T = await world.thakhin();
    const A = await world.person('alice');
    const card = await activeCard(A);
    const { paymentId } = await (await submitRenewal(A, card.slug)).json();
    const results = await Promise.all([
      reviewPayment(T, paymentId, 'approved'),
      reviewPayment(T, paymentId, 'rejected'),
    ]);
    expect(await statuses(results)).toEqual([200, 409]);
    const [payment] = await sql(
      `select status from subscription_payment where id = $1`,
      [paymentId]
    );
    const state = await subscription(card.id);
    expect(state.status).toBe('active');
    if (payment?.status === 'approved') {
      expect(state.current_period_end_at.getTime()).toBeGreaterThan(
        Date.now() + 500 * DAY
      );
    }
  });

  test('8.4 request submitted while email is down', async ({ world }) => {
    const A = await world.person('alice');
    await setEmailDown(true);
    try {
      const created = await newDesignRequest(A);
      const [card] = await sql(`select id from card where slug = $1`, [
        created.cardSlug,
      ]);
      expect(card).toBeTruthy();
    } finally {
      await setEmailDown(false);
    }
  });

  test('8.5 expiry task', async ({ world }) => {
    const T = await world.thakhin();
    const A = await world.person('alice');
    const card = await activeCard(A);
    await setPeriodEnd(card.id, new Date(Date.now() - 60_000));
    expect(await availability(world, card.slug)).toBe('paused');
    const run = await T.api.get('/_nitro/tasks/subscriptions:expire');
    test.skip(run.status() === 404, 'Nitro tasks are only exposed in dev');
    expect((await subscription(card.id)).status).toBe('expired');
  });
});
