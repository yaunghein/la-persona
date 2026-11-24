import {
  accept,
  expect,
  sql,
  test as companiesTest,
  type Person,
  type World,
} from './companies';

export type Community = { id: string; slug: string; name: string };

/** A community created by Thakhin whose organizer (O) has accepted. */
export async function createCommunity(world: World, organizer?: Person) {
  const T = await world.thakhin();
  const O = organizer ?? (await world.person('org'));
  const response = await T.api.post('/api/admin/organizations', {
    data: {
      name: `Yangon Devs ${crypto.randomUUID().slice(0, 6)}`,
      type: 'community',
      ownerEmail: O.email,
    },
  });
  expect(response.status(), await response.text()).toBe(201);
  const created = await response.json();
  world.communityIds.push(created.id);
  const community: Community = {
    id: created.id,
    slug: created.slug,
    name: created.name,
  };
  const accepted = await accept(
    O,
    await pendingInvitationId(community, O.email)
  );
  expect(accepted.status(), await accepted.text()).toBe(200);
  return { community, O };
}

export async function pendingInvitationId(community: Community, email: string) {
  const [row] = await sql<{ id: string }>(
    `select id from invitation
     where organization_id = $1 and lower(email) = lower($2) and status = 'pending'
     order by created_at desc limit 1`,
    [community.id, email]
  );
  if (!row) throw new Error(`No pending invitation for ${email}`);
  return row.id;
}

export function inviteToCommunity(
  organizer: Person,
  community: Community,
  email: string,
  role: 'member' | 'volunteer' = 'member'
) {
  return organizer.api.post(
    `/api/organizations/${community.slug}/invitations`,
    { data: { email, role } }
  );
}

/** Invites a fresh person and has them accept. */
export async function addMember(
  world: World,
  community: Community,
  organizer: Person,
  label: string,
  role: 'member' | 'volunteer' = 'member'
) {
  const person = await world.person(label);
  const invited = await inviteToCommunity(
    organizer,
    community,
    person.email,
    role
  );
  expect(invited.status(), await invited.text()).toBe(201);
  const accepted = await accept(person, (await invited.json()).id);
  expect(accepted.status(), await accepted.text()).toBe(200);
  return person;
}

/** Thakhin invites a second organizer, who accepts. */
export async function addOrganizer(world: World, community: Community) {
  const T = await world.thakhin();
  const person = await world.person('org2');
  const invited = await T.api.post(
    `/api/admin/organizations/${community.id}/invitations`,
    { data: { email: person.email } }
  );
  expect(invited.status(), await invited.text()).toBe(201);
  const accepted = await accept(person, (await invited.json()).id);
  expect(accepted.status(), await accepted.text()).toBe(200);
  return person;
}

export async function membership(community: Community, person: Person) {
  const [row] = await sql<{ id: string; role: string }>(
    `select id, role from member where organization_id = $1 and user_id = $2`,
    [community.id, person.userId]
  );
  return row ?? null;
}

/** The person's live community card. */
export async function communityCard(community: Community, person: Person) {
  const [row] = await sql<{ id: string; slug: string }>(
    `select id, slug from card
     where organization_id = $1 and user_id = $2 and removed_at is null`,
    [community.id, person.userId]
  );
  return row ?? null;
}

export async function personalSpace(person: Person) {
  const [row] = await sql<{ id: string; slug: string }>(
    `select o.id, o.slug from organization o join member m on m.organization_id = o.id
     where m.user_id = $1 and o.type = 'personal'`,
    [person.userId]
  );
  if (!row) throw new Error(`${person.email} has no personal space`);
  return row;
}

type EventOptions = {
  capacity?: number | null;
  registrationMode?: 'open' | 'closed' | 'invite_only';
  approvalMode?: 'everyone' | 'manual';
};

const DAY = 24 * 60 * 60 * 1000;

