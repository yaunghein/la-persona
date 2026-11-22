<script setup lang="ts">
import { Line } from 'vue-chartjs';
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  CategoryScale,
} from 'chart.js';
import type {
  AdminChartBucket,
  AdminChartRange,
  AdminRevenueRange,
} from '~~/shared/contracts/admin';
import { lineChartOptions, lineSeries } from '~/utils/line-chart';
import {
  ADMIN_PAGE_CLASS,
  ADMIN_TABS_UI,
  planTone,
} from '~/features/admin/utils/admin-ui';

ChartJS.register(
  Title,
  Tooltip,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  CategoryScale
);

definePageMeta({
  layout: 'thakhin',
});

const { data, isLoading } = useAdminOverviewQuery();
const chartRange = useQueryState<AdminChartRange>('range', '1m');
const revenueRange = useQueryState<AdminRevenueRange>('revenue', 'all');
const { data: charts } = useAdminChartsQuery(chartRange);
const { data: revenue } = useAdminRevenueQuery(revenueRange);
const chartColors = useChartColors();

const SECTION_TITLE_CLASS =
  'text-xl font-medium uppercase leading-tight tracking-widest sm:text-2xl';
const CARD_LABEL_CLASS =
  'text-xs font-medium uppercase tracking-[1.2px] text-subtle';

const RANGE_ITEMS: { label: string; value: AdminChartRange }[] = [
  { label: '1W', value: '1w' },
  { label: '1M', value: '1m' },
  { label: '3M', value: '3m' },
  { label: '6M', value: '6m' },
  { label: '1Y', value: '1y' },
];

const REVENUE_ITEMS: { label: string; value: AdminRevenueRange }[] = [
  ...RANGE_ITEMS,
  { label: 'All', value: 'all' },
];

const REVENUE_LABELS: Record<AdminRevenueRange, string> = {
  '1w': 'Past week',
  '1m': 'Past month',
  '3m': 'Past 3\u00A0months',
  '6m': 'Past 6\u00A0months',
  '1y': 'Past year',
  all: 'All time',
};

const RANGE_LABELS: Record<AdminChartRange, string> = {
  '1w': 'week',
  '1m': 'month',
  '3m': '3\u00A0months',
  '6m': '6\u00A0months',
  '1y': 'year',
};

function money(amount: number) {
  return `${amount.toLocaleString()} MMK`;
}

/** Percent change, or the raw difference when there is nothing to compare with. */
function change(current: number, previous: number) {
  const diff = current - previous;
  if (diff === 0) return { delta: '0%', deltaTone: undefined };
  const sign = diff > 0 ? '+' : '';
  return {
    delta:
      previous > 0
        ? `${sign}${Math.round((diff / previous) * 100)}%`
        : `${sign}${diff.toLocaleString()}`,
    deltaTone: diff > 0 ? ('good' as const) : ('bad' as const),
  };
}

function cardsLink(subscription: string, billing?: string) {
  const query = new URLSearchParams({ subscription });
  if (billing) query.set('billing', billing);
  return `${ROUTES.THAKHIN.CARDS}?${query}`;
}

function bucketLabel(start: string, bucket: AdminChartBucket) {
  return new Intl.DateTimeFormat(
    'en-GB',
    bucket === 'month'
      ? { month: 'short', year: '2-digit', timeZone: 'UTC' }
      : { day: 'numeric', month: 'short', timeZone: 'UTC' }
  ).format(new Date(`${start}T00:00:00Z`));
}

const queueTiles = computed(() => {
  const queues = data.value?.queues;
  if (!queues) return [];
  return [
    {
      icon: 'i-material-symbols:assignment-outline-sharp',
      label: 'Design requests',
      value: queues.designRequests.count,
      to: `${ROUTES.THAKHIN.REQUESTS}?tab=design&status=pending`,
    },
    {
      icon: 'i-material-symbols:payments-outline-sharp',
      label: 'Payment reviews',
      value: queues.standalonePayments.count,
      to: `${ROUTES.THAKHIN.PAYMENTS}?link=standalone&status=submitted`,
    },
    {
      icon: 'i-lucide-hourglass',
      label: 'Invites expiring',
      value: queues.expiringInvitations.count,
      to: `${ROUTES.THAKHIN.INVITATIONS}?status=expiring`,
    },
  ];
});

