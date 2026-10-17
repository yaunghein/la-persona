import {
  aggregateCardInteractions,
  type CardAnalyticsScope,
} from '~~/server/features/analytics/card-analytics.repository';
import { listWorkspaceCards } from '~~/server/features/card/card.repository';
import type {
  AnalyticsQuery,
  CardAnalyticsSummary,
} from '~~/shared/contracts/analytics';
import {
  OTHER_LINK_LABELS,
  SOCIAL_MEDIA_LINK_LABELS,
} from '~~/shared/constants/card-link-options';
import { analyticsPeriodStart } from '~~/shared/utils/analytics-period';

const SOCIAL_LABELS = new Set(
  SOCIAL_MEDIA_LINK_LABELS.map((label) => label.toLowerCase())
);
const OTHER_LABELS = new Set(
  OTHER_LINK_LABELS.map((label) => label.toLowerCase())
);
const KNOWN_LABEL_BY_LOWER = new Map(
  [...SOCIAL_MEDIA_LINK_LABELS, ...OTHER_LINK_LABELS].map((label) => [
    label.toLowerCase(),
    label,
  ])
);

/** Which link labels the cards in scope actually show, for zero-filled charts. */
function configuredLinkLabels(
  cards: { socials: { label: string }[] | null }[]
) {
  const social = new Set<string>();
  const other = new Map<string, string>();
  for (const { socials } of cards) {
    for (const link of socials ?? []) {
      const label = String(link?.label || '').trim();
      const lower = label.toLowerCase();
      if (!lower) continue;
      const canonical = KNOWN_LABEL_BY_LOWER.get(lower) || label;
      if (SOCIAL_LABELS.has(lower)) social.add(canonical);
      else other.set(lower, canonical);
    }
  }
  const knownOther = OTHER_LINK_LABELS.filter((label) =>
    other.has(label.toLowerCase())
  );
  const customOther = [...other.entries()]
    .filter(([lower]) => !OTHER_LABELS.has(lower))
    .map(([, label]) => label)
    .sort((a, b) => a.localeCompare(b));
  return {
    socialConfiguredLabels: SOCIAL_MEDIA_LINK_LABELS.filter((label) =>
      social.has(label)
    ),
    otherConfiguredLabels: [...knownOther, ...customOther],
  };
}

async function summarize(
  scope: CardAnalyticsScope,
  query: AnalyticsQuery,
  coversAllCards: boolean
): Promise<CardAnalyticsSummary> {
  const { cardLinks, ...interactions } = await aggregateCardInteractions(
    scope,
    analyticsPeriodStart(query.period),
    query.tzOffset
  );
  return {
    coversAllCards,
    period: query.period,
    ...interactions,
    ...configuredLinkLabels(cardLinks),
  };
}

/**
 * Personal-workspace owners see every card there; community managers get
 * community insights instead, so in communities everyone sees only their card.
 */
export function summarizeOrganizationAnalytics(params: {
  organizationId: string;
  viewerUserId: string;
  viewerSeesAllCards: boolean;
  query: AnalyticsQuery;
}) {
  const { query } = params;
  return summarize(
    {
      organizationId: params.organizationId,
      holderUserId: params.viewerSeesAllCards ? undefined : params.viewerUserId,
      cardId: query.cardId,
    },
    query,
    params.viewerSeesAllCards
  );
}

/** Every card the user holds, across personal and community workspaces. */
export async function summarizeWorkspaceAnalytics(
  userId: string,
  query: AnalyticsQuery
) {
  const cards = await listWorkspaceCards(userId);
  const cardIds = cards.map((row) => row.card.id);
  const scopedIds = query.cardId
    ? cardIds.filter((id) => id === query.cardId)
    : cardIds;
  if (query.cardId && !scopedIds.length) throw notFound('Card');
  if (!scopedIds.length) {
    return {
      coversAllCards: true,
      period: query.period,
      totalStats: [],
      dailyViews: [],
      socialClicks: [],
      linkClicks: [],
      saveActions: [],
      socialConfiguredLabels: [],
      otherConfiguredLabels: [],
    } satisfies CardAnalyticsSummary;
  }
  return summarize({ cardIds: scopedIds }, query, true);
}