/** An event three days out; move it with `scheduleEvent`. */
export async function createEvent(
  organizer: Person,
  community: Community,
  options: EventOptions = {}
) {
  const startsAt = new Date(Date.now() + 3 * DAY);
  const response = await organizer.api.post(
    `/api/organizations/${community.slug}/events`,
    {
      data: {
        title: `Meetup ${crypto.randomUUID().slice(0, 6)}`,
        location: 'Yangon',
        startsAt: startsAt.toISOString(),
        endsAt: new Date(startsAt.getTime() + 2 * 60 * 60 * 1000).toISOString(),
        timeZone: 'Asia/Yangon',
        capacity: options.capacity ?? null,
        coverUrl: 'events/cover.jpg',
        photoUrls: [],
        registrationMode: options.registrationMode ?? 'open',
        approvalMode: options.approvalMode ?? 'everyone',
      },
    }
  );
  expect(response.status(), await response.text()).toBe(201);
  return (await response.json()) as { id: string; title: string };
}

/** Live: started an hour ago, ends in an hour. Past: ended an hour ago. */
export async function scheduleEvent(eventId: string, phase: 'live' | 'past') {
  const hour = 60 * 60 * 1000;
  const now = Date.now();
  const [startsAt, endsAt] =
    phase === 'live' ? [now - hour, now + hour] : [now - 3 * hour, now - hour];
  await sql(`update event set starts_at = $2, ends_at = $3 where id = $1`, [
    eventId,
    new Date(startsAt),
    new Date(endsAt),
  ]);
}

export function register(person: Person, eventId: string) {
  return person.api.post(`/api/events/${eventId}/registrations`);
}

export function checkIn(person: Person, eventId: string, cardSlug: string) {
  return person.api.post(`/api/events/${eventId}/check-ins`, {
    data: { cardSlug },
  });
}

/** Data rules from the communities guide's Invariants; each query returns offending rows. */
const INVARIANTS: Record<string, string> = {
  'a person has at most one membership': `
    select user_id from member where organization_id = $1
    group by user_id having count(*) > 1`,
  'every member holds exactly one live card': `
    select m.id from member m
    left join card c on c.user_id = m.user_id and c.organization_id = m.organization_id
      and c.removed_at is null
    where m.organization_id = $1
    group by m.id having count(c.id) <> 1`,
  'every live card holder is a member': `
    select c.id from card c
    left join member m on m.user_id = c.user_id and m.organization_id = c.organization_id
    where c.organization_id = $1 and c.removed_at is null and m.id is null`,
  'an accepted organizer invite leaves at least one organizer': `
    select 1 where exists (
      select 1 from invitation where organization_id = $1 and role = 'admin' and status = 'accepted'
    ) and not exists (
      select 1 from member where organization_id = $1 and role = 'admin'
    )`,
  'at most one pending invite per email and role': `
    select lower(email) from invitation
    where organization_id = $1 and status = 'pending'
    group by lower(email), role having count(*) > 1`,
  'no event is over capacity (staff walk-ins excepted)': `
    select e.id from event e
    where e.organization_id = $1 and e.capacity is not null
      and (select count(*) from event_registration r
           where r.event_id = e.id and r.user_id is not null
             and r.status in ('registered', 'checked_in')) > e.capacity`,
  'checked_in matches checked_in_at': `
    select r.id from event_registration r join event e on e.id = r.event_id
    where e.organization_id = $1
      and (r.status = 'checked_in') <> (r.checked_in_at is not null)`,
  'every registration belongs to a member': `
    select r.id from event_registration r join event e on e.id = r.event_id
    left join member m on m.user_id = r.user_id and m.organization_id = e.organization_id
    where e.organization_id = $1 and r.user_id is not null and m.id is null`,
};

export async function expectCommunityInvariants(communityId: string) {
  for (const [rule, query] of Object.entries(INVARIANTS)) {
    const rows = await sql(query, [communityId]);
    expect(rows, `invariant broken: ${rule}`).toEqual([]);
  }
}

/** The companies fixture plus the community invariants after each test. */
export const test = companiesTest.extend<{ world: World }>({
  world: async ({ world }, use) => {
    await use(world);
    for (const id of world.communityIds) await expectCommunityInvariants(id);
  },
});

export { expect };