const subscriptionTiles = computed(() => {
  const subscriptions = data.value?.subscriptions;
  if (!subscriptions) return [];
  return [
    {
      icon: 'i-lucide-badge-dollar-sign',
      label: 'Paid',
      value: subscriptions.paidLive,
      to: cardsLink('live', 'paid'),
    },
    {
      icon: 'i-lucide-gift',
      label: 'Free',
      value: subscriptions.freeLive,
      to: cardsLink('live', 'free'),
    },
    {
      icon: 'i-lucide-calendar-clock',
      label: 'Expiring soon',
      value: subscriptions.expiring,
      to: cardsLink('expiring'),
      attention: subscriptions.expiring > 0,
    },
    {
      icon: 'i-lucide-hourglass',
      label: 'Pending',
      value: subscriptions.pendingApproval,
      to: cardsLink('pending_approval'),
      attention: subscriptions.pendingApproval > 0,
    },
    {
      icon: 'i-lucide-calendar-x',
      label: 'Expired',
      value: subscriptions.expired,
      to: cardsLink('expired'),
    },
    {
      icon: 'i-lucide-calendar-off',
      label: 'No period',
      value: subscriptions.noEndDate,
      to: cardsLink('no_end'),
      attention: subscriptions.noEndDate > 0,
    },
  ];
});

const revenueTile = computed(() => {
  if (!revenue.value) return null;
  const previous = revenue.value.previous;
  return {
    icon: 'i-lucide-banknote',
    label: REVENUE_LABELS[revenue.value.range],
    value: money(revenue.value.total),
    ...(previous === null ? {} : change(revenue.value.total, previous)),
  };
});

const revenuePlans = computed(() => revenue.value?.byPlan ?? []);

const growthTiles = computed(() => {
  const month = data.value?.month;
  if (!month) return [];
  return [
    {
      icon: 'i-lucide-user-round-plus',
      label: 'New people',
      value: month.newUsers.current,
      ...change(month.newUsers.current, month.newUsers.previous),
    },
    {
      icon: 'i-lucide-credit-card',
      label: 'New cards',
      value: month.cardsCreated.current,
      ...change(month.cardsCreated.current, month.cardsCreated.previous),
    },
    {
      icon: 'i-lucide-send',
      label: 'Invites sent',
      value: month.invitationsSent.current,
      ...change(month.invitationsSent.current, month.invitationsSent.previous),
    },
    {
      icon: 'i-lucide-mail-check',
      label: 'Invites accepted',
      value: month.invitationsAccepted.current,
      ...change(
        month.invitationsAccepted.current,
        month.invitationsAccepted.previous
      ),
    },
  ];
});

const engagementTiles = computed(() => {
  const engagement = data.value?.engagement;
  if (!engagement) return [];
  const { current, previous, dailyActive } = engagement;
  return [
    {
      icon: 'i-lucide-activity',
      label: 'Active today',
      value: dailyActive.today,
      ...change(dailyActive.today, dailyActive.yesterday),
    },
    {
      icon: 'i-lucide-eye',
      label: 'Card views',
      value: current.views,
      ...change(current.views, previous.views),
    },
    {
      icon: 'i-lucide-link-2',
      label: 'Link clicks',
      value: current.linkClicks,
      ...change(current.linkClicks, previous.linkClicks),
    },
    {
      icon: 'i-lucide-share-2',
      label: 'Social clicks',
      value: current.socialClicks,
      ...change(current.socialClicks, previous.socialClicks),
    },
    {
      icon: 'i-lucide-download',
      label: 'Saves',
      value: current.saves,
      ...change(current.saves, previous.saves),
    },
    {
      icon: 'i-lucide-refresh-cw',
      label: 'Exchanges',
      value: current.contactExchanges,
      ...change(current.contactExchanges, previous.contactExchanges),
    },
  ];
});

const sizeTiles = computed(() => {
  const census = data.value?.census;
  if (!census) return [];
  return [
    {
      icon: 'i-material-symbols:group-outline-sharp',
      label: 'People',
      value: census.users.toLocaleString(),
      to: ROUTES.THAKHIN.USERS,
    },
    {
      icon: 'i-material-symbols:cards-stack-outline-sharp',
      label: 'Cards',
      value: census.cards.total.toLocaleString(),
      to: ROUTES.THAKHIN.CARDS,
    },
    {
      icon: 'i-material-symbols:corporate-fare-sharp',
      label: 'Organizations',
      value: census.organizations.total.toLocaleString(),
      to: ROUTES.THAKHIN.ORGANIZATIONS,
    },
    {
      icon: 'i-lucide-calendar-days',
      label: 'Events',
      value: census.events.toLocaleString(),
    },
  ];
});

