<script setup lang="ts">
import { format } from 'date-fns';
import type { DropdownMenuItem, TableColumn, TabsItem } from '@nuxt/ui';

const props = defineProps<{ organizationSlug: string }>();
const toast = useToast();

type CompanyCard = {
  id: string;
  slug: string;
  firstName: string;
  lastName: string | null;
  position: string;
  email: string | null;
  departmentId: string | null;
  departmentName: string | null;
  holderName: string | null;
  state: 'active' | 'pending' | 'vacant';
  subscriptionStatus: string | null;
  periodEnd: string | null;
  contactCount: number;
  userId: string | null;
  memberId: string | null;
  inviteId: string | null;
  inviteEmail: string | null;
};

type Holder = {
  id: string;
  holderName: string;
  holderEmail: string;
  startedAt: string;
  endedAt: string | null;
  contactCount: number;
};

type MemberTab = 'all' | CompanyCard['state'];

const { data, refresh } = await useFetch<{ items: CompanyCard[] }>(
  () => `/api/organizations/${props.organizationSlug}/company-cards` as string
);
const { data: departments, refresh: refreshDepartments } = await useFetch<{
  items: { id: string; name: string }[];
}>(() => `/api/organizations/${props.organizationSlug}/departments` as string);
const cards = computed(() => data.value?.items ?? []);

const searchQuery = ref('');
const activeTab = ref<MemberTab>('all');
const page = ref(1);
const itemsPerPage = 10;
const { siblingCount, showEdges } = usePaginationWindow();
const isInfoOpen = ref(false);
const open = ref(false);
const selected = ref<CompanyCard | null>(null);
const holders = ref<Holder[]>([]);
const cardToOffboard = ref<CompanyCard | null>(null);
const isOffboarding = ref(false);
const isRemoveOpen = computed({
  get: () => cardToOffboard.value !== null,
  set: (value) => {
    if (!value) cardToOffboard.value = null;
  },
});

const editForm = reactive({
  firstName: '',
  lastName: '',
  position: '',
  email: '',
  departmentId: null as string | null,
});
const assignForm = reactive({
  firstName: '',
  lastName: '',
  email: '',
  position: '',
});

const departmentItems = computed(() => [
  { label: 'No department', value: null as string | null },
  ...(departments.value?.items ?? []).map((item) => ({
    label: item.name,
    value: item.id,
  })),
]);

const isSmUp = useMediaQuery('(min-width: 640px)');
const tabCounts = computed(() => ({
  all: cards.value.length,
  active: cards.value.filter((card) => card.state === 'active').length,
  pending: cards.value.filter((card) => card.state === 'pending').length,
  vacant: cards.value.filter((card) => card.state === 'vacant').length,
}));
const tabItems = computed<TabsItem[]>(() => {
  const counts = tabCounts.value;
  if (isSmUp.value) {
    return [
      { label: `All cards (${counts.all})`, value: 'all' },
      { label: `Active (${counts.active})`, value: 'active' },
      { label: `Pending (${counts.pending})`, value: 'pending' },
      { label: `Vacant (${counts.vacant})`, value: 'vacant' },
    ];
  }
  return [
    { label: `All (${counts.all})`, value: 'all' },
    { label: `Active (${counts.active})`, value: 'active' },
    { label: `Pending (${counts.pending})`, value: 'pending' },
    { label: `Vacant (${counts.vacant})`, value: 'vacant' },
  ];
});
const selectedTab = computed({
  get: () => activeTab.value,
  set: (value: string | number) => {
    activeTab.value = String(value) as MemberTab;
  },
});

function displayName(card: CompanyCard) {
  if (card.state === 'vacant') return 'Vacant';
  if (card.state === 'pending') return card.inviteEmail || 'Invite pending';
  return card.holderName || `${card.firstName} ${card.lastName ?? ''}`.trim();
}

function statusLabel(state: CompanyCard['state']) {
  if (state === 'pending') return 'Pending';
  if (state === 'vacant') return 'Vacant';
  return 'Active';
}

const SUBSCRIPTION_LABELS: Record<string, string> = {
  active: 'Active',
  expired: 'Expired',
  grace: 'Grace period',
  pending_approval: 'Pending approval',
  submitted: 'Awaiting review',
  rejected: 'Rejected',
  trial: 'Trial',
};

