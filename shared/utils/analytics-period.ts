export const ANALYTICS_PERIODS = ['7d', '30d', '90d'] as const;

export type AnalyticsPeriod = (typeof ANALYTICS_PERIODS)[number];

export const ANALYTICS_PERIOD_OPTIONS: { label: string; value: AnalyticsPeriod }[] =
  [
    { label: '7 Days', value: '7d' },
    { label: '30 Days', value: '30d' },
    { label: '90 Days', value: '90d' },
  ];

export function parseAnalyticsPeriod(value: unknown): AnalyticsPeriod {
  if (value === '30d' || value === '90d') return value;
  return '7d';
}

export function analyticsPeriodDays(period: AnalyticsPeriod) {
  if (period === '90d') return 90;
  if (period === '30d') return 30;
  return 7;
}

export function analyticsPeriodStart(
  period: AnalyticsPeriod,
  now = new Date()
) {
  const start = new Date(now);
  start.setDate(start.getDate() - analyticsPeriodDays(period));
  return start;
}
