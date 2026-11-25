import {
  test as base,
  expect,
  type APIRequestContext,
  type APIResponse,
  type Browser,
  type BrowserContext,
} from '@playwright/test';
import pg from 'pg';
import { makePlatformAdmin, uniqueEmail } from './auth';
import { readMagicLink } from './mailpit';

const MAILPIT_URL = 'http://localhost:8025';

// Timestamp columns have no time zone and the app reads them as UTC; match it.
pg.defaults.parseInputDatesAsUTC = true;
pg.types.setTypeParser(1114, (value) => new Date(`${value}Z`));

export async function sql<T = Record<string, any>>(
  text: string,
  params: unknown[] = []
) {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    return (await client.query(text, params)).rows as T[];
  } finally {
    await client.end();
  }
}

export type Person = {
  email: string;
  userId: string;
  context: BrowserContext;
  api: APIRequestContext;
};

export type Company = { id: string; slug: string; name: string };

export type CardDraft = {
  firstName: string;
  lastName?: string;
  email: string;
  position: string;
  role: 'admin' | 'member';
  freeMonth: boolean;
  paid: boolean;
};

export type CompanyCard = {
  id: string;
  slug: string;
  firstName: string;
  email: string | null;
  phone?: string | null;
  departmentId: string | null;
  userId: string | null;
  memberId: string | null;
  inviteId: string | null;
  inviteEmail: string | null;
  periodEnd: string | null;
  subscriptionStatus: string | null;
  contactCount: number;
  state: 'active' | 'pending' | 'vacant';
};

/** Signs in through the magic-link API: same flow as the form, without the UI. */
async function signUp(
  browser: Browser,
  label: string,
  email = uniqueEmail(label)
): Promise<Person> {
  const context = await browser.newContext({
    baseURL: process.env.BASE_URL,
    // The API refuses cross-site writes; a browser sends Origin on its own fetches.
    extraHTTPHeaders: { origin: process.env.BASE_URL! },
  });
  const requested = await context.request.post('/api/auth/sign-in/magic-link', {
    data: { email, callbackURL: '/platform' },
  });
  expect(requested.ok(), await requested.text()).toBe(true);
  await context.request.get(await readMagicLink(email));
  const session = await (
    await context.request.get('/api/auth/get-session')
  ).json();
  expect(session?.user?.id, `no session for ${email}`).toBeTruthy();
  return { email, userId: session.user.id, context, api: context.request };
}

export function draft(
  person: Person | string,
  overrides: Partial<CardDraft> = {}
): CardDraft {
  const email = typeof person === 'string' ? person : person.email;
  return {
    firstName: email.split('@')[0]!.split('-')[0]!,
    email,
    position: 'Staff',
    role: 'member',
    freeMonth: true,
    paid: false,
    ...overrides,
  };
}

export class World {
  readonly people: Person[] = [];
  readonly companyIds: string[] = [];
  /** Checked against the community invariants in `support/communities.ts`. */
  readonly communityIds: string[] = [];
  private thakhinPerson?: Person;

  constructor(readonly browser: Browser) {}

  /** Signs up a new user; pass `email` to sign up an address that was invited first. */
  async person(label: string, email?: string) {
    const person = await signUp(this.browser, label, email);
    this.people.push(person);
    return person;
  }

  /** A signed-out visitor; each call is a new private window. */
  async anonymous() {
    const context = await this.browser.newContext({
      baseURL: process.env.BASE_URL,
      extraHTTPHeaders: { origin: process.env.BASE_URL! },
    });
    this.people.push({ email: '', userId: '', context, api: context.request });
    return context;
  }

  /** A platform admin (T), shared by everything in one test. */
  async thakhin() {
    if (!this.thakhinPerson) {
      this.thakhinPerson = await this.person('thakhin');
      await makePlatformAdmin(this.thakhinPerson.email);
    }
    return this.thakhinPerson;
  }

  async company(name = 'Acme Test Co'): Promise<Company> {
    const T = await this.thakhin();
    const response = await T.api.post('/api/admin/organizations', {
      data: {
        name: `${name} ${crypto.randomUUID().slice(0, 6)}`,
        type: 'company',
      },
    });
    expect(response.status(), await response.text()).toBe(201);
    const created = await response.json();
    this.companyIds.push(created.id);
    return { id: created.id, slug: created.slug, name: created.name };
  }

  createCards(company: Company, cards: CardDraft[], extra: object = {}) {
    return this.thakhin().then((T) =>
      T.api.post(`/api/admin/organizations/${company.id}/company-cards`, {
        data: { termYears: 1, cards, ...extra },
      })
    );
  }

  /** Creates one card and returns its invitation; the person hasn't accepted. */
  async invite(company: Company, card: CardDraft) {
    const response = await this.createCards(company, [card]);
    expect(response.status(), await response.text()).toBe(201);
    const [item] = (await response.json()).items;
    return item as { id: string; email: string; invitationId: string };
  }

  /** Creates a card for `person` and has them accept it. */
  async hire(
    company: Company,
    person: Person,
    overrides: Partial<CardDraft> = {}
  ) {
    const invited = await this.invite(company, draft(person, overrides));
    const accepted = await accept(person, invited.invitationId);
    expect(accepted.status(), await accepted.text()).toBe(200);
    return this.card(company, invited.id);
  }

  async cards(company: Company): Promise<CompanyCard[]> {
    const T = await this.thakhin();
    const response = await T.api.get(
      `/api/admin/organizations/${company.id}/company-cards`
    );
    expect(response.status()).toBe(200);
    return (await response.json()).items;
  }

