import { z } from 'zod';

type MonthComparison = { current: number; previous: number };

export type AdminEngagementTotals = {
  views: number;
  linkClicks: number;
  socialClicks: number;
  saves: number;
  contactExchanges: number;
};

export type AdminOverview = {
  census: {
    users: number;
    cards: { total: number; claimed: number; unclaimed: number };
    organizations: { total: number; personal: number; community: number };
    events: number;
  };
  queues: {
    designRequests: { count: number; oldestAgeHours: number | null };
    standalonePayments: { count: number };
    updateRequests: { count: number };
    expiringInvitations: { count: number };
  };
  /** Counted with the Thakhin cards filters, so each number matches its link. */
  subscriptions: {
    paidLive: number;
    freeLive: number;
    expiring: number;
    pendingApproval: number;
    expired: number;
    noEndDate: number;
  };
  month: {
    newUsers: MonthComparison;
    cardsCreated: MonthComparison;
    invitationsSent: MonthComparison;
    invitationsAccepted: MonthComparison;
  };
  /** The last 30 days against the 30 days before. */
  engagement: {
    dailyActive: { today: number; yesterday: number };
    current: AdminEngagementTotals;
    previous: AdminEngagementTotals;
  };
};

export const ADMIN_CHART_RANGES = ['1w', '1m', '3m', '6m', '1y'] as const;
export type AdminChartRange = (typeof ADMIN_CHART_RANGES)[number];

export const ADMIN_REVENUE_RANGES = [...ADMIN_CHART_RANGES, 'all'] as const;
export type AdminRevenueRange = (typeof ADMIN_REVENUE_RANGES)[number];

export const AdminRevenueQuery = z.object({
  range: z.enum(ADMIN_REVENUE_RANGES).default('all'),
});

export type AdminRevenuePlan = {
  planCode: string;
  planName: string;
  amountMinor: number;
  periods: number;
};

export type AdminRevenue = {
  range: AdminRevenueRange;
  currency: string;
  total: number;
  /** The previous window of the same length. Absent for all time. */
  previous: number | null;
  byPlan: AdminRevenuePlan[];
};

export const AdminChartsQuery = z.object({
  range: z.enum(ADMIN_CHART_RANGES).default('1m'),
});

export type AdminChartBucket = 'day' | 'week' | 'month';

export type AdminCharts = {
  range: AdminChartRange;
  bucket: AdminChartBucket;
  points: {
    /** First Yangon day of the bucket, YYYY-MM-DD. */
    start: string;
    /** Distinct people active at least once in the bucket. */
    activePeople: number;
    views: number;
    /** Link clicks, social clicks, and saves. */
    interactions: number;
    revenueMinor: number;
  }[];
};

export type AdminSearchResult = {
  users: { id: string; label: string; href: string }[];
  organizations: { id: string; label: string; href: string }[];
  cards: { id: string; label: string; href: string }[];
};

export const BackOfficeSearchQuery = z.object({
  q: z.string().trim().max(100).default(''),
});

export type BackOfficeSearchResult = AdminSearchResult;
