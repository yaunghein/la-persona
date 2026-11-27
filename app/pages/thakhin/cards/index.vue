<script setup lang="ts">
definePageMeta({
  layout: 'thakhin',
});

import type { DropdownMenuItem, TableColumn } from '@nuxt/ui';
import type { BackgroundTheme } from '~~/shared/utils/constants';
import { getThakhinCardPlanAssetDefaults } from '~~/shared/constants/thakhin-card-plan-assets';
import {
  MAX_UPLOAD_BYTES,
  UPLOAD_CONTENT_TYPES,
} from '~~/shared/contracts/media';
import { cardImageSlug, isCardImageKeyFor } from '~~/shared/utils/card-image';
import { resolvedPhoneFields } from '~~/shared/utils/phone';
import {
  matchesBillingFilter,
  matchesSubscriptionFilter,
  type AdminCardBillingFilter,
  type AdminCardSubscriptionFilter,
} from '~~/shared/utils/admin-card-filter';
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
  type AdminPillTone,
} from '~/features/admin/utils/admin-ui';
import type {
  AdminCardSummary,
  CreateAdminCardRequest,
  UpdateAdminCardRequest,
} from '~~/shared/contracts/card';

type CardRow = AdminCardSummary;

const toast = useToast();
const { normalizeCardLinkValue } = useUrlNormalization();
const invalidateAdmin = useInvalidateAdmin();

const isFormOpen = ref(false);
const editingId = ref<string | null>(null);
let editingRow: CardRow | null = null;
const isSaving = ref(false);
const isDeleteOpen = ref(false);
const isDeleting = ref(false);
const cardToDelete = ref<CardRow | null>(null);

const form = reactive({
  organizationId: '',
  firstName: '',
  lastName: '',
  position: '',
  company: '',
  phone: '',
  phoneCountryCode: 'MM',
  email: '',
  website: '',
  splineUrl: '',
  backgroundTheme: 'dark' as BackgroundTheme,
  avatarUrl: '',
  wallpaperUrl: '',
  cardBackUrl: '',
});

function applyPlanAssetPrefills(planCode: string) {
  if (planCode === 'premium' || planCode === 'founder-club') {
    form.splineUrl = '';
    form.wallpaperUrl = '';
    form.cardBackUrl = '';
    return;
  }
  const d = getThakhinCardPlanAssetDefaults(planCode);
  if (!d) return;
  form.splineUrl = d.splineUrl;
  form.wallpaperUrl = d.wallpaperS3Key;
  form.cardBackUrl = d.cardBackS3Key;
}

function resetForm() {
  form.organizationId = '';
  form.firstName = '';
  form.lastName = '';
  form.position = '';
  form.company = '';
  form.phone = '';
  form.phoneCountryCode = 'MM';
  form.email = '';
  form.website = '';
  form.splineUrl = '';
  form.backgroundTheme = 'dark';
  form.avatarUrl = '';
  form.wallpaperUrl = '';
  form.cardBackUrl = '';
}

function fillForm(row: CardRow) {
  form.organizationId = row.organizationId;
  form.firstName = row.firstName;
  form.lastName = row.lastName || '';
  form.position = row.position;
  form.company = row.company || '';
  form.phone = row.phone || '';
  form.phoneCountryCode = row.phoneCountryCode || 'MM';
  form.email = row.email || '';
  form.website = row.website || '';
  form.splineUrl = row.splineUrl || '';
  form.backgroundTheme = row.backgroundTheme;
  form.avatarUrl = row.avatarUrl || '';
  form.wallpaperUrl = row.wallpaperUrl || '';
  form.cardBackUrl = row.cardBackUrl || '';
}

const { data: cardsData, isLoading: pending } = useAdminCardsQuery();
const { data: orgOptions } = useAdminOrganizationsQuery();
const { data: plans } = useSubscriptionPlansQuery();

const rows = computed(() => cardsData.value || []);
const claimFilter = useQueryState<'all' | 'linked' | 'unclaimed'>(
  'claim',
  'all'
);
const orgFilter = useQueryState('organization', 'all');

const subscriptionFilter = useQueryState<AdminCardSubscriptionFilter>(
  'subscription',
  'all'
);
const billingFilter = useQueryState<AdminCardBillingFilter>('billing', 'all');

const claimFilterItems = [
  { label: 'All cards', value: 'all' },
  { label: 'Linked', value: 'linked' },
  { label: 'Unclaimed', value: 'unclaimed' },
];

