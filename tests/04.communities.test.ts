// Steps mirror tests/guides/04.communities.md; keep the numbers in sync.
import { gotoHydrated, uniqueEmail } from './support/auth';
import {
  emailsTo,
  expectError,
  givePersonalCard,
  setEmailDown,
  sql,
  type Person,
  type World,
} from './support/companies';
import {
  addMember,
  addOrganizer,
  checkIn,
  communityCard,
  createCommunity,
  createEvent,
  expect,
  membership,
  register,
  scheduleEvent,
  test,
  type Community,
} from './support/communities';

/** Yangon Devs with an organizer, a member and a volunteer. */
async function yangonDevs(world: World) {
  const { community, O } = await createCommunity(world);
  const M = await addMember(world, community, O, 'member');
  const VOL = await addMember(world, community, O, 'vol', 'volunteer');
  return { community, O, M, VOL };
}

function removeMember(actor: Person, memberId: string) {
  return actor.api.delete(`/api/members/${memberId}`);
}

function quit(person: Person, community: Community) {
  return person.api.delete(`/api/me/organizations/${community.slug}`);
}

function exchangeByForm(world: World, slug: string, name = 'Walk In') {
  return world.anonymous().then((visitor) =>
    visitor.request.post(`/api/public/cards/${slug}/contact-exchanges`, {
      data: {
        mode: 'form',
        name,
        email: uniqueEmail('walkin'),
        phone: '91234567',
      },
    })
  );
}

async function contactsOf(person: Person, path = '/api/me/contacts') {
  const response = await person.api.get(`${path}?limit=100`);
  expect(response.status()).toBe(200);
  return (await response.json()).items as {
    id: string;
    name: string;
    card: { id: string } | null;
  }[];
}

function broadcast(
  person: Person,
  eventId: string,
  kind: 'reminder' | 'after_event'
) {
  return person.api.post(`/api/events/${eventId}/broadcasts`, {
    data: { kind },
  });
}

async function registrationOf(eventId: string, person: Person) {
  const [row] = await sql(
    `select id, status, checked_in_at, source from event_registration where event_id = $1 and user_id = $2`,
    [eventId, person.userId]
  );
  return row ?? null;
}

async function statuses(responses: { status(): number }[]) {
  return responses.map((response) => response.status()).sort();
}

test.describe('Part 4.1: Thakhin setup', () => {
  test('4.1.1 branding', async ({ world }) => {
    const T = await world.thakhin();
    const { community } = await createCommunity(world);
    const base = { name: community.name, slug: community.slug };
    const saved = await T.api.patch(
      `/api/admin/organizations/${community.id}`,
      {
        data: {
          ...base,
          description: '<p>Builders</p>',
          splineUrl: 'https://prod.spline.design/y/scene.splinecode',
        },
      }
    );
    expect(saved.status(), await saved.text()).toBe(200);
    const about = await (
      await T.api.get(`/api/admin/organizations/${community.id}`)
    ).json();
    expect(about.community.description).toBe('<p>Builders</p>');
    await expectError(
      await T.api.patch(`/api/admin/organizations/${community.id}`, {
        data: { ...base, splineUrl: 'http://foo' },
      }),
      400
    );
  });

  test('4.1.2 rich text is sanitized', async ({ world }) => {
    const T = await world.thakhin();
    const { community } = await createCommunity(world);
    const description =
      '<p>Hi</p><script>alert(1)</script><img src=x onerror=alert(1)><a href="javascript:alert(1)">x</a>';
    await T.api.patch(`/api/admin/organizations/${community.id}`, {
      data: { name: community.name, slug: community.slug, description },
    });
    const visitor = await world.anonymous();
    const shown = await (
      await visitor.request.get(`/api/public/communities/${community.slug}`)
    ).json();
    expect(shown.description).toContain('<p>Hi</p>');
    expect(shown.description).not.toMatch(/<script|onerror|javascript:/i);
  });

  // test.skip('4.1.3 brand assets (needs S3)', () => {});

  test('4.1.4 apply to member cards', async ({ world }) => {
    const T = await world.thakhin();
    const { community, M } = await yangonDevs(world);
    const spline = 'https://prod.spline.design/new/scene.splinecode';
    const saved = await T.api.patch(
      `/api/admin/organizations/${community.id}`,
      {
        data: {
          name: community.name,
          slug: community.slug,
          splineUrl: spline,
          applyToMemberCards: true,
        },
      }
    );
    expect((await saved.json()).cardsUpdated).toBeGreaterThan(0);
    const [card] = await sql(`select spline_url from card where id = $1`, [
      (await communityCard(community, M))!.id,
    ]);
    expect(card?.spline_url).toBe(spline);
  });

  test('4.1.5 delete rules', async ({ world }) => {
    const T = await world.thakhin();
    const { community, O } = await createCommunity(world);
    await expectError(
      await T.api.delete(`/api/admin/organizations/${community.id}`),
      409,
      "Remove this organization's cards before deleting it."
    );
    expect(
      (await O.api.delete(`/api/admin/organizations/${community.id}`)).status()
    ).toBe(404);
  });

  test('4.1.6 background theme', async ({ world }) => {
    const T = await world.thakhin();
    const { community, O, M } = await yangonDevs(world);
    const save = (data: Record<string, unknown>) =>
      T.api.patch(`/api/admin/organizations/${community.id}`, {
        data: { name: community.name, slug: community.slug, ...data },
      });
    const themeOf = async (person: Person) => {
      const [row] = await sql(
        `select background_theme from card where id = $1`,
        [(await communityCard(community, person))!.id]
      );
      return row?.background_theme;
    };

    const saved = await save({ backgroundTheme: 'light' });
    expect(saved.status(), await saved.text()).toBe(200);
    expect(await themeOf(M)).toBe('dark');
    const detail = await (
      await T.api.get(`/api/admin/organizations/${community.id}`)
    ).json();
    expect(detail.community.backgroundTheme).toBe('light');

    const newcomer = await addMember(world, community, O, 'newcomer');
    expect(await themeOf(newcomer)).toBe('light');

    await save({ backgroundTheme: 'light', applyToMemberCards: true });
    expect(await themeOf(M)).toBe('light');
  });
});

