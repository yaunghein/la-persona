<script setup lang="ts">
definePageMeta({
  layout: 'thakhin',
});

import type { DropdownMenuItem, TableColumn } from '@nuxt/ui';
import { useQuery, useQueryClient } from '@tanstack/vue-query';
import { useThakhinTable } from '~/composables/thakhin-table';
import {
  THAKHIN_ACTIONS_COLUMN,
  THAKHIN_TABLE_UI,
  thakhinSortableHeader,
} from '~/utils/thakhin-table';

type InvitationRow = {
  id: string;
  email: string;
  status: string;
  freeMonths: number;
  expirationMinutes: number;
  expiresAt: string;
  acceptedAt: string | null;
  resendCount: number;
  lastSentAt: string | null;
  createdAt: string;
  organizationName: string;
  cardFirstName: string;
  cardLastName: string | null;
  planName: string;
  link: string;
};

type OptionsResponse = {
  cards: { id: string; label: string; subtitle: string }[];
  plans: { code: string; name: string }[];
};

const toast = useToast();
const queryClient = useQueryClient();
const isCreateOpen = ref(false);
const isCreating = ref(false);
const isSendingById = ref<Record<string, boolean>>({});

const createState = reactive({
  email: '',
  organizationName: '',
  cardId: '',
  subscriptionPlanCode: '',
  freeMonths: 6,
  expirationMinutes: 60,
  sendNow: false,
});

const { data: invitationsData, isLoading: pending } = useQuery({
  queryKey: QUERY_KEYS.invitations,
  queryFn: () => $fetch<InvitationRow[]>('/api/onboarding-invitation'),
});
const { data: optionsData } = useQuery({
  queryKey: QUERY_KEYS.invitationOptions,
  queryFn: () => $fetch<OptionsResponse>('/api/onboarding-invitation/options'),
});

const rows = computed(() => invitationsData.value || []);
const statusFilter = ref<'all' | 'pending' | 'accepted' | 'cancelled'>('all');

const statusFilterItems = [
  { label: 'All statuses', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Accepted', value: 'accepted' },
  { label: 'Cancelled', value: 'cancelled' },
];

const filteredRows = computed(() => {
  if (statusFilter.value === 'all') return rows.value;
  return rows.value.filter((row) => row.status === statusFilter.value);
});

const {
  globalFilter,
  sorting,
  pagination,
  paginationOptions,
  paginationTotal,
  resetPage,
  onPageChange,
} = useThakhinTable(() => filteredRows.value.length, {
  defaultSort: [{ id: 'expiresAt', desc: true }],
});

watch(statusFilter, resetPage);
const cardItems = computed(() =>
  (optionsData.value?.cards || []).map((item) => ({
    label: item.subtitle ? `${item.label} - ${item.subtitle}` : item.label,
    value: item.id,
  }))
);
const planItems = computed(() =>
  (optionsData.value?.plans || []).map((item) => ({
    label: item.name,
    value: item.code,
  }))
);

function formatDate(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

function getStatusColor(status: string) {
  if (status === 'accepted') return 'success';
  if (status === 'cancelled') return 'neutral';
  return 'warning';
}

async function onCreateInvitation() {
  isCreating.value = true;
  try {
    await $fetch('/api/onboarding-invitation', {
      method: 'POST',
      body: createState,
    });
    await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.invitations });
    isCreateOpen.value = false;
    createState.email = '';
    createState.organizationName = '';
    createState.cardId = '';
    createState.subscriptionPlanCode = '';
    createState.freeMonths = 6;
    createState.expirationMinutes = 60;
    createState.sendNow = false;
    toast.add({
      title: 'Invitation created',
      description: 'A new onboarding invitation has been created.',
      color: 'success',
    });
  } catch (error: any) {
    toast.add({
      title: 'Create failed',
      description:
        error?.data?.statusMessage ||
        error?.statusMessage ||
        'Please try again.',
      color: 'error',
    });
  } finally {
    isCreating.value = false;
  }
}

