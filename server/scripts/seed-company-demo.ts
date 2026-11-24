import { asc, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { env } from '../../env';
import { db } from '../db';
import {
  analytics,
  card,
  cardAssignment,
  cardSubscription,
  companySetting,
  contactExchange,
  department,
  invitation,
  member,
  organization,
  retiredCardSlug,
  subscriptionPayment,
  subscriptionPaymentItem,
  user,
} from '../db/schema';

const SLUG = 'northwind-demo';

async function person(email: string, name: string, now: Date) {
  const [found] = await db
    .select()
    .from(user)
    .where(eq(user.email, email))
    .limit(1);
  if (found) return found;
  const [created] = await db
    .insert(user)
    .values({
      id: nanoid(),
      name,
      email,
      emailVerified: true,
      role: 'user',
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  if (!created) throw new Error(`Could not create ${email}`);
  return created;
}

async function main() {
  const [existing] = await db
    .select({ slug: organization.slug })
    .from(organization)
    .where(eq(organization.slug, SLUG))
    .limit(1);
  if (existing) {
    console.log(`Northwind Studio is already in the database.`);
    console.log(`Open /platform/${SLUG} as the company admin.`);
    return;
  }

  const [platformAdmin] = await db
    .select()
    .from(user)
    .where(eq(user.role, 'admin'))
    .orderBy(asc(user.createdAt))
    .limit(1);
  const [oldest] = await db
    .select()
    .from(user)
    .orderBy(asc(user.createdAt))
    .limit(1);
  const viewer = platformAdmin ?? oldest;
  if (!viewer) {
    throw new Error('No users yet. Sign in once, then run this script again.');
  }

  const now = new Date();
  const nextYear = new Date(now);
  nextYear.setUTCFullYear(nextYear.getUTCFullYear() + 1);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const lastMonth = new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000);
  const handoff = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000);
  const orgId = nanoid();

  await db.insert(organization).values({
    id: orgId,
    name: 'Northwind Studio',
    slug: SLUG,
    createdAt: now,
    type: 'company',
  });
  await db.insert(companySetting).values({
    organizationId: orgId,
    website: 'https://northwind.example',
    splineUrl: env.DEFAULT_SPLINE_URL,
    wallpaperUrl: env.DEFAULT_WALLPAPER_URL,
    cardBackUrl: env.DEFAULT_CARD_BACK_URL,
  });
  await db.insert(member).values({
    id: nanoid(),
    organizationId: orgId,
    userId: viewer.id,
    role: 'admin',
    createdAt: now,
  });

  const maya = await person('maya.chen.demo@la-persona.test', 'Maya Chen', now);
  const su = await person('su.lin.demo@la-persona.test', 'Su Lin', now);
  await db.insert(member).values([
    {
      id: nanoid(),
      organizationId: orgId,
      userId: maya.id,
      role: 'member',
      createdAt: now,
    },
    {
      id: nanoid(),
      organizationId: orgId,
      userId: su.id,
      role: 'member',
      createdAt: now,
    },
  ]);

  const [sales] = await db
    .insert(department)
    .values({ organizationId: orgId, name: 'Sales' })
    .returning();
  const [design] = await db
    .insert(department)
    .values({ organizationId: orgId, name: 'Design' })
    .returning();
  if (!sales || !design) throw new Error('Could not create departments.');

  const [viewerFirst, ...viewerRest] = viewer.name.split(' ');
  const designFields = {
    company: 'Northwind Studio',
    website: 'https://northwind.example',
    splineUrl: env.DEFAULT_SPLINE_URL,
    wallpaperUrl: env.DEFAULT_WALLPAPER_URL,
    cardBackUrl: env.DEFAULT_CARD_BACK_URL,
    visibility: 'public' as const,
    organizationId: orgId,
  };

  const adminCardId = nanoid();
  const mayaCardId = nanoid();
  const pausedCardId = nanoid();
  const vacantCardId = nanoid();
  const pendingCardId = nanoid();

  await db.insert(card).values([
    {
      id: adminCardId,
      firstName: viewerFirst || 'Admin',
      lastName: viewerRest.join(' ') || null,
      slug: 'northwind-admin',
      position: 'Studio director',
      email: viewer.email,
      departmentId: sales.id,
      userId: viewer.id,
      ...designFields,
    },
    {
      id: mayaCardId,
      firstName: 'Maya',
      lastName: 'Chen',
      slug: 'maya-chen-northwind',
      position: 'Design lead',
      email: maya.email,
      departmentId: design.id,
      userId: maya.id,
      ...designFields,
    },
    {
      id: pausedCardId,
      firstName: 'Su',
      lastName: 'Lin',
      slug: 'su-lin-northwind',
      position: 'Account manager',
      email: su.email,
      departmentId: sales.id,
      userId: su.id,
      ...designFields,
    },
    {
      id: vacantCardId,
      firstName: 'Open',
      lastName: 'Seat',
      slug: 'northwind-open-seat',
      position: 'Producer',
      email: null,
      departmentId: design.id,
      userId: null,
      ...designFields,
    },
    {
      id: pendingCardId,
      firstName: 'New',
      lastName: 'Hire',
      slug: 'northwind-new-hire',
      position: 'Coordinator',
      email: 'new.hire.demo@la-persona.test',
      departmentId: sales.id,
      userId: null,
      ...designFields,
    },
  ]);

  await db.insert(retiredCardSlug).values({
    slug: 'ko-aung-northwind',
    cardId: mayaCardId,
    retiredAt: handoff,
  });

  const adminAssignment = nanoid();
  const formerAssignment = nanoid();
  const mayaAssignment = nanoid();
  const pausedAssignment = nanoid();
  await db.insert(cardAssignment).values([
    {
      id: adminAssignment,
      cardId: adminCardId,
      userId: viewer.id,
      holderName: viewer.name,
      holderEmail: viewer.email,
      startedAt: lastMonth,
    },
    {
      id: formerAssignment,
      cardId: mayaCardId,
      userId: null,
      holderName: 'Ko Aung',
      holderEmail: 'ko.aung.demo@la-persona.test',
      startedAt: lastMonth,
      endedAt: handoff,
      endedByUserId: viewer.id,
    },
    {
      id: mayaAssignment,
      cardId: mayaCardId,
      userId: maya.id,
      holderName: 'Maya Chen',
      holderEmail: maya.email,
      startedAt: handoff,
    },
    {
      id: pausedAssignment,
      cardId: pausedCardId,
      userId: su.id,
      holderName: 'Su Lin',
      holderEmail: su.email,
      startedAt: lastMonth,
    },
  ]);

  const paidId = nanoid();
  const freeId = nanoid();
  const expiredPaymentId = nanoid();
  await db.insert(subscriptionPayment).values([
    {
      id: paidId,
      organizationId: orgId,
      paidByUserId: viewer.id,
      paymentMethod: 'manual',
      status: 'approved',
      paymentReference: 'NW-2026-001',
      note: 'Northwind first year',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: freeId,
      organizationId: orgId,
      paidByUserId: viewer.id,
      paymentMethod: 'system',
      status: 'approved',
      note: 'Free month',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: expiredPaymentId,
      organizationId: orgId,
      paidByUserId: viewer.id,
      paymentMethod: 'manual',
      status: 'approved',
      note: 'Ended term',
      createdAt: lastMonth,
      updatedAt: yesterday,
    },
  ]);

  const paidAdminItem = nanoid();
  const paidMayaItem = nanoid();
  const freeItem = nanoid();
  const expiredItem = nanoid();
  const freeEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  await db.insert(subscriptionPaymentItem).values([
    {
      id: paidAdminItem,
      paymentId: paidId,
      cardId: adminCardId,
      planCode: 'standard',
      startAt: now,
      endAt: nextYear,
      amountMinor: 120000,
      currency: 'MMK',
    },
    {
      id: paidMayaItem,
      paymentId: paidId,
      cardId: mayaCardId,
      planCode: 'standard',
      startAt: now,
      endAt: nextYear,
      amountMinor: 120000,
      currency: 'MMK',
    },
    {
      id: nanoid(),
      paymentId: paidId,
      cardId: vacantCardId,
      planCode: 'standard',
      startAt: now,
      endAt: nextYear,
      amountMinor: 120000,
      currency: 'MMK',
    },
    {
      id: freeItem,
      paymentId: freeId,
      cardId: pendingCardId,
      planCode: 'standard',
      startAt: now,
      endAt: freeEnd,
      amountMinor: 0,
      currency: 'MMK',
    },
    {
      id: expiredItem,
      paymentId: expiredPaymentId,
      cardId: pausedCardId,
      planCode: 'standard',
      startAt: lastMonth,
      endAt: yesterday,
      amountMinor: 120000,
      currency: 'MMK',
    },
  ]);

  await db.insert(cardSubscription).values([
    {
      cardId: adminCardId,
      planCode: 'standard',
      status: 'active',
      isTrial: false,
      currentPeriodStartAt: now,
      currentPeriodEndAt: nextYear,
      lastPaymentItemId: paidAdminItem,
      activatedAt: now,
    },
    {
      cardId: mayaCardId,
      planCode: 'standard',
      status: 'active',
      isTrial: false,
      currentPeriodStartAt: now,
      currentPeriodEndAt: nextYear,
      lastPaymentItemId: paidMayaItem,
      activatedAt: now,
    },
    {
      cardId: vacantCardId,
      planCode: 'standard',
      status: 'active',
      isTrial: false,
      currentPeriodStartAt: now,
      currentPeriodEndAt: nextYear,
      activatedAt: now,
    },
    {
      cardId: pendingCardId,
      planCode: 'standard',
      status: 'active',
      isTrial: false,
      currentPeriodStartAt: now,
      currentPeriodEndAt: freeEnd,
      lastPaymentItemId: freeItem,
      activatedAt: now,
    },
    {
      cardId: pausedCardId,
      planCode: 'standard',
      status: 'expired',
      isTrial: false,
      currentPeriodStartAt: lastMonth,
      currentPeriodEndAt: yesterday,
      lastPaymentItemId: expiredItem,
      activatedAt: lastMonth,
      expiredAt: yesterday,
    },
  ]);

  await db.insert(invitation).values({
    id: nanoid(),
    organizationId: orgId,
    email: 'new.hire.demo@la-persona.test',
    role: 'member',
    status: 'pending',
    expiresAt: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
    inviterId: viewer.id,
    cardId: pendingCardId,
    createdAt: now,
  });

  await db.insert(contactExchange).values([
    {
      name: 'Hla Win',
      phone: '0911111111',
      email: 'hla.win.demo@la-persona.test',
      company: 'River Books',
      position: 'Editor',
      cardId: adminCardId,
      cardAssignmentId: adminAssignment,
      source: 'public_form',
      note: 'Asked for a printed sample.',
      createdAt: now,
      updatedAt: now,
    },
    {
      name: 'Aye Aye',
      phone: '0922222222',
      email: 'aye.aye.demo@la-persona.test',
      company: 'Former client',
      position: 'Buyer',
      cardId: mayaCardId,
      cardAssignmentId: formerAssignment,
      source: 'public_form',
      note: 'Met while Ko Aung held this card.',
      createdAt: handoff,
      updatedAt: handoff,
    },
    {
      name: 'Min Khant',
      phone: '0933333333',
      email: 'min.khant.demo@la-persona.test',
      company: 'Gallery 21',
      position: 'Curator',
      cardId: mayaCardId,
      cardAssignmentId: mayaAssignment,
      source: 'public_form',
      note: 'Wants the spring lookbook.',
      createdAt: now,
      updatedAt: now,
    },
    {
      name: 'Paused Contact',
      phone: '0944444444',
      email: 'paused.contact.demo@la-persona.test',
      company: 'Old account',
      position: 'Manager',
      cardId: pausedCardId,
      cardAssignmentId: pausedAssignment,
      source: 'public_form',
      createdAt: now,
      updatedAt: now,
    },
  ]);

  await db.insert(analytics).values([
    {
      type: 'view',
      organizationId: orgId,
      cardId: adminCardId,
      cardAssignmentId: adminAssignment,
      createdAt: now,
    },
    {
      type: 'view',
      organizationId: orgId,
      cardId: adminCardId,
      cardAssignmentId: adminAssignment,
      createdAt: now,
    },
    {
      type: 'save_action',
      organizationId: orgId,
      cardId: adminCardId,
      cardAssignmentId: adminAssignment,
      metadata: { action: 'save_contact' },
      createdAt: now,
    },
    {
      type: 'link_click',
      organizationId: orgId,
      cardId: mayaCardId,
      cardAssignmentId: mayaAssignment,
      metadata: { label: 'Website' },
      createdAt: now,
    },
    {
      type: 'view',
      organizationId: orgId,
      cardId: mayaCardId,
      cardAssignmentId: formerAssignment,
      createdAt: handoff,
    },
  ]);

  console.log(`Company admin: ${viewer.email}`);
  console.log(`Workspace: /platform/${SLUG}`);
  console.log('Thakhin: /thakhin/organizations → Northwind Studio → Cards');
  console.log('Live card: /c/northwind-admin');
  console.log('Paused card: /c/su-lin-northwind');
  console.log('Retired link: /c/ko-aung-northwind');
}

main();
