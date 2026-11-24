// Steps mirror tests/guides/02.companies.md; keep the numbers in sync.
import type { APIResponse } from '@playwright/test';
import {
  accept,
  draft,
  emailsTo,
  expect,
  expectError,
  givePersonalCard,
  setEmailDown,
  setPeriodEnd,
  sql,
  test,
  waitForEmail,
  type Company,
  type CompanyCard,
  type Person,
  type World,
} from './support/companies';

const unique = (label: string) =>
  `${label}-${crypto.randomUUID().slice(0, 8)}@test.local`;

/** Acme after Part 3: Alice (A) is the admin and Mike (M1) a member, both paid. */
async function staffedCompany(world: World) {
  const company = await world.company();
  const A = await world.person('admin');
  const M1 = await world.person('m1');
  const alice = await world.hire(company, A, {
    firstName: 'Alice',
    role: 'admin',
    paid: true,
  });
  const mike = await world.hire(company, M1, {
    firstName: 'Mike',
    position: 'Sales',
    paid: true,
  });
  return { company, A, M1, alice, mike };
}

function offboard(admin: Person, card: CompanyCard) {
  return admin.api.delete(`/api/members/${card.memberId}`);
}

function assign(
  admin: Person,
  card: CompanyCard,
  email: string,
  firstName = 'Nina'
) {
  return admin.api.post(`/api/cards/${card.slug}/invitations`, {
    data: { firstName, email, position: 'Sales' },
  });
}

function exchangeByForm(world: World, slug: string) {
  return world.anonymous().then((visitor) =>
    visitor.request.post(`/api/public/cards/${slug}/contact-exchanges`, {
      data: {
        mode: 'form',
        name: 'Walk In',
        email: unique('walkin'),
        phone: '91234567',
      },
    })
  );
}

async function holders(admin: Person, card: CompanyCard) {
  const response = await admin.api.get(`/api/cards/${card.slug}/holders`);
  expect(response.status()).toBe(200);
  return (await response.json()).items as {
    holderName: string;
    endedAt: string | null;
    contactCount: number;
  }[];
}

async function publicCard(world: World, slug: string) {
  const visitor = await world.anonymous();
  return visitor.request.get(`/api/public/cards/${slug}`);
}

function insights(admin: Person, company: Company) {
  return admin.api
    .get(`/api/organizations/${company.slug}/company-insights?period=7d`)
    .then((response) => response.json());
}

async function statuses(responses: { status(): number }[]) {
  return responses.map((response) => response.status()).sort();
}

test.describe('Part 1: Thakhin creates the company', () => {
  test('1.1 create the company', async ({ world }) => {
    test.slow();
    const T = await world.thakhin();
    const name = `Acme UI ${crypto.randomUUID().slice(0, 6)}`;
    const page = await T.context.newPage();
    await page.goto('/thakhin/organizations');
    await page.getByRole('button', { name: 'Create' }).first().click();
    const form = page.getByRole('dialog');
    await form.getByPlaceholder('Organization name').fill(name);
    await form.getByRole('combobox').first().click();
    await page.getByRole('option', { name: 'Company' }).click();

    await expect(form.getByText('Organizer email')).toHaveCount(0);
    await expect(form.getByText('Owner', { exact: true })).toHaveCount(0);

    await form.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByText('Organization created').first()).toBeVisible();
    const [created] = await sql(
      `select id, type from organization where name = $1`,
      [name]
    );
    expect(created?.type).toBe('company');
    world.companyIds.push(created!.id);
  });

  test('1.2 list filters by type', async ({ world }) => {
    const T = await world.thakhin();
    const company = await world.company();
    const list = await (await T.api.get('/api/admin/organizations')).json();
    const row = list.items.find(
      (item: { id: string }) => item.id === company.id
    );
    expect(row.type).toBe('company');
  });

  test('1.3 edit company branding', async ({ world }) => {
    const T = await world.thakhin();
    const company = await world.company();
    const spline = 'https://prod.spline.design/acme/scene.splinecode';

    const saved = await T.api.patch(`/api/admin/organizations/${company.id}`, {
      data: {
        name: company.name,
        slug: company.slug,
        website: 'https://acme.example',
        splineUrl: spline,
      },
    });
    expect(saved.status(), await saved.text()).toBe(200);
    expect((await saved.json()).cardsUpdated).toBe(0);
    const detail = await (
      await T.api.get(`/api/admin/organizations/${company.id}`)
    ).json();
    expect(detail.company.website).toBe('https://acme.example');
    expect(detail.company.splineUrl).toBe(spline);

    const insecure = await T.api.patch(
      `/api/admin/organizations/${company.id}`,
      {
        data: {
          name: company.name,
          slug: company.slug,
          splineUrl: 'http://foo',
        },
      }
    );
    await expectError(insecure, 400);
  });

  // Uploads need S3, which the e2e stack doesn't run.
  test.skip('1.4 upload assets', () => {});
});