async function onSendInvitation(row: InvitationRow) {
  isSendingById.value = { ...isSendingById.value, [row.id]: true };
  try {
    await $fetch(`/api/onboarding-invitation/${row.id}/send`, {
      method: 'POST',
    });
    await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.invitations });
    toast.add({
      title: row.resendCount > 0 ? 'Invitation resent' : 'Invitation sent',
      description: `Email sent to ${row.email}.`,
      color: 'success',
    });
  } catch (error: any) {
    toast.add({
      title: 'Send failed',
      description:
        error?.data?.statusMessage ||
        error?.statusMessage ||
        'Please try again.',
      color: 'error',
    });
  } finally {
    isSendingById.value = { ...isSendingById.value, [row.id]: false };
  }
}

async function onCopyLink(link: string) {
  try {
    await navigator.clipboard.writeText(link);
    toast.add({
      title: 'Link copied',
      color: 'success',
    });
  } catch {
    toast.add({
      title: 'Copy failed',
      color: 'error',
    });
  }
}

function getActionItems(row: InvitationRow): DropdownMenuItem[][] {
  return [
    [
      {
        label: row.resendCount > 0 ? 'Resend Email' : 'Send Email',
        icon: 'i-lucide-send',
        onSelect: () => onSendInvitation(row),
      },
      {
        label: 'Copy Link',
        icon: 'i-lucide-copy',
        onSelect: () => onCopyLink(row.link),
      },
    ],
  ];
}

const columns: TableColumn<InvitationRow>[] = [
  { accessorKey: 'email', header: thakhinSortableHeader('EMAIL') },
  {
    accessorKey: 'organizationName',
    header: thakhinSortableHeader('ORGANIZATION'),
  },
  {
    id: 'cardName',
    header: thakhinSortableHeader('CARD'),
    accessorFn: (row) =>
      `${row.cardFirstName} ${row.cardLastName || ''}`.trim(),
  },
  { accessorKey: 'planName', header: thakhinSortableHeader('PLAN') },
  { accessorKey: 'freeMonths', header: thakhinSortableHeader('FREE MONTHS') },
  { accessorKey: 'expiresAt', header: thakhinSortableHeader('EXPIRES AT') },
  { accessorKey: 'status', header: thakhinSortableHeader('STATUS') },
  { accessorKey: 'lastSentAt', header: thakhinSortableHeader('LAST SENT') },
  THAKHIN_ACTIONS_COLUMN,
];

/** Matches thakhin cards slideover + `app/components/form/manual-contact.vue` */
const formFieldClass =
  '[&_label]:mb-3 [&_label]:text-sm [&_label]:font-medium [&_label]:text-white';

const inputUi = {
  base: 'h-[47px] rounded-[4px] border-[#2a2a2a] bg-[#232323] text-sm text-white placeholder:text-white/50',
};

const selectUi = {
  base: 'h-[47px] w-full rounded-[4px] border-[#2a2a2a] bg-[#232323] px-3 text-sm text-white',
  content: 'border border-[#2a2a2a] bg-[#232323]',
  item: 'text-white data-[highlighted]:bg-[#232323]',
  value: 'text-white',
};
</script>