const subscriptionFilterItems: {
  label: string;
  value: AdminCardSubscriptionFilter;
}[] = [
  { label: 'All subscriptions', value: 'all' },
  { label: 'Live', value: 'live' },
  { label: 'Trial', value: 'trial' },
  { label: 'Active', value: 'active' },
  { label: 'Pending', value: 'pending_approval' },
  { label: 'Expiring in 30 days', value: 'expiring' },
  { label: 'Expired', value: 'expired' },
  { label: 'No end date', value: 'no_end' },
  { label: 'Community', value: 'community' },
  { label: 'Company', value: 'company' },
];

const billingFilterItems: { label: string; value: AdminCardBillingFilter }[] = [
  { label: 'All billing', value: 'all' },
  { label: 'Paid', value: 'paid' },
  { label: 'Free', value: 'free' },
];

const SUBSCRIPTION_PILLS: Record<
  string,
  { label: string; tone: AdminPillTone }
> = {
  trial: { label: 'Trial', tone: 'info' },
  active: { label: 'Active', tone: 'success' },
  grace: { label: 'Grace', tone: 'warning' },
  pending_approval: { label: 'Pending', tone: 'warning' },
  expired: { label: 'Expired', tone: 'error' },
};

function subscriptionPill(row: CardRow): {
  label: string;
  tone: AdminPillTone;
} {
  if (row.organizationType === 'community') {
    return { label: 'Community', tone: 'gold' };
  }
  if (!row.subscriptionStatus) return { label: 'None', tone: 'neutral' };
  return (
    SUBSCRIPTION_PILLS[row.subscriptionStatus] ?? {
      label: row.subscriptionStatus,
      tone: 'neutral',
    }
  );
}

function planLabel(planCode: string) {
  return plans.value?.find((plan) => plan.code === planCode)?.name ?? planCode;
}

const orgFilterItems = computed(() => {
  const names = [
    ...new Set(rows.value.map((row) => row.organizationName).filter(Boolean)),
  ].sort((a, b) => a.localeCompare(b));

  return [
    { label: 'All organizations', value: 'all' },
    ...names.map((name) => ({ label: name, value: name })),
  ];
});

