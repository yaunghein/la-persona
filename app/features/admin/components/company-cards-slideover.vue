<script setup lang="ts">
import { addDays, addYears, format } from 'date-fns';
import {
  ADMIN_GHOST_BUTTON_CLASS,
  ADMIN_SLIDEOVER_BUTTON_CLASS,
  ADMIN_SLIDEOVER_UI,
  type AdminPillTone,
} from '~/features/admin/utils/admin-ui';

const open = defineModel<boolean>('open', { required: true });
const props = defineProps<{ organizationId: string | null }>();
const toast = useToast();

type Draft = {
  firstName: string;
  lastName: string;
  email: string;
  position: string;
  role: 'admin' | 'member';
  freeMonth: boolean;
  paid: boolean;
};

type ListedCard = {
  id: string;
  firstName: string;
  lastName: string | null;
  position: string;
  email: string | null;
  holderName: string | null;
  inviteEmail: string | null;
  state: string;
  subscriptionStatus: string | null;
  periodEnd: string | null;
};

function blankDraft(): Draft {
  return {
    firstName: '',
    lastName: '',
    email: '',
    position: '',
    role: 'member',
    freeMonth: true,
    paid: true,
  };
}

const drafts = ref<Draft[]>([blankDraft()]);
const termYears = ref(1);
const amountMinor = ref(0);
const isAmountEdited = ref(false);
const paymentReference = ref('');
const note = ref('');
const selectedIds = ref<string[]>([]);
const renewMode = ref<'years' | 'date'>('years');
const renewYears = ref(1);
const renewAmount = ref(0);
const isRenewAmountEdited = ref(false);
const renewEndAt = ref('');
const saving = ref(false);

const renewModeItems = [
  { label: 'By years', value: 'years' },
  { label: 'To a date', value: 'date' },
];

const { data: plans } = useSubscriptionPlansQuery();
const standardPriceMinor = computed(
  () => plans.value?.find((plan) => plan.code === 'standard')?.priceMinor ?? 0
);

const roleItems = [
  { label: 'Member', value: 'member' },
  { label: 'Admin', value: 'admin' },
];

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

const checkboxUi = { label: 'text-sm font-medium text-ink' };

function addDraft() {
  drafts.value.push(blankDraft());
}

function removeDraft(index: number) {
  drafts.value = drafts.value.filter((_, item) => item !== index);
}

const { data, refresh } = useFetch<{ items: ListedCard[] }>(
  () =>
    props.organizationId
      ? (`/api/admin/organizations/${props.organizationId}/company-cards` as string)
      : '',
  { immediate: false, watch: false }
);
const cards = computed(() => data.value?.items ?? []);

watch(
  () => [open.value, props.organizationId] as const,
  ([isOpen, organizationId]) => {
    if (isOpen && organizationId) refresh();
  }
);

const paidCount = computed(() => drafts.value.filter((row) => row.paid).length);

// Mirrors the server: a free month is 30 days and the paid term starts after it.
function draftEndLabel(draft: Draft) {
  if (!draft.freeMonth && !draft.paid) return null;
  const freeEnd = draft.freeMonth ? addDays(new Date(), 30) : new Date();
  const end = draft.paid ? addYears(freeEnd, termYears.value || 1) : freeEnd;
  return `Ends ${format(end, 'd MMM yyyy')}`;
}

// The amount follows the standard price until someone types their own.
watchEffect(() => {
  if (isAmountEdited.value) return;
  amountMinor.value =
    standardPriceMinor.value * paidCount.value * (termYears.value || 1);
});
watchEffect(() => {
  if (isRenewAmountEdited.value || renewMode.value !== 'years') return;
  renewAmount.value =
    standardPriceMinor.value *
    selectedIds.value.length *
    (renewYears.value || 1);
});

const SUBSCRIPTION_PILLS: Record<
  string,
  { label: string; tone: AdminPillTone }
> = {
  trial: { label: 'Trial', tone: 'info' },
  active: { label: 'Active', tone: 'success' },
  grace: { label: 'Grace', tone: 'warning' },
  pending_approval: { label: 'Pending', tone: 'warning' },
  submitted: { label: 'Submitted', tone: 'warning' },
  rejected: { label: 'Rejected', tone: 'error' },
  expired: { label: 'Expired', tone: 'error' },
};

function statePill(state: string): { label: string; tone: AdminPillTone } {
  if (state === 'active') return { label: 'Active', tone: 'success' };
  if (state === 'pending') return { label: 'Invite pending', tone: 'warning' };
  if (state === 'vacant') return { label: 'Vacant', tone: 'neutral' };
  return { label: state, tone: 'neutral' };
}

