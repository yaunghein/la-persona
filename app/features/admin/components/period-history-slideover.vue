<script setup lang="ts">
import { useQuery, useQueryClient } from '@tanstack/vue-query';
import type { CardPeriod } from '~~/shared/contracts/billing';
import {
  ADMIN_SLIDEOVER_BUTTON_CLASS,
  ADMIN_SLIDEOVER_UI,
  reviewStatusPill,
} from '~/features/admin/utils/admin-ui';

const open = defineModel<boolean>('open', { required: true });

const props = defineProps<{
  cardId?: string | null;
  userId?: string | null;
}>();

const toast = useToast();
const invalidateAdmin = useInvalidateAdmin();
const queryClient = useQueryClient();

const { data, isLoading } = useQuery({
  queryKey: computed(() => [
    'admin',
    'periods',
    props.cardId ?? null,
    props.userId ?? null,
  ]),
  queryFn: () =>
    props.cardId
      ? adminApi.listCardPeriods(props.cardId)
      : adminApi.listUserPeriods(props.userId || ''),
  enabled: () => open.value && Boolean(props.cardId || props.userId),
  select: (collection) => collection.items,
});

const drafts = ref<Record<string, number>>({});
const rows = computed(() =>
  (data.value ?? []).filter((row) => drafts.value[row.id] !== undefined)
);
const savingId = ref<string | null>(null);

const formFieldClass =
  '[&_label]:mb-3 [&_label]:text-sm [&_label]:font-medium [&_label]:text-ink';

const inputUi = {
  base: 'h-[47px] rounded-[4px] border-line bg-raised text-sm text-ink placeholder:text-ink/50',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB');
}

function periodPill(row: CardPeriod) {
  if (row.status === 'approved' || row.status === 'trial') {
    return row.amountMinor > 0
      ? { label: 'Paid', tone: 'gold' as const }
      : { label: 'Free', tone: 'neutral' as const };
  }
  return reviewStatusPill(row.status);
}

watch(
  data,
  (periods) => {
    const next: Record<string, number> = {};
    for (const period of periods ?? []) next[period.id] = period.amountMinor;
    drafts.value = next;
  },
  { immediate: true }
);

async function save(row: CardPeriod) {
  const amountMinor = drafts.value[row.id];
  if (amountMinor === undefined) return;
  savingId.value = row.id;
  try {
    await adminApi.updatePaymentItem(row.id, { amountMinor });
    await Promise.all([
      invalidateAdmin(),
      queryClient.invalidateQueries({ queryKey: ['admin', 'periods'] }),
      queryClient.invalidateQueries({ queryKey: ['billing'] }),
    ]);
    toast.add({ title: 'Period updated', color: 'success' });
  } catch (error: any) {
    toast.add({
      title: 'Could not update the period',
      description:
        error?.data?.statusMessage ||
        error?.statusMessage ||
        'Please try again.',
      color: 'error',
    });
  } finally {
    savingId.value = null;
  }
}
</script>

<template>
  <USlideover
    v-model:open="open"
    title="Payment history"
    side="right"
    inset
    :ui="ADMIN_SLIDEOVER_UI"
  >
    <template #body>
      <p v-if="isLoading" class="text-sm text-subtle">Loading history…</p>
      <p v-else-if="!data?.length" class="text-sm text-subtle">
        No periods yet.
      </p>
      <div v-else class="flex flex-col gap-6">
        <form
          v-for="row in rows"
          :key="row.id"
          class="flex flex-col gap-4 border-b-2 border-raised pb-6 last:border-b-0"
          @submit.prevent="save(row)"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="truncate text-sm font-medium text-ink">
                {{ row.cardName }}
              </p>
              <p class="mt-1 text-sm text-subtle">
                {{ row.planName || row.planCode }}
              </p>
            </div>
            <AdminStatusPill v-bind="periodPill(row)" />
          </div>
          <UFormField label="Amount" :class="formFieldClass">
            <UInput
              v-model.number="drafts[row.id]"
              type="number"
              min="0"
              class="w-full"
              size="xl"
              :ui="inputUi"
            />
          </UFormField>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <p class="mb-3 text-sm font-medium text-ink">Start</p>
              <p class="text-sm text-subtle">{{ formatDate(row.startAt) }}</p>
            </div>
            <div>
              <p class="mb-3 text-sm font-medium text-ink">End</p>
              <p class="text-sm text-subtle">{{ formatDate(row.endAt) }}</p>
            </div>
          </div>
          <UButton
            label="Save period"
            type="submit"
            color="neutral"
            :loading="savingId === row.id"
            :class="['self-start', ADMIN_SLIDEOVER_BUTTON_CLASS]"
          />
        </form>
      </div>
    </template>
  </USlideover>
</template>