test.describe('Part 4.2: Roles and members', () => {
  test('4.2.1 members list', async ({ world }) => {
    const { community, O } = await yangonDevs(world);
    const list = await (
      await O.api.get(`/api/organizations/${community.slug}/members`)
    ).json();
    const roles = list.items
      .map((item: { memberRole: string }) => item.memberRole)
      .sort();
    expect(roles).toEqual(['admin', 'member', 'volunteer']);
    const csv = await (
      await O.api.get(`/api/organizations/${community.slug}/members`, {
        headers: { accept: 'text/csv' },
      })
    ).text();
    expect(csv.split('\n')[0]!.replaceAll('"', '')).toContain(
      'Name,Email,Phone,Job title,Company,Role,Status,Joined,LinkedIn'
    );
    expect(csv).toContain('Organizer');
  });

  test('4.2.2 change roles', async ({ world }) => {
    const { community, O, M } = await yangonDevs(world);
    const O2 = await addOrganizer(world, community);
    const m = (await membership(community, M))!;
    expect(
      (
        await O.api.patch(`/api/members/${m.id}`, {
          data: { role: 'volunteer' },
        })
      ).status()
    ).toBe(200);
    expect((await membership(community, M))?.role).toBe('volunteer');
    expect(
      (
        await O.api.patch(`/api/members/${m.id}`, { data: { role: 'member' } })
      ).status()
    ).toBe(200);
    await expectError(
      await O.api.patch(
        `/api/members/${(await membership(community, O2))!.id}`,
        { data: { role: 'member' } }
      ),
      403,
      'The organizer role cannot be changed here.'
    );
    await expectError(
      await O.api.patch(`/api/members/${m.id}`, { data: { role: 'admin' } }),
      400
    );
  });

  test('4.2.3 remove a member keeps their contacts', async ({ world }) => {
    const { community, O, M } = await yangonDevs(world);
    const card = (await communityCard(community, M))!;
    const event = await createEvent(O, community);
    expect((await register(M, event.id)).status()).toBe(201);
    expect(
      (await exchangeByForm(world, card.slug, 'Met At Meetup')).status()
    ).toBe(201);

    expect(
      (await removeMember(O, (await membership(community, M))!.id)).status()
    ).toBe(204);
    expect(await membership(community, M)).toBeNull();
    expect(await registrationOf(event.id, M)).toBeNull();
    const [row] = await sql(
      `select removed_at, user_id from card where id = $1`,
      [card.id]
    );
    expect(row?.removed_at).not.toBeNull();
    expect(row?.user_id).toBe(M.userId);
    const visitor = await world.anonymous();
    expect(
      (await visitor.request.get(`/api/public/cards/${card.slug}`)).status()
    ).toBe(404);

    const organizerView = await contactsOf(
      O,
      `/api/organizations/${community.slug}/contacts`
    );
    expect(organizerView.map((item) => item.name)).toContain('Met At Meetup');
    const mine = (await contactsOf(M)).find(
      (item) => item.name === 'Met At Meetup'
    );
    expect(mine, 'the former member keeps the contact').toBeTruthy();
    expect(
      (
        await M.api.patch(`/api/contacts/${mine!.id}`, {
          data: { note: 'kept' },
        })
      ).status()
    ).toBe(200);
    await expectError(
      await M.api.patch(`/api/contacts/${mine!.id}`, {
        data: { eventId: event.id },
      }),
      400,
      'Choose an event you registered for.'
    );
    expect((await M.api.delete(`/api/contacts/${mine!.id}`)).status()).toBe(
      204
    );
  });

  test('4.2.4 organizer protections', async ({ world }) => {
    const { community, O, M } = await yangonDevs(world);
    const O2 = await addOrganizer(world, community);
    expect(
      (await removeMember(O, (await membership(community, O2))!.id)).status()
    ).toBe(204);
    await expectError(
      await removeMember(O, (await membership(community, O))!.id),
      409,
      'The last organizer cannot be removed from this community.'
    );
    expect(
      (await removeMember(M, (await membership(community, O))!.id)).status()
    ).toBe(403);
  });

  test('4.2.5 quit community', async ({ world }) => {
    test.slow();
    const { community, O, M, VOL } = await yangonDevs(world);
    const card = (await communityCard(community, M))!;
    await exchangeByForm(world, card.slug, 'Kept After Quitting');

    const page = await M.context.newPage();
    await gotoHydrated(page, `/platform/${community.slug}/about`);
    await page.getByRole('button', { name: 'Quit Community' }).click();
    await page.getByRole('button', { name: 'Leave', exact: true }).click();
    await expect(
      page.getByText(`You left ${community.name}`).first()
    ).toBeVisible();
    await expect(page).toHaveURL(/\/platform/);

    expect(await membership(community, M)).toBeNull();
    expect((await contactsOf(M)).map((item) => item.name)).toContain(
      'Kept After Quitting'
    );
    expect((await quit(VOL, community)).status()).toBe(204);
    await expectError(
      await quit(O, community),
      409,
      'The last organizer cannot be removed from this community.'
    );
    await addOrganizer(world, community);
    expect((await quit(O, community)).status()).toBe(204);

    const company = await world.company();
    const A = await world.person('alice');
    await world.hire(company, A);
    await expectError(
      await A.api.delete(`/api/me/organizations/${company.slug}`),
      403,
      'This is only available for community organizations.'
    );
    const X = await world.person('outsider');
    expect((await quit(X, community)).status()).toBe(404);
  });

  test("4.2.6 organizers can read, not edit, a member's card", async ({
    world,
  }) => {
    const { community, O, M } = await yangonDevs(world);
    const card = (await communityCard(community, M))!;
    await expectError(
      await O.api.patch(`/api/cards/${card.slug}`, {
        data: { firstName: 'Hacked', slug: 'hacked' },
      }),
      403,
      'Only the card holder can edit this card.'
    );
    const [row] = await sql(`select first_name, slug from card where id = $1`, [
      card.id,
    ]);
    expect(row?.slug).toBe(card.slug);
    expect((await O.api.get(`/api/cards/${card.slug}`)).status()).toBe(200);
    const own = (await communityCard(community, O))!;
    expect(
      (
        await O.api.patch(`/api/cards/${own.slug}`, {
          data: { position: 'Host' },
        })
      ).status()
    ).toBe(200);
  });
});

