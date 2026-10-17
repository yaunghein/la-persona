import { z } from 'zod';
import { ANALYTICS_PERIODS } from '~~/shared/utils/analytics-period';
import { isTimezoneOffset } from '~~/shared/utils/datetime';

export const CARD_INTERACTION_TYPES = [
  'view',
  'social_click',
  'link_click',
  'save_action',
] as const;

export type CardInteractionType = (typeof CARD_INTERACTION_TYPES)[number];

/** Recorded anonymously from the public card; owner and organization come from the card. */
export const RecordCardInteractionRequest = z.object({
  type: z.enum(CARD_INTERACTION_TYPES),
  metadata: z
    .object({
      platform: z.string().trim().max(60).optional(),
      label: z.string().trim().max(120).optional(),
      action: z.string().trim().max(60).optional(),
      url: z.string().trim().max(2048).optional(),
      path: z.string().trim().max(512).optional(),
    })
    .strict()
    .optional(),
});

export type RecordCardInteractionRequest = z.infer<
  typeof RecordCardInteractionRequest
>;

/** `?period=7d|30d|90d&cardId=&tzOffset=` (tzOffset groups by the viewer's day). */
export const AnalyticsQuery = z.object({
  period: z.enum(ANALYTICS_PERIODS).default('7d'),
  cardId: z.string().trim().min(1).optional(),
  tzOffset: z.coerce.number().refine(isTimezoneOffset).optional(),
});

export type AnalyticsQuery = z.infer<typeof AnalyticsQuery>;

/** Interaction totals and breakdowns for the cards in scope. */
export type CardAnalyticsSummary = {
  /** True when the viewer sees every card in scope (not just the ones they hold). */
  coversAllCards: boolean;
  period: (typeof ANALYTICS_PERIODS)[number];
  totalStats: { type: CardInteractionType; count: number }[];
  dailyViews: { date: string; count: number }[];
  socialClicks: { platform: string; count: number }[];
  linkClicks: { label: string; count: number }[];
  saveActions: { action: string; count: number }[];
  socialConfiguredLabels: string[];
  otherConfiguredLabels: string[];
};

export type CommunityMetric = {
  label: string;
  value: string;
};

export type CommunityEventPerformance = {
  id: string;
  event: string;
  registered: number;
  checkedIn: number;
  attendance: string;
};

export type CommunityMemberGrowth = {
  labels: string[];
  values: number[];
};

export type CommunityInsightsData = {
  title: string;
  periodOptions: { label: string; value: string }[];
  metrics: CommunityMetric[];
  memberGrowth: CommunityMemberGrowth;
  eventPerformance: CommunityEventPerformance[];
  infoItems: {
    icon: string;
    title: string;
    description: string;
  }[];
};