const chartPoints = computed(() => charts.value?.points ?? []);
const chartLabels = computed(() =>
  chartPoints.value.map((point) =>
    bucketLabel(point.start, charts.value?.bucket ?? 'day')
  )
);
const trendsDescription = computed(() => {
  const bucket = charts.value?.bucket ?? 'day';
  return `Each ${bucket} over the past ${RANGE_LABELS[chartRange.value]}.`;
});

const revenueChart = computed(() => ({
  labels: chartLabels.value,
  datasets: [
    lineSeries(
      chartColors.value,
      chartPoints.value.map((point) => point.revenueMinor),
      { label: 'Approved revenue' }
    ),
  ],
}));

const activeChart = computed(() => ({
  labels: chartLabels.value,
  datasets: [
    lineSeries(
      chartColors.value,
      chartPoints.value.map((point) => point.activePeople),
      { label: 'Active people' }
    ),
  ],
}));

const analyticsChart = computed(() => ({
  labels: chartLabels.value,
  datasets: [
    lineSeries(
      chartColors.value,
      chartPoints.value.map((point) => point.views),
      { label: 'Views' }
    ),
    lineSeries(
      chartColors.value,
      chartPoints.value.map((point) => point.interactions),
      { label: 'Clicks and saves', color: chartColors.value.gold }
    ),
  ],
}));

const revenueChartOptions = computed(() =>
  lineChartOptions(chartColors.value, {
    y: wholeNumberYAxis(revenueChart.value.datasets[0]?.data ?? []),
    tooltipLabel: (value) => money(value),
  })
);
const activeChartOptions = computed(() =>
  lineChartOptions(chartColors.value, {
    y: wholeNumberYAxis(activeChart.value.datasets[0]?.data ?? []),
  })
);
const analyticsChartOptions = computed(() =>
  lineChartOptions(chartColors.value, {
    legend: true,
    y: wholeNumberYAxis(
      analyticsChart.value.datasets.flatMap((dataset) => dataset.data)
    ),
  })
);
</script>