test.describe('Part 4.3: Community cards', () => {
  test('4.3.1 seeded from the personal card', async ({ world }) => {
    const { community, O } = await createCommunity(world);
    const X = await world.person('outsider');
    const personal = await givePersonalCard(X);
    await sql(
      `update card set first_name = 'Thiri', position = 'PM', phone = '0977' where id = $1`,
      [personal.id]
    );
    const invited = await O.api.post(
      `/api/organizations/${community.slug}/invitations`,
      {
        data: { email: X.email },
      }
    );
    await X.api.patch(`/api/invitations/${(await invited.json()).id}`, {
      data: { status: 'accepted' },
    });
    const [card] = await sql(
      `select first_name, position, phone from card where organization_id = $1 and user_id = $2`,
      [community.id, X.userId]
    );
    expect(card).toEqual({
      first_name: 'Thiri',
      position: 'PM',
      phone: '0977',
    });

    const N = await addMember(world, community, O, 'nocard');
    const [plain] = await sql(
      `select position from card where organization_id = $1 and user_id = $2`,
      [community.id, N.userId]
    );
    expect(plain?.position).toBe('Member');
  });

  test('4.3.2 setup flow', async ({ world }) => {
    const { community, O } = await createCommunity(world);
    const N = await world.person('new');
    const invited = await O.api.post(
      `/api/organizations/${community.slug}/invitations`,
      { data: { email: N.email } }
    );
    const accepted = await N.api.patch(
      `/api/invitations/${(await invited.json()).id}`,
      {
        data: { status: 'accepted' },
      }
    );
    expect((await accepted.json()).redirectTo).toContain(
      `/platform/${community.slug}/cards/`
    );
    expect((await accepted.json()).redirectTo).toContain('community-setup');
  });

  test('4.3.3 never pauses', async ({ world }) => {
    const { community, M } = await yangonDevs(world);
    const card = (await communityCard(community, M))!;
    await sql(
      `insert into card_subscription (id, card_id, plan_code, status, is_trial, current_period_end_at)
       values ($1, $2, 'standard', 'active', false, now() - interval '1 day')`,
      [`s${crypto.randomUUID().slice(0, 12)}`, card.id]
    );
    expect((await exchangeByForm(world, card.slug)).status()).toBe(201);
    await expectError(
      await M.api.get(`/api/cards/${card.slug}/payment-quote?kind=renewal`),
      403
    );
  });

  test("4.3.4 can't be deleted directly", async ({ world }) => {
    const { community, M } = await yangonDevs(world);
    const card = (await communityCard(community, M))!;
    // Members lack `card:delete`, so they get the generic 403.
    await expectError(await M.api.delete(`/api/cards/${card.slug}`), 403);
    expect(await communityCard(community, M)).not.toBeNull();
  });

  test('4.3.5 one card per member', async ({ world }) => {
    const T = await world.thakhin();
    const { community, M } = await yangonDevs(world);
    const X = await world.person('outsider');
    const path = `/api/admin/organizations/${community.id}/cards`;
    await expectError(
      await T.api.post(path, { data: { userId: M.userId } }),
      409,
      'This member already has a community card.'
    );
    expect(
      (await T.api.post(path, { data: { userId: X.userId } })).status()
    ).toBe(404);
  });
});

test.describe('Part 4.4: Settings and About', () => {
  const settings = (name: string, extra: object = {}) => ({
    name,
    description: '<p>About</p>',
    guidelines: '<p>Be kind</p>',
    whyJoin: '<p>Friends</p>',
    foundedYear: 2020,
    ...extra,
  });

  test('4.4.1 save settings', async ({ world }) => {
    const { community, O } = await createCommunity(world);
    const saved = await O.api.patch(`/api/organizations/${community.slug}`, {
      data: settings(community.name, {
        description: '<p>About</p><script>x</script>',
      }),
    });
    expect(saved.status(), await saved.text()).toBe(200);
    const body = await saved.json();
    expect(body.description).toBe('<p>About</p>');
    expect(body.foundedYear).toBe(2020);
  });

  test('4.4.2 organizer contact must be an organizer', async ({ world }) => {
    const { community, O, M } = await yangonDevs(world);
    const beta = await createCommunity(world);
    for (const memberId of [
      (await membership(community, M))!.id,
      (await membership(beta.community, beta.O))!.id,
    ]) {
      await expectError(
        await O.api.patch(`/api/organizations/${community.slug}`, {
          data: settings(community.name, { organizerMemberId: memberId }),
        }),
        400,
        'Choose an organizer of this community.'
      );
    }
  });

  test('4.4.3 members can read, not write', async ({ world }) => {
    const { community, M } = await yangonDevs(world);
    expect(
      (await M.api.get(`/api/organizations/${community.slug}`)).status()
    ).toBe(200);
    expect(
      (
        await M.api.patch(`/api/organizations/${community.slug}`, {
          data: settings('Mine'),
        })
      ).status()
    ).toBe(403);
  });

  test('4.4.4 public community page', async ({ world }) => {
    const { community, M } = await yangonDevs(world);
    const visitor = (await world.anonymous()).request;
    const response = await visitor.get(
      `/api/public/communities/${community.slug}`
    );
    expect(response.status()).toBe(200);
    const text = await response.text();
    expect(JSON.parse(text).memberCount).toBe(3);
    expect(text).not.toContain(M.email);
    const company = await world.company();
    expect(
      (await visitor.get(`/api/public/communities/${company.slug}`)).status()
    ).toBe(404);
  });
});

