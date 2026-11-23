<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui';
import { Line } from 'vue-chartjs';
import {
  Chart as ChartJS,
  CategoryScale,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from 'chart.js';
import { format, parseISO } from 'date-fns';
import { lineChartOptions, lineSeries } from '~/utils/line-chart';
import {
  ANALYTICS_PERIOD_OPTIONS,
  analyticsPeriodDays,
  type AnalyticsPeriod,
} from '~~/shared/utils/analytics-period';

ChartJS.register(
  Title,
  Tooltip,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  CategoryScale
);

type DayCount = { date: string; count: number };

type MemberRow = {
  id: string;
  name: string;
  departmentName: string | null;
  views: number;
  contacts: number;
};

const props = defineProps<{
  views: number;
  clicks: number;
  contacts: number;
  dailyViews: DayCount[];
  dailyContacts: DayCount[];
  members: MemberRow[];
  departments: { id: string; name: string }[];
}>();

const period = defineModel<AnalyticsPeriod>('period', { required: true });
const departmentId = defineModel<string>('departmentId', { required: true });
const isInfoOpen = ref(false);

function openInfo() {
  isInfoOpen.value = true;
}

const conversion = computed(() =>
  props.views ? Math.round((props.contacts / props.views) * 100) : 0
);

const metrics = computed(() => [
  { label: 'Views', value: props.views.toLocaleString(), icon: 'i-lucide-eye' },
  {
    label: 'Contacts',
    value: props.contacts.toLocaleString(),
    icon: 'i-lucide-user-plus',
  },
  {
    label: 'Conversion',
    value: `${conversion.value}%`,
    icon: 'i-lucide-percent',
  },
  {
    label: 'Link clicks',
    value: props.clicks.toLocaleString(),
    icon: 'i-lucide-share-2',
  },
]);

const chartColors = useChartColors();
const viewCounts = computed(() => props.dailyViews.map((day) => day.count));
const contactCounts = computed(() =>
  props.dailyContacts.map((day) => day.count)
);

const chartData = computed(() => ({
  labels: props.dailyViews.map((day) => format(parseISO(day.date), 'MMM d')),
  datasets: [
    lineSeries(chartColors.value, viewCounts.value, { label: 'Views' }),
    lineSeries(chartColors.value, contactCounts.value, {
      label: 'Contacts',
      color: chartColors.value.gold,
    }),
  ],
}));

const chartOptions = computed(() =>
  lineChartOptions(chartColors.value, {
    y: wholeNumberYAxis([...viewCounts.value, ...contactCounts.value]),
    legend: true,
  })
);

const departmentItems = computed(() => [
  { label: 'All departments', value: 'all' },
  ...props.departments.map((item) => ({ label: item.name, value: item.id })),
]);

function rate(row: MemberRow) {
  if (!row.views) return '—';
  return `${Math.round((row.contacts / row.views) * 100)}%`;
}

const columns: TableColumn<MemberRow>[] = [
  { accessorKey: 'name', header: 'MEMBER' },
  { accessorKey: 'departmentName', header: 'DEPARTMENT' },
  { accessorKey: 'views', header: 'VIEWS' },
  { accessorKey: 'contacts', header: 'CONTACTS' },
  { id: 'rate', header: 'CONVERSION' },
];

const selectUi = {
  base: 'h-10 rounded-lg border-none bg-surface px-4 text-ink shadow-lg sm:shadow-none',
  content: 'bg-surface border border-line',
  item: 'text-ink data-[highlighted]:bg-raised',
  value: 'text-ink',
};
</script>

<template>
  <div class="space-y-4 pb-20 sm:pb-0">
    <div
      class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <div class="flex items-center gap-2">
        <h1
          class="text-xl font-medium leading-tight tracking-widest uppercase sm:text-2xl"
        >
          Company insights
        </h1>
        <UTooltip text="What is company insights?">
          <UButton
            size="lg"
            icon="i-material-symbols:info-outline"
            color="neutral"
            variant="ghost"
            class="flex cursor-pointer items-center justify-center rounded-full p-0 text-muted hover:bg-raised"
            aria-label="What is company insights?"
            @click="openInfo"
          />
        </UTooltip>
      </div>

      <div
        class="fixed inset-x-4 bottom-6 z-10 flex items-center gap-2 sm:static"
      >
        <USelectMenu
          v-model="departmentId"
          value-key="value"
          :items="departmentItems"
          :search-input="false"
          class="min-w-0 flex-1 sm:w-48 sm:flex-none"
          :ui="selectUi"
        />
        <USelectMenu
          v-model="period"
          value-key="value"
          :items="ANALYTICS_PERIOD_OPTIONS"
          :search-input="false"
          class="min-w-0 flex-1 sm:w-40 sm:flex-none"
          :ui="selectUi"
        />
      </div>
    </div>

    <div class="grid grid-cols-2 gap-4 md:grid-cols-4">
      <div
        v-for="metric in metrics"
        :key="metric.label"
        class="rounded-lg bg-surface p-4 sm:p-6"
      >
        <div
          class="mb-4 grid size-8 place-items-center rounded-[4px] bg-raised sm:size-11"
        >
          <UIcon :name="metric.icon" class="size-5 text-ink/70" />
        </div>
        <p
          class="mb-4 -mt-1 text-xs font-medium tracking-[1.2px] text-subtle uppercase"
        >
          {{ metric.label }}
        </p>
        <p class="mt-1 -mb-1 text-3xl leading-[1.1] font-bold text-ink">
          {{ metric.value }}
        </p>
      </div>
    </div>

    <div class="rounded-lg bg-surface p-4 sm:p-6">
      <h2
        class="text-xl leading-tight font-medium tracking-widest uppercase sm:text-2xl"
      >
        Views and contacts
      </h2>
      <p class="mt-1 text-sm text-subtle">
        Daily card opens and new contacts for the past
        {{ analyticsPeriodDays(period) }}&nbsp;days
      </p>
      <div class="mt-4 h-60">
        <Line :data="chartData" :options="chartOptions as any" />
      </div>
    </div>

    <div class="rounded-lg bg-surface p-4 sm:p-6">
      <h2
        class="mb-6 text-xl leading-tight font-medium tracking-widest uppercase sm:text-2xl"
      >
        By holder
      </h2>
      <div class="overflow-x-auto">
        <UTable
          :data="members"
          :columns="columns"
          :ui="{
            th: 'px-6 py-5 border-b border-raised text-xs font-semibold tracking-wide uppercase text-ink',
            tbody: '[&>tr:last-child>td]:border-b-0 [&>tr:last-child>td]:pb-0',
            td: 'px-6 py-5 border-b border-raised text-sm',
            tr: 'bg-transparent',
            empty: 'py-12 text-center text-sm text-muted',
          }"
          class="w-full min-w-225"
        >
          <template #name-cell="{ row }">
            <span class="font-medium text-ink">{{ row.original.name }}</span>
          </template>
          <template #departmentName-cell="{ row }">
            <span class="text-subtle">{{
              row.original.departmentName || '—'
            }}</span>
          </template>
          <template #views-cell="{ row }">
            <span class="text-subtle">{{
              row.original.views.toLocaleString()
            }}</span>
          </template>
          <template #contacts-cell="{ row }">
            <span class="font-medium text-ink">{{
              row.original.contacts.toLocaleString()
            }}</span>
          </template>
          <template #rate-cell="{ row }">
            <span class="text-subtle">{{ rate(row.original) }}</span>
          </template>
        </UTable>
      </div>
    </div>
  </div>

  <UModal
    v-model:open="isInfoOpen"
    title="What is company insights?"
    :ui="{
      content: 'sm:max-w-[480px] rounded-lg bg-surface',
      title: 'text-sm font-medium uppercase tracking-widest text-ink',
      body: 'px-5 py-4 sm:px-6 sm:py-5',
    }"
  >
    <template #body>
      <div class="space-y-2">
        <h3
          class="text-lg leading-tight font-medium tracking-widest text-ink uppercase sm:text-xl"
        >
          See how the company cards are used
        </h3>
        <p class="text-sm leading-relaxed text-subtle">
          Views are card opens. Contacts are people who exchanged details.
          Conversion is contacts divided by views. Former holders stay in the
          list with the activity from their time on&nbsp;the&nbsp;card.
        </p>
      </div>
    </template>
  </UModal>
</template>