  async card(company: Company, cardId: string) {
    const found = (await this.cards(company)).find(
      (item) => item.id === cardId
    );
    if (!found) throw new Error(`Card ${cardId} not in ${company.slug}`);
    return found;
  }

  async dispose() {
    await Promise.all(this.people.map((person) => person.context.close()));
  }
}

export function accept(person: Person, invitationId: string) {
  return person.api.patch(`/api/invitations/${invitationId}`, {
    data: { status: 'accepted' },
  });
}

/** One company card per test needs a personal card for seamless exchange. */
export async function givePersonalCard(person: Person) {
  const [space] = await sql<{ id: string }>(
    `select o.id from organization o join member m on m.organization_id = o.id
     where m.user_id = $1 and o.type = 'personal'`,
    [person.userId]
  );
  if (!space) throw new Error(`${person.email} has no personal space`);
  const [created] = await sql<{ id: string; slug: string }>(
    `insert into card (id, first_name, slug, position, email, organization_id, user_id)
     values ($1, 'Personal', $1, 'Self', $2, $3, $4) returning id, slug`,
    [
      `p${crypto.randomUUID().slice(0, 12)}`,
      person.email,
      space.id,
      person.userId,
    ]
  );
  return created!;
}

export async function setPeriodEnd(cardId: string, endAt: Date) {
  await sql(
    `update card_subscription set current_period_end_at = $2 where card_id = $1`,
    [cardId, endAt]
  );
}

export async function expectError(
  response: APIResponse,
  status: number,
  message?: string | RegExp
) {
  const body = await response.text();
  expect(response.status(), body).toBe(status);
  if (message) {
    const parsed = JSON.parse(body);
    const text = parsed.data?.message ?? parsed.message ?? parsed.statusMessage;
    if (typeof message === 'string') expect(text).toContain(message);
    else expect(text).toMatch(message);
  }
}

export async function emailsTo(email: string, subject = '') {
  const query = `to:"${email}"${subject ? ` subject:"${subject}"` : ''}`;
  const search = await fetch(
    `${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(query)}`
  ).then((response) => response.json());
  return search.messages_count as number;
}

export async function latestEmailHtml(email: string) {
  const search = await fetch(
    `${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`
  ).then((response) => response.json());
  const newest = search.messages?.[0];
  if (!newest) throw new Error(`No email reached ${email}`);
  const message = await fetch(
    `${MAILPIT_URL}/api/v1/message/${newest.ID}`
  ).then((response) => response.json());
  return message.HTML as string;
}

export async function waitForEmail(email: string, subject: string) {
  await expect
    .poll(() => emailsTo(email, subject), { timeout: 15_000 })
    .toBeGreaterThan(0);
}

/** Mailpit's chaos mode: every SMTP send fails with 451 while it's down. */
export async function setEmailDown(down: boolean) {
  const response = await fetch(`${MAILPIT_URL}/api/v1/chaos`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      Sender: { ErrorCode: 451, Probability: down ? 100 : 0 },
    }),
  });
  if (!response.ok) throw new Error('Mailpit chaos is not enabled');
}

/** Data rules from the guide's Invariants section; each query returns offending rows. */
const INVARIANTS: Record<string, string> = {
  'a card has at most one open holder, and card.user_id is that holder': `
    select c.id from card c
    left join card_assignment a on a.card_id = c.id and a.ended_at is null
    where c.organization_id = $1
    group by c.id, c.user_id
    having count(a.id) > 1 or c.user_id is distinct from max(a.user_id)`,
  'every held card holder is a member': `
    select c.id from card c
    left join member m on m.user_id = c.user_id and m.organization_id = c.organization_id
    where c.organization_id = $1 and c.user_id is not null and m.id is null`,
  'every member holds exactly one card': `
    select m.id from member m
    left join card c on c.user_id = m.user_id and c.organization_id = m.organization_id
    where m.organization_id = $1
    group by m.id having count(c.id) <> 1`,
  'a card has at most one pending invite': `
    select card_id from invitation
    where organization_id = $1 and status = 'pending' and card_id is not null
    group by card_id having count(*) > 1`,
  'a held card has no pending invite': `
    select i.id from invitation i join card c on c.id = i.card_id
    where i.organization_id = $1 and i.status = 'pending' and c.user_id is not null`,
  'a person has at most one pending invite': `
    select lower(email) from invitation
    where organization_id = $1 and status = 'pending' and card_id is not null
    group by lower(email) having count(*) > 1`,
  'every card has a subscription': `
    select c.id from card c left join card_subscription s on s.card_id = c.id
    where c.organization_id = $1 and s.card_id is null`,
  'an accepted admin invite leaves at least one admin': `
    select 1 where exists (
      select 1 from invitation where organization_id = $1 and role = 'admin' and status = 'accepted'
    ) and not exists (
      select 1 from member where organization_id = $1 and role = 'admin'
    )`,
  'a retired slug never belongs to a live card': `
    select r.slug from retired_card_slug r
    join card c on c.slug = r.slug
    where c.organization_id = $1`,
};

export async function expectInvariants(companyId: string) {
  for (const [rule, query] of Object.entries(INVARIANTS)) {
    const rows = await sql(query, [companyId]);
    expect(rows, `invariant broken: ${rule}`).toEqual([]);
  }
}

export const test = base.extend<{ world: World }>({
  world: async ({ browser }, use) => {
    const world = new World(browser);
    await use(world);
    await world.dispose();
    await setEmailDown(false);
    for (const id of world.companyIds) await expectInvariants(id);
  },
});

export { expect };