test.describe('Part 4.5: Events', () => {
  test('4.5.1 create', async ({ world }) => {
    const { community, O } = await createCommunity(world);
    const event = await createEvent(O, community, { capacity: 50 });
    const visitor = (await world.anonymous()).request;
    expect((await visitor.get(`/api/public/events/${event.id}`)).status()).toBe(
      200
    );
  });

  test('4.5.2 validation', async ({ world }) => {
    const { community, O } = await createCommunity(world);
    const start = new Date(Date.now() + 3 * 86_400_000);
    const valid = {
      title: 'Meetup',
      location: 'Yangon',
      startsAt: start.toISOString(),
      endsAt: new Date(start.getTime() + 3_600_000).toISOString(),
      timeZone: 'Asia/Yangon',
      capacity: null,
      coverUrl: 'events/cover.jpg',
      photoUrls: [],
    };
    const create = (overrides: object) =>
      O.api.post(`/api/organizations/${community.slug}/events`, {
        data: { ...valid, ...overrides },
      });
    for (const overrides of [
      { endsAt: new Date(start.getTime() - 3_600_000).toISOString() },
      { mapUrl: 'javascript:alert(1)' },
      { capacity: 0 },
      { capacity: -1 },
      { photoUrls: Array.from({ length: 5 }, () => 'events/p.jpg') },
    ]) {
      expect(
        (await create(overrides)).status(),
        JSON.stringify(overrides)
      ).toBe(400);
    }
  });

  test('4.5.3 edit and delete', async ({ world }) => {
    const { community, O, M } = await yangonDevs(world);
    const event = await createEvent(O, community);
    await register(M, event.id);
    const detail = await (await O.api.get(`/api/events/${event.id}`)).json();
    const edited = await O.api.patch(`/api/events/${event.id}`, {
      data: {
        title: 'Renamed',
        location: detail.location,
        startsAt: detail.startsAt,
        endsAt: detail.endsAt,
        capacity: null,
        coverUrl: 'events/cover.jpg',
        photoUrls: [],
      },
    });
    expect(edited.status(), await edited.text()).toBe(200);
    expect((await O.api.delete(`/api/events/${event.id}`)).status()).toBe(204);
    expect(await registrationOf(event.id, M)).toBeNull();
    const visitor = (await world.anonymous()).request;
    expect((await visitor.get(`/api/public/events/${event.id}`)).status()).toBe(
      404
    );
  });

  test('4.5.4 who can manage events', async ({ world }) => {
    const { community, O, M, VOL } = await yangonDevs(world);
    const X = await world.person('outsider');
    const beta = await createCommunity(world);
    const event = await createEvent(O, community);
    const cases: [Person, number][] = [
      [M, 403],
      [VOL, 403],
      [X, 404],
      [beta.O, 404],
    ];
    for (const [person, expected] of cases) {
      expect(
        (
          await person.api.post(`/api/organizations/${community.slug}/events`, {
            data: {},
          })
        ).status()
      ).toBe(expected === 403 ? 403 : 404);
      expect(
        (
          await person.api.patch(`/api/events/${event.id}`, { data: {} })
        ).status()
      ).toBe(expected);
      expect(
        (await person.api.delete(`/api/events/${event.id}`)).status()
      ).toBe(expected);
    }
  });
});

test.describe('Part 4.6: Registration', () => {
  test('4.6.1 open event, member registers', async ({ world }) => {
    const { community, O, M } = await yangonDevs(world);
    const event = await createEvent(O, community);
    const first = await register(M, event.id);
    expect(first.status()).toBe(201);
    expect((await first.json()).status).toBe('registered');
    const again = await register(M, event.id);
    expect(again.status()).toBe(200);
    expect((await again.json()).id).toBe((await first.json()).id);
  });

  test('4.6.2 non-member registers from the public page', async ({ world }) => {
    const { community, O } = await createCommunity(world);
    const event = await createEvent(O, community);
    const X = await world.person('outsider');
    const joined = await X.api.post(`/api/events/${event.id}/memberships`);
    expect(joined.status()).toBe(201);
    expect((await register(X, event.id)).status()).toBe(201);
    const again = await X.api.post(`/api/events/${event.id}/memberships`);
    expect((await again.json()).alreadyMember).toBe(true);
    expect((await membership(community, X))?.role).toBe('member');
  });

  test('4.6.3 manual approval', async ({ world }) => {
    const { community, O, M, VOL } = await yangonDevs(world);
    const event = await createEvent(O, community, {
      approvalMode: 'manual',
      capacity: 1,
    });
    const pending = await (await register(M, event.id)).json();
    expect(pending.status).toBe('pending');
    // Pending registrations hold no seat, so both get in line before one is approved.
    const other = await (await register(VOL, event.id)).json();
    expect(other.status).toBe('pending');
    const approved = await O.api.patch(`/api/registrations/${pending.id}`, {
      data: { status: 'registered' },
    });
    expect((await approved.json()).status).toBe('registered');

    await expectError(
      await O.api.patch(`/api/registrations/${other.id}`, {
        data: { status: 'registered' },
      }),
      409,
      'This event is at capacity.'
    );
    await scheduleEvent(event.id, 'past');
    await expectError(
      await O.api.patch(`/api/registrations/${other.id}`, {
        data: { status: 'registered' },
      }),
      409,
      'This event has ended.'
    );
  });

  test('4.6.4 closed and invite-only', async ({ world }) => {
    const { community, O, M } = await yangonDevs(world);
    const X = await world.person('outsider');
    const closed = await createEvent(O, community, {
      registrationMode: 'closed',
    });
    await expectError(
      await register(M, closed.id),
      403,
      'Registration is closed for this event'
    );
    await expectError(
      await X.api.post(`/api/events/${closed.id}/memberships`),
      403
    );
    expect(await membership(community, X)).toBeNull();
    const inviteOnly = await createEvent(O, community, {
      registrationMode: 'invite_only',
    });
    await expectError(
      await register(M, inviteOnly.id),
      403,
      'This event is invite only'
    );
  });

  test('4.6.5 capacity', async ({ world }) => {
    const { community, O, M, VOL } = await yangonDevs(world);
    const O2 = await addOrganizer(world, community);
    const event = await createEvent(O, community, { capacity: 2 });
    await register(M, event.id);
    await register(VOL, event.id);
    await expectError(
      await register(O2, event.id),
      409,
      'This event is at capacity'
    );
    expect(
      (await M.api.delete(`/api/events/${event.id}/registrations/me`)).status()
    ).toBe(204);
    expect((await register(O2, event.id)).status()).toBe(201);
  });

  test('4.6.6 cancel own registration', async ({ world }) => {
    const { community, O, M, VOL } = await yangonDevs(world);
    const event = await createEvent(O, community);
    await register(M, event.id);
    expect(
      (await M.api.delete(`/api/events/${event.id}/registrations/me`)).status()
    ).toBe(204);
    expect(
      (await M.api.delete(`/api/events/${event.id}/registrations/me`)).status()
    ).toBe(204);

    await register(M, event.id);
    await scheduleEvent(event.id, 'live');
    expect(
      (
        await checkIn(VOL, event.id, (await communityCard(community, M))!.slug)
      ).status()
    ).toBe(201);
    await expectError(
      await M.api.delete(`/api/events/${event.id}/registrations/me`),
      409,
      'Checked-in attendees cannot unregister.'
    );
  });

  test('4.6.7 past events', async ({ world }) => {
    const { community, O, M } = await yangonDevs(world);
    const X = await world.person('outsider');
    const event = await createEvent(O, community);
    await scheduleEvent(event.id, 'past');
    await expectError(await register(M, event.id), 403, 'This event has ended');
    await expectError(
      await X.api.post(`/api/events/${event.id}/memberships`),
      403
    );
  });

  test('4.6.8 attendee labels carry over', async ({ world }) => {
    const { community, O, M } = await yangonDevs(world);
    const label = async (name: string, carriesOver: boolean) =>
      (
        await (
          await O.api.post(
            `/api/organizations/${community.slug}/attendee-labels`,
            {
              data: { name, color: '#c8a97e', carriesOver },
            }
          )
        ).json()
      ).id as string;
    const vip = await label('VIP', true);
    const once = await label('Speaker', false);
    const first = await createEvent(O, community);
    const registration = await (await register(M, first.id)).json();
    const set = await O.api.put(
      `/api/registrations/${registration.id}/labels`,
      { data: { labelIds: [vip, once] } }
    );
    expect(set.status(), await set.text()).toBe(200);

    const second = await createEvent(O, community);
    const next = await (await register(M, second.id)).json();
    const carried = await sql(
      `select label_id from registration_label where registration_id = $1`,
      [next.id]
    );
    expect(carried).toEqual([{ label_id: vip }]);
  });
});

