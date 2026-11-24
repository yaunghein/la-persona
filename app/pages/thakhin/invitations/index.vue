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
import {
  ADMIN_FILTER_UI,
  ADMIN_GHOST_BUTTON_CLASS,
  ADMIN_PAGE_CLASS,
  ADMIN_PRIMARY_BUTTON_CLASS,
  ADMIN_SEARCH_UI,
  ADMIN_SLIDEOVER_BUTTON_CLASS,
  ADMIN_SLIDEOVER_UI,
} from '~/features/admin/utils/admin-ui';
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
  amountMinor: 0,
  freeMonths: 6,
  expirationMinutes: 60 * 24,
  sendNow: false,
});

const { data: invitationsData, isLoading: pending } =
  useOnboardingInvitationsQuery();
// Only cards not yet linked to an account can be handed out.
const { data: unclaimedCards } = useAdminCardsQuery({ claimed: false });
const { data: plans } = useSubscriptionPlansQuery();

const rows = computed(() => invitationsData.value || []);
const statusFilter = useQueryState<
  'all' | 'pending' | 'expiring' | 'accepted' | 'cancelled' | 'expired'
>('status', 'pending');

const statusFilterItems = [
  { label: 'All statuses', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Expiring in 48 hours', value: 'expiring' },
  { label: 'Accepted', value: 'accepted' },
  { label: 'Cancelled', value: 'cancelled' },
  { label: 'Expired', value: 'expired' },
];

function displayStatus(row: InvitationRow) {
  if (
    row.status === 'pending' &&
    new Date(row.expiresAt).getTime() <= Date.now()
  ) {
    return 'expired';
  }
  return row.status;
}

/** Same window as the dashboard's "Invites expiring" count. */
const EXPIRING_WINDOW_MS = 48 * 60 * 60 * 1000;

const filteredRows = computed(() => {
  if (statusFilter.value === 'all') return rows.value;
  if (statusFilter.value === 'expiring') {
    const expiringBefore = Date.now() + EXPIRING_WINDOW_MS;
    return rows.value.filter(
      (row) =>
        displayStatus(row) === 'pending' &&
        new Date(row.expiresAt).getTime() < expiringBefore
    );
  }
  return rows.value.filter((row) => displayStatus(row) === statusFilter.value);
});

const {
  globalFilter,
  sorting,
  pagination,
  paginationOptions,
  paginationTotal,
  resetPage,
  onPageChange,
} = useAdminTable(() => filteredRows.value.length);

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

watch(
  () => createState.subscriptionPlanCode,
  (code) => {
    const plan = plans.value?.find((item) => item.code === code);
    createState.amountMinor = plan?.priceMinor ?? 0;
  }
);

function formatAmount(amountMinor: number, currency: string) {
  return `${amountMinor.toLocaleString()} ${currency}`;
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
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
    createState.amountMinor = 0;
    createState.freeMonths = 6;
    createState.expirationMinutes = 60 * 24;
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
  { accessorKey: 'amountMinor', header: sortableHeader('AMOUNT') },
  { accessorKey: 'freeMonths', header: sortableHeader('FREE MONTHS') },
  { accessorKey: 'createdAt', header: sortableHeader('CREATED') },
  { accessorKey: 'expiresAt', header: sortableHeader('EXPIRES AT') },
  { accessorKey: 'status', header: sortableHeader('STATUS') },
  { accessorKey: 'lastSentAt', header: sortableHeader('LAST SENT') },
  ADMIN_ACTIONS_COLUMN,
];

/** Matches thakhin cards slideover + `app/components/form/manual-contact.vue` */
const formFieldClass =
  '[&_label]:mb-3 [&_label]:text-sm [&_label]:font-medium [&_label]:text-ink';

const inputUi = {
  base: 'h-[47px] rounded-[4px] border-line bg-raised text-sm text-ink placeholder:text-ink/50',
};

const selectUi = {
  base: 'h-[47px] w-full rounded-[4px] border-line bg-raised px-3 text-sm text-ink',
  content: 'border border-line bg-raised',
  item: 'text-ink data-[highlighted]:bg-raised',
  value: 'text-ink',
};
</script>

<template>
  <div :class="ADMIN_PAGE_CLASS">
    <AdminPageHeader
      title="Invitations"
      description-class="max-w-105"
      description="Create, send, and cancel card invitations. Cancelling a pending invite returns the card and removes the empty&nbsp;organization."
    >
      <UButton
        label="Create"
        leading-icon="i-lucide-plus"
        color="neutral"
        :class="ADMIN_PRIMARY_BUTTON_CLASS"
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
          color="neutral"
          variant="soft"
          class="w-full sm:w-72"
          :ui="ADMIN_SEARCH_UI"
        />
        <USelect
          v-model="statusFilter"
          :items="statusFilterItems"
          class="w-full sm:w-40"
          :ui="ADMIN_FILTER_UI"
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
        class="w-full min-w-4xl"
      >
        <template #email-cell="{ row }">
          <span class="font-medium text-ink">{{ row.original.email }}</span>
        </template>
        <template #cardName-cell="{ row }">
          {{
            `${row.original.cardFirstName} ${row.original.cardLastName || ''}`.trim()
          }}
        </template>
        <template #planName-cell="{ row }">
          <AdminStatusPill
            :label="row.original.planName"
            :tone="planTone(row.original.planCode)"
          />
        </template>
        <template #amountMinor-cell="{ row }">
          {{ formatAmount(row.original.amountMinor, row.original.currency) }}
        </template>
        <template #createdAt-cell="{ row }">
          <span class="text-muted">{{
            formatDate(row.original.createdAt)
          }}</span>
        </template>
        <template #expiresAt-cell="{ row }">
          <span class="text-muted">{{
            formatDate(row.original.expiresAt)
          }}</span>
        </template>
        <template #lastSentAt-cell="{ row }">
          <span class="text-muted">{{
            formatDate(row.original.lastSentAt)
          }}</span>
        </template>
        <template #status-cell="{ row }">
          <AdminStatusPill
            v-bind="reviewStatusPill(displayStatus(row.original))"
          />
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
      :ui="ADMIN_SLIDEOVER_UI"
    >
      <template #body>
        <form
          id="create-invitation-form"
          novalidate
          @submit.prevent="onCreateInvitation"
          class="py-2"
        >
          <div class="flex flex-col gap-4">
            <UFormField label="Invitee Email" :class="formFieldClass">
              <UInput
                v-model="createState.email"
                type="email"
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
            <UFormField
              v-if="createState.subscriptionPlanCode"
              label="Amount"
              required
              :class="formFieldClass"
            >
              <UInput
                v-model.number="createState.amountMinor"
                type="number"
                min="0"
                required
                class="w-full"
                size="xl"
                :ui="inputUi"
              />
            </UFormField>
            <UFormField label="Free Months" required :class="formFieldClass">
              <UInput
                v-model.number="createState.freeMonths"
                type="number"
                min="1"
                class="w-full"
                size="xl"
                :ui="inputUi"
              />
            </UFormField>
            <UFormField
              label="Expiration (minutes)"
              help="1440 minutes is one day."
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
                  label: 'text-sm font-medium text-ink',
                }"
              />
            </div>
          </div>
        </form>
      </template>

      <template #footer>
        <UButton
          label="Cancel"
          color="neutral"
          variant="ghost"
          :class="ADMIN_GHOST_BUTTON_CLASS"
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
          :class="ADMIN_SLIDEOVER_BUTTON_CLASS"
          type="submit"
          form="create-invitation-form"
        />
      </template>
    </USlideover>
  </div>
</template>