function subscriptionLabel(status: string | null) {
  if (!status) return 'No plan';
  return SUBSCRIPTION_LABELS[status] ?? 'Active';
}

function subscriptionWhen(status: string | null, periodEnd: string | null) {
  if (!status || !periodEnd) return null;
  const date = format(new Date(periodEnd), 'd MMM yyyy');
  const label = subscriptionLabel(status);
  if (label === 'Expired' || label === 'Rejected') return `Ended ${date}`;
  return `Through ${date}`;
}

function contactCountLabel(count: number) {
  return count === 1 ? '1 contact' : `${count} contacts`;
}

const filteredCards = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  return cards.value.filter((card) => {
    if (activeTab.value !== 'all' && card.state !== activeTab.value)
      return false;
    if (!query) return true;
    return [
      displayName(card),
      card.position,
      card.departmentName,
      card.email,
      card.inviteEmail,
    ]
      .filter(Boolean)
      .some((value) => value!.toLowerCase().includes(query));
  });
});
const total = computed(() => filteredCards.value.length);
const pagedCards = computed(() => {
  const start = (page.value - 1) * itemsPerPage;
  return filteredCards.value.slice(start, start + itemsPerPage);
});

watch([searchQuery, activeTab], () => {
  page.value = 1;
});

const columns: TableColumn<CompanyCard>[] = [
  { accessorKey: 'name', header: 'NAME' },
  { accessorKey: 'departmentName', header: 'DEPARTMENT' },
  { accessorKey: 'contactCount', header: 'CONTACTS' },
  { accessorKey: 'subscriptionStatus', header: 'SUBSCRIPTION' },
  { accessorKey: 'state', header: 'STATUS' },
  { id: 'actions', header: '' },
];

const inputUi = {
  base: 'h-[47px] rounded-[4px] border-line bg-raised text-sm text-ink placeholder:text-ink/50',
};
const selectUi = {
  base: 'h-[47px] w-full rounded-[4px] border border-line bg-raised px-4 text-sm text-ink',
  content: 'border border-line bg-surface',
  item: 'text-ink data-[highlighted]:bg-raised',
  value: 'text-ink',
  placeholder: 'text-ink/50',
};
const formFieldClass =
  '[&_label]:mb-1 [&_label]:text-sm [&_label]:font-medium [&_label]:text-ink';

function openInfo() {
  isInfoOpen.value = true;
}

function askOffboard(card: CompanyCard) {
  cardToOffboard.value = card;
}

function showError(title: string, error: unknown) {
  toast.add({ title, description: apiErrorMessage(error), color: 'error' });
}

async function openCard(card: CompanyCard) {
  selected.value = card;
  editForm.firstName = card.firstName;
  editForm.lastName = card.lastName ?? '';
  editForm.position = card.position;
  editForm.email = card.email ?? '';
  editForm.departmentId = card.departmentId;
  assignForm.firstName = '';
  assignForm.lastName = '';
  assignForm.email = '';
  assignForm.position = card.position;
  open.value = true;
  holders.value = [];
  try {
    const history = await $fetch<{ items: Holder[] }>(
      `/api/cards/${card.slug}/holders` as string
    );
    holders.value = history.items;
  } catch {
    holders.value = [];
  }
}

async function saveCard() {
  if (!selected.value) return;
  try {
    await $fetch(`/api/cards/${selected.value.slug}` as string, {
      method: 'PATCH',
      body: {
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        position: editForm.position,
        email: editForm.email,
        departmentId: editForm.departmentId,
      },
    });
    toast.add({ title: 'Card saved', color: 'success' });
    await refresh();
    const next = cards.value.find((item) => item.id === selected.value?.id);
    if (next) selected.value = next;
  } catch (error) {
    showError('Could not save', error);
  }
}

async function confirmOffboard() {
  const card = cardToOffboard.value;
  if (!card?.memberId) return;
  isOffboarding.value = true;
  try {
    await $fetch(`/api/members/${card.memberId}` as string, {
      method: 'DELETE',
    });
    toast.add({ title: 'Member offboarded', color: 'success' });
    cardToOffboard.value = null;
    open.value = false;
    await refresh();
  } catch (error) {
    showError('Could not offboard', error);
  } finally {
    isOffboarding.value = false;
  }
}