test.describe('Part 4.7: Check-in', () => {
  test('4.7.1 before and after the event day', async ({ world }) => {
    const { community, O, M, VOL } = await yangonDevs(world);
    const event = await createEvent(O, community);
    await register(M, event.id);
    const slug = (await communityCard(community, M))!.slug;
    await expectError(
      await checkIn(VOL, event.id, slug),
      409,
      'Check-in opens on the event day.'
    );
    await scheduleEvent(event.id, 'past');
    await expectError(
      await checkIn(VOL, event.id, slug),
      409,
      'This event has ended.'
    );
  });

  test('4.7.2 scan a registered member', async ({ world }) => {
    const { community, O, M, VOL } = await yangonDevs(world);
    const event = await createEvent(O, community);
    await register(M, event.id);
    await scheduleEvent(event.id, 'live');
    const slug = (await communityCard(community, M))!.slug;
    const ticket = await (
      await VOL.api.get(`/api/events/${event.id}/tickets/${slug}`)
    ).json();
    expect(ticket.status).toBe('ready');
    expect((await checkIn(VOL, event.id, slug)).status()).toBe(201);
    await expect.poll(() => emailsTo(M.email, 'checked in')).toBe(1);
    expect((await checkIn(VOL, event.id, slug)).status()).toBe(200);
    expect(
      (
        await (
          await VOL.api.get(`/api/events/${event.id}/tickets/${slug}`)
        ).json()
      ).status
    ).toBe('already');
  });

  test('4.7.3 scan someone not registered', async ({ world }) => {
    const { community, O, M, VOL } = await yangonDevs(world);
    const event = await createEvent(O, community, { approvalMode: 'manual' });
    await scheduleEvent(event.id, 'live');
    const slug = (await communityCard(community, M))!.slug;
    expect(
      await (
        await VOL.api.get(`/api/events/${event.id}/tickets/${slug}`)
      ).json()
    ).toEqual({
      status: 'not_found',
      slug,
    });

    const X = await world.person('outsider');
    const personal = await givePersonalCard(X);
    const beta = await createCommunity(world);
    const betaSlug = (await communityCard(beta.community, beta.O))!.slug;
    for (const other of [personal.slug, betaSlug]) {
      expect(
        (
          await (
            await VOL.api.get(`/api/events/${event.id}/tickets/${other}`)
          ).json()
        ).status
      ).toBe('not_found');
    }

    await register(M, event.id);
    expect(
      (
        await (
          await VOL.api.get(`/api/events/${event.id}/tickets/${slug}`)
        ).json()
      ).status
    ).toBe('not_found');
    expect((await checkIn(VOL, event.id, slug)).status()).toBe(404);
  });

  test('4.7.4 walk-in without email', async ({ world }) => {
    const { community, O, VOL } = await yangonDevs(world);
    const event = await createEvent(O, community, {
      capacity: 1,
      registrationMode: 'closed',
    });
    await scheduleEvent(event.id, 'live');
    const walkIn = (name: string) =>
      VOL.api.post(`/api/events/${event.id}/walk-ins`, {
        data: { name, phone: '0911', position: 'Guest' },
      });
    expect((await walkIn('Guest One')).status()).toBe(201);
    expect((await walkIn('Guest Two')).status()).toBe(201);
    const rows = await sql(
      `select status from event_registration where event_id = $1 and user_id is null`,
      [event.id]
    );
    expect(rows).toEqual([{ status: 'checked_in' }, { status: 'checked_in' }]);
  });

  test('4.7.5 self walk-in', async ({ world }) => {
    const { community, O, M } = await yangonDevs(world);
    const selfWalkIn = async (person: Person, eventId: string) => {
      const joined = await person.api.post(
        `/api/events/${eventId}/walk-in-memberships`
      );
      const registered = await person.api.post(
        `/api/events/${eventId}/walk-in-registrations`
      );
      return { joined, registered };
    };

    const open = await createEvent(O, community, { capacity: 3 });
    await scheduleEvent(open.id, 'live');
    const X = await world.person('outsider');
    const walkedIn = await selfWalkIn(X, open.id);
    expect(walkedIn.joined.status()).toBe(201);
    expect(walkedIn.registered.status()).toBe(201);
    expect((await registrationOf(open.id, X))?.source).toBe('walk_in');

    for (const mode of ['closed', 'invite_only'] as const) {
      const event = await createEvent(O, community, { registrationMode: mode });
      await sql(`update event set registration_mode = 'open' where id = $1`, [
        event.id,
      ]);
      await register(M, event.id);
      await sql(`update event set registration_mode = $2 where id = $1`, [
        event.id,
        mode,
      ]);
      await scheduleEvent(event.id, 'live');

      const Y = await world.person('stranger');
      const refused = await selfWalkIn(Y, event.id);
      const message =
        mode === 'closed'
          ? 'Registration is closed for this event'
          : 'This event is invite only';
      await expectError(refused.joined, 403, message);
      expect(await membership(community, Y)).toBeNull();

      const existing = await M.api.post(
        `/api/events/${event.id}/walk-in-registrations`
      );
      expect(existing.status()).toBe(200);
    }

    const ended = await createEvent(O, community);
    await scheduleEvent(ended.id, 'past');
    expect(
      (
        await M.api.post(`/api/events/${ended.id}/walk-in-registrations`)
      ).status()
    ).toBe(404);
  });

  test('4.7.6 attendee list and export', async ({ world }) => {
    const { community, O, M, VOL } = await yangonDevs(world);
    const event = await createEvent(O, community);
    await register(M, event.id);
    const path = `/api/events/${event.id}/registrations`;
    expect((await VOL.api.get(path)).status()).toBe(200);
    expect(
      (
        await VOL.api.get(`${path}?roster=registered`, {
          headers: { accept: 'text/csv' },
        })
      ).status()
    ).toBe(403);
    const csv = await O.api.get(`${path}?roster=registered`, {
      headers: { accept: 'text/csv' },
    });
    expect(csv.status()).toBe(200);
    const checkedIn = await (
      await O.api.get(`${path}?roster=checked_in`, {
        headers: { accept: 'text/csv' },
      })
    ).text();
    expect(checkedIn.trim().split('\n')).toHaveLength(1);
  });

  test("4.7.7 members can't check in", async ({ world }) => {
    const { community, O, M } = await yangonDevs(world);
    const event = await createEvent(O, community);
    await scheduleEvent(event.id, 'live');
    const slug = (await communityCard(community, M))!.slug;
    expect((await checkIn(M, event.id, slug)).status()).toBe(403);
    expect(
      (await M.api.get(`/api/events/${event.id}/tickets/${slug}`)).status()
    ).toBe(403);
    expect(
      (await M.api.get(`/api/events/${event.id}/registrations`)).status()
    ).toBe(403);
  });
});