<template>
  <div class="flex min-h-[calc(100dvh-11rem)] flex-col gap-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1
        class="text-[1.75rem] font-normal leading-tight tracking-widest uppercase"
      >
        Onboarding Invitations
      </h1>
      <div class="flex flex-wrap items-center gap-2">
        <UInput
          v-model="globalFilter"
          icon="i-lucide-search"
          placeholder="Search email, org, or card"
          class="w-64"
          size="xl"
        />
        <USelect
          v-model="statusFilter"
          :items="statusFilterItems"
          class="w-44"
          size="xl"
        />
        <UButton
          size="xl"
          label="Create Invitation"
          icon="i-lucide-plus"
          color="neutral"
          class="rounded-full"
          @click="() => { isCreateOpen = true }"
        />
      </div>
    </div>

    <div class="hide-scrollbar flex-1 overflow-x-auto overflow-y-hidden">
      <UTable
        ref="table"
        v-model:global-filter="globalFilter"
        v-model:sorting="sorting"
        v-model:pagination="pagination"
        :data="filteredRows"
        :columns="columns"
        :loading="pending"
        :pagination-options="paginationOptions"
        :get-row-id="(row) => row.id"
        :ui="THAKHIN_TABLE_UI"
        class="w-full min-w-287.5"
      >
        <template #email-cell="{ row }">
          <span class="font-medium text-white">{{ row.original.email }}</span>
        </template>
        <template #cardName-cell="{ row }">
          {{
            `${row.original.cardFirstName} ${row.original.cardLastName || ''}`.trim()
          }}
        </template>
        <template #expiresAt-cell="{ row }">
          {{ formatDate(row.original.expiresAt) }}
        </template>
        <template #lastSentAt-cell="{ row }">
          {{ formatDate(row.original.lastSentAt) }}
        </template>
        <template #status-cell="{ row }">
          <UBadge
            :color="getStatusColor(row.original.status)"
            variant="soft"
            class="uppercase"
          >
            {{ row.original.status }}
          </UBadge>
        </template>
        <template #actions-cell="{ row }">
          <UDropdownMenu :items="getActionItems(row.original)">
            <UButton
              size="xl"
              icon="i-mdi-dots-vertical"
              color="neutral"
              variant="ghost"
              class="text-muted"
              :loading="isSendingById[row.original.id]"
            />
          </UDropdownMenu>
        </template>
      </UTable>
    </div>

    <div class="mt-auto flex items-center justify-end pt-4">
      <UPagination
        :page="pagination.pageIndex + 1"
        :total="paginationTotal"
        :items-per-page="pagination.pageSize"
        @update:page="onPageChange"
        show-controls
        show-edges
        color="neutral"
        variant="outline"
      />
    </div>

    <USlideover
      v-model:open="isCreateOpen"
      side="right"
      inset
      title="CREATE ONBOARDING INVITATION"
      :ui="{
        header: 'border-b-2 border-[#232323] px-6 py-6',
        title: 'text-sm font-medium tracking-[1.4px] text-white uppercase',
        body: 'px-6',
      }"
    >
      <template #body>
        <div class="py-2">
          <div class="flex flex-col gap-4">
            <UFormField label="Invitee Email" :class="formFieldClass">
              <UInput
                v-model="createState.email"
                type="email"
                placeholder="name@email.com"
                class="w-full"
                size="xl"
                :ui="inputUi"
              />
            </UFormField>
            <UFormField
              label="Organization Name"
              required
              :class="formFieldClass"
            >
              <UInput
                v-model="createState.organizationName"
                placeholder="Organization name"
                class="w-full"
                size="xl"
                :ui="inputUi"
              />
            </UFormField>
            <UFormField label="Card" required :class="formFieldClass">
              <USelect
                v-model="createState.cardId"
                :items="cardItems"
                placeholder="Select card"
                class="w-full"
                size="xl"
                :ui="selectUi"
              />
            </UFormField>
            <UFormField
              label="Subscription Plan"
              required
              :class="formFieldClass"
            >
              <USelect
                v-model="createState.subscriptionPlanCode"
                :items="planItems"
                placeholder="Select plan"
                class="w-full"
                size="xl"
                :ui="selectUi"
              />
            </UFormField>
            <UFormField label="Free Months" required :class="formFieldClass">
              <UInput
                v-model.number="createState.freeMonths"
                type="number"
                min="0"
                class="w-full"
                size="xl"
                :ui="inputUi"
              />
            </UFormField>
            <UFormField
              label="Expiration (minutes)"
              required
              :class="formFieldClass"
            >
              <UInput
                v-model.number="createState.expirationMinutes"
                type="number"
                min="1"
                class="w-full"
                size="xl"
                :ui="inputUi"
              />
            </UFormField>
            <div class="pt-1">
              <UCheckbox
                v-model="createState.sendNow"
                label="Send invitation email now"
                :ui="{
                  label: 'text-sm font-medium text-white',
                }"
              />
            </div>
          </div>

          <div
            class="mt-6 flex justify-end gap-2 border-t border-[#232323] pt-6"
          >
            <UButton
              size="xl"
              label="Cancel"
              color="neutral"
              variant="ghost"
              class="rounded-full px-5 text-white hover:bg-[#232323]"
              @click="() => { isCreateOpen = false }"
            />
            <UButton
              size="xl"
              label="Create Invitation"
              color="neutral"
              :loading="isCreating"
              class="rounded-full bg-white px-6 font-medium text-dark hover:bg-white/90"
              @click="onCreateInvitation"
            />
          </div>
        </div>
      </template>
    </USlideover>
  </div>
</template>
