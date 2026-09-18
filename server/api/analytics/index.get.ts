import { and, eq, sql, gte } from 'drizzle-orm';
import { db } from '~~/server/db';
import { analytics, card, member } from '~~/server/db/schema';
import { requireOrganizationSession } from '~~/server/utils/organization-permissions';
import { isOrganizationManagerRole } from '~~/shared/permissions/organization';
import { parseAnalyticsPeriod, analyticsPeriodStart } from '~~/shared/utils/analytics-period';
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
  const session = await requireOrganizationSession(event);

  const query = getQuery(event);
  const selectedCardId = typeof query.cardId === 'string' ? query.cardId : 'all';
  const period = parseAnalyticsPeriod(query.period);
  const since = analyticsPeriodStart(period);
  const orgId = session.session.activeOrganizationId;
  const userId = session.user.id;

  const userMemberInfo = await db.query.member.findFirst({
    where: and(eq(member.organizationId, orgId), eq(member.userId, userId)),
  });

  if (!userMemberInfo) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' });
  }

  const isOwner = isOrganizationManagerRole(userMemberInfo.role);

  let conditions = [
    eq(analytics.organizationId, orgId),
    gte(analytics.createdAt, since),
  ];
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
            eq(analytics.type, 'view')
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

      db
        .select({
          socials: card.socials,
        })
        .from(card)
        .where(and(...cardScopeConditions)),
    ]);

  const configuredSocialLabels = new Set<string>();
  const configuredLinkLabelByLower = new Map<string, string>();

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

      if (socialLabelSet.has(normalizedLabel)) {
        configuredSocialLabels.add(canonicalLabel || rawLabel.trim());
        continue;
      }

      // Include both predefined "other" labels and custom labels.
      configuredLinkLabelByLower.set(
        normalizedLabel,
        canonicalLabel || rawLabel.trim()
      );
    }
  }

  const knownOtherConfiguredLabels = OTHER_LINK_LABELS.filter((label) =>
    configuredLinkLabelByLower.has(label.toLowerCase())
  );
  const customConfiguredLabels = Array.from(
    configuredLinkLabelByLower.entries()
  )
    .filter(([normalizedLabel]) => !otherLabelSet.has(normalizedLabel))
    .map(([, label]) => label)
    .sort((a, b) => a.localeCompare(b));

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
    otherConfiguredLabels: [
      ...knownOtherConfiguredLabels,
      ...customConfiguredLabels,
    ],
    period,
    cards: [],
  };
});