test.describe('Part 4.8: Broadcasts', () => {
  test('4.8 reminders and after-event emails go out once', async ({
    world,
  }) => {
    const { community, O, M, VOL } = await yangonDevs(world);
    const event = await createEvent(O, community);
    const empty = await createEvent(O, community);
    await expectError(
      await broadcast(O, empty.id, 'reminder'),
      400,
      'No registered attendees to email'
    );
    await register(M, empty.id);
    expect((await broadcast(O, empty.id, 'reminder')).status()).toBe(202);

    await register(M, event.id);
    await expectError(
      await broadcast(O, event.id, 'after_event'),
      409,
      'This event has not started yet.'
    );
    expect((await broadcast(VOL, event.id, 'reminder')).status()).toBe(403);
    expect((await broadcast(M, event.id, 'reminder')).status()).toBe(403);

    const O2 = await addOrganizer(world, community);
    const results = await Promise.all([
      broadcast(O, event.id, 'reminder'),
      broadcast(O2, event.id, 'reminder'),
    ]);
    expect(await statuses(results)).toEqual([202, 409]);
    await expectError(
      await broadcast(O, event.id, 'reminder'),
      409,
      'This email was already sent for this event.'
    );

    await scheduleEvent(event.id, 'live');
    await checkIn(VOL, event.id, (await communityCard(community, M))!.slug);
    expect((await broadcast(O, event.id, 'after_event')).status()).toBe(202);

    await scheduleEvent(event.id, 'past');
    await expectError(
      await broadcast(O, event.id, 'reminder'),
      409,
      'This event has ended.'
    );
  });
});

test.describe('Part 4.9: Contacts and insights', () => {
  test('4.9.1 contacts on community cards', async ({ world }) => {
    const { community, O, M, VOL } = await yangonDevs(world);
    const card = (await communityCard(community, M))!;
    await exchangeByForm(world, card.slug, 'Community Contact');
    expect((await contactsOf(M)).map((item) => item.name)).toContain(
      'Community Contact'
    );
    const organizerView = await contactsOf(
      O,
      `/api/organizations/${community.slug}/contacts`
    );
    const contact = organizerView.find(
      (item) => item.name === 'Community Contact'
    )!;
    expect(contact.card?.id).toBe(card.id);
    for (const person of [M, VOL]) {
      expect(
        (
          await person.api.get(`/api/organizations/${community.slug}/contacts`)
        ).status()
      ).toBe(403);
    }
    expect(
      (
        await O.api.patch(`/api/contacts/${contact.id}`, {
          data: { note: 'organizer note' },
        })
      ).status()
    ).toBe(200);
    expect(
      (
        await M.api.patch(`/api/contacts/${contact.id}`, {
          data: { note: 'mine' },
        })
      ).status()
    ).toBe(200);
  });

  test('4.9.2 insights', async ({ world }) => {
    const { community, O, M, VOL } = await yangonDevs(world);
    expect(
      (
        await O.api.get(`/api/organizations/${community.slug}/insights`)
      ).status()
    ).toBe(200);
    expect(
      (
        await M.api.get(`/api/organizations/${community.slug}/insights`)
      ).status()
    ).toBe(403);
    expect(
      (
        await VOL.api.get(`/api/organizations/${community.slug}/insights`)
      ).status()
    ).toBe(403);
  });
});