function subscriptionPill(status: string | null): {
  label: string;
  tone: AdminPillTone;
} {
  if (!status) return { label: 'No plan', tone: 'neutral' };
  return SUBSCRIPTION_PILLS[status] ?? { label: 'Active', tone: 'neutral' };
}

function cardTitle(card: ListedCard) {
  if (card.state === 'vacant') return 'Vacant';
  if (card.holderName) return card.holderName;
  if (card.state === 'pending') return card.inviteEmail || 'Invite pending';
  return `${card.firstName} ${card.lastName ?? ''}`.trim();
}

function periodLabel(card: ListedCard) {
  if (!card.periodEnd) return null;
  const date = format(new Date(card.periodEnd), 'd MMM yyyy');
  if (
    card.subscriptionStatus === 'expired' ||
    card.subscriptionStatus === 'rejected'
  ) {
    return `Ended ${date}`;
  }
  return `Through ${date}`;
}

function isSelected(id: string) {
  return selectedIds.value.includes(id);
}

function setSelected(id: string, checked: boolean | 'indeterminate') {
  if (checked === true) {
    if (!isSelected(id)) selectedIds.value = [...selectedIds.value, id];
    return;
  }
  selectedIds.value = selectedIds.value.filter((item) => item !== id);
}

async function createCards() {
  if (!props.organizationId) return;
  saving.value = true;
  try {
    await $fetch(
      `/api/admin/organizations/${props.organizationId}/company-cards` as string,
      {
        method: 'POST',
        body: {
          termYears: termYears.value,
          amountMinor: amountMinor.value,
          paymentReference: paymentReference.value || undefined,
          note: note.value || undefined,
          cards: drafts.value,
        },
      }
    );
    toast.add({ title: 'Cards created', color: 'success' });
    drafts.value = [blankDraft()];
    isAmountEdited.value = false;
    await refresh();
  } catch (error) {
    toast.add({
      title: 'Could not create cards',
      description: apiErrorMessage(error),
      color: 'error',
    });
  } finally {
    saving.value = false;
  }
}