const filteredRows = computed(() => {
  return rows.value.filter((row) => {
    const matchesClaim =
      claimFilter.value === 'all' ||
      (claimFilter.value === 'linked' && Boolean(row.userId)) ||
      (claimFilter.value === 'unclaimed' && !row.userId);
    const matchesOrg =
      orgFilter.value === 'all' || row.organizationName === orgFilter.value;
    return (
      matchesClaim &&
      matchesOrg &&
      matchesSubscriptionFilter(row, subscriptionFilter.value) &&
      matchesBillingFilter(row, billingFilter.value)
    );
  });
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

watch([claimFilter, orgFilter, subscriptionFilter, billingFilter], resetPage);
const orgSelectItems = computed(() =>
  (orgOptions.value || []).map((o) => ({ label: o.name, value: o.id }))
);
const CREATE_PLANS = [
  { code: 'friend-family', label: 'Friends & Family' },
  { code: 'standard', label: 'Standard' },
  { code: 'premium', label: 'Premium' },
  { code: 'founder-club', label: "Founders' Club" },
] as const;

const createPlanItems = computed(() =>
  CREATE_PLANS.map((plan) => ({
    label:
      plans.value?.find((item) => item.code === plan.code)?.name ?? plan.label,
    value: plan.code,
  }))
);

const planSelectItems = computed(() =>
  (plans.value ?? [])
    .filter((plan) => plan.isActive)
    .map((plan) => ({ label: plan.name, value: plan.code }))
);

/** Subscription plan for create flow — prefills Spline + S3 keys (placeholders). */
const createPlanCode =
  ref<(typeof CREATE_PLANS)[number]['code']>('friend-family');

watch(
  createPlanItems,
  (items) => {
    const first = items[0];
    if (!first) return;
    if (!items.some((item) => item.value === createPlanCode.value)) {
      createPlanCode.value = first.value;
    }
  },
  { immediate: true }
);

watch(createPlanCode, (code) => {
  if (editingId.value || !isFormOpen.value) return;
  clearPremiumImageChoices();
  applyPlanAssetPrefills(code);
});

const customImages = ref(false);
const lockedImageName = ref('');

const cardImageName = computed(() =>
  editingId.value && customImages.value
    ? lockedImageName.value
    : `${form.firstName} ${form.lastName}`.trim()
);

const choosingPremiumImages = computed(
  () =>
    !editingId.value &&
    (createPlanCode.value === 'premium' ||
      createPlanCode.value === 'founder-club')
);
const showCardImageUpload = computed(
  () => Boolean(editingId.value) && customImages.value
);

const wallpaperFile = ref<File | null>(null);
const backFile = ref<File | null>(null);
const wallpaperExistingKey = ref('');
const backExistingKey = ref('');
const {
  data: storedUploads,
  isLoading: uploadsLoading,
  error: uploadsError,
} = useAdminUploadsQuery(choosingPremiumImages);
const storedUploadItems = computed(() => storedUploads.value ?? []);
const uploadsErrorMessage = computed(() =>
  uploadsError.value ? apiErrorMessage(uploadsError.value) : ''
);

function clearPremiumImageChoices() {
  wallpaperFile.value = null;
  backFile.value = null;
  wallpaperExistingKey.value = '';
  backExistingKey.value = '';
}

function openCreate() {
  editingId.value = null;
  customImages.value = false;
  lockedImageName.value = '';
  resetForm();
  clearPremiumImageChoices();
  const items = createPlanItems.value;
  const firstPlan = items[0];
  if (firstPlan && !items.some((i) => i.value === createPlanCode.value)) {
    createPlanCode.value = firstPlan.value;
  }
  applyPlanAssetPrefills(createPlanCode.value);
  isFormOpen.value = true;
}

function openEdit(row: CardRow) {
  editingId.value = row.id;
  editingRow = row;
  const name = `${row.firstName} ${row.lastName || ''}`.trim();
  lockedImageName.value = name;
  customImages.value =
    isCardImageKeyFor(row.wallpaperUrl || '', 'wallpaper', name) &&
    isCardImageKeyFor(row.cardBackUrl || '', 'back', name);
  fillForm(row);
  isFormOpen.value = true;
}

function openDelete(row: CardRow) {
  cardToDelete.value = row;
  isDeleteOpen.value = true;
}

function closeDelete() {
  isDeleteOpen.value = false;
  cardToDelete.value = null;
}

function displayName(row: CardRow) {
  return `${row.firstName} ${row.lastName || ''}`.trim();
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

const slideTitle = computed(() =>
  editingId.value ? 'EDIT CARD' : 'CREATE CARD'
);

const MEDIA_FIELDS = [
  'splineUrl',
  'avatarUrl',
  'wallpaperUrl',
  'cardBackUrl',
] as const;

// Enter submits only when creating; edits are saved with the button.
function blockEnterWhileEditing(event: KeyboardEvent) {
  if (editingId.value && event.target instanceof HTMLInputElement) {
    event.preventDefault();
  }
}

async function storeChosenCardImage(
  kind: 'wallpaper' | 'back',
  chosenFile: File | null,
  existingKey: string
) {
  if (!chosenFile) return existingKey;
  const contentType = UPLOAD_CONTENT_TYPES.find(
    (type) => type === chosenFile.type
  );
  if (!contentType || chosenFile.size > MAX_UPLOAD_BYTES) {
    throw new Error(
      contentType
        ? 'Images must be 5 MB or smaller.'
        : 'Upload a JPG, PNG or WebP image.'
    );
  }
  const ticket = await adminApi.createCardImageUpload({
    name: cardImageName.value,
    kind,
    contentType,
    contentLength: chosenFile.size,
  });
  const response = await fetch(ticket.uploadUrl, {
    method: 'PUT',
    body: chosenFile,
    headers: ticket.headers,
  });
  if (!response.ok) throw new Error('Upload failed. Please try again.');
  return ticket.key;
}

async function onSubmitForm() {
  const creatingPremium = choosingPremiumImages.value;
  if (
    creatingPremium &&
    (!(wallpaperFile.value || wallpaperExistingKey.value) ||
      !(backFile.value || backExistingKey.value))
  ) {
    toast.add({
      title: 'Choose both images',
      description: 'This plan needs a wallpaper and a card back.',
      color: 'warning',
    });
    return;
  }
  if (
    creatingPremium &&
    (wallpaperFile.value || backFile.value) &&
    !cardImageSlug(cardImageName.value)
  ) {
    toast.add({
      title: 'Enter a name',
      description: 'New images are named from the first and last name.',
      color: 'warning',
    });
    return;
  }

  isSaving.value = true;
  try {
    if (creatingPremium) {
      const wallpaperKey = await storeChosenCardImage(
        'wallpaper',
        wallpaperFile.value,
        wallpaperExistingKey.value
      );
      wallpaperExistingKey.value = wallpaperKey;
      wallpaperFile.value = null;
      const backKey = await storeChosenCardImage(
        'back',
        backFile.value,
        backExistingKey.value
      );
      backExistingKey.value = backKey;
      backFile.value = null;
      form.wallpaperUrl = wallpaperKey;
      form.cardBackUrl = backKey;
    }

    const body: UpdateAdminCardRequest = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim() || null,
      position: form.position.trim(),
      company: form.company.trim() || null,
      ...resolvedPhoneFields(form.phone, form.phoneCountryCode),
      email: form.email.trim() || null,
      website: form.website.trim() || null,
      splineUrl: form.splineUrl.trim() || null,
      backgroundTheme: form.backgroundTheme,
      avatarUrl: form.avatarUrl.trim() || null,
      wallpaperUrl: form.wallpaperUrl.trim() || null,
      cardBackUrl: form.cardBackUrl.trim() || null,
    };

    if (!editingId.value) {
      await adminApi.createCard(body as CreateAdminCardRequest);
      toast.add({
        title: 'Card created',
        description: 'Unclaimed card is ready for onboarding invitation.',
        color: 'success',
      });
    } else {
      body.organizationId = form.organizationId;
      // Unchanged media is left out, so a value the form can't produce
      // (e.g. an avatar the holder uploaded) never blocks a save.
      for (const field of MEDIA_FIELDS) {
        if (body[field] === (editingRow?.[field] || null)) delete body[field];
      }
      await adminApi.updateCard(editingId.value, body);
      toast.add({
        title: 'Card updated',
        color: 'success',
      });
    }

    await invalidateAdmin();
    isFormOpen.value = false;
    editingId.value = null;
    resetForm();
    clearPremiumImageChoices();
  } catch (error: any) {
    toast.add({
      title: editingId.value ? 'Update failed' : 'Create failed',
      description: apiErrorMessage(
        error,
        error instanceof Error ? error.message : 'Please try again.'
      ),
      color: 'error',
    });
  } finally {
    isSaving.value = false;
  }
}

async function onConfirmDelete() {
  if (!cardToDelete.value) return;
  isDeleting.value = true;
  try {
    await adminApi.deleteCard(cardToDelete.value.id);
    await invalidateAdmin();
    toast.add({
      title: 'Card deleted',
      description: `"${displayName(cardToDelete.value)}" was removed.`,
      color: 'success',
    });
    closeDelete();
  } catch (error: any) {
    toast.add({
      title: 'Delete failed',
      description:
        error?.data?.statusMessage ||
        error?.statusMessage ||
        'Please try again.',
      color: 'error',
    });
  } finally {
    isDeleting.value = false;
  }
}

function getActionItems(row: CardRow): DropdownMenuItem[][] {
  return [
    [
      {
        label: 'History',
        icon: 'i-lucide-history',
        onSelect: () => openHistory(row),
      },
      {
        label: 'Extend',
        icon: 'i-lucide-calendar-plus',
        disabled:
          !row.userId ||
          row.subscriptionStatus === 'pending_approval' ||
          row.organizationType !== 'personal',
        onSelect: () => openExtend(row),
      },
      {
        label: 'Edit',
        icon: 'i-lucide-pencil',
        onSelect: () => openEdit(row),
      },
      {
        label: 'Delete',
        icon: 'i-lucide-trash-2',
        color: 'error',
        onSelect: () => openDelete(row),
      },
    ],
  ];
}

const historyOpen = ref(false);
const historyCardId = ref<string | null>(null);
const extendOpen = ref(false);
const extendCard = ref<CardRow | null>(null);
const extendKind = ref<'trial' | 'paid'>('trial');
const extendMonths = ref(3);
const extendEndDate = ref('');
const extendPlanCode = ref('standard');
const extendAmount = ref(0);
const isExtending = ref(false);

function openHistory(row: CardRow) {
  historyCardId.value = row.id;
  historyOpen.value = true;
}

function openExtend(row: CardRow) {
  extendCard.value = row;
  extendKind.value = 'trial';
  extendMonths.value = 3;
  extendEndDate.value = '';
  const planCode =
    row.subscriptionPlanCode || planSelectItems.value[0]?.value || 'standard';
  extendPlanCode.value = planCode;
  extendAmount.value =
    plans.value?.find((plan) => plan.code === planCode)?.priceMinor ?? 0;
  extendOpen.value = true;
}

watch(extendPlanCode, (code) => {
  const plan = plans.value?.find((item) => item.code === code);
  if (plan) extendAmount.value = plan.priceMinor;
});

async function onExtend() {
  const card = extendCard.value;
  if (!card) return;
  isExtending.value = true;
  try {
    const body =
      extendKind.value === 'paid'
        ? {
            kind: 'paid' as const,
            planCode: extendPlanCode.value,
            amountMinor: extendAmount.value,
          }
        : card.subscriptionEndAt
          ? { kind: 'trial' as const, months: extendMonths.value }
          : {
              kind: 'trial' as const,
              endAt: new Date(`${extendEndDate.value}T23:59:59`).toISOString(),
            };
    await adminApi.addCardPeriod(card.id, body);
    await invalidateAdmin();
    extendOpen.value = false;
    toast.add({ title: 'Period added', color: 'success' });
  } catch (error: any) {
    toast.add({
      title: 'Could not add the period',
      description:
        error?.data?.statusMessage ||
        error?.statusMessage ||
        'Please try again.',
      color: 'error',
    });
  } finally {
    isExtending.value = false;
  }
}

const columns: TableColumn<CardRow>[] = [
  {
    id: 'displayName',
    header: sortableHeader('NAME'),
    accessorFn: (row) => displayName(row),
  },
  { accessorKey: 'slug', header: sortableHeader('SLUG') },
  {
    accessorKey: 'organizationName',
    header: sortableHeader('ORGANIZATION'),
  },
  { accessorKey: 'position', header: sortableHeader('ROLE') },
  {
    id: 'claimStatus',
    header: sortableHeader('CLAIM'),
    accessorFn: (row) => (row.userId ? 'Linked' : 'Unclaimed'),
  },
  { accessorKey: 'linkedUserEmail', header: sortableHeader('OWNER') },
  {
    id: 'subscription',
    header: sortableHeader('STATUS'),
    accessorFn: (row) => subscriptionPill(row).label,
  },
  {
    id: 'plan',
    header: sortableHeader('PLAN'),
    accessorFn: (row) =>
      row.subscriptionPlanCode ? planLabel(row.subscriptionPlanCode) : '',
  },
  {
    accessorKey: 'subscriptionBilling',
    header: sortableHeader('BILLING'),
  },
  {
    accessorKey: 'subscriptionStartAt',
    header: sortableHeader('STARTS'),
  },
  {
    accessorKey: 'subscriptionEndAt',
    header: sortableHeader('EXPIRES'),
  },
  {
    accessorKey: 'connectionCount',
    header: sortableHeader('CONNECTIONS'),
  },
  {
    id: 'socials',
    header: 'SOCIALS',
    accessorFn: (row) => row.socials.map((link) => link.label).join(', '),
  },
  { accessorKey: 'email', header: sortableHeader('CARD EMAIL') },
  { accessorKey: 'createdAt', header: sortableHeader('CREATED') },
  ADMIN_ACTIONS_COLUMN,
];

/** Matches `app/components/form/manual-contact.vue` / `update-card-info.vue` */
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

const BACKGROUND_THEME_ITEMS: { label: string; value: BackgroundTheme }[] = [
  { label: 'Dark', value: 'dark' },
  { label: 'Light', value: 'light' },
];
</script>

<template>
  <div :class="ADMIN_PAGE_CLASS">
    <AdminPageHeader
      title="Cards"
      description-class="max-w-99"
      description="Issue cards, correct them, and extend their subscription periods. Deleting a card removes its contacts and&nbsp;analytics."
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
      :loading="pending"
      @update:page="onPageChange"
    >
      <template #toolbar>
        <UInput
          v-model="globalFilter"
          icon="i-lucide-search"
          placeholder="Search name, email, or slug"
          color="neutral"
          variant="soft"
          class="w-full sm:w-64"
          :ui="ADMIN_SEARCH_UI"
        />
        <USelect
          v-model="claimFilter"
          :items="claimFilterItems"
          class="w-full sm:w-40"
          :ui="ADMIN_FILTER_UI"
        />
        <USelect
          v-model="orgFilter"
          :items="orgFilterItems"
          class="w-full sm:w-52"
          :ui="ADMIN_FILTER_UI"
        />
        <USelect
          v-model="subscriptionFilter"
          :items="subscriptionFilterItems"
          class="w-full sm:w-52"
          :ui="ADMIN_FILTER_UI"
        />
        <USelect
          v-model="billingFilter"
          :items="billingFilterItems"
          class="w-full sm:w-36"
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
        class="w-full min-w-5xl"
        @select="(_event, row) => openEdit(row.original)"
      >
        <template #displayName-cell="{ row }">
          <span class="font-medium text-ink">
            {{ displayName(row.original) }}
          </span>
        </template>
        <template #claimStatus-cell="{ row }">
          <AdminStatusPill
            :label="row.original.userId ? 'Linked' : 'Unclaimed'"
            :tone="row.original.userId ? 'success' : 'warning'"
          />
        </template>
        <template #linkedUserEmail-cell="{ row }">
          <span v-if="row.original.linkedUserEmail">
            {{ row.original.linkedUserEmail }}
          </span>
          <span v-else class="text-subtle">—</span>
        </template>
        <template #subscription-cell="{ row }">
          <AdminStatusPill v-bind="subscriptionPill(row.original)" />
        </template>
        <template #plan-cell="{ row }">
          <AdminStatusPill
            v-if="row.original.subscriptionPlanCode"
            :label="planLabel(row.original.subscriptionPlanCode)"
            :tone="planTone(row.original.subscriptionPlanCode)"
          />
          <span v-else class="text-subtle">—</span>
        </template>
        <template #subscriptionBilling-cell="{ row }">
          <AdminStatusPill
            v-if="row.original.subscriptionBilling"
            :label="
              row.original.subscriptionBilling === 'paid' ? 'Paid' : 'Free'
            "
            :tone="
              row.original.subscriptionBilling === 'paid' ? 'gold' : 'neutral'
            "
          />
          <span v-else class="text-subtle">—</span>
        </template>
        <template #subscriptionEndAt-cell="{ row }">
          <span
            v-if="row.original.subscriptionEndAt"
            :class="
              row.original.subscriptionStatus === 'expired'
                ? 'text-error'
                : 'text-muted'
            "
          >
            {{ new Date(row.original.subscriptionEndAt).toLocaleDateString() }}
          </span>
          <span v-else class="text-subtle">—</span>
        </template>
        <template #subscriptionStartAt-cell="{ row }">
          <span v-if="row.original.subscriptionStartAt" class="text-muted">
            {{
              new Date(row.original.subscriptionStartAt).toLocaleDateString()
            }}
          </span>
          <span v-else class="text-subtle">—</span>
        </template>
        <template #socials-cell="{ row }">
          <div v-if="row.original.socials.length" class="flex flex-wrap gap-2">
            <a
              v-for="(link, index) in row.original.socials"
              :key="`${link.label}-${index}`"
              :href="normalizeCardLinkValue(link.value, link.label)"
              :title="link.value"
              target="_blank"
              rel="noopener noreferrer"
              class="text-muted underline underline-offset-2 hover:text-ink"
              @click.stop
            >
              {{ link.label }}
            </a>
          </div>
          <span v-else class="text-subtle">—</span>
        </template>
        <template #createdAt-cell="{ row }">
          <span class="text-muted">{{
            formatDate(row.original.createdAt)
          }}</span>
        </template>
        <template #actions-cell="{ row }">
          <AdminRowMenu :items="getActionItems(row.original)" />
        </template>
      </UTable>
    </AdminTableFrame>

    <USlideover
      v-model:open="isFormOpen"
      side="right"
      inset
      :title="slideTitle"
      :ui="ADMIN_SLIDEOVER_UI"
    >
      <template #body>
        <form
          id="card-form"
          novalidate
          @submit.prevent="onSubmitForm"
          @keydown.enter="blockEnterWhileEditing"
          class="py-2"
        >
          <div class="flex flex-col gap-4">
            <UFormField
              v-if="editingId"
              label="Organization"
              required
              :class="formFieldClass"
            >
              <USelect
                v-model="form.organizationId"
                :items="orgSelectItems"
                placeholder="Select organization"
                size="xl"
                class="w-full"
                :ui="selectUi"
              />
            </UFormField>

            <UFormField
              v-if="!editingId && createPlanItems.length"
              label="Plan"
              :class="formFieldClass"
            >
              <USelect
                v-model="createPlanCode"
                :items="createPlanItems"
                placeholder="Select plan"
                size="xl"
                class="w-full"
                :ui="selectUi"
              />
            </UFormField>

            <UFormField label="First name" :class="formFieldClass">
              <UInput
                v-model="form.firstName"
                placeholder="Optional — defaults to “Card” if empty"
                class="w-full"
                size="xl"
                :ui="inputUi"
              />
            </UFormField>
            <UFormField label="Last name" :class="formFieldClass">
              <UInput
                v-model="form.lastName"
                placeholder="Last name (optional)"
                class="w-full"
                size="xl"
                :ui="inputUi"
              />
            </UFormField>
            <UFormField label="Position / role" :class="formFieldClass">
              <UInput
                v-model="form.position"
                placeholder="Optional — defaults to “Professional” if empty"
                class="w-full"
                size="xl"
                :ui="inputUi"
              />
            </UFormField>
            <UFormField label="Company" :class="formFieldClass">
              <UInput
                v-model="form.company"
                placeholder="Company / brand"
                class="w-full"
                size="xl"
                :ui="inputUi"
              />
            </UFormField>
            <UFormField label="Phone" :class="formFieldClass">
              <UiPhoneField
                v-model="form.phone"
                v-model:country-code="form.phoneCountryCode"
                name="phone"
                placeholder="Phone number"
                size="xl"
                :ui="inputUi"
              />
            </UFormField>
            <UFormField label="Card email" :class="formFieldClass">
              <UInput
                v-model="form.email"
                type="email"
                placeholder="Shown on card (optional)"
                class="w-full"
                size="xl"
                :ui="inputUi"
              />
            </UFormField>
            <UFormField label="Website" :class="formFieldClass">
              <UInput
                v-model="form.website"
                placeholder="https://..."
                class="w-full"
                size="xl"
                :ui="inputUi"
              />
            </UFormField>
            <UFormField label="Spline scene URL" :class="formFieldClass">
              <UInput
                v-model="form.splineUrl"
                placeholder="https://prod.spline.design/…/scene.splinecode"
                class="w-full"
                size="xl"
                :ui="inputUi"
              />
            </UFormField>
            <UFormField
              label="Background theme"
              description="The Spline scene's background. Light makes the public card use dark&nbsp;text."
              :class="formFieldClass"
            >
              <USelect
                v-model="form.backgroundTheme"
                :items="BACKGROUND_THEME_ITEMS"
                size="xl"
                class="w-full"
                :ui="selectUi"
              />
            </UFormField>
            <UFormField label="Avatar URL" :class="formFieldClass">
              <UInput
                v-model="form.avatarUrl"
                placeholder="https://… (optional)"
                class="w-full"
                size="xl"
                :ui="inputUi"
              />
            </UFormField>
            <template v-if="choosingPremiumImages">
              <p class="text-xs leading-relaxed text-subtle">
                Both images are required. A new file uploads when you create the
                card, named from the person's&nbsp;name.
              </p>
              <AdminCardImageChoice
                v-model:file="wallpaperFile"
                v-model:existing-key="wallpaperExistingKey"
                label="Wallpaper"
                :images="storedUploadItems"
                :loading="uploadsLoading"
                :error="uploadsErrorMessage"
              />
              <AdminCardImageChoice
                v-model:file="backFile"
                v-model:existing-key="backExistingKey"
                label="Card back"
                :images="storedUploadItems"
                :loading="uploadsLoading"
                error=""
              />
            </template>
            <template v-else-if="showCardImageUpload">
              <p class="text-xs leading-relaxed text-subtle">
                Stored in uploads/, named from the card name. Delete an image
                before replacing&nbsp;it.
              </p>
              <AdminCardImageField
                v-model="form.wallpaperUrl"
                kind="wallpaper"
                label="Wallpaper"
                :name="cardImageName"
                delete-note="The file is removed from storage. Upload a new wallpaper before saving the&nbsp;card."
              />
              <AdminCardImageField
                v-model="form.cardBackUrl"
                kind="back"
                label="Card back"
                :name="cardImageName"
                delete-note="The file is removed from storage. Upload a new card back before saving the&nbsp;card."
              />
            </template>
            <template v-else>
              <UFormField label="Wallpaper (S3 key)" :class="formFieldClass">
                <UInput
                  v-model="form.wallpaperUrl"
                  placeholder="path/in/bucket.webp — not a full URL"
                  class="w-full"
                  size="xl"
                  :ui="inputUi"
                />
              </UFormField>
              <UFormField label="Card back (S3 key)" :class="formFieldClass">
                <UInput
                  v-model="form.cardBackUrl"
                  placeholder="path/in/bucket.webp — not a full URL"
                  class="w-full"
                  size="xl"
                  :ui="inputUi"
                />
              </UFormField>
            </template>
          </div>

          <p v-if="!editingId" class="mt-1 text-xs text-subtle">
            New cards are stored under the placeholder org until you create an
            onboarding invitation (which creates the customer org and moves the
            card). User stays unlinked until the recipient accepts.
          </p>
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
              isFormOpen = false;
              // resetForm();
            }
          "
        />
        <UButton
          :label="editingId ? 'Save changes' : 'Create card'"
          color="neutral"
          :loading="isSaving"
          :class="ADMIN_SLIDEOVER_BUTTON_CLASS"
          type="submit"
          form="card-form"
        />
      </template>
    </USlideover>

    <UModal
      v-model:open="isDeleteOpen"
      :close="false"
      :dismissible="!isDeleting"
      :ui="{
        content: 'bg-surface max-w-md',
        title: 'text-ink',
        body: 'pt-4',
        footer: 'justify-end gap-2',
      }"
      title="Delete card?"
    >
      <template #body>
        <p class="text-sm leading-relaxed text-soft">
          This cannot be undone. The card
          <span class="font-medium text-ink">
            "{{ cardToDelete ? displayName(cardToDelete) : '' }}"
          </span>
          and related subscription, contact exchanges, and analytics on this
          card will be removed.
        </p>
      </template>
      <template #footer>
        <UButton
          label="Cancel"
          color="neutral"
          variant="ghost"
          :class="ADMIN_GHOST_BUTTON_CLASS"
          :disabled="isDeleting"
          @click="closeDelete"
        />
        <UButton
          label="Delete"
          color="error"
          :loading="isDeleting"
          class="h-10 cursor-pointer rounded-full px-6 text-sm font-medium"
          @click="onConfirmDelete"
        />
      </template>
    </UModal>

    <AdminPeriodHistorySlideover
      v-model:open="historyOpen"
      :card-id="historyCardId"
    />

    <USlideover
      v-model:open="extendOpen"
      title="Extend"
      side="right"
      inset
      :ui="ADMIN_SLIDEOVER_UI"
    >
      <template #body>
        <form id="extend-form" class="space-y-4" @submit.prevent="onExtend">
          <p v-if="extendCard" class="text-sm text-ink">
            {{ displayName(extendCard) }}
          </p>
          <UFormField label="Kind" :class="formFieldClass">
            <USelect
              v-model="extendKind"
              :items="[
                { label: 'Free', value: 'trial' },
                { label: 'Paid', value: 'paid' },
              ]"
              class="w-full"
              size="xl"
              :ui="selectUi"
            />
          </UFormField>
          <UFormField
            v-if="extendKind === 'trial' && !extendCard?.subscriptionEndAt"
            label="End date"
            required
            :class="formFieldClass"
          >
            <UInput
              v-model="extendEndDate"
              type="date"
              required
              class="w-full"
              size="xl"
              :ui="inputUi"
            />
          </UFormField>
          <UFormField
            v-else-if="extendKind === 'trial'"
            label="Months"
            required
            :class="formFieldClass"
          >
            <UInput
              v-model.number="extendMonths"
              type="number"
              min="1"
              max="36"
              required
              class="w-full"
              size="xl"
              :ui="inputUi"
            />
          </UFormField>
          <template v-else>
            <p class="text-sm text-soft">The paid term is one year.</p>
            <UFormField label="Plan" required :class="formFieldClass">
              <USelect
                v-model="extendPlanCode"
                :items="planSelectItems"
                class="w-full"
                size="xl"
                :ui="selectUi"
              />
            </UFormField>
            <UFormField label="Amount" required :class="formFieldClass">
              <UInput
                v-model.number="extendAmount"
                type="number"
                min="0"
                required
                class="w-full"
                size="xl"
                :ui="inputUi"
              />
            </UFormField>
          </template>
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
              extendOpen = false;
            }
          "
        />
        <UButton
          label="Add period"
          color="neutral"
          :loading="isExtending"
          :class="ADMIN_SLIDEOVER_BUTTON_CLASS"
          type="submit"
          form="extend-form"
        />
      </template>
    </USlideover>
  </div>
</template>