test.describe('Part 4.10: Isolation', () => {
  test('4.10 an organizer of another community gets not found', async ({
    world,
  }) => {
    const { community, O, M } = await yangonDevs(world);
    const beta = await createCommunity(world);
    const O3 = beta.O;
    const event = await createEvent(O, community);
    const registration = await (await register(M, event.id)).json();
    const label = await (
      await O.api.post(`/api/organizations/${community.slug}/attendee-labels`, {
        data: { name: 'VIP', color: '#c8a97e' },
      })
    ).json();
    const m = (await membership(community, M))!;
    const base = `/api/organizations/${community.slug}`;
    // One at a time: a burst of 404s can wedge the dev server's error page renderer.
    const calls = [
      () => O3.api.get(`${base}/members`),
      () => O3.api.get(`${base}/contacts`),
      () => O3.api.get(`${base}/insights`),
      () => O3.api.get(`${base}/join-link`),
      () => O3.api.get(`${base}/events`),
      () => O3.api.patch(base, { data: { name: 'Mine' } }),
      () => O3.api.delete(`/api/members/${m.id}`),
      () =>
        O3.api.patch(`/api/members/${m.id}`, { data: { role: 'volunteer' } }),
      () => O3.api.patch(`/api/events/${event.id}`, { data: {} }),
      () =>
        O3.api.post(`/api/events/${event.id}/check-ins`, {
          data: { cardSlug: 'x' },
        }),
      () =>
        O3.api.post(`/api/events/${event.id}/broadcasts`, {
          data: { kind: 'reminder' },
        }),
      () =>
        O3.api.patch(`/api/registrations/${registration.id}`, {
          data: { status: 'registered' },
        }),
      () =>
        O3.api.patch(`/api/attendee-labels/${label.id}`, {
          data: { name: 'Mine' },
        }),
      () => O3.api.delete(`/api/attendee-labels/${label.id}`),
      () =>
        O3.api.post(`${base}/uploads`, {
          data: { contentType: 'image/png', contentLength: 1000 },
        }),
    ];
    for (const call of calls) {
      const response = await call();
      expect(response.status(), response.url()).toBe(404);
    }
    expect(await membership(community, M)).not.toBeNull();

    const company = await world.company();
    const A = await world.person('alice');
    await world.hire(company, A, { role: 'admin' });
    await expectError(
      await A.api.get(`/api/organizations/${company.slug}/events`),
      403
    );
    expect(
      (await O.api.get(`/api/organizations/${company.slug}/events`)).status()
    ).toBe(404);
  });
});

test.describe('Part 4.11: Reliability', () => {
  test('4.11.1 last seat, two people at once', async ({ world }) => {
    const { community, O, M, VOL } = await yangonDevs(world);
    const event = await createEvent(O, community, { capacity: 1 });
    const results = await Promise.all([
      register(M, event.id),
      register(VOL, event.id),
    ]);
    expect(await statuses(results)).toEqual([201, 409]);
  });

  test('4.11.2 same person registers twice at once', async ({ world }) => {
    const { community, O, M } = await yangonDevs(world);
    const event = await createEvent(O, community);
    const before = await emailsTo(M.email);
    const results = await Promise.all([
      register(M, event.id),
      register(M, event.id),
    ]);
    expect(await statuses(results)).toEqual([200, 201]);
    await expect.poll(() => emailsTo(M.email)).toBe(before + 1);

    const live = await createEvent(O, community);
    await scheduleEvent(live.id, 'live');
    const walkIns = await Promise.all([
      M.api.post(`/api/events/${live.id}/walk-in-registrations`),
      M.api.post(`/api/events/${live.id}/walk-in-registrations`),
    ]);
    expect(await statuses(walkIns)).toEqual([200, 201]);
  });

  test('4.11.3 two scanners, one card', async ({ world }) => {
    const { community, O, M, VOL } = await yangonDevs(world);
    const event = await createEvent(O, community);
    await register(M, event.id);
    await scheduleEvent(event.id, 'live');
    const slug = (await communityCard(community, M))!.slug;
    const results = await Promise.all([
      checkIn(O, event.id, slug),
      checkIn(VOL, event.id, slug),
    ]);
    expect(await statuses(results)).toEqual([200, 201]);
    await expect.poll(() => emailsTo(M.email, 'checked in')).toBe(1);
  });

  test('4.11.5 two organizers remove each other at once', async ({ world }) => {
    const { community, O } = await createCommunity(world);
    const O2 = await addOrganizer(world, community);
    const o = (await membership(community, O))!;
    const o2 = (await membership(community, O2))!;
    const results = await Promise.all([
      removeMember(O, o2.id),
      removeMember(O2, o.id),
    ]);
    const codes = await statuses(results);
    expect(codes[0]).toBe(204);
    expect([404, 409]).toContain(codes[1]);
  });

  test('4.11.6 approve the last seat twice', async ({ world }) => {
    const { community, O, M, VOL } = await yangonDevs(world);
    const event = await createEvent(O, community, {
      capacity: 1,
      approvalMode: 'manual',
    });
    const first = await (await register(M, event.id)).json();
    const second = await (await register(VOL, event.id)).json();
    const approve = (id: string) =>
      O.api.patch(`/api/registrations/${id}`, {
        data: { status: 'registered' },
      });
    const results = await Promise.all([approve(first.id), approve(second.id)]);
    expect(await statuses(results)).toEqual([200, 409]);
  });

  test('4.11.7 email down during registration', async ({ world }) => {
    const { community, O, M } = await yangonDevs(world);
    const event = await createEvent(O, community);
    await setEmailDown(true);
    try {
      expect((await register(M, event.id)).status()).toBe(201);
      expect((await registrationOf(event.id, M))?.status).toBe('registered');
    } finally {
      await setEmailDown(false);
    }
  });

  test('4.11.8 first settings read, many at once', async ({ world }) => {
    const { community, O } = await createCommunity(world);
    await sql('delete from community_setting where organization_id = $1', [
      community.id,
    ]);
    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        O.api.get(`/api/organizations/${community.slug}/join-link`)
      )
    );
    expect(await statuses(results)).toEqual([200, 200, 200, 200, 200]);
    const links = await Promise.all(results.map((result) => result.json()));
    expect(new Set(links.map((link) => link.url)).size).toBe(1);
    const rows = await sql(
      'select id from community_setting where organization_id = $1',
      [community.id]
    );
    expect(rows).toHaveLength(1);
  });
});