async function cancelInvite(card: CompanyCard) {
  if (!card.inviteId) return;
  try {
    await $fetch(`/api/invitations/${card.inviteId}` as string, {
      method: 'PATCH',
      body: { status: 'canceled' },
    });
    toast.add({ title: 'Invite cancelled', color: 'success' });
    open.value = false;
    await refresh();
  } catch (error) {
    showError('Could not cancel', error);
  }
}

async function resendInvite(card: CompanyCard) {
  try {
    await $fetch(`/api/cards/${card.slug}/invitation-resends` as string, {
      method: 'POST',
    });
    toast.add({ title: 'Invite sent again', color: 'success' });
  } catch (error) {
    showError('Could not resend', error);
  }
}

async function assign() {
  if (!selected.value) return;
  try {
    await $fetch(`/api/cards/${selected.value.slug}/invitations` as string, {
      method: 'POST',
      body: assignForm,
    });
    toast.add({ title: 'Invite sent', color: 'success' });
    open.value = false;
    await refresh();
  } catch (error) {
    showError('Could not assign', error);
  }
}

function actionItems(card: CompanyCard): DropdownMenuItem[][] {
  const items: DropdownMenuItem[] = [
    {
      label: 'View card',
      icon: 'i-lucide-user',
      onSelect: () => openCard(card),
    },
  ];
  if (card.state === 'active') {
    items.push({
      label: 'Offboard',
      icon: 'i-lucide-user-minus',
      color: 'error',
      onSelect: () => {
        cardToOffboard.value = card;
      },
    });
  }
  if (card.state === 'pending') {
    items.push(
      {
        label: 'Resend invite',
        icon: 'i-lucide-mail',
        onSelect: () => resendInvite(card),
      },
      {
        label: 'Cancel invite',
        icon: 'i-lucide-x',
        color: 'error',
        onSelect: () => cancelInvite(card),
      }
    );
  }
  return [items];
}

onMounted(() => {
  refreshDepartments();
});
</script>