async function recordPayment() {
  if (!props.organizationId || !selectedIds.value.length) return;
  saving.value = true;
  try {
    await $fetch(
      `/api/admin/organizations/${props.organizationId}/payments` as string,
      {
        method: 'POST',
        body: {
          cardIds: selectedIds.value,
          amountMinor: renewAmount.value,
          ...(renewMode.value === 'years'
            ? { termYears: renewYears.value }
            : { endAt: renewEndAt.value }),
        },
      }
    );
    toast.add({ title: 'Payment recorded', color: 'success' });
    selectedIds.value = [];
    isRenewAmountEdited.value = false;
    await refresh();
  } catch (error) {
    toast.add({
      title: 'Could not record payment',
      description: apiErrorMessage(error),
      color: 'error',
    });
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <USlideover
    v-model:open="open"
    side="right"
    inset
    title="Company cards"
    :ui="ADMIN_SLIDEOVER_UI"
  >
    <template #body>
      <div class="flex flex-col gap-8 py-2">
        <form class="flex flex-col gap-4" @submit.prevent="createCards">
          <p class="text-sm font-medium tracking-[1.4px] text-ink uppercase">
            Add cards
          </p>

          <div
            v-for="(draft, index) in drafts"
            :key="index"
            class="flex flex-col gap-4 rounded-lg border border-raised p-4"
          >
            <div class="flex items-center justify-between gap-3">
              <p class="text-sm font-medium text-ink">Card {{ index + 1 }}</p>
              <UButton
                v-if="drafts.length > 1"
                type="button"
                icon="i-lucide-trash-2"
                color="neutral"
                variant="ghost"
                class="text-muted"
                :aria-label="`Remove card ${index + 1}`"
                @click="removeDraft(index)"
              />
            </div>
            <UFormField label="First Name" required :class="formFieldClass">
              <UInput
                v-model="draft.firstName"
                class="w-full"
                size="xl"
                :ui="inputUi"
              />
            </UFormField>
            <UFormField label="Last Name" :class="formFieldClass">
              <UInput
                v-model="draft.lastName"
                class="w-full"
                size="xl"
                :ui="inputUi"
              />
            </UFormField>
            <UFormField label="Email" required :class="formFieldClass">
              <UInput
                v-model="draft.email"
                type="email"
                class="w-full"
                size="xl"
                :ui="inputUi"
              />
            </UFormField>
            <UFormField label="Position" required :class="formFieldClass">
              <UInput
                v-model="draft.position"
                class="w-full"
                size="xl"
                :ui="inputUi"
              />
            </UFormField>
            <UFormField label="Role" :class="formFieldClass">
              <USelect
                v-model="draft.role"
                :items="roleItems"
                value-key="value"
                class="w-full"
                size="xl"
                :ui="selectUi"
              />
            </UFormField>
            <div class="flex flex-wrap gap-6">
              <UCheckbox
                v-model="draft.freeMonth"
                label="Free month"
                :ui="checkboxUi"
              />
              <UCheckbox
                v-model="draft.paid"
                label="Paid term"
                :ui="checkboxUi"
              />
            </div>
            <p v-if="draftEndLabel(draft)" class="text-xs text-subtle">
              {{ draftEndLabel(draft) }}
            </p>
          </div>

          <UButton
            type="button"
            label="Add Another Card"
            leading-icon="i-lucide-plus"
            color="neutral"
            variant="ghost"
            class="w-fit"
            :class="ADMIN_GHOST_BUTTON_CLASS"
            @click="addDraft"
          />

          <template v-if="paidCount">
            <UFormField label="Term in Years" :class="formFieldClass">
              <UInput
                v-model.number="termYears"
                type="number"
                min="1"
                max="5"
                class="w-full"
                size="xl"
                :ui="inputUi"
              />
            </UFormField>
            <UFormField label="Amount (MMK)" :class="formFieldClass">
              <UInput
                v-model.number="amountMinor"
                type="number"
                min="0"
                class="w-full"
                size="xl"
                :ui="inputUi"
                @update:model-value="isAmountEdited = true"
              />
            </UFormField>
            <UFormField label="Payment Reference" :class="formFieldClass">
              <UInput
                v-model="paymentReference"
                class="w-full"
                size="xl"
                :ui="inputUi"
              />
            </UFormField>
            <UFormField label="Note" :class="formFieldClass">
              <UInput v-model="note" class="w-full" size="xl" :ui="inputUi" />
            </UFormField>
          </template>

          <div class="flex justify-end">
            <UButton
              type="submit"
              label="Create Cards and Send Invites"
              color="neutral"
              :loading="saving"
              :class="ADMIN_SLIDEOVER_BUTTON_CLASS"
            />
          </div>
        </form>

        <form
          class="flex flex-col gap-4 border-t border-raised pt-6"
          @submit.prevent="recordPayment"
        >
          <p class="text-sm font-medium tracking-[1.4px] text-ink uppercase">
            Record a payment
          </p>
          <p v-if="!cards.length" class="text-sm text-subtle">No cards yet.</p>
          <ul v-else class="flex flex-col">
            <li
              v-for="card in cards"
              :key="card.id"
              class="flex items-center gap-3 border-b border-raised py-3 last:border-0"
            >
              <UCheckbox
                :model-value="isSelected(card.id)"
                :aria-label="`Select ${cardTitle(card)}`"
                @update:model-value="setSelected(card.id, $event)"
              />
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium text-ink">
                  {{ cardTitle(card) }}
                </p>
                <p class="truncate text-xs text-subtle">
                  {{ card.position }}
                  <template v-if="periodLabel(card)">
                    · {{ periodLabel(card) }}
                  </template>
                </p>
              </div>
              <div class="flex shrink-0 flex-wrap justify-end gap-1.5">
                <AdminStatusPill v-bind="statePill(card.state)" />
                <AdminStatusPill
                  v-bind="subscriptionPill(card.subscriptionStatus)"
                />
              </div>
            </li>
          </ul>
          <UFormField label="Extend" :class="formFieldClass">
            <URadioGroup
              v-model="renewMode"
              :items="renewModeItems"
              orientation="horizontal"
              :ui="{ label: 'text-sm font-medium text-ink' }"
            />
          </UFormField>
          <UFormField
            v-if="renewMode === 'years'"
            label="Term in Years"
            help="Added to each card's current end date, or from today if it has ended."
            :class="formFieldClass"
          >
            <UInput
              v-model.number="renewYears"
              type="number"
              min="1"
              max="5"
              class="w-full"
              size="xl"
              :ui="inputUi"
            />
          </UFormField>
          <UFormField
            v-else
            label="End Date"
            help="Every selected card ends on this date."
            required
            :class="formFieldClass"
          >
            <UInput
              v-model="renewEndAt"
              type="date"
              class="w-full"
              size="xl"
              :ui="inputUi"
            />
          </UFormField>
          <UFormField label="Amount (MMK)" :class="formFieldClass">
            <UInput
              v-model.number="renewAmount"
              type="number"
              min="0"
              class="w-full"
              size="xl"
              :ui="inputUi"
              @update:model-value="isRenewAmountEdited = true"
            />
          </UFormField>
          <div class="flex justify-end">
            <UButton
              type="submit"
              label="Record Payment"
              color="neutral"
              :disabled="
                !selectedIds.length || (renewMode === 'date' && !renewEndAt)
              "
              :loading="saving"
              :class="ADMIN_SLIDEOVER_BUTTON_CLASS"
            />
          </div>
        </form>
      </div>
    </template>
  </USlideover>
</template>