<template>
  <div :class="ADMIN_PAGE_CLASS">
    <AdminPageHeader
      title="Dashboard"
      description-class="max-w-101"
      description="What needs a decision, how subscriptions and revenue are doing, and how this month compares with the&nbsp;last."
    />

    <div v-if="isLoading" class="flex flex-col gap-4">
      <USkeleton class="h-8 w-48 rounded-md" />
      <div class="grid grid-cols-2 gap-4 md:grid-cols-3">
        <USkeleton v-for="index in 3" :key="index" class="h-40 rounded-lg" />
      </div>
      <USkeleton class="h-80 w-full rounded-lg" />
    </div>

    <template v-else-if="data">
      <section class="flex flex-col gap-4">
        <div>
          <h2 :class="SECTION_TITLE_CLASS">Needs you</h2>
          <p class="mt-1 text-sm text-subtle">
            Work waiting on Thakhin&nbsp;staff.
          </p>
        </div>
        <div class="grid grid-cols-2 gap-4 md:grid-cols-3">
          <AdminStatTile
            v-for="tile in queueTiles"
            :key="tile.label"
            v-bind="tile"
            :attention="tile.value > 0"
          />
        </div>
      </section>

      <section class="flex flex-col gap-4">
        <div>
          <h2 :class="SECTION_TITLE_CLASS">Subscriptions</h2>
          <p class="mt-1 text-sm text-subtle">
            Personal and company cards. Community cards are not&nbsp;billed.
          </p>
        </div>
        <div class="grid grid-cols-2 gap-4 md:grid-cols-3 2xl:grid-cols-6">
          <AdminStatTile
            v-for="tile in subscriptionTiles"
            :key="tile.label"
            v-bind="tile"
          />
        </div>
      </section>

      <section class="flex flex-col gap-4">
        <div
          class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
        >
          <div>
            <h2 :class="SECTION_TITLE_CLASS">Revenue</h2>
            <p class="mt-1 text-sm text-subtle">
              Approved payments, counted when they were&nbsp;approved.
            </p>
          </div>
          <UTabs
            v-model="revenueRange"
            :items="REVENUE_ITEMS"
            :content="false"
            color="neutral"
            variant="pill"
            :ui="ADMIN_TABS_UI"
          />
        </div>
        <div class="grid gap-4 md:grid-cols-3">
          <AdminStatTile v-if="revenueTile" v-bind="revenueTile" />
          <div class="rounded-lg bg-surface p-4 sm:p-6 md:col-span-2">
            <p :class="CARD_LABEL_CLASS">By plan</p>
            <div v-if="revenuePlans.length" class="mt-4 flex flex-col gap-2">
              <div
                v-for="plan in revenuePlans"
                :key="plan.planCode"
                class="flex items-center justify-between gap-3 rounded-[4px] bg-raised px-3 py-2"
              >
                <div class="flex min-w-0 items-center gap-3">
                  <AdminStatusPill
                    :label="plan.planName"
                    :tone="planTone(plan.planCode)"
                  />
                  <span class="truncate text-sm text-subtle">
                    {{ plan.periods }}
                    {{ plan.periods === 1 ? 'period' : 'periods' }}
                  </span>
                </div>
                <span class="text-sm font-medium tabular-nums text-ink">
                  {{ money(plan.amountMinor) }}
                </span>
              </div>
            </div>
            <div
              v-else
              class="mt-4 flex min-h-24 items-center justify-center rounded-[4px] bg-raised text-sm text-subtle"
            >
              No approved payments.
            </div>
          </div>
        </div>
      </section>

      <section class="flex flex-col gap-4">
        <div>
          <h2 :class="SECTION_TITLE_CLASS">Growth</h2>
          <p class="mt-1 text-sm text-subtle">
            This month against last&nbsp;month.
          </p>
        </div>
        <div class="grid grid-cols-2 gap-4 md:grid-cols-4">
          <AdminStatTile
            v-for="tile in growthTiles"
            :key="tile.label"
            v-bind="tile"
          />
        </div>
      </section>

      <section class="flex flex-col gap-4">
        <div>
          <h2 :class="SECTION_TITLE_CLASS">Engagement</h2>
          <p class="mt-1 text-sm text-subtle">
            The last 30 days against the 30 days&nbsp;before.
          </p>
        </div>
        <div class="grid grid-cols-2 gap-4 md:grid-cols-3 2xl:grid-cols-6">
          <AdminStatTile
            v-for="tile in engagementTiles"
            :key="tile.label"
            v-bind="tile"
          />
        </div>
      </section>

      <section class="flex flex-col gap-4">
        <div
          class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
        >
          <div>
            <h2 :class="SECTION_TITLE_CLASS">Trends</h2>
            <p class="mt-1 text-sm text-subtle">{{ trendsDescription }}</p>
          </div>
          <UTabs
            v-model="chartRange"
            :items="RANGE_ITEMS"
            :content="false"
            color="neutral"
            variant="pill"
            :ui="ADMIN_TABS_UI"
          />
        </div>
        <div class="rounded-lg bg-surface p-4 sm:p-6">
          <p :class="CARD_LABEL_CLASS">Approved revenue</p>
          <div class="mt-4 h-60">
            <Line :data="revenueChart" :options="revenueChartOptions" />
          </div>
        </div>
        <div class="grid gap-4 lg:grid-cols-2">
          <div class="rounded-lg bg-surface p-4 sm:p-6">
            <p :class="CARD_LABEL_CLASS">Active people</p>
            <div class="mt-4 h-60">
              <Line :data="activeChart" :options="activeChartOptions" />
            </div>
          </div>
          <div class="rounded-lg bg-surface p-4 sm:p-6">
            <p :class="CARD_LABEL_CLASS">Card activity</p>
            <div class="mt-4 h-60">
              <Line :data="analyticsChart" :options="analyticsChartOptions" />
            </div>
          </div>
        </div>
      </section>

      <section class="flex flex-col gap-4">
        <div>
          <h2 :class="SECTION_TITLE_CLASS">Platform size</h2>
          <p class="mt-1 text-sm text-subtle">Everything stored&nbsp;today.</p>
        </div>
        <div class="grid grid-cols-2 gap-4 md:grid-cols-4">
          <AdminStatTile
            v-for="tile in sizeTiles"
            :key="tile.label"
            v-bind="tile"
          />
        </div>
      </section>
    </template>
  </div>
</template>