<template>
  <div class="flex flex-col pb-20 sm:pb-0">
    <div class="flex flex-col gap-8 pt-2 sm:pt-0">
      <div class="flex items-center gap-3">
        <h1
          class="text-xl font-normal leading-tight tracking-widest uppercase text-ink sm:text-2xl"
        >
          Company cards
        </h1>
        <UTooltip text="What are company cards?">
          <UButton
            icon="i-material-symbols:info-outline"
            color="neutral"
            variant="ghost"
            class="size-5 cursor-pointer p-0 text-ink hover:bg-transparent"
            aria-label="What are company cards?"
            @click="openInfo"
          />
        </UTooltip>
      </div>

      <div class="flex flex-col gap-6">
        <UInput
          v-model="searchQuery"
          placeholder="Search by name, position, or department"
          trailing-icon="i-lucide-search"
          color="neutral"
          variant="soft"
          class="w-full flex-1"
          :ui="{
            base: 'h-10 rounded-full border-0 bg-raised px-5 text-sm font-medium text-ink ring-0 placeholder:text-subtle focus-visible:ring-0',
            trailing: 'pe-4',
            trailingIcon: 'size-4 text-subtle',
          }"
        />
        <UTabs
          v-model="selectedTab"
          :items="tabItems"
          :content="false"
          color="neutral"
          variant="pill"
          :ui="{
            root: 'w-full sm:w-fit',
            list: 'bg-surface w-full sm:w-fit rounded-lg p-1',
            indicator: 'bg-raised',
            trigger:
              'data-[state=active]:text-ink data-[state=inactive]:text-subtle rounded-md px-4 py-2.5 grow-0 whitespace-nowrap text-center sm:text-left w-full sm:w-fit',
          }"
        />
      </div>
    </div>

    <div
      class="hide-scrollbar shrink-0 overflow-x-auto overflow-y-hidden pt-2 pb-6"
    >
      <UTable
        :data="pagedCards"
        :columns="columns"
        :ui="{
          th: 'px-4 py-4 border-b border-raised text-xs font-medium tracking-wide uppercase text-ink',
          td: 'px-4 py-4 border-b border-raised text-sm',
          tr: 'bg-transparent cursor-pointer hover:bg-raised/50',
          empty: 'py-16 text-center text-sm text-muted',
        }"
        class="w-full min-w-225"
        @select="(_event, row) => openCard(row.original)"
      >
        <template #name-cell="{ row }">
          <div class="flex flex-col gap-0.5">
            <span class="font-medium text-ink">{{
              displayName(row.original)
            }}</span>
            <span class="text-sm text-subtle">{{ row.original.position }}</span>
          </div>
        </template>
        <template #departmentName-cell="{ row }">
          <span class="text-subtle">{{
            row.original.departmentName || '—'
          }}</span>
        </template>
        <template #contactCount-cell="{ row }">
          <span class="text-subtle">{{ row.original.contactCount }}</span>
        </template>
        <template #subscriptionStatus-cell="{ row }">
          <div class="flex flex-col gap-0.5">
            <span class="font-medium text-ink">{{
              subscriptionLabel(row.original.subscriptionStatus)
            }}</span>
            <span
              v-if="
                subscriptionWhen(
                  row.original.subscriptionStatus,
                  row.original.periodEnd
                )
              "
              class="text-xs text-subtle"
            >
              {{
                subscriptionWhen(
                  row.original.subscriptionStatus,
                  row.original.periodEnd
                )
              }}
            </span>
          </div>
        </template>
        <template #state-cell="{ row }">
          <span
            :class="
              row.original.state === 'active' ? 'text-ink' : 'text-subtle'
            "
          >
            {{ statusLabel(row.original.state) }}
          </span>
        </template>
        <template #actions-cell="{ row }">
          <UDropdownMenu :items="actionItems(row.original)">
            <UTooltip :text="`Actions for ${displayName(row.original)}`">
              <UButton
                size="xl"
                icon="i-mdi-dots-vertical"
                color="neutral"
                variant="ghost"
                class="text-muted"
                :aria-label="`Actions for ${displayName(row.original)}`"
                @click.stop
              />
            </UTooltip>
          </UDropdownMenu>
        </template>
      </UTable>
    </div>

    <div
      class="flex w-full min-w-0 items-center justify-center pt-2 sm:justify-end"
    >
      <UPagination
        v-model:page="page"
        :total="total"
        :items-per-page="itemsPerPage"
        :sibling-count="siblingCount"
        :show-edges="showEdges"
        show-controls
        color="neutral"
        variant="outline"
      />
    </div>
  </div>

  <USlideover
    v-model:open="open"
    side="right"
    inset
    title="CARD"
    :ui="{
      header: 'border-b-2 border-raised px-6 py-6',
      title: 'text-sm font-medium tracking-[1.4px] text-ink uppercase',
      body: 'px-6',
    }"
  >
    <template v-if="selected" #body>
      <form class="flex flex-col gap-4 py-2" @submit.prevent="saveCard">
        <UFormField label="First name" :class="formFieldClass" required>
          <UInput v-model="editForm.firstName" class="w-full" :ui="inputUi" />
        </UFormField>
        <UFormField label="Last name" :class="formFieldClass">
          <UInput v-model="editForm.lastName" class="w-full" :ui="inputUi" />
        </UFormField>
        <UFormField label="Position" :class="formFieldClass" required>
          <UInput v-model="editForm.position" class="w-full" :ui="inputUi" />
        </UFormField>
        <UFormField label="Email" :class="formFieldClass">
          <UInput
            v-model="editForm.email"
            type="email"
            class="w-full"
            :ui="inputUi"
          />
        </UFormField>
        <UFormField label="Department" :class="formFieldClass">
          <USelect
            v-model="editForm.departmentId"
            :items="departmentItems"
            value-key="value"
            class="w-full"
            :ui="selectUi"
          />
        </UFormField>
        <div class="flex flex-wrap items-center justify-end gap-2">
          <UButton
            v-if="selected.state === 'active'"
            type="button"
            color="neutral"
            variant="ghost"
            label="Offboard"
            class="h-10 cursor-pointer rounded-full px-5 text-sm"
            @click="askOffboard(selected)"
          />
          <UButton
            v-if="selected.state === 'pending'"
            type="button"
            color="neutral"
            variant="ghost"
            label="Resend invite"
            class="h-10 cursor-pointer rounded-full px-5 text-sm"
            @click="resendInvite(selected)"
          />
          <UButton
            v-if="selected.state === 'pending'"
            type="button"
            color="neutral"
            variant="ghost"
            label="Cancel invite"
            class="h-10 cursor-pointer rounded-full px-5 text-sm"
            @click="cancelInvite(selected)"
          />
          <UButton
            type="submit"
            label="Save"
            leading-icon="i-lucide-check"
            color="neutral"
            class="h-10 cursor-pointer rounded-full bg-ink pr-6 pl-5 text-sm font-medium text-ink-inverse hover:bg-ink/90"
          />
        </div>
      </form>

      <form
        v-if="selected.state === 'vacant'"
        class="mt-8 flex flex-col gap-4 border-t border-raised pt-6"
        @submit.prevent="assign"
      >
        <p class="text-xs font-medium uppercase tracking-widest text-subtle">
          Assign to someone new
        </p>
        <UFormField label="First name" :class="formFieldClass" required>
          <UInput v-model="assignForm.firstName" class="w-full" :ui="inputUi" />
        </UFormField>
        <UFormField label="Last name" :class="formFieldClass">
          <UInput v-model="assignForm.lastName" class="w-full" :ui="inputUi" />
        </UFormField>
        <UFormField label="Email" :class="formFieldClass" required>
          <UInput
            v-model="assignForm.email"
            type="email"
            class="w-full"
            :ui="inputUi"
          />
        </UFormField>
        <UFormField label="Position" :class="formFieldClass" required>
          <UInput v-model="assignForm.position" class="w-full" :ui="inputUi" />
        </UFormField>
        <div class="flex justify-end">
          <UButton
            type="submit"
            label="Send invite"
            color="neutral"
            class="h-10 cursor-pointer rounded-full bg-ink pr-6 pl-5 text-sm font-medium text-ink-inverse hover:bg-ink/90"
          />
        </div>
      </form>

      <div class="mt-8 border-t border-raised pt-6">
        <p class="text-xs font-medium tracking-widest text-subtle uppercase">
          Holders
        </p>
        <ol v-if="holders.length" class="mt-4">
          <li
            v-for="(holder, index) in holders"
            :key="holder.id"
            class="grid grid-cols-[1rem_minmax(0,1fr)] gap-x-3"
          >
            <div class="flex flex-col items-center">
              <span
                class="mt-1.5 size-2 shrink-0 rounded-full"
                :class="holder.endedAt ? 'bg-line' : 'bg-ink'"
              />
              <span
                v-if="index < holders.length - 1"
                class="mt-1 w-px flex-1 bg-raised"
              />
            </div>
            <div class="flex items-start justify-between gap-4 pb-5">
              <div class="min-w-0">
                <p class="truncate text-sm font-medium text-ink">
                  {{ holder.holderName }}
                </p>
                <p class="truncate text-sm text-subtle">
                  {{ holder.holderEmail }}
                </p>
              </div>
              <div class="shrink-0 text-right">
                <p class="text-sm text-ink">
                  {{ format(new Date(holder.startedAt), 'd MMM yyyy') }}
                  –
                  {{
                    holder.endedAt
                      ? format(new Date(holder.endedAt), 'd MMM yyyy')
                      : 'Now'
                  }}
                </p>
                <p class="text-xs text-subtle">
                  {{ contactCountLabel(holder.contactCount) }}
                </p>
              </div>
            </div>
          </li>
        </ol>
        <p v-else class="py-3 text-sm text-subtle">
          No one has held this card yet.
        </p>
      </div>
    </template>
  </USlideover>

  <UiConfirmDeleteModal
    v-model:open="isRemoveOpen"
    title="Offboard member?"
    confirm-label="Offboard"
    :pending="isOffboarding"
    @confirm="confirmOffboard"
  >
    <template v-if="cardToOffboard">
      {{ displayName(cardToOffboard) }} loses this company card. Their contacts
      stay with the card for the next person. Their personal account is not
      removed.
    </template>
  </UiConfirmDeleteModal>

  <UModal
    v-model:open="isInfoOpen"
    title="What are company cards?"
    :ui="{
      content: 'sm:max-w-[480px] rounded-lg bg-surface',
      title: 'text-sm font-medium uppercase tracking-widest text-ink',
      body: 'px-5 py-4 sm:px-6 sm:py-5',
    }"
  >
    <template #body>
      <p class="text-sm leading-relaxed text-subtle">
        Each person has one company card. Offboard a departing employee, then
        assign the vacant card to someone new. The old link retires and the
        contact history stays on the card.
      </p>
    </template>
  </UModal>
</template>