test.describe('Part 4.12: Thakhin activity', () => {
  type Activity = {
    userId: string;
    email: string;
    connections: number;
    eventConnections: number;
    eventsRegistered: number;
    eventsAttended: number;
  };

  async function activity(T: Person, query: Record<string, string> = {}) {
    const response = await T.api.get('/api/admin/user-activity', {
      params: query,
    });
    expect(response.status(), await response.text()).toBe(200);
    return (await response.json()).items as Activity[];
  }

  function rowOf(rows: Activity[], person: Person) {
    return rows.find((row) => row.userId === person.userId);
  }

  /**
   * M checks in and collects three contacts: two tagged to the event, one not.
   * M2 registers and doesn't come.
   */
  async function meetupWithConnections(world: World) {
    const T = await world.thakhin();
    const { community, O, M } = await yangonDevs(world);
    const M2 = await addMember(world, community, O, 'member2');
    const event = await createEvent(O, community);
    await register(M, event.id);
    await register(M2, event.id);
    await scheduleEvent(event.id, 'live');
    const card = (await communityCard(community, M))!;
    expect((await checkIn(O, event.id, card.slug)).status()).toBe(201);
    for (const name of ['At Event 1', 'At Event 2', 'Elsewhere']) {
      expect((await exchangeByForm(world, card.slug, name)).status()).toBe(201);
    }
    // Tag directly so the counts don't depend on check-in timing rules.
    await sql(
      `update contact_exchange
       set event_id = case when name like 'At Event%' then $2 else null end
       where card_id = $1`,
      [card.id, event.id]
    );
    return { T, community, O, M, M2, event, card };
  }

  test('4.12.1 counts per person', async ({ world }) => {
    const { T, community, M, M2 } = await meetupWithConnections(world);
    const rows = await activity(T, { organizationId: community.id });
    expect(rowOf(rows, M)).toMatchObject({
      connections: 3,
      eventConnections: 2,
      eventsRegistered: 1,
      eventsAttended: 1,
    });
    expect(rowOf(rows, M2)).toMatchObject({
      connections: 0,
      eventConnections: 0,
      eventsRegistered: 1,
      eventsAttended: 0,
    });
  });

  test('4.12.2 filters', async ({ world }) => {
    const { T, community, M, event, card } = await meetupWithConnections(world);
    const other = await yangonDevs(world);
    await exchangeByForm(
      world,
      (await communityCard(other.community, other.M))!.slug
    );

    const byEvent = await activity(T, { eventId: event.id });
    expect(rowOf(byEvent, M)).toMatchObject({
      connections: 2,
      eventsRegistered: 1,
    });

    await sql(
      `update contact_exchange set source = 'manual' where card_id = $1 and name = 'Elsewhere'`,
      [card.id]
    );
    const manual = await activity(T, {
      organizationId: community.id,
      source: 'manual',
    });
    expect(rowOf(manual, M)).toMatchObject({
      connections: 1,
      eventsAttended: 1,
    });

    await sql(
      `update contact_exchange set created_at = now() - interval '30 days'
       where card_id = $1 and name = 'At Event 1'`,
      [card.id]
    );
    const lastWeek = await activity(T, {
      organizationId: community.id,
      range: '1w',
    });
    expect(rowOf(lastWeek, M)?.connections).toBe(2);

    expect(
      rowOf(await activity(T, { organizationId: community.id }), other.M)
    ).toBeUndefined();
    expect(rowOf(await activity(T), other.M)?.connections).toBe(1);
  });

  test('4.12.3 per-person events', async ({ world }) => {
    const { T, community, O, M, event, card } =
      await meetupWithConnections(world);
    const later = await createEvent(O, community);
    await exchangeByForm(world, card.slug, 'Later');
    await sql(
      `update contact_exchange set event_id = $2 where card_id = $1 and name = 'Later'`,
      [card.id, later.id]
    );

    const response = await T.api.get(
      `/api/admin/users/${M.userId}/event-activity`
    );
    expect(response.status(), await response.text()).toBe(200);
    const items = (await response.json()).items as {
      eventId: string;
      status: string | null;
      connections: number;
    }[];
    expect(items.map((item) => item.eventId)).toEqual([later.id, event.id]);
    expect(items[0]).toMatchObject({ status: null, connections: 1 });
    expect(items[1]).toMatchObject({ status: 'checked_in', connections: 2 });

    const events = await (await T.api.get('/api/admin/events')).json();
    expect(
      events.items.find((item: { id: string }) => item.id === event.id)
    ).toMatchObject({ organizationId: community.id });
  });

  test('4.12.4 CSV export', async ({ world }) => {
    const { T, community, M } = await meetupWithConnections(world);
    const rows = await activity(T, { organizationId: community.id });
    const response = await T.api.get('/api/admin/user-activity', {
      params: { organizationId: community.id },
      headers: { accept: 'text/csv' },
    });
    expect(response.status()).toBe(200);
    const lines = (await response.text()).trim().split('\r\n');
    expect(lines[0]).toContain('Connections at events');
    expect(lines).toHaveLength(rows.length + 1);
    expect(lines.some((line) => line.includes(M.email))).toBe(true);
  });

  test('4.12.5 Thakhin only', async ({ world }) => {
    const { O, M } = await yangonDevs(world);
    const anonymous = (await world.anonymous()).request;
    for (const path of [
      '/api/admin/user-activity',
      `/api/admin/users/${M.userId}/event-activity`,
      '/api/admin/events',
    ]) {
      expect((await O.api.get(path)).status()).toBe(404);
      expect((await M.api.get(path)).status()).toBe(404);
      expect((await anonymous.get(path)).status()).toBe(404);
    }
  });
});
