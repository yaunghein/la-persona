<script setup lang="ts">
definePageMeta({
  layout: 'thakhin',
});

import type { DropdownMenuItem, TableColumn } from '@nuxt/ui';

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
const isCreateOpen = ref(false);
const isCreating = ref(false);
const isSendingById = ref<Record<string, boolean>>({});

const createState = reactive({
  email: '',
  organizationName: '',
  cardId: '',
  subscriptionPlanCode: '',
  freeMonths: 3,
  expirationMinutes: 60,
  sendNow: true,
});

const { data: invitationsData, pending, refresh } =
  await useFetch<InvitationRow[]>('/api/onboarding-invitation');
const { data: optionsData } = await useFetch<OptionsResponse>(
  '/api/onboarding-invitation/options'
);

const rows = computed(() => invitationsData.value || []);
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

const page = ref(1);
const itemsPerPage = 10;
const total = computed(() => rows.value.length);
const pagedRows = computed(() => {
  const start = (page.value - 1) * itemsPerPage;
  return rows.value.slice(start, start + itemsPerPage);
});

watch(rows, () => {
  const maxPage = Math.max(1, Math.ceil(total.value / itemsPerPage));
  if (page.value > maxPage) page.value = maxPage;
});

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
    await refresh();
    isCreateOpen.value = false;
    createState.email = '';
    createState.organizationName = '';
    createState.cardId = '';
    createState.subscriptionPlanCode = '';
    createState.freeMonths = 3;
    createState.expirationMinutes = 60;
    createState.sendNow = true;
    toast.add({
      title: 'Invitation created',
      description: 'A new onboarding invitation has been created.',
      color: 'success',
    });
  } catch (error: any) {
    toast.add({
      title: 'Create failed',
      description:
        error?.data?.statusMessage || error?.statusMessage || 'Please try again.',
      color: 'error',
    });
  } finally {
    isCreating.value = false;
  }
}

async function onSendInvitation(row: InvitationRow) {
  isSendingById.value = { ...isSendingById.value, [row.id]: true };
  try {
    await $fetch(`/api/onboarding-invitation/${row.id}/send`, { method: 'POST' });
    await refresh();
    toast.add({
      title: row.resendCount > 0 ? 'Invitation resent' : 'Invitation sent',
      description: `Email sent to ${row.email}.`,
      color: 'success',
    });
  } catch (error: any) {
    toast.add({
      title: 'Send failed',
      description:
        error?.data?.statusMessage || error?.statusMessage || 'Please try again.',
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
  { accessorKey: 'email', header: 'EMAIL' },
  { accessorKey: 'organizationName', header: 'ORGANIZATION' },
  { id: 'cardName', header: 'CARD' },
  { accessorKey: 'planName', header: 'PLAN' },
  { accessorKey: 'freeMonths', header: 'FREE MONTHS' },
  { accessorKey: 'expiresAt', header: 'EXPIRES AT' },
  { accessorKey: 'status', header: 'STATUS' },
  { accessorKey: 'lastSentAt', header: 'LAST SENT' },
  { id: 'actions', header: '' },
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
    <div class="flex items-center justify-between gap-3">
      <h1 class="text-[1.75rem] font-normal leading-tight tracking-widest uppercase">
        Onboarding Invitations
      </h1>
      <UButton
        label="Create Invitation"
        icon="i-lucide-plus"
        color="neutral"
        class="rounded-full"
        @click="isCreateOpen = true"
      />
    </div>

    <div class="hide-scrollbar flex-1 overflow-x-auto overflow-y-hidden">
      <UTable
        :data="pagedRows"
        :columns="columns"
        :loading="pending"
        :ui="{
          th: 'px-4 py-4 border-b border-[#232323] text-xs font-semibold tracking-wide uppercase text-white',
          td: 'px-4 py-4 border-b border-[#232323] text-sm text-[#8b8b8b]',
          tr: 'bg-transparent',
          empty: 'py-16 text-center text-sm text-muted',
        }"
        class="w-full min-w-[1150px]"
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
        v-model:page="page"
        :total="total"
        :items-per-page="itemsPerPage"
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
            <UFormField label="Invitee Email" required :class="formFieldClass">
              <UInput
                v-model="createState.email"
                type="email"
                placeholder="name@email.com"
                class="w-full"
                size="xl"
                :ui="inputUi"
              />
            </UFormField>
            <UFormField label="Organization Name" required :class="formFieldClass">
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
            <UFormField label="Subscription Plan" required :class="formFieldClass">
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
            <UFormField label="Expiration (minutes)" required :class="formFieldClass">
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

          <div class="mt-6 flex justify-end gap-2 border-t border-[#232323] pt-6">
            <UButton
              label="Cancel"
              color="neutral"
              variant="ghost"
              class="rounded-full px-5 text-white hover:bg-[#232323]"
              @click="isCreateOpen = false"
            />
            <UButton
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