test.describe('Part 2: Creating cards and sending invites', () => {
  test('2.1 create the first admin card, free month only', async ({
    world,
  }) => {
    test.slow();
    const T = await world.thakhin();
    const company = await world.company();
    const adminEmail = `alice-${crypto.randomUUID().slice(0, 8)}@test.local`;
    const page = await T.context.newPage();
    await page.goto('/thakhin/organizations');
    await page.getByPlaceholder('Search name or slug').fill(company.slug);
    await page
      .locator('tr', { hasText: company.name })
      .locator('button')
      .last()
      .click();
    await page.getByRole('menuitem', { name: 'Cards' }).click();

    const panel = page.getByRole('dialog');
    await panel.getByLabel('First Name').fill('Alice');
    await panel.getByLabel('Email').fill(adminEmail);
    await panel.getByLabel('Position').fill('CEO');
    await panel.getByRole('combobox').first().click();
    await page.getByRole('option', { name: 'Admin' }).click();
    await panel.getByLabel('Paid term').uncheck();
    await expect(panel.getByText(/^Ends /).first()).toBeVisible();
    await expect(panel.getByLabel('Payment Reference')).toHaveCount(0);

    await panel
      .getByRole('button', { name: 'Create Cards and Send Invites' })
      .click();
    await expect(page.getByText('Cards created').first()).toBeVisible();

    await waitForEmail(adminEmail, 'invited to administer');
    const [card] = await world.cards(company);
    expect(card?.state).toBe('pending');
    const days = (Date.parse(card!.periodEnd!) - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(27);
    expect(days).toBeLessThan(32);

    const payments = await sql(
      `select payment_method, paid_by_user_id, note, sum(i.amount_minor)::int as total
       from subscription_payment p join subscription_payment_item i on i.payment_id = p.id
       where p.organization_id = $1 group by p.id`,
      [company.id]
    );
    expect(payments).toEqual([
      {
        payment_method: 'system',
        paid_by_user_id: null,
        note: 'Free month',
        total: 0,
      },
    ]);
  });

  test('2.2 batch with free month plus paid term', async ({ world }) => {
    const company = await world.company();
    const m1 = `mike-${crypto.randomUUID().slice(0, 8)}@test.local`;
    const m3 = `ivy-${crypto.randomUUID().slice(0, 8)}@test.local`;

    const response = await world.createCards(
      company,
      [
        draft(m1, { firstName: 'Mike', position: 'Sales', paid: true }),
        draft(m3, {
          firstName: 'Ivy',
          position: 'Designer',
          freeMonth: false,
          paid: true,
        }),
      ],
      { amountMinor: 100000, paymentReference: 'TEST-001' }
    );
    expect(response.status(), await response.text()).toBe(201);

    await waitForEmail(m1, 'invited to join');
    await waitForEmail(m3, 'invited to join');
    const payments = await sql(
      `select p.payment_method, p.payment_reference,
              array_agg(i.amount_minor order by i.amount_minor) as amounts
       from subscription_payment p join subscription_payment_item i on i.payment_id = p.id
       where p.organization_id = $1 group by p.id order by p.payment_method`,
      [company.id]
    );
    expect(payments).toEqual([
      {
        payment_method: 'manual',
        payment_reference: 'TEST-001',
        amounts: [50000, 50000],
      },
      { payment_method: 'system', payment_reference: null, amounts: [0] },
    ]);

    const cards = await world.cards(company);
    const mike = cards.find((item) => item.inviteEmail === m1)!;
    const ivy = cards.find((item) => item.inviteEmail === m3)!;
    const gapDays =
      (Date.parse(mike.periodEnd!) - Date.parse(ivy.periodEnd!)) / 86_400_000;
    expect(gapDays).toBeGreaterThan(27);
    expect(gapDays).toBeLessThan(32);
  });

  test('2.3 validation errors', async ({ world }) => {
    const company = await world.company();
    const taken = `m1-${crypto.randomUUID().slice(0, 8)}@test.local`;
    const twice = `twice-${crypto.randomUUID().slice(0, 8)}@test.local`;

    await expectError(
      await world.createCards(company, [draft(twice), draft(twice)]),
      400,
      'Each card needs a different email'
    );
    await world.invite(company, draft(taken));
    await expectError(
      await world.createCards(company, [draft(taken)]),
      409,
      'already has a pending invite to another card'
    );
    await expectError(
      await world.createCards(company, [
        draft(`x-${crypto.randomUUID().slice(0, 8)}@test.local`, {
          freeMonth: false,
          paid: false,
        }),
      ]),
      400
    );
    expect(await world.cards(company)).toHaveLength(1);
  });
});

test.describe('Part 3: Accepting invites', () => {
  test('3.1 admin accepts', async ({ world }) => {
    test.slow();
    const company = await world.company();
    const A = await world.person('admin');
    const invited = await world.invite(company, draft(A, { role: 'admin' }));
    await world.createCards(company, [
      draft(`m-${crypto.randomUUID().slice(0, 8)}@test.local`, { paid: true }),
    ]);

    const page = await A.context.newPage();
    await page.goto(`/invite/community/accept/${invited.invitationId}`);
    await page.getByRole('button', { name: 'Accept Invitation' }).click();
    // The redirect happens only after the accept finished, so read the card after it.
    await expect(page).toHaveURL(
      new RegExp(`/platform/${company.slug}/cards/[^/?]+`)
    );

    const card = await world.card(company, invited.id);
    expect(page.url()).toContain(`/cards/${card.slug}`);
    expect(card.state).toBe('active');
    const payers = await sql(
      `select distinct paid_by_user_id from subscription_payment where organization_id = $1`,
      [company.id]
    );
    expect(payers).toEqual([{ paid_by_user_id: A.userId }]);
  });

  test('3.2 accepting again redirects to the card', async ({ world }) => {
    const company = await world.company();
    const A = await world.person('admin');
    const invited = await world.invite(company, draft(A, { role: 'admin' }));
    expect((await accept(A, invited.invitationId)).status()).toBe(200);

    const again = await accept(A, invited.invitationId);
    expect(again.status()).toBe(200);
    const card = await world.card(company, invited.id);
    expect((await again.json()).redirectTo).toBe(
      `/platform/${company.slug}/cards/${card.slug}`
    );
  });

  test('3.3 wrong account', async ({ world }) => {
    const company = await world.company();
    const V = await world.person('visitor');
    const invited = await world.invite(
      company,
      draft(`m1-${crypto.randomUUID().slice(0, 8)}@test.local`)
    );

    await expectError(
      await V.api.get(`/api/invitations/${invited.invitationId}`),
      403,
      'This invitation was sent to'
    );
    const response = await accept(V, invited.invitationId);
    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect((await world.card(company, invited.id)).state).toBe('pending');
  });

  test('3.4 member accepts', async ({ world }) => {
    const company = await world.company();
    const M1 = await world.person('m1');
    const personal = await givePersonalCard(M1);
    const card = await world.hire(company, M1);

    expect(card.state).toBe('active');
    expect((await M1.api.get(`/api/cards/${card.slug}`)).status()).toBe(200);
    const [kept] = await sql(`select user_id from card where id = $1`, [
      personal.id,
    ]);
    expect(kept?.user_id).toBe(M1.userId);
    const mine = await (await M1.api.get('/api/me/cards')).json();
    expect(mine.items.map((item: { slug: string }) => item.slug)).toEqual(
      expect.arrayContaining([card.slug, personal.slug])
    );
    const organizations = await (
      await M1.api.get('/api/me/organizations')
    ).json();
    const acme = organizations.items.find(
      (item: { slug: string }) => item.slug === company.slug
    );
    expect(acme?.role).toBe('member');
    for (const path of [
      'company-cards',
      'company-insights',
      'company-settings',
    ]) {
      expect(
        (
          await M1.api.get(`/api/organizations/${company.slug}/${path}`)
        ).status()
      ).toBe(403);
    }
  });

  test('3.5 what a member can edit', async ({ world }) => {
    const company = await world.company();
    const M1 = await world.person('m1');
    const card = await world.hire(company, M1);

    const saved = await M1.api.patch(`/api/cards/${card.slug}`, {
      data: {
        phone: '91234567',
        socials: [{ label: 'LinkedIn', value: 'https://linkedin.com/in/mike' }],
      },
    });
    expect(saved.status(), await saved.text()).toBe(200);
    const [row] = await sql(`select phone, socials from card where id = $1`, [
      card.id,
    ]);
    expect(row?.phone).toBe('91234567');
    expect(row?.socials).toHaveLength(1);
    expect(
      (await M1.api.delete(`/api/cards/${card.slug}`)).status()
    ).toBeGreaterThanOrEqual(400);
  });
});

test.describe('Part 4: The company workspace (as A)', () => {
  test('4.1 sidebar', async ({ world }) => {
    test.slow();
    const { company, A } = await staffedCompany(world);
    const page = await A.context.newPage();
    await page.goto('/platform');
    await expect(page.getByText(company.name).first()).toBeVisible();
    for (const path of ['', '/members', '/contacts', '/settings']) {
      await expect(
        page.locator(`a[href="/platform/${company.slug}${path}"]`).first()
      ).toBeVisible();
    }
  });

  test('4.2 settings → company', async ({ world }) => {
    const { company, A, mike } = await staffedCompany(world);
    const name = `Acme Test Company ${crypto.randomUUID().slice(0, 4)}`;

    const saved = await A.api.patch(
      `/api/organizations/${company.slug}/company-settings`,
      { data: { name, website: 'https://acme2.example' } }
    );
    expect(saved.status(), await saved.text()).toBe(200);
    const card = await (await publicCard(world, mike.slug)).json();
    expect(card.company).toBe(name);
    expect(card.website).toBe('https://acme2.example');

    const xss = await A.api.patch(
      `/api/organizations/${company.slug}/company-settings`,
      { data: { name, website: 'javascript:alert(1)' } }
    );
    await expectError(xss, 400);
    expect((await (await publicCard(world, mike.slug)).json()).website).toBe(
      'https://acme2.example'
    );
  });

  test('4.3 settings → departments', async ({ world }) => {
    const { company, A } = await staffedCompany(world);
    const base = `/api/organizations/${company.slug}/departments`;

    expect((await A.api.post(base, { data: { name: 'Sales' } })).status()).toBe(
      201
    );
    const eng = await (
      await A.api.post(base, { data: { name: 'Engineering' } })
    ).json();
    const renamed = await A.api.patch(`${base}/${eng.id}`, {
      data: { name: 'Eng' },
    });
    expect(renamed.status(), await renamed.text()).toBe(200);
    await expectError(
      await A.api.post(base, { data: { name: 'Sales' } }),
      409,
      'A department with this name already exists.'
    );
    expect((await A.api.delete(`${base}/${eng.id}`)).status()).toBe(204);

    const names = (await (await A.api.get(base)).json()).items.map(
      (item: { name: string }) => item.name
    );
    expect(names).toEqual(['Sales']);
  });

  test('4.4 members page', async ({ world }) => {
    const { company, A, mike } = await staffedCompany(world);
    const ivy = unique('ivy');
    await world.invite(company, draft(ivy, { firstName: 'Ivy' }));

    const cards = (
      await (
        await A.api.get(`/api/organizations/${company.slug}/company-cards`)
      ).json()
    ).items as CompanyCard[];
    const count = (state: string) =>
      cards.filter((item) => item.state === state).length;
    expect([count('active'), count('pending'), count('vacant')]).toEqual([
      2, 1, 0,
    ]);

    const sales = await (
      await A.api.post(`/api/organizations/${company.slug}/departments`, {
        data: { name: 'Sales' },
      })
    ).json();
    const saved = await A.api.patch(`/api/cards/${mike.slug}`, {
      data: { departmentId: sales.id },
    });
    expect(saved.status(), await saved.text()).toBe(200);
    expect((await world.card(company, mike.id)).departmentId).toBe(sales.id);
    const [holder] = await holders(A, mike);
    expect(holder).toMatchObject({ endedAt: null, contactCount: 0 });

    const pending = cards.find((item) => item.state === 'pending')!;
    const resent = await A.api.post(
      `/api/cards/${pending.slug}/invitation-resends`
    );
    expect(resent.status()).toBe(202);
    await expect.poll(() => emailsTo(ivy, 'invited to join')).toBe(2);
  });

  test('4.5 insights', async ({ world }) => {
    const { company, A } = await staffedCompany(world);
    const data = await insights(A, company);
    expect(data).toMatchObject({ views: 0, clicks: 0, contacts: 0 });
    expect(data.dailyViews.length).toBeGreaterThan(0);
    expect(data.members).toHaveLength(2);
  });
});

test.describe('Part 5: The public card and contacts', () => {
  test('5.1 anonymous visitor', async ({ world }) => {
    const { company, A, M1, mike } = await staffedCompany(world);
    const visitor = await world.anonymous();
    const interact = (type: string) =>
      visitor.request.post(`/api/public/cards/${mike.slug}/interactions`, {
        data: { type },
      });
    expect((await interact('view')).status()).toBe(204);
    expect((await interact('link_click')).status()).toBe(204);
    expect((await exchangeByForm(world, mike.slug)).status()).toBe(201);

    const data = await insights(A, company);
    expect(data.views).toBe(1);
    expect(data.clicks).toBeGreaterThanOrEqual(1);
    expect(data.contacts).toBe(1);
    const row = data.members.find(
      (item: { name: string }) => item.name === M1.email.split('@')[0]
    );
    expect(row).toMatchObject({ views: 1, contacts: 1 });
  });

  test('5.2 exchange as a La Persona user', async ({ world }) => {
    const { mike } = await staffedCompany(world);
    const V = await world.person('visitor');
    await givePersonalCard(V);
    const exchanged = await V.api.post(
      `/api/public/cards/${mike.slug}/contact-exchanges`,
      { data: { mode: 'seamless' } }
    );
    expect(exchanged.status(), await exchanged.text()).toBeLessThan(300);
  });

  test('5.3 contacts (as A)', async ({ world }) => {
    const { company, A, M1, mike } = await staffedCompany(world);
    const V = await world.person('visitor');
    await givePersonalCard(V);
    await exchangeByForm(world, mike.slug);
    await V.api.post(`/api/public/cards/${mike.slug}/contact-exchanges`, {
      data: { mode: 'seamless' },
    });

    const page = await (
      await A.api.get(`/api/organizations/${company.slug}/contacts`)
    ).json();
    expect(page.items).toHaveLength(2);
    for (const item of page.items) {
      expect(item.card.holderName).toBe(M1.email.split('@')[0]);
    }

    const csv = await A.api.get(`/api/organizations/${company.slug}/contacts`, {
      headers: { accept: 'text/csv' },
    });
    expect(csv.status()).toBe(200);
    const header = (await csv.text()).split('\n')[0];
    expect(header).toContain('Holder');
    expect(header).toContain('Department');
  });

  test('5.4 contacts (as M1)', async ({ world }) => {
    const { M1, mike } = await staffedCompany(world);
    await exchangeByForm(world, mike.slug);
    await exchangeByForm(world, mike.slug);
    const page = await (await M1.api.get('/api/me/contacts')).json();
    expect(page.items).toHaveLength(2);
  });
});

test.describe('Part 6: Offboarding', () => {
  test('6.1 offboard Mike', async ({ world }) => {
    test.slow();
    const { company, A, M1, mike } = await staffedCompany(world);
    await exchangeByForm(world, mike.slug);
    await exchangeByForm(world, mike.slug);

    const page = await A.context.newPage();
    await page.goto(`/platform/${company.slug}/members`);
    await page
      .getByRole('button', {
        name: `Actions for ${M1.email.split('@')[0]}`,
        exact: true,
      })
      .click();
    await page.getByRole('menuitem', { name: 'Offboard' }).click();
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Offboard' })
      .click();
    await expect(page.getByText('Member offboarded').first()).toBeVisible();

    const card = await world.card(company, mike.id);
    expect(card).toMatchObject({
      state: 'vacant',
      firstName: 'Mike',
      position: 'Sales',
    });
    expect(card.email).toBeTruthy();
    const [holder] = await holders(A, card);
    expect(holder?.endedAt).toBeTruthy();
    expect(holder?.contactCount).toBe(2);
  });

  test("6.2 Mike's side", async ({ world }) => {
    const { A, M1, mike } = await staffedCompany(world);
    const personal = await givePersonalCard(M1);
    await exchangeByForm(world, mike.slug);
    expect((await offboard(A, mike)).status()).toBe(204);

    const cards = await (await M1.api.get('/api/me/cards')).json();
    expect(cards.items.map((item: { slug: string }) => item.slug)).toEqual([
      personal.slug,
    ]);
    const contacts = await (await M1.api.get('/api/me/contacts')).json();
    expect(contacts.items).toHaveLength(0);

    expect((await M1.api.get(`/api/cards/${mike.slug}`)).status()).toBe(404);
    const [kept] = await sql(`select user_id from card where id = $1`, [
      personal.id,
    ]);
    expect(kept?.user_id).toBe(M1.userId);
  });

  test('6.3 old link', async ({ world }) => {
    const { company, A, mike } = await staffedCompany(world);
    await offboard(A, mike);

    expect(await (await publicCard(world, mike.slug)).json()).toMatchObject({
      availability: 'retired',
    });
    const page = await (await world.anonymous()).newPage();
    await page.goto(`/c/${mike.slug}`);
    await expect(page.getByText('No longer here')).toBeVisible();
    await expect(page.getByText('This link has been retired.')).toBeVisible();
    await expect(page.getByText(company.name).first()).toBeVisible();
    await expect(page.getByText('Mike')).toHaveCount(0);
    await expect(page.getByRole('button')).toHaveCount(0);
  });

  test('6.4 nothing is recorded', async ({ world }) => {
    const { company, A, mike } = await staffedCompany(world);
    await offboard(A, mike);
    for (let visit = 0; visit < 3; visit += 1) {
      const visitor = await world.anonymous();
      const response = await visitor.request.post(
        `/api/public/cards/${mike.slug}/interactions`,
        { data: { type: 'view' } }
      );
      expect(response.status()).toBe(204);
    }
    expect((await insights(A, company)).views).toBe(0);
  });

  test('6.5 last admin', async ({ world }) => {
    const { company, A, alice } = await staffedCompany(world);
    await expectError(
      await offboard(A, alice),
      409,
      "The last admin can't be offboarded from this company."
    );
    expect((await world.card(company, alice.id)).state).toBe('active');
  });

  test('6.6 two admins offboard each other at once', async ({ world }) => {
    const { company, A, alice } = await staffedCompany(world);
    const B = await world.person('admin2');
    const bob = await world.hire(company, B, {
      firstName: 'Bob',
      role: 'admin',
    });

    const results = await Promise.all([offboard(A, bob), offboard(B, alice)]);
    // The loser gets 409, or 404 when the winner removed them before it was authorized.
    const [winner, loser] = await statuses(results);
    expect(winner).toBe(204);
    expect([404, 409]).toContain(loser);
    const admins = await sql(
      `select 1 from member where organization_id = $1 and role = 'admin'`,
      [company.id]
    );
    expect(admins).toHaveLength(1);
  });
});

test.describe('Part 7: Reassigning a vacant card', () => {
  test('7.1 assign to M2', async ({ world }) => {
    test.slow();
    const { company, A, M1, mike } = await staffedCompany(world);
    await M1.api.patch(`/api/cards/${mike.slug}`, {
      data: {
        phone: '91234567',
        socials: [{ label: 'LinkedIn', value: 'https://linkedin.com/in/mike' }],
      },
    });
    await offboard(A, mike);
    const m2 = unique('m2');

    const page = await A.context.newPage();
    await page.goto(`/platform/${company.slug}/members`);
    await page
      .getByRole('button', { name: 'Actions for Vacant', exact: true })
      .click();
    await page.getByRole('menuitem', { name: 'View card' }).click();
    const panel = page.getByRole('dialog');
    await panel.getByLabel('First name').last().fill('Nina');
    await panel.getByLabel('Email').last().fill(m2);
    await panel.getByLabel('Position').last().fill('Sales');
    await panel.getByRole('button', { name: 'Send invite' }).click();
    await expect(page.getByText('Invite sent').first()).toBeVisible();

    const card = await world.card(company, mike.id);
    expect(card.state).toBe('pending');
    expect(card.slug).not.toBe(mike.slug);
    await waitForEmail(m2, 'invited to join');
    const [row] = await sql(`select phone, socials from card where id = $1`, [
      mike.id,
    ]);
    expect(row?.phone ?? null).toBeNull();
    expect(row?.socials ?? []).toEqual([]);
  });

  test('7.2 links before acceptance', async ({ world }) => {
    const { company, A, mike } = await staffedCompany(world);
    await offboard(A, mike);
    const nina = await (await assign(A, mike, unique('m2'))).json();

    expect(
      (await (await publicCard(world, mike.slug)).json()).availability
    ).toBe('retired');
    const page = await (await world.anonymous()).newPage();
    await page.goto(`/c/${nina.slug}`);
    await expect(page.getByText('Card paused')).toBeVisible();
    await expect(
      page.getByText(
        new RegExp(`If it.s yours, ask your ${company.name}\\sadmin`)
      )
    ).toBeVisible();
    await expect(page.getByRole('button')).toHaveCount(0);
  });

  test('7.3 re-invite before acceptance', async ({ world }) => {
    const { company, A, mike } = await staffedCompany(world);
    await offboard(A, mike);
    const M2 = await world.person('m2');
    const V = await world.person('visitor');

    const first = await (await assign(A, mike, M2.email)).json();
    const cancelled = await A.api.patch(
      `/api/invitations/${first.invitationId}`,
      {
        data: { status: 'canceled' },
      }
    );
    expect(cancelled.status(), await cancelled.text()).toBe(200);
    let card = await world.card(company, mike.id);
    const second = await (await assign(A, card, V.email)).json();
    card = await world.card(company, mike.id);
    const third = await (await assign(A, card, M2.email)).json();

    for (const [person, invitationId] of [
      [M2, first.invitationId],
      [V, second.invitationId],
    ] as const) {
      await expectError(
        await accept(person, invitationId),
        409,
        'expired or was already processed'
      );
    }
    expect((await accept(M2, third.invitationId)).status()).toBe(200);
  });

  test('7.4 already in the company', async ({ world }) => {
    const { A, mike } = await staffedCompany(world);
    await offboard(A, mike);
    await expectError(
      await assign(A, mike, A.email),
      409,
      'is already in this company'
    );
  });

  test('7.5 M2 accepts', async ({ world }) => {
    const { company, A, mike } = await staffedCompany(world);
    await offboard(A, mike);
    const M2 = await world.person('m2');
    const nina = await (await assign(A, mike, M2.email)).json();
    expect((await accept(M2, nina.invitationId)).status()).toBe(200);

    expect((await (await publicCard(world, nina.slug)).json()).firstName).toBe(
      'Nina'
    );
    const card = await world.card(company, mike.id);
    expect(card.periodEnd).toBe(mike.periodEnd);
    const rows = await holders(A, card);
    expect(rows).toHaveLength(2);
    expect(rows.filter((row) => row.endedAt === null)).toHaveLength(1);
  });

  test('7.6 one contact per holder', async ({ world }) => {
    const { company, A, M1, mike } = await staffedCompany(world);
    await exchangeByForm(world, mike.slug);
    await exchangeByForm(world, mike.slug);
    const visitor = await world.anonymous();
    await visitor.request.post(`/api/public/cards/${mike.slug}/interactions`, {
      data: { type: 'view' },
    });
    await offboard(A, mike);
    const M2 = await world.person('m2');
    const nina = await (await assign(A, mike, M2.email)).json();
    await accept(M2, nina.invitationId);
    const V = await world.person('visitor');
    await givePersonalCard(V);

    const exchanged = await V.api.post(
      `/api/public/cards/${nina.slug}/contact-exchanges`,
      { data: { mode: 'seamless' } }
    );
    expect(exchanged.status(), await exchanged.text()).toBeLessThan(300);
    const mine = await (await M2.api.get('/api/me/contacts')).json();
    expect(mine.items.map((item: { email: string }) => item.email)).toEqual([
      V.email,
    ]);
    const cards = await (await M2.api.get('/api/me/cards')).json();
    expect(cards.items.map((item: { slug: string }) => item.slug)).toContain(
      nina.slug
    );
    // Mike's view stays with Mike's holding.
    const analytics = await (await M2.api.get('/api/me/analytics')).json();
    const views = analytics.totalStats.find(
      (stat: { type: string }) => stat.type === 'view'
    );
    expect(views?.count ?? 0).toBe(0);
    const card = await world.card(company, mike.id);
    const rows = await holders(A, card);
    expect(rows.find((row) => row.endedAt !== null)?.contactCount).toBe(2);
    expect(rows.find((row) => row.endedAt === null)?.contactCount).toBe(1);

    // The admin still sees every holder's contacts and views.
    const all = await (
      await A.api.get(`/api/organizations/${company.slug}/contacts`)
    ).json();
    const byHolder = all.items
      .map((item: { card: { holderName: string } }) => item.card.holderName)
      .sort();
    expect(byHolder).toEqual(
      [
        M1.email.split('@')[0],
        M1.email.split('@')[0],
        M2.email.split('@')[0],
      ].sort()
    );
    expect((await insights(A, company)).views).toBe(1);
  });
});

test.describe('Part 8: Cancelling an invite', () => {
  test('8 cancel an invite nobody accepted', async ({ world }) => {
    const { company, A } = await staffedCompany(world);
    const M3 = await world.person('m3');
    const ivy = await world.invite(company, draft(M3, { firstName: 'Ivy' }));

    const cancelled = await A.api.patch(
      `/api/invitations/${ivy.invitationId}`,
      {
        data: { status: 'canceled' },
      }
    );
    expect(cancelled.status()).toBe(200);
    const card = await world.card(company, ivy.id);
    expect(card.state).toBe('vacant');
    await expectError(await accept(M3, ivy.invitationId), 409);
    expect(
      (await (await publicCard(world, card.slug)).json()).availability
    ).toBe('paused');

    await assign(A, card, unique('next'));
    expect((await publicCard(world, card.slug)).status()).toBe(404);
  });
});

test.describe('Part 9: Thakhin payments and renewals', () => {
  async function record(
    world: World,
    company: Company,
    cards: CompanyCard[],
    body: object
  ) {
    const T = await world.thakhin();
    return T.api.post(`/api/admin/organizations/${company.id}/payments`, {
      data: {
        cards: cards.map((item) => ({
          id: item.id,
          periodEnd: item.periodEnd,
        })),
        ...body,
      },
    });
  }

  test('9.1 record a payment', async ({ world }) => {
    const { company, A, alice, mike } = await staffedCompany(world);
    const response = await record(world, company, [alice, mike], {
      termYears: 2,
      amountMinor: 200000,
    });
    expect(response.status(), await response.text()).toBe(201);
    const { paymentId } = await response.json();

    const [payment] = await sql(
      `select paid_by_user_id, array_agg(i.amount_minor) as amounts
       from subscription_payment p join subscription_payment_item i on i.payment_id = p.id
       where p.id = $1 group by p.id`,
      [paymentId]
    );
    expect(payment).toEqual({
      paid_by_user_id: A.userId,
      amounts: [100000, 100000],
    });
    for (const before of [alice, mike]) {
      const after = await world.card(company, before.id);
      const expected = new Date(before.periodEnd!);
      expected.setFullYear(expected.getFullYear() + 2);
      expect(after.periodEnd).toBe(expected.toISOString());
    }
  });

  test('9.2 extend to a date', async ({ world }) => {
    const { company, alice, mike } = await staffedCompany(world);
    const endAt = new Date();
    endAt.setMonth(endAt.getMonth() + 18);
    endAt.setHours(23, 59, 59, 0);
    const response = await record(world, company, [alice, mike], {
      endAt: endAt.toISOString(),
      amountMinor: 1000,
    });
    expect(response.status(), await response.text()).toBe(201);
    for (const card of [alice, mike]) {
      expect((await world.card(company, card.id)).periodEnd).toBe(
        endAt.toISOString()
      );
    }

    const fresh = await world.cards(company);
    const tooEarly = await record(world, company, fresh, {
      endAt: new Date(Date.now() + 86_400_000).toISOString(),
      amountMinor: 1000,
    });
    await expectError(
      tooEarly,
      400,
      'The end date must be after the paid term starts.'
    );
  });

  test('9.3 renaming in Thakhin', async ({ world }) => {
    const { company } = await staffedCompany(world);
    const T = await world.thakhin();
    const name = `Acme Final ${crypto.randomUUID().slice(0, 4)}`;
    const saved = await T.api.patch(`/api/admin/organizations/${company.id}`, {
      data: { name, slug: company.slug },
    });
    expect((await saved.json()).cardsUpdated).toBe(2);
    const rows = await sql(
      `select distinct company from card where organization_id = $1`,
      [company.id]
    );
    expect(rows).toEqual([{ company: name }]);
  });
});

test.describe('Part 10: Paused cards', () => {
  test('10.1 company card expires', async ({ world }) => {
    const { company, mike } = await staffedCompany(world);
    await setPeriodEnd(mike.id, new Date(Date.now() - 86_400_000));

    const page = await (await world.anonymous()).newPage();
    await page.goto(`/c/${mike.slug}`);
    await expect(page.getByText('Card paused')).toBeVisible();
    await expect(
      page.getByText(new RegExp(`ask your ${company.name}\\sadmin`))
    ).toBeVisible();
    await expect(page.getByRole('button')).toHaveCount(0);
    await expectError(await exchangeByForm(world, mike.slug), 409);

    const T = await world.thakhin();
    const card = await world.card(company, mike.id);
    const revived = await T.api.post(
      `/api/admin/organizations/${company.id}/payments`,
      {
        data: {
          cards: [{ id: card.id, periodEnd: card.periodEnd }],
          termYears: 1,
          amountMinor: 0,
        },
      }
    );
    expect(revived.status()).toBe(201);
    expect((await exchangeByForm(world, mike.slug)).status()).toBe(201);
  });

  test('10.2 personal card expires', async ({ world }) => {
    test.slow();
    const P = await world.person('personal');
    const card = await givePersonalCard(P);
    await sql(
      `insert into card_subscription (id, card_id, plan_code, status, is_trial, current_period_start_at, current_period_end_at, activated_at)
       values (gen_random_uuid()::text, $1, 'standard', 'active', false, now() - interval '1 year', now() - interval '1 day', now() - interval '1 year')`,
      [card.id]
    );

    const visitor = await (await world.anonymous()).newPage();
    await visitor.goto(`/c/${card.slug}`);
    await expect(visitor.getByText('Card paused')).toBeVisible();
    await expect(
      visitor.getByText(
        'This card is taking a short break. Please check back soon.'
      )
    ).toBeVisible();
    await expect(visitor.getByRole('button')).toHaveCount(0);

    const owner = await P.context.newPage();
    await owner.goto(`/c/${card.slug}`);
    await expect(owner.getByText('Your card is paused')).toBeVisible();
    await owner
      .getByRole('link', { name: 'Extend my card' })
      .or(owner.getByRole('button', { name: 'Extend my card' }))
      .click();
    await expect(owner).toHaveURL(
      new RegExp(`/cards/${card.slug}\\?payment=renewal`)
    );
  });

  test('10.3 community cards never pause', async ({ world }) => {
    const T = await world.thakhin();
    const O = await world.person('organizer');
    const created = await T.api.post('/api/admin/organizations', {
      data: {
        name: `Club ${crypto.randomUUID().slice(0, 6)}`,
        type: 'community',
        ownerEmail: O.email,
      },
    });
    expect(created.status(), await created.text()).toBe(201);
    const [invite] = await sql(`select id from invitation where email = $1`, [
      O.email,
    ]);
    expect((await accept(O, invite!.id)).status()).toBe(200);
    const [card] = await sql(
      `select id, slug from card where user_id = $1 and organization_id = $2`,
      [O.userId, (await created.json()).id]
    );
    await sql(
      `insert into card_subscription (id, card_id, plan_code, status, is_trial, current_period_start_at, current_period_end_at, activated_at)
       values (gen_random_uuid()::text, $1, 'standard', 'active', false, now() - interval '1 year', now() - interval '1 day', now())
       on conflict (card_id) do update set current_period_end_at = excluded.current_period_end_at`,
      [card!.id]
    );
    const response = await publicCard(world, card!.slug);
    expect((await response.json()).availability).toBeUndefined();
  });
});

test.describe('Part 11: Deleting a user', () => {
  test("11.1 the only admin can't be deleted", async ({ world }) => {
    const { company, A, alice } = await staffedCompany(world);
    const T = await world.thakhin();
    await expectError(
      await T.api.delete(`/api/admin/users/${A.userId}`),
      409,
      `This user is the only admin of ${company.name}. Add another admin there before deleting them.`
    );
    expect((await world.card(company, alice.id)).state).toBe('active');
  });

  test('11.2 delete a member', async ({ world }) => {
    const { company, A, M1, mike } = await staffedCompany(world);
    const T = await world.thakhin();
    expect((await T.api.delete(`/api/admin/users/${M1.userId}`)).status()).toBe(
      204
    );

    const card = await world.card(company, mike.id);
    expect(card.state).toBe('vacant');
    const [holder] = await holders(A, card);
    expect(holder?.endedAt).toBeTruthy();
    expect(
      (await (await publicCard(world, mike.slug)).json()).availability
    ).toBe('retired');
    const payments = await sql(
      `select 1 from subscription_payment_item where card_id = $1`,
      [mike.id]
    );
    expect(payments.length).toBeGreaterThan(0);

    const M3 = await world.person('m3');
    const next = await (await assign(A, card, M3.email)).json();
    expect((await accept(M3, next.invitationId)).status()).toBe(200);
  });
});

test.describe('Part 12: Checks without a UI', () => {
  test('12 cross-company and contract checks', async ({ world }) => {
    const { company, A } = await staffedCompany(world);
    const beta = await world.company('Beta Co');
    const B = await world.person('beta-admin');
    await world.hire(beta, B, { role: 'admin' });
    const betaDept = await (
      await B.api.post(`/api/organizations/${beta.slug}/departments`, {
        data: { name: 'Ops' },
      })
    ).json();

    expect(
      (
        await A.api.delete(
          `/api/organizations/${company.slug}/departments/${betaDept.id}`
        )
      ).status()
    ).toBe(404);
    expect(
      (
        await A.api.post(`/api/organizations/${company.slug}/card-requests`, {
          data: {},
        })
      ).status()
    ).toBe(404);

    const T = await world.thakhin();
    await expectError(
      await T.api.post('/api/admin/organizations', {
        data: {
          name: 'Owned Co',
          type: 'company',
          ownerEmail: unique('owner'),
        },
      }),
      400
    );
    const [card] = await world.cards(company);
    for (const body of [
      { termYears: 1, endAt: new Date().toISOString() },
      {},
    ]) {
      await expectError(
        await T.api.post(`/api/admin/organizations/${company.id}/payments`, {
          data: {
            cards: [{ id: card!.id, periodEnd: card!.periodEnd }],
            amountMinor: 0,
            ...body,
          },
        }),
        400
      );
    }
    const ignored = await world.createCards(company, [draft(unique('x'))], {
      endAt: new Date().toISOString(),
    });
    expect(ignored.status()).toBe(201);
  });
});

test.describe('Part 13: Access checks', () => {
  test("13.1 a member can't use admin routes", async ({ world }) => {
    const { company, M1, alice } = await staffedCompany(world);
    const vacant = await world.invite(company, draft(unique('v')));
    const vacantCard = await world.card(company, vacant.id);
    const org = `/api/organizations/${company.slug}`;
    const calls = [
      M1.api.get(`${org}/company-cards`),
      M1.api.get(`${org}/company-insights`),
      M1.api.patch(`${org}/company-settings`, { data: { name: 'Hacked' } }),
      M1.api.post(`${org}/departments`, { data: { name: 'Hacked' } }),
      M1.api.get(`${org}/payments`),
      M1.api.delete(`/api/members/${alice.memberId}`),
      M1.api.post(`/api/cards/${vacantCard.slug}/invitations`, {
        data: { firstName: 'X', email: unique('x'), position: 'X' },
      }),
    ];
    for (const response of await Promise.all(calls)) {
      expect(response.status(), response.url()).toBe(403);
    }
    const [row] = await sql(`select name from organization where id = $1`, [
      company.id,
    ]);
    expect(row?.name).toBe(company.name);
  });

  test('13.2 outsiders get 404', async ({ world }) => {
    const { company, alice } = await staffedCompany(world);
    const V = await world.person('visitor');
    const org = `/api/organizations/${company.slug}`;
    const calls = [
      V.api.get(`${org}/company-cards`),
      V.api.get(`${org}/company-insights`),
      V.api.patch(`${org}/company-settings`, { data: { name: 'Hacked' } }),
      V.api.post(`${org}/departments`, { data: { name: 'Hacked' } }),
      V.api.get(`${org}/payments`),
      V.api.delete(`/api/members/${alice.memberId}`),
    ];
    for (const response of await Promise.all(calls)) {
      expect(response.status(), response.url()).toBe(404);
    }
  });

  test("13.3 one company's admin can't reach another", async ({ world }) => {
    const { A } = await staffedCompany(world);
    const beta = await world.company('Beta Co');
    const org = `/api/organizations/${beta.slug}`;
    for (const path of ['company-cards', 'contacts', 'company-settings']) {
      expect((await A.api.get(`${org}/${path}`)).status()).toBe(404);
    }
  });

  test('13.4 locked fields stay locked', async ({ world }) => {
    const { company, M1, mike } = await staffedCompany(world);
    const response = await M1.api.patch(`/api/cards/${mike.slug}`, {
      data: {
        company: 'Hacked Inc',
        website: 'https://hacked.example',
        slug: 'hacked-slug',
        departmentId: 'not-a-department',
      },
    });
    expect(response.status()).toBeLessThan(500);
    const [row] = await sql(
      `select company, website, slug, department_id from card where id = $1`,
      [mike.id]
    );
    expect(row).toEqual({
      company: company.name,
      website: null,
      slug: mike.slug,
      department_id: null,
    });
  });

  test("13.5 the next holder can't reach earlier contacts", async ({
    world,
  }) => {
    const { company, A, mike } = await staffedCompany(world);
    await exchangeByForm(world, mike.slug);
    const [earlier] = (
      await (
        await A.api.get(`/api/organizations/${company.slug}/contacts`)
      ).json()
    ).items;
    await offboard(A, mike);
    const M2 = await world.person('m2');
    const nina = await (await assign(A, mike, M2.email)).json();
    await accept(M2, nina.invitationId);

    expect(
      (
        await M2.api.patch(`/api/contacts/${earlier.id}`, {
          data: { note: 'x' },
        })
      ).status()
    ).toBe(404);
    expect((await M2.api.delete(`/api/contacts/${earlier.id}`)).status()).toBe(
      404
    );

    await exchangeByForm(world, nina.slug);
    const [own] = (await (await M2.api.get('/api/me/contacts')).json()).items;
    expect(own.id).not.toBe(earlier.id);
    expect((await M2.api.delete(`/api/contacts/${own.id}`)).status()).toBe(204);
  });

  test('13.6 retired and paused cards take no contacts', async ({ world }) => {
    const { A, alice, mike } = await staffedCompany(world);
    await offboard(A, mike);
    await expectError(
      await exchangeByForm(world, mike.slug),
      409,
      'not assigned'
    );
    await assign(A, mike, unique('m2'));
    expect((await exchangeByForm(world, mike.slug)).status()).toBe(404);
    await setPeriodEnd(alice.id, new Date(Date.now() - 60_000));
    await expectError(
      await exchangeByForm(world, alice.slug),
      409,
      'unavailable'
    );
    const contacts = await sql(
      `select 1 from contact_exchange where card_id = $1`,
      [mike.id]
    );
    expect(contacts).toHaveLength(0);
  });
  test('13.7 image uploads', async ({ world }) => {
    const { company, A, M1 } = await staffedCompany(world);
    const uploads = `/api/organizations/${company.slug}/uploads`;
    const rejects = async (
      response: APIResponse,
      field: string,
      detail?: string
    ) => {
      const body: {
        data: { message: string; details: { message: string }[] };
      } = await response.json();
      expect(response.status()).toBe(400);
      expect(body.data.message).toBe(`Invalid ${field}`);
      if (detail) expect(body.data.details[0].message).toBe(detail);
    };
    const ask = (person: { api: typeof A.api }, data: object, path = uploads) =>
      person.api.post(path, { data });

    for (const [contentType, extension] of [
      ['image/png', 'png'],
      ['image/jpeg', 'jpg'],
      ['image/webp', 'webp'],
    ]) {
      const response = await ask(A, {
        contentType,
        contentLength: 1000,
        key: 'uploads/wallpaper-standard.webp',
      });
      expect(response.status(), await response.text()).toBe(201);
      const ticket = await response.json();
      expect(ticket.key).toMatch(
        new RegExp(`^organizations/${company.id}/[0-9a-f-]{36}\\.${extension}$`)
      );
      const url = new URL(ticket.uploadUrl);
      expect(url.searchParams.get('X-Amz-SignedHeaders')).toContain(
        'content-length'
      );
      expect(url.searchParams.get('X-Amz-SignedHeaders')).toContain(
        'content-type'
      );
      expect(Number(url.searchParams.get('X-Amz-Expires'))).toBeLessThanOrEqual(
        60
      );
    }

    await rejects(
      await ask(A, { contentType: 'image/svg+xml', contentLength: 1000 }),
      'contentType',
      'Upload a JPG, PNG or WebP image.'
    );
    await rejects(
      await ask(A, { contentType: 'image/gif', contentLength: 1000 }),
      'contentType'
    );
    await rejects(
      await ask(A, {
        contentType: 'image/png',
        contentLength: 5 * 1024 * 1024 + 1,
      }),
      'contentLength',
      'Images must be 5 MB or smaller.'
    );
    await rejects(
      await ask(A, { contentType: 'image/png', contentLength: 0 }),
      'contentLength'
    );

    // Members upload their own card photo.
    expect(
      (
        await ask(M1, { contentType: 'image/png', contentLength: 1000 })
      ).status()
    ).toBe(201);

    const V = await world.person('visitor');
    expect(
      (await ask(V, { contentType: 'image/png', contentLength: 1000 })).status()
    ).toBe(404);
    const beta = await world.company('Beta Co');
    expect(
      (
        await ask(
          A,
          { contentType: 'image/png', contentLength: 1000 },
          `/api/organizations/${beta.slug}/uploads`
        )
      ).status()
    ).toBe(404);
    const anonymous = await world.anonymous();
    expect(
      (
        await anonymous.request.post(uploads, {
          data: { contentType: 'image/png', contentLength: 1000 },
        })
      ).status()
    ).toBe(401);

    const T = await world.thakhin();
    const admin = {
      contentType: 'image/png',
      contentLength: 1000,
      organizationId: company.id,
    };
    const thakhin = await ask(T, admin, '/api/admin/uploads');
    expect(thakhin.status(), await thakhin.text()).toBe(201);
    expect((await thakhin.json()).key).toMatch(
      new RegExp(`^organizations/${company.id}/`)
    );
    expect((await ask(A, admin, '/api/admin/uploads')).status()).toBe(404);
    await expectError(
      await ask(
        T,
        { ...admin, contentType: 'image/svg+xml' },
        '/api/admin/uploads'
      ),
      400
    );
  });
});

test.describe('Part 14: Reliability', () => {
  test('14.1 accept in two tabs at once', async ({ world }) => {
    const company = await world.company();
    const M1 = await world.person('m1');
    const invited = await world.invite(company, draft(M1));

    const results = await Promise.all([
      accept(M1, invited.invitationId),
      accept(M1, invited.invitationId),
    ]);
    for (const response of results) expect(response.status()).toBeLessThan(500);
    expect(results.some((response) => response.status() === 200)).toBe(true);
    const members = await sql(
      `select 1 from member where organization_id = $1 and user_id = $2`,
      [company.id, M1.userId]
    );
    expect(members).toHaveLength(1);
    const card = await world.card(company, invited.id);
    expect(card.userId).toBe(M1.userId);
    expect((await M1.api.get(`/api/cards/${card.slug}`)).status()).toBe(200);
  });

  test('14.1 community invite accepted twice at once', async ({ world }) => {
    const T = await world.thakhin();
    const O = await world.person('organizer');
    const created = await (
      await T.api.post('/api/admin/organizations', {
        data: {
          name: `Club ${crypto.randomUUID().slice(0, 6)}`,
          type: 'community',
          ownerEmail: O.email,
        },
      })
    ).json();
    const [invite] = await sql(`select id from invitation where email = $1`, [
      O.email,
    ]);

    const results = await Promise.all([
      accept(O, invite!.id),
      accept(O, invite!.id),
    ]);
    for (const response of results) expect(response.status()).toBeLessThan(500);
    const counts = await sql(
      `select (select count(*)::int from member where organization_id = $1 and user_id = $2) as members,
              (select count(*)::int from card where organization_id = $1 and user_id = $2) as cards`,
      [created.id, O.userId]
    );
    expect(counts).toEqual([{ members: 1, cards: 1 }]);
  });

  test('14.2 accept after the invite was cancelled', async ({ world }) => {
    const { company, A } = await staffedCompany(world);
    const M3 = await world.person('m3');
    const ivy = await world.invite(company, draft(M3));
    await A.api.patch(`/api/invitations/${ivy.invitationId}`, {
      data: { status: 'canceled' },
    });

    await expectError(
      await accept(M3, ivy.invitationId),
      409,
      'This invitation has expired or was already processed.'
    );
    expect((await world.card(company, ivy.id)).state).toBe('vacant');
    expect(
      await sql(
        `select 1 from member where organization_id = $1 and user_id = $2`,
        [company.id, M3.userId]
      )
    ).toHaveLength(0);
  });

  test('14.3 expired invite, then resend', async ({ world }) => {
    const { company, A } = await staffedCompany(world);
    const M3 = await world.person('m3');
    const ivy = await world.invite(company, draft(M3));
    await sql(
      `update invitation set expires_at = now() - interval '1 day' where id = $1`,
      [ivy.invitationId]
    );

    await expectError(
      await accept(M3, ivy.invitationId),
      409,
      'expired or was already processed'
    );
    const card = await world.card(company, ivy.id);
    const before = await emailsTo(M3.email);
    expect(
      (await A.api.post(`/api/cards/${card.slug}/invitation-resends`)).status()
    ).toBe(202);
    await expect.poll(() => emailsTo(M3.email)).toBe(before + 1);
    expect((await accept(M3, ivy.invitationId)).status()).toBe(200);
  });

  test('14.4 create the same batch twice at once', async ({ world }) => {
    const company = await world.company();
    const batch = [draft(unique('m1')), draft(unique('m3'), { paid: true })];

    const results = await Promise.all([
      world.createCards(company, batch, { amountMinor: 1000 }),
      world.createCards(company, batch, { amountMinor: 1000 }),
    ]);
    expect(await statuses(results)).toEqual([201, 409]);
    const loser = results.find((response) => response.status() === 409)!;
    expect((await loser.json()).data.code).toBe('company_invite_exists');

    await expectError(
      await world.createCards(company, batch, { amountMinor: 1000 }),
      409,
      'already has a pending invite to another card'
    );
    expect(await world.cards(company)).toHaveLength(2);
    const payments = await sql(
      `select 1 from subscription_payment where organization_id = $1`,
      [company.id]
    );
    expect(payments).toHaveLength(2);
  });

  test('14.5 assign the same vacant card twice at once', async ({ world }) => {
    const { company, A, mike } = await staffedCompany(world);
    await offboard(A, mike);

    const results = await Promise.all([
      assign(A, mike, unique('one')),
      assign(A, mike, unique('two')),
    ]);
    // Overlapping requests give one 409. If the first finished before the second
    // started, the second is a normal reassignment of a pending card, so both pass.
    const codes = await statuses(results);
    expect([
      [200, 409],
      [200, 200],
    ]).toContainEqual(codes);
    const loser = results.find((response) => response.status() === 409);
    if (loser) expect((await loser.json()).data.code).toBe('card_changed');
    const pending = await sql(
      `select 1 from invitation where card_id = $1 and status = 'pending'`,
      [mike.id]
    );
    expect(pending).toHaveLength(1);
    const retired = await sql(
      `select 1 from retired_card_slug where card_id = $1`,
      [mike.id]
    );
    expect(retired).toHaveLength(1);
  });

  test('14.6 assign two vacant cards to the same person at once', async ({
    world,
  }) => {
    const { company, A } = await staffedCompany(world);
    const vacant = await Promise.all(
      [unique('a'), unique('b')].map(async (email) => {
        const invited = await world.invite(company, draft(email));
        await A.api.patch(`/api/invitations/${invited.invitationId}`, {
          data: { status: 'canceled' },
        });
        return world.card(company, invited.id);
      })
    );
    const m3 = unique('m3');

    const results = await Promise.all(
      vacant.map((card) => assign(A, card, m3))
    );
    expect(await statuses(results)).toEqual([200, 409]);
    const loser = results.find((response) => response.status() === 409)!;
    expect((await loser.json()).data.code).toBe('company_invite_exists');
    const states = (await world.cards(company))
      .filter((card) => vacant.some((item) => item.id === card.id))
      .map((card) => card.state)
      .sort();
    expect(states).toEqual(['pending', 'vacant']);
  });

  test('14.7 record the same payment twice', async ({ world }) => {
    const { company, alice, mike } = await staffedCompany(world);
    const T = await world.thakhin();
    const body = {
      cards: [alice, mike].map((card) => ({
        id: card.id,
        periodEnd: card.periodEnd,
      })),
      termYears: 1,
      amountMinor: 100000,
    };
    const post = () =>
      T.api.post(`/api/admin/organizations/${company.id}/payments`, {
        data: body,
      });

    const since = new Date();
    const results = await Promise.all([post(), post()]);
    expect(await statuses(results)).toEqual([201, 409]);
    const loser = results.find((response) => response.status() === 409)!;
    expect((await loser.json()).data.message).toBe(
      'These cards changed since you opened them. Reload and try again.'
    );
    await expectError(
      await post(),
      409,
      'These cards changed since you opened them.'
    );

    const manual = await sql(
      `select 1 from subscription_payment
       where organization_id = $1 and payment_method = 'manual' and created_at >= $2`,
      [company.id, since]
    );
    expect(manual).toHaveLength(1);
    const after = await world.card(company, alice.id);
    const expected = new Date(alice.periodEnd!);
    expected.setFullYear(expected.getFullYear() + 1);
    expect(after.periodEnd).toBe(expected.toISOString());
  });

  test('14.8 email is down when cards are created', async ({ world }) => {
    test.slow();
    const { company, A } = await staffedCompany(world);
    const M3 = await world.person('m3');
    const T = await world.thakhin();
    await setEmailDown(true);

    const page = await T.context.newPage();
    await page.goto('/thakhin/organizations');
    await page.getByPlaceholder('Search name or slug').fill(company.slug);
    await page
      .locator('tr', { hasText: company.name })
      .locator('button')
      .last()
      .click();
    await page.getByRole('menuitem', { name: 'Cards' }).click();
    const panel = page.getByRole('dialog');
    await panel.getByLabel('First Name').fill('Ivy');
    await panel.getByLabel('Email').fill(M3.email);
    await panel.getByLabel('Position').fill('Designer');
    await panel.getByLabel('Paid term').uncheck();
    await panel
      .getByRole('button', { name: 'Create Cards and Send Invites' })
      .click();
    await expect(
      page.getByText("Cards created, but some invites didn't send").first()
    ).toBeVisible();
    await expect(page.getByText(M3.email).first()).toBeVisible();
    expect(await emailsTo(M3.email, 'invited')).toBe(0);

    const card = (await world.cards(company)).find(
      (item) => item.inviteEmail === M3.email
    )!;
    expect(card.state).toBe('pending');
    await expectError(
      await A.api.post(`/api/cards/${card.slug}/invitation-resends`),
      502,
      'The invite email could not be sent.'
    );

    await setEmailDown(false);
    expect(
      (await A.api.post(`/api/cards/${card.slug}/invitation-resends`)).status()
    ).toBe(202);
    await expect.poll(() => emailsTo(M3.email, 'invited')).toBe(1);
    expect((await accept(M3, card.inviteId!)).status()).toBe(200);
  });

  test('14.9 email is down when a card is reassigned', async ({ world }) => {
    test.slow();
    const { company, A, mike } = await staffedCompany(world);
    await offboard(A, mike);
    const M3 = await world.person('m3');
    await setEmailDown(true);

    const page = await A.context.newPage();
    await page.goto(`/platform/${company.slug}/members`);
    await page
      .getByRole('button', { name: 'Actions for Vacant', exact: true })
      .click();
    await page.getByRole('menuitem', { name: 'View card' }).click();
    const panel = page.getByRole('dialog');
    await panel.getByLabel('First name').last().fill('Ivy');
    await panel.getByLabel('Email').last().fill(M3.email);
    await panel.getByLabel('Position').last().fill('Designer');
    await panel.getByRole('button', { name: 'Send invite' }).click();
    await expect(
      page.getByText("Card saved, but the email didn't send").first()
    ).toBeVisible();
    await expect(
      page.getByText('Use Resend invite to try').first()
    ).toBeVisible();

    const card = await world.card(company, mike.id);
    expect(card.state).toBe('pending');
    expect(await emailsTo(M3.email, 'invited')).toBe(0);
    await setEmailDown(false);
    expect(
      (await A.api.post(`/api/cards/${card.slug}/invitation-resends`)).status()
    ).toBe(202);
    await expect.poll(() => emailsTo(M3.email, 'invited')).toBe(1);
    expect((await accept(M3, card.inviteId!)).status()).toBe(200);
  });

  test('14.10 expiry at the boundary', async ({ world }) => {
    const { company, A, mike } = await staffedCompany(world);
    const view = async () => {
      const visitor = await world.anonymous();
      return visitor.request.post(
        `/api/public/cards/${mike.slug}/interactions`,
        {
          data: { type: 'view' },
        }
      );
    };

    await setPeriodEnd(mike.id, new Date(Date.now() - 60_000));
    expect(
      (await (await publicCard(world, mike.slug)).json()).availability
    ).toBe('paused');
    expect((await exchangeByForm(world, mike.slug)).status()).toBe(409);
    await view();
    expect((await insights(A, company)).views).toBe(0);

    await setPeriodEnd(mike.id, new Date(Date.now() + 60_000));
    expect(
      (await (await publicCard(world, mike.slug)).json()).availability
    ).toBeUndefined();
    expect((await exchangeByForm(world, mike.slug)).status()).toBe(201);
    await view();
    expect((await insights(A, company)).views).toBe(1);

    await sql(
      `update card_subscription set status = 'expired', current_period_end_at = now() - interval '1 minute' where card_id = $1`,
      [mike.id]
    );
    const card = await world.card(company, mike.id);
    const T = await world.thakhin();
    const paid = await T.api.post(
      `/api/admin/organizations/${company.id}/payments`,
      {
        data: {
          cards: [{ id: card.id, periodEnd: card.periodEnd }],
          termYears: 1,
          amountMinor: 0,
        },
      }
    );
    expect(paid.status(), await paid.text()).toBe(201);
    const [row] = await sql(
      `select status from card_subscription where card_id = $1`,
      [mike.id]
    );
    expect(row?.status).toBe('active');
    expect((await exchangeByForm(world, mike.slug)).status()).toBe(201);
  });

  test('14.11 two admins add the same department at once', async ({
    world,
  }) => {
    const { company, A } = await staffedCompany(world);
    const B = await world.person('admin2');
    await world.hire(company, B, { role: 'admin' });
    const base = `/api/organizations/${company.slug}/departments`;

    const results = await Promise.all([
      A.api.post(base, { data: { name: 'Ops' } }),
      B.api.post(base, { data: { name: 'Ops' } }),
    ]);
    expect(await statuses(results)).toEqual([201, 409]);
    const other = await (
      await A.api.post(base, { data: { name: 'Legal' } })
    ).json();
    await expectError(
      await A.api.patch(`${base}/${other.id}`, { data: { name: 'Ops' } }),
      409,
      'A department with this name already exists.'
    );
    const names = (await (await A.api.get(base)).json()).items.map(
      (item: { name: string }) => item.name
    );
    expect(names).toEqual(['Legal', 'Ops']);
  });
});
