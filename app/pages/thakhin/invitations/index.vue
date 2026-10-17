<script setup lang="ts">
definePageMeta({
  layout: 'thakhin',
});

import type { DropdownMenuItem, TableColumn } from '@nuxt/ui';
import {
  ADMIN_ACTIONS_COLUMN,
  ADMIN_TABLE_UI,
  sortableHeader,
} from '~/features/admin/utils/admin-table';
import type { OnboardingInvitationSummary } from '~~/shared/contracts/onboarding';

type InvitationRow = OnboardingInvitationSummary;

const toast = useToast();
const invalidateAdmin = useInvalidateAdmin();
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

const { data: invitationsData, isLoading: pending } =
  useOnboardingInvitationsQuery();
// Only cards not yet linked to an account can be handed out.
const { data: unclaimedCards } = useAdminCardsQuery({ claimed: false });
const { data: plans } = useSubscriptionPlansQuery();

const rows = computed(() => invitationsData.value || []);
const statusFilter = ref<'all' | 'pending' | 'accepted' | 'cancelled'>(
  'pending'
);

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
} = useAdminTable(() => filteredRows.value.length, {
  defaultSort: [{ id: 'expiresAt', desc: true }],
});

watch(statusFilter, resetPage);
const cardItems = computed(() =>
  (unclaimedCards.value ?? []).map((card) => {
    const label = `${card.firstName} ${card.lastName || ''}`.trim();
    return {
      label: card.position ? `${label} - ${card.position}` : label,
      value: card.id,
    };
  })
);
const planItems = computed(() =>
  (plans.value ?? [])
    .filter((plan) => plan.isActive)
    .map((plan) => ({ label: plan.name, value: plan.code }))
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

function openCreate() {
  isCreateOpen.value = true;
}

async function onCreateInvitation() {
  isCreating.value = true;
  try {
    await adminApi.createOnboardingInvitation({ ...createState });
    await invalidateAdmin();
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
      description: apiErrorMessage(error),
      color: 'error',
    });
  } finally {
    isCreating.value = false;
  }
}

async function onSendInvitation(row: InvitationRow) {
  isSendingById.value = { ...isSendingById.value, [row.id]: true };
  try {
    await adminApi.sendOnboardingInvitation(row.id);
    await invalidateAdmin();
    toast.add({
      title: row.resendCount > 0 ? 'Invitation resent' : 'Invitation sent',
      description: `Email sent to ${row.email}.`,
      color: 'success',
    });
  } catch (error: any) {
    toast.add({
      title: 'Send failed',
      description: apiErrorMessage(error),
      color: 'error',
    });
  } finally {
    isSendingById.value = { ...isSendingById.value, [row.id]: false };
  }
}

async function onCancelInvitation(row: InvitationRow) {
  try {
    await adminApi.cancelOnboardingInvitation(row.id);
    await invalidateAdmin();
    toast.add({
      title: 'Invitation cancelled',
      description:
        'The card was returned and the temporary organization was removed.',
      color: 'success',
    });
  } catch (error: any) {
    toast.add({
      title: 'Cancel failed',
      description: error?.data?.statusMessage || 'Please try again.',
      color: 'error',
    });
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
      {
        label: 'Cancel',
        icon: 'i-lucide-x',
        color: 'error',
        disabled: row.status !== 'pending',
        onSelect: () => onCancelInvitation(row),
      },
    ],
  ];
}

const columns: TableColumn<InvitationRow>[] = [
  { accessorKey: 'email', header: sortableHeader('EMAIL') },
  {
    accessorKey: 'organizationName',
    header: sortableHeader('ORGANIZATION'),
  },
  {
    id: 'cardName',
    header: sortableHeader('CARD'),
    accessorFn: (row) =>
      `${row.cardFirstName} ${row.cardLastName || ''}`.trim(),
  },
  { accessorKey: 'planName', header: sortableHeader('PLAN') },
  { accessorKey: 'freeMonths', header: sortableHeader('FREE MONTHS') },
  { accessorKey: 'expiresAt', header: sortableHeader('EXPIRES AT') },
  { accessorKey: 'status', header: sortableHeader('STATUS') },
  { accessorKey: 'lastSentAt', header: sortableHeader('LAST SENT') },
  ADMIN_ACTIONS_COLUMN,
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
  <div class="flex flex-col gap-6">
    <AdminPageHeader
      title="Invitations"
      description="Create, send, and cancel card onboarding invitations. Cancelling a pending invite returns the card and removes the empty organization."
    >
      <UButton
        size="sm"
        label="Create"
        icon="i-lucide-plus"
        color="neutral"
        variant="outline"
        @click="openCreate"
      />
    </AdminPageHeader>

    <AdminTableFrame
      :page="pagination.pageIndex + 1"
      :total="paginationTotal"
      :items-per-page="pagination.pageSize"
      @update:page="onPageChange"
    >
      <template #toolbar>
        <UInput
          v-model="globalFilter"
          icon="i-lucide-search"
          placeholder="Search email, org, or card"
          class="w-64"
          size="sm"
        />
        <USelect
          v-model="statusFilter"
          :items="statusFilterItems"
          class="w-40"
          size="sm"
        />
      </template>

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
        :ui="ADMIN_TABLE_UI"
        class="w-full min-w-[56rem]"
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
          <span class="text-white/55">{{
            formatDate(row.original.expiresAt)
          }}</span>
        </template>
        <template #lastSentAt-cell="{ row }">
          <span class="text-white/55">{{
            formatDate(row.original.lastSentAt)
          }}</span>
        </template>
        <template #status-cell="{ row }">
          <UBadge :color="getStatusColor(row.original.status)" variant="subtle">
            {{ row.original.status }}
          </UBadge>
        </template>
        <template #actions-cell="{ row }">
          <AdminRowMenu :items="getActionItems(row.original)" />
        </template>
      </UTable>
    </AdminTableFrame>

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
              label="Cancel"
              color="neutral"
              variant="ghost"
              class="h-10 text-sm rounded-full px-5 text-white hover:bg-[#232323]"
              @click="
                () => {
                  isCreateOpen = false;
                }
              "
            />
            <UButton
              label="Create Invitation"
              color="neutral"
              :loading="isCreating"
              class="h-10 text-sm rounded-full bg-white px-6 font-medium text-dark hover:bg-white/90"
              @click="onCreateInvitation"
            />
          </div>
        </div>
      </template>
    </USlideover>
  </div>
</template>
