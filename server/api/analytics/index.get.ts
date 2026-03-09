import { and, eq, sql, gte } from 'drizzle-orm';
import { db } from '~~/server/db';
import { auth } from '~~/server/auth';
import { analytics, card, member } from '~~/server/db/schema';
import {
  OTHER_LINK_LABELS,
  SOCIAL_MEDIA_LINK_LABELS,
} from '~~/shared/constants/card-link-options';

const socialLabelSet = new Set(SOCIAL_MEDIA_LINK_LABELS.map((label) => label.toLowerCase()));
const otherLabelSet = new Set(OTHER_LINK_LABELS.map((label) => label.toLowerCase()));
const knownLabelByLower = new Map(
  [...SOCIAL_MEDIA_LINK_LABELS, ...OTHER_LINK_LABELS].map((label) => [
    label.toLowerCase(),
    label,
  ])
);

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers });
  if (!session || !session.session.activeOrganizationId) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
  }

  const { cardId } = getQuery(event);
  const selectedCardId = typeof cardId === 'string' ? cardId : 'all';
  const orgId = session.session.activeOrganizationId;
  const userId = session.user.id;

  const userMemberInfo = await db.query.member.findFirst({
    where: and(eq(member.organizationId, orgId), eq(member.userId, userId)),
  });

  if (!userMemberInfo) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' });
  }
  const isOwner = userMemberInfo.role === 'owner';

  let conditions = [eq(analytics.organizationId, orgId)];
  if (!isOwner) {
    conditions.push(eq(analytics.userId, userId as string));
  }

  if (selectedCardId !== 'all') {
    const accessibleCard = await db.query.card.findFirst({
      where: and(
        eq(card.id, selectedCardId),
        eq(card.organizationId, orgId),
        ...(isOwner ? [] : [eq(card.userId, userId)])
      ),
      columns: { id: true },
    });

    if (!accessibleCard) {
      throw createError({
        statusCode: 403,
        statusMessage: 'You do not have access to this card analytics.',
      });
    }

    conditions.push(eq(analytics.cardId, selectedCardId));
  }

  const last7Days = new Date();
  last7Days.setDate(last7Days.getDate() - 7);

  const cardScopeConditions = [eq(card.organizationId, orgId)];
  if (!isOwner) {
    cardScopeConditions.push(eq(card.userId, userId as string));
  }
  if (selectedCardId !== 'all') {
    cardScopeConditions.push(eq(card.id, selectedCardId));
  }

  const [
    totalStats,
    dailyViews,
    socialClicks,
    linkClicks,
    saveActions,
    ownerCardOptions,
    scopedCardLinks,
  ] =
    await Promise.all([
      db
        .select({ type: analytics.type, count: sql<number>`count(*)::int` })
        .from(analytics)
        .where(and(...conditions))
        .groupBy(analytics.type),

      db
        .select({
          date: sql`DATE_TRUNC('day', ${analytics.createdAt})`.as('day'),
          count: sql<number>`count(*)::int`,
        })
        .from(analytics)
        .where(
          and(
            ...conditions,
            eq(analytics.type, 'view'),
            gte(analytics.createdAt, last7Days)
          )
        )
        .groupBy(sql`day`)
        .orderBy(sql`day`),

      db
        .select({
          platform: sql<string>`metadata->>'platform'`,
          count: sql<number>`count(*)::int`,
        })
        .from(analytics)
        .where(and(...conditions, eq(analytics.type, 'social_click')))
        .groupBy(sql`metadata->>'platform'`),

      db
        .select({
          label: sql<string>`metadata->>'label'`,
          count: sql<number>`count(*)::int`,
        })
        .from(analytics)
        .where(and(...conditions, eq(analytics.type, 'link_click')))
        .groupBy(sql`metadata->>'label'`),

      db
        .select({
          action: sql<string>`metadata->>'action'`,
          count: sql<number>`count(*)::int`,
        })
        .from(analytics)
        .where(and(...conditions, eq(analytics.type, 'save_action')))
        .groupBy(sql`metadata->>'action'`),

      isOwner
        ? db
            .select({
              id: card.id,
              firstName: card.firstName,
              lastName: card.lastName,
            })
            .from(card)
            .where(eq(card.organizationId, orgId))
        : Promise.resolve([]),

      db
        .select({
          socials: card.socials,
        })
        .from(card)
        .where(and(...cardScopeConditions)),
    ]);

  const configuredSocialLabels = new Set<string>();
  const configuredOtherLabels = new Set<string>();

  for (const cardData of scopedCardLinks) {
    const socials = Array.isArray(cardData.socials) ? cardData.socials : [];
    for (const social of socials) {
      const rawLabel =
        social && typeof social === 'object' && 'label' in social
          ? String((social as { label?: string }).label || '')
          : '';
      const normalizedLabel = rawLabel.trim().toLowerCase();
      if (!normalizedLabel) continue;
      const canonicalLabel = knownLabelByLower.get(normalizedLabel);
      if (!canonicalLabel) continue;

      if (socialLabelSet.has(normalizedLabel)) configuredSocialLabels.add(canonicalLabel);
      if (otherLabelSet.has(normalizedLabel)) configuredOtherLabels.add(canonicalLabel);
    }
  }

  return {
    isOwner,
    totalStats,
    dailyViews,
    socialClicks,
    linkClicks,
    saveActions,
    socialConfiguredLabels: SOCIAL_MEDIA_LINK_LABELS.filter((label) =>
      configuredSocialLabels.has(label)
    ),
    otherConfiguredLabels: OTHER_LINK_LABELS.filter((label) =>
      configuredOtherLabels.has(label)
    ),
    cards: ownerCardOptions.map((item) => ({
      id: item.id,
      label: `${item.firstName} ${item.lastName || ''}`.trim(),
    })),
  };
});
