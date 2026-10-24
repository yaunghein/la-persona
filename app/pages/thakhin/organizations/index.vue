<script setup lang="ts">
definePageMeta({
  layout: 'thakhin',
});

import type { DropdownMenuItem, TableColumn } from '@nuxt/ui';
import {
  ORGANIZATION_TYPES,
  ORGANIZATION_TYPE_LABELS,
  type OrganizationType,
} from '~~/shared/utils/constants';
import { communityCardPath } from '~~/shared/utils/routes';
import {
  ADMIN_ACTIONS_COLUMN,
  ADMIN_TABLE_UI,
  sortableHeader,
} from '~/features/admin/utils/admin-table';
import type {
  AdminOrganizationDetail,
  AdminOrganizationSummary,
} from '~~/shared/contracts/organization';

type OrgRow = AdminOrganizationSummary;
type OrgDetail = AdminOrganizationDetail;

const toast = useToast();
const invalidateAdmin = useInvalidateAdmin();
const route = useRoute();

const isEditOpen = ref(false);
const isCreateOpen = ref(false);
const editingRow = ref<OrgRow | null>(null);
const isSaving = ref(false);
const isCreating = ref(false);
const isDeleteOpen = ref(false);
const isDeleting = ref(false);
const orgToDelete = ref<OrgRow | null>(null);

const editForm = reactive({
  name: '',
  slug: '',
  description: '',
  guidelines: '',
  whyJoin: '',
  logoUrl: '',
  coverImageUrl: '',
  splineUrl: '',
  wallpaperUrl: '',
  cardBackUrl: '',
  emailQrBackgroundUrl: '',
  emailContactExchangeUrl: '',
  emailAfterEventUrl: '',
  applyToMemberCards: false,
});

const createForm = reactive({
  name: '',
  slug: '',
  type: ORGANIZATION_TYPES.COMMUNITY as OrganizationType,
  ownerUserId: undefined as string | undefined,
  ownerEmail: '',
});
const isCreatingCommunity = computed(
  () => createForm.type === ORGANIZATION_TYPES.COMMUNITY
);

const typeItems = [
  {
    label: ORGANIZATION_TYPE_LABELS[ORGANIZATION_TYPES.PERSONAL],
    value: ORGANIZATION_TYPES.PERSONAL,
  },
  {
    label: ORGANIZATION_TYPE_LABELS[ORGANIZATION_TYPES.COMMUNITY],
    value: ORGANIZATION_TYPES.COMMUNITY,
  },
];

const { data: orgsData, isLoading: pending } = useAdminOrganizationsQuery();
const { data: usersData, isLoading: usersPending } = useAdminUsersQuery();

const userItems = computed(() => usersData.value || []);

const rows = computed(() => orgsData.value || []);
const typeFilter = ref<'all' | OrganizationType>('all');

const typeFilterItems = [{ label: 'All types', value: 'all' }, ...typeItems];

const filteredRows = computed(() => {
  if (typeFilter.value === 'all') return rows.value;
  return rows.value.filter((row) => row.type === typeFilter.value);
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

watch(typeFilter, resetPage);

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

async function openEdit(row: OrgRow) {
  editingRow.value = row;
  editForm.name = row.name;
  editForm.slug = row.slug;
  editForm.description = '';
  editForm.guidelines = '';
  editForm.whyJoin = '';
  editForm.logoUrl = row.logo || '';
  editForm.coverImageUrl = '';
  editForm.splineUrl = '';
  editForm.wallpaperUrl = '';
  editForm.cardBackUrl = '';
  editForm.emailQrBackgroundUrl = '';
  editForm.emailContactExchangeUrl = '';
  editForm.emailAfterEventUrl = '';
  editForm.applyToMemberCards = false;
  isEditOpen.value = true;

  if (row.type !== ORGANIZATION_TYPES.COMMUNITY) return;

  const detail = await adminApi.getOrganization(row.id);
  if (editingRow.value?.id !== row.id || !detail.community) return;
  editForm.description = detail.community.description;
  editForm.guidelines = detail.community.guidelines;
  editForm.whyJoin = detail.community.whyJoin;
  editForm.logoUrl = detail.community.logoUrl;
  editForm.coverImageUrl = detail.community.coverImageUrl;
  editForm.splineUrl = detail.community.splineUrl;
  editForm.wallpaperUrl = detail.community.wallpaperUrl;
  editForm.cardBackUrl = detail.community.cardBackUrl;
  editForm.emailQrBackgroundUrl = detail.community.emailQrBackgroundUrl;
  editForm.emailContactExchangeUrl = detail.community.emailContactExchangeUrl;
  editForm.emailAfterEventUrl = detail.community.emailAfterEventUrl;
}

function closeEdit() {
  isEditOpen.value = false;
  editingRow.value = null;
}

function openCreate() {
  createForm.name = '';
  createForm.slug = '';
  createForm.type = ORGANIZATION_TYPES.COMMUNITY;
  createForm.ownerUserId = undefined;
  createForm.ownerEmail = '';
  isCreateOpen.value = true;
}

function closeCreate() {
  isCreateOpen.value = false;
}

async function onSaveEdit() {
  if (!editingRow.value) return;
  const name = editForm.name.trim();
  const slug = editForm.slug.trim();
  if (!name || !slug) {
    toast.add({
      title: 'Missing fields',
      description: 'Name and slug are required.',
      color: 'warning',
    });
    return;
  }

  isSaving.value = true;
  try {
    const saved = await adminApi.updateOrganization(editingRow.value.id, {
      name,
      slug,
      ...(editingRow.value.type === ORGANIZATION_TYPES.COMMUNITY
        ? {
            description: editForm.description,
            guidelines: editForm.guidelines,
            whyJoin: editForm.whyJoin,
            logoUrl: editForm.logoUrl,
            coverImageUrl: editForm.coverImageUrl,
            splineUrl: editForm.splineUrl,
            wallpaperUrl: editForm.wallpaperUrl,
            cardBackUrl: editForm.cardBackUrl,
            emailQrBackgroundUrl: editForm.emailQrBackgroundUrl,
            emailContactExchangeUrl: editForm.emailContactExchangeUrl,
            emailAfterEventUrl: editForm.emailAfterEventUrl,
            applyToMemberCards: editForm.applyToMemberCards,
          }
        : {}),
    });
    await invalidateAdmin();
    const cardsUpdated = saved.cardsUpdated || 0;
    toast.add({
      title: 'Organization updated',
      description: editForm.applyToMemberCards
        ? cardsUpdated > 0
          ? `Copied spline, wallpaper, and card back onto ${cardsUpdated} member ${cardsUpdated === 1 ? 'card' : 'cards'}.`
          : 'No member cards to update.'
        : undefined,
      color: 'success',
    });
    const editedId = editingRow.value.id;
    closeEdit();
    if (orgOpen.value && orgDetail.value?.id === editedId) {
      orgDetail.value = await adminApi.getOrganization(editedId);
    }
  } catch (error: any) {
    toast.add({
      title: 'Update failed',
      description: apiErrorMessage(error),
      color: 'error',
    });
  } finally {
    isSaving.value = false;
  }
}

async function onCreate() {
  const name = createForm.name.trim();
  if (!name) {
    toast.add({
      title: 'Missing fields',
      description: 'Name is required.',
      color: 'warning',
    });
    return;
  }

  const ownerEmail = createForm.ownerEmail.trim();
  isCreating.value = true;
  try {
    await adminApi.createOrganization({
      name,
      type: createForm.type,
      slug: createForm.slug.trim() || undefined,
      ...(isCreatingCommunity.value
        ? { ownerEmail: ownerEmail || undefined }
        : { ownerUserId: createForm.ownerUserId || undefined }),
    });
    await invalidateAdmin();
    toast.add({
      title: 'Organization created',
      description:
        isCreatingCommunity.value && ownerEmail
          ? `Owner invitation sent to ${ownerEmail}.`
          : undefined,
      color: 'success',
    });
    closeCreate();
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

function getActionItems(row: OrgRow): DropdownMenuItem[][] {
  return [
    [
      {
        label: 'View',
        icon: 'i-lucide-eye',
        onSelect: () => openOrg(row),
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

const orgDetail = ref<OrgDetail | null>(null);
const orgOpen = ref(false);
const orgLoading = ref(false);

async function openOrg(row: OrgRow) {
  orgOpen.value = true;
  orgLoading.value = true;
  orgDetail.value = null;
  try {
    orgDetail.value = await adminApi.getOrganization(row.id);
  } catch (error: any) {
    orgOpen.value = false;
    toast.add({
      title: 'Could not open organization',
      description: error?.data?.statusMessage || 'Please try again.',
      color: 'error',
    });
  } finally {
    orgLoading.value = false;
  }
}

const creatingCardFor = ref<string | null>(null);

function needsCommunityCard(userId: string) {
  const detail = orgDetail.value;
  return (
    detail?.type === ORGANIZATION_TYPES.COMMUNITY &&
    !detail.cards.some((item) => item.userId === userId)
  );
}

async function createMemberCard(userId: string) {
  const detail = orgDetail.value;
  if (!detail) return;
  creatingCardFor.value = userId;
  try {
    await adminApi.createMemberCard(detail.id, userId);
    orgDetail.value = await adminApi.getOrganization(detail.id);
    await invalidateAdmin();
    toast.add({ title: 'Community card created', color: 'success' });
  } catch (error) {
    toast.add({
      title: 'Could not create card',
      description: apiErrorMessage(error),
      color: 'error',
    });
  } finally {
    creatingCardFor.value = null;
  }
}

function detailAsRow(): OrgRow | null {
  const detail = orgDetail.value;
  if (!detail) return null;
  return (
    rows.value.find((item) => item.id === detail.id) ?? {
      id: detail.id,
      name: detail.name,
      slug: detail.slug,
      logo: detail.community?.logoUrl || null,
      type: detail.type,
      createdAt: detail.createdAt,
      memberCount: detail.members.length,
      cardCount: detail.cards.length,
    }
  );
}

function openEditFromDetail() {
  const row = detailAsRow();
  if (!row) return;
  orgOpen.value = false;
  openEdit(row);
}

function openDeleteFromDetail() {
  const row = detailAsRow();
  if (row) openDelete(row);
}

function plainText(value: string) {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const brandRows = computed(() => {
  const community = orgDetail.value?.community;
  if (!community) return [];
  return [
    { label: 'Spline', value: community.splineUrl },
    { label: 'Wallpaper', value: community.wallpaperUrl },
    { label: 'Card back', value: community.cardBackUrl },
    { label: 'Logo', value: community.logoUrl },
    { label: 'Cover', value: community.coverImageUrl },
    { label: 'Email QR background', value: community.emailQrBackgroundUrl },
    {
      label: 'Email contact exchange',
      value: community.emailContactExchangeUrl,
    },
    { label: 'Email after event', value: community.emailAfterEventUrl },
  ];
});

const copyRows = computed(() => {
  const community = orgDetail.value?.community;
  if (!community) return [];
  return [
    { label: 'Description', value: plainText(community.description) },
    { label: 'Guidelines', value: plainText(community.guidelines) },
    { label: 'Why join', value: plainText(community.whyJoin) },
  ].filter((row) => row.value);
});

watch(
  () => [route.query.focus, (orgsData.value || []).length] as const,
  () => {
    const id = String(route.query.focus || '');
    if (!id) return;
    const row = (orgsData.value || []).find((item) => item.id === id);
    if (row) openOrg(row);
  }
);

function openDelete(row: OrgRow) {
  orgToDelete.value = row;
  isDeleteOpen.value = true;
}

function closeDelete() {
  if (isDeleting.value) return;
  isDeleteOpen.value = false;
  orgToDelete.value = null;
}

async function onConfirmDelete() {
  if (!orgToDelete.value || orgToDelete.value.cardCount > 0) return;
  isDeleting.value = true;
  try {
    await adminApi.deleteOrganization(orgToDelete.value.id);
    await invalidateAdmin();
    toast.add({
      title: 'Organization deleted',
      description: `${orgToDelete.value.name} was removed. Member accounts were kept.`,
      color: 'success',
    });
    isDeleteOpen.value = false;
    orgOpen.value = false;
    orgToDelete.value = null;
  } catch (error: any) {
    toast.add({
      title: 'Delete failed',
      description: error?.data?.statusMessage || 'Please try again.',
      color: 'error',
    });
  } finally {
    isDeleting.value = false;
  }
}

function typeBadgeColor(type: OrganizationType) {
  return type === ORGANIZATION_TYPES.PERSONAL ? 'neutral' : 'primary';
}

const columns: TableColumn<OrgRow>[] = [
  { accessorKey: 'name', header: sortableHeader('NAME') },
  { accessorKey: 'slug', header: sortableHeader('SLUG') },
  { accessorKey: 'memberCount', header: sortableHeader('MEMBERS') },
  { accessorKey: 'cardCount', header: sortableHeader('CARDS') },
  { accessorKey: 'type', header: sortableHeader('TYPE') },
  { accessorKey: 'createdAt', header: sortableHeader('CREATED') },
  ADMIN_ACTIONS_COLUMN,
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

const selectMenuUi = {
  base: 'h-[47px] w-full rounded-[4px] border-line bg-raised px-3 text-sm text-ink',
  content: 'border border-line bg-raised',
  item: 'text-ink data-[highlighted]:bg-line',
  value: 'text-ink',
  placeholder: 'text-ink/50',
  input: 'bg-raised text-ink placeholder:text-ink/50',
};
</script>

<template>
  <div class="flex flex-col gap-6">
    <AdminPageHeader
      title="Organizations"
      description="Create a personal or community organization, correct its name, slug, and community settings, or delete one that has no cards and no payments."
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
          placeholder="Search name or slug"
          class="w-64"
          size="sm"
        />
        <USelect
          v-model="typeFilter"
          :items="typeFilterItems"
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
        class="w-full"
        @select="(_event, row) => openOrg(row.original)"
      >
        <template #name-cell="{ row }">
          <span class="font-medium text-ink">{{ row.original.name }}</span>
        </template>
        <template #slug-cell="{ row }">
          <span class="font-mono text-xs text-ink/55">{{
            row.original.slug
          }}</span>
        </template>
        <template #memberCount-cell="{ row }">
          {{ row.original.memberCount }}
        </template>
        <template #cardCount-cell="{ row }">
          {{ row.original.cardCount }}
        </template>
        <template #type-cell="{ row }">
          <UBadge :color="typeBadgeColor(row.original.type)" variant="subtle">
            {{ ORGANIZATION_TYPE_LABELS[row.original.type] }}
          </UBadge>
        </template>
        <template #createdAt-cell="{ row }">
          <span class="text-ink/55">{{
            formatDate(row.original.createdAt)
          }}</span>
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
      title="CREATE ORGANIZATION"
      :ui="{
        header: 'border-b-2 border-raised px-6 py-6',
        title: 'text-sm font-medium tracking-[1.4px] text-ink uppercase',
        body: 'px-6',
      }"
    >
      <template #body>
        <div class="py-2">
          <div class="flex flex-col gap-4">
            <UFormField label="Name" required :class="formFieldClass">
              <UInput
                v-model="createForm.name"
                placeholder="Organization name"
                class="w-full"
                size="xl"
                :ui="inputUi"
              />
            </UFormField>
            <UFormField label="Type" required :class="formFieldClass">
              <USelect
                v-model="createForm.type"
                :items="typeItems"
                class="w-full"
                size="xl"
                :ui="selectUi"
              />
            </UFormField>
            <UFormField label="Slug" :class="formFieldClass">
              <UInput
                v-model="createForm.slug"
                placeholder="optional — auto from name"
                class="w-full"
                size="xl"
                :ui="inputUi"
              />
            </UFormField>
            <UFormField
              v-if="isCreatingCommunity"
              label="Owner email"
              :class="formFieldClass"
            >
              <UInput
                v-model="createForm.ownerEmail"
                type="email"
                placeholder="We'll email them an invitation"
                class="w-full"
                size="xl"
                :ui="inputUi"
              />
            </UFormField>
            <UFormField v-else label="Owner" :class="formFieldClass">
              <USelectMenu
                v-model="createForm.ownerUserId"
                value-key="id"
                :items="userItems"
                :loading="usersPending"
                clear
                placeholder="Search users by name or email..."
                :search-input="{
                  placeholder: 'Search...',
                  icon: 'i-lucide-search',
                }"
                :filter-fields="['label', 'name', 'email']"
                class="w-full"
                size="xl"
                :ui="selectMenuUi"
              />
            </UFormField>
          </div>
        </div>
      </template>

      <template #footer>
        <UButton
          label="Cancel"
          color="neutral"
          variant="ghost"
          class="h-10 cursor-pointer rounded-full px-5 text-sm font-medium text-subtle hover:bg-raised hover:text-ink"
          @click="closeCreate"
        />
        <UButton
          label="Create"
          color="neutral"
          :loading="isCreating"
          class="h-10 cursor-pointer rounded-full bg-ink px-5 text-sm font-medium text-ink-inverse hover:bg-ink/90"
          @click="onCreate"
        />
      </template>
    </USlideover>

    <USlideover
      v-model:open="isEditOpen"
      side="right"
      inset
      title="EDIT ORGANIZATION"
      :ui="{
        header: 'border-b-2 border-raised px-6 py-6',
        title: 'text-sm font-medium tracking-[1.4px] text-ink uppercase',
        body: 'px-6',
      }"
    >
      <template #body>
        <div class="py-2">
          <p class="mb-4 text-sm leading-relaxed text-subtle">
            Changing the slug updates platform URLs that use
            <span class="font-mono text-ink/80"
              >/platform/{{ editForm.slug || '…' }}/…</span
            >. Bookmarks and shared links with the old slug will stop working
            until updated.
          </p>
          <div class="flex flex-col gap-4">
            <UFormField label="Name" required :class="formFieldClass">
              <UInput
                v-model="editForm.name"
                placeholder="Organization name"
                class="w-full"
                size="xl"
                :ui="inputUi"
              />
            </UFormField>
            <UFormField label="Slug" required :class="formFieldClass">
              <UInput
                v-model="editForm.slug"
                placeholder="e.g. acme-corp"
                class="w-full"
                size="xl"
                :ui="inputUi"
              />
            </UFormField>
            <template v-if="editingRow?.type === ORGANIZATION_TYPES.COMMUNITY">
              <UFormField label="Logo URL" :class="formFieldClass">
                <UInput
                  v-model="editForm.logoUrl"
                  placeholder="https://"
                  class="w-full"
                  size="xl"
                  :ui="inputUi"
                />
              </UFormField>
              <UFormField label="Cover image URL" :class="formFieldClass">
                <UInput
                  v-model="editForm.coverImageUrl"
                  placeholder="https://"
                  class="w-full"
                  size="xl"
                  :ui="inputUi"
                />
              </UFormField>
              <UFormField label="Spline URL" :class="formFieldClass">
                <UInput
                  v-model="editForm.splineUrl"
                  placeholder="https://prod.spline.design/…"
                  class="w-full"
                  size="xl"
                  :ui="inputUi"
                />
              </UFormField>
              <UFormField label="Wallpaper" :class="formFieldClass">
                <UInput
                  v-model="editForm.wallpaperUrl"
                  placeholder="URL or storage key"
                  class="w-full"
                  size="xl"
                  :ui="inputUi"
                />
              </UFormField>
              <UFormField label="Card back" :class="formFieldClass">
                <UInput
                  v-model="editForm.cardBackUrl"
                  placeholder="URL or storage key"
                  class="w-full"
                  size="xl"
                  :ui="inputUi"
                />
              </UFormField>
              <div class="rounded-lg border border-ink/10 bg-ink/[0.03] p-4">
                <UCheckbox
                  v-model="editForm.applyToMemberCards"
                  label="Update existing member cards"
                  :ui="{ label: 'text-sm font-medium text-ink' }"
                />
                <p class="mt-2 text-xs leading-relaxed text-ink/50">
                  Member cards keep the spline, wallpaper, and card back they
                  received when they joined. Turn this on to copy the three
                  values above onto every card in this community.
                </p>
              </div>
              <div
                v-if="editingRow"
                class="flex flex-col gap-6 border-y border-raised py-6"
              >
                <p
                  class="text-sm font-medium tracking-[1.4px] text-ink uppercase"
                >
                  Email images
                </p>
                <AdminImageUploadField
                  v-model="editForm.emailQrBackgroundUrl"
                  :organization-id="editingRow.id"
                  label="QR ticket background"
                  hint="Use the ticket template layout (952 × 936). The QR is placed by position, so the white ticket must stay in the same spot."
                  empty-text="Not set: emails use the default ticket background."
                />
                <AdminImageUploadField
                  v-model="editForm.emailContactExchangeUrl"
                  :organization-id="editingRow.id"
                  label="Contact exchange (reminder email)"
                  hint="Two phones exchanging cards, 952 px wide."
                  empty-text="Not set: the reminder email hides this image."
                />
                <AdminImageUploadField
                  v-model="editForm.emailAfterEventUrl"
                  :organization-id="editingRow.id"
                  label="Community card uses (after-event email)"
                  hint="The three-panel image (share, stay ready, register), 952 px wide."
                  empty-text="Not set: the after-event email hides this image."
                />
              </div>
              <UFormField label="Description" :class="formFieldClass">
                <UiRichTextEditor
                  v-model="editForm.description"
                  placeholder="Describe the community"
                />
              </UFormField>
              <UFormField label="Guidelines" :class="formFieldClass">
                <UiRichTextEditor
                  v-model="editForm.guidelines"
                  placeholder="Community guidelines"
                />
              </UFormField>
              <UFormField label="Why join" :class="formFieldClass">
                <UiRichTextEditor
                  v-model="editForm.whyJoin"
                  placeholder="Why people should join"
                />
              </UFormField>
            </template>
          </div>
        </div>
      </template>

      <template #footer>
        <UButton
          label="Cancel"
          color="neutral"
          variant="ghost"
          class="h-10 cursor-pointer rounded-full px-5 text-sm font-medium text-subtle hover:bg-raised hover:text-ink"
          @click="closeEdit"
        />
        <UButton
          label="Save"
          color="neutral"
          :loading="isSaving"
          class="h-10 cursor-pointer rounded-full bg-ink px-5 text-sm font-medium text-ink-inverse hover:bg-ink/90"
          @click="onSaveEdit"
        />
      </template>
    </USlideover>

    <USlideover
      v-model:open="orgOpen"
      side="right"
      inset
      :title="orgDetail?.name || 'Organization'"
      :ui="{
        content: 'bg-canvas',
        header: 'border-b-2 border-raised px-6 py-6',
        title: 'truncate text-lg font-medium text-ink',
        body: 'px-6',
      }"
    >
      <template #body>
        <div v-if="orgLoading" class="py-10 text-sm text-ink/45">
          Loading organization…
        </div>
        <div v-else-if="orgDetail" class="space-y-8 py-2">
          <div class="flex items-start justify-between gap-4">
            <div class="min-w-0">
              <p class="truncate font-mono text-xs text-ink/45">
                /{{ orgDetail.slug }}
              </p>
              <p class="mt-1 text-xs text-ink/40">
                Created {{ formatDate(orgDetail.createdAt) }}
              </p>
            </div>
            <UBadge
              :color="typeBadgeColor(orgDetail.type)"
              variant="subtle"
              class="shrink-0"
            >
              {{ ORGANIZATION_TYPE_LABELS[orgDetail.type] }}
            </UBadge>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="rounded-lg border border-ink/10 px-4 py-3">
              <p class="text-xs text-ink/45">Members</p>
              <p class="mt-1 text-2xl font-semibold tabular-nums text-ink">
                {{ orgDetail.members.length }}
              </p>
            </div>
            <div class="rounded-lg border border-ink/10 px-4 py-3">
              <p class="text-xs text-ink/45">Cards</p>
              <p class="mt-1 text-2xl font-semibold tabular-nums text-ink">
                {{ orgDetail.cards.length }}
              </p>
            </div>
          </div>

          <section v-if="orgDetail.community" class="space-y-3">
            <h3 class="text-xs font-medium tracking-wide text-ink/45 uppercase">
              Brand
            </h3>
            <dl
              class="divide-y divide-ink/10 overflow-hidden rounded-lg border border-ink/10"
            >
              <div v-for="row in brandRows" :key="row.label" class="px-4 py-3">
                <dt class="text-xs text-ink/45">{{ row.label }}</dt>
                <dd
                  class="mt-1 break-all font-mono text-xs leading-relaxed text-ink/85"
                >
                  {{ row.value || '—' }}
                </dd>
              </div>
            </dl>
          </section>

          <section v-if="copyRows.length" class="space-y-4">
            <div v-for="row in copyRows" :key="row.label">
              <h3
                class="text-xs font-medium tracking-wide text-ink/45 uppercase"
              >
                {{ row.label }}
              </h3>
              <p class="mt-2 line-clamp-4 text-sm leading-relaxed text-ink/75">
                {{ row.value }}
              </p>
            </div>
          </section>

          <section class="space-y-3">
            <h3 class="text-xs font-medium tracking-wide text-ink/45 uppercase">
              Members
            </h3>
            <p
              v-if="orgDetail.members.length === 0"
              class="text-sm text-ink/45"
            >
              No members.
            </p>
            <ul
              v-else
              class="divide-y divide-ink/10 overflow-hidden rounded-lg border border-ink/10"
            >
              <li
                v-for="member in orgDetail.members"
                :key="member.id"
                class="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div class="min-w-0">
                  <p class="truncate text-sm text-ink">
                    {{ member.userName }}
                  </p>
                  <p class="truncate text-xs text-ink/45">
                    {{ member.userEmail }}
                  </p>
                </div>
                <div class="flex shrink-0 items-center gap-2">
                  <UButton
                    v-if="needsCommunityCard(member.userId)"
                    label="Create card"
                    size="xs"
                    color="neutral"
                    variant="soft"
                    icon="i-lucide-id-card"
                    :loading="creatingCardFor === member.userId"
                    :disabled="!!creatingCardFor"
                    @click="createMemberCard(member.userId)"
                  />
                  <UBadge color="neutral" variant="subtle" class="capitalize">
                    {{ member.role }}
                  </UBadge>
                </div>
              </li>
            </ul>
          </section>

          <section class="space-y-3">
            <h3 class="text-xs font-medium tracking-wide text-ink/45 uppercase">
              Cards
            </h3>
            <p v-if="orgDetail.cards.length === 0" class="text-sm text-ink/45">
              No cards.
            </p>
            <ul
              v-else
              class="divide-y divide-ink/10 overflow-hidden rounded-lg border border-ink/10"
            >
              <li
                v-for="item in orgDetail.cards"
                :key="item.id"
                class="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div class="min-w-0">
                  <p class="truncate text-sm text-ink">
                    {{
                      [item.firstName, item.lastName]
                        .filter(Boolean)
                        .join(' ') || item.slug
                    }}
                  </p>
                  <p class="truncate font-mono text-xs text-ink/45">
                    /c/{{ item.slug }}
                  </p>
                </div>
                <div class="flex shrink-0 items-center gap-2">
                  <UBadge v-if="!item.userId" color="warning" variant="subtle">
                    Unclaimed
                  </UBadge>
                  <UButton
                    :to="communityCardPath(item.slug)"
                    target="_blank"
                    size="xs"
                    color="neutral"
                    variant="ghost"
                    icon="i-lucide-external-link"
                    aria-label="Open card"
                  />
                </div>
              </li>
            </ul>
          </section>
        </div>
      </template>
      <template v-if="orgDetail" #footer>
        <UButton
          label="Delete"
          leading-icon="i-lucide-trash-2"
          color="error"
          variant="soft"
          class="h-10 cursor-pointer rounded-full px-5 text-sm font-medium"
          @click="openDeleteFromDetail"
        />
        <UButton
          label="Edit"
          leading-icon="i-lucide-pencil"
          color="neutral"
          class="h-10 cursor-pointer rounded-full bg-ink px-5 text-sm font-medium text-ink-inverse hover:bg-ink/90"
          @click="openEditFromDetail"
        />
      </template>
    </USlideover>

    <UModal
      v-model:open="isDeleteOpen"
      :close="false"
      :dismissible="!isDeleting"
      :ui="{ content: 'bg-surface max-w-md' }"
      title="Delete organization?"
    >
      <template #body>
        <div class="space-y-3 text-sm leading-relaxed text-ink/70">
          <p v-if="(orgToDelete?.cardCount || 0) > 0">
            <span class="font-medium text-ink">{{ orgToDelete?.name }}</span>
            still has {{ orgToDelete?.cardCount }}
            {{ orgToDelete?.cardCount === 1 ? 'card' : 'cards' }}. Delete or
            move those cards first. Deleting the organization would remove them.
          </p>
          <template v-else-if="orgToDelete">
            <p>
              <span class="font-medium text-ink">{{ orgToDelete?.name }}</span>
              will be removed.
              {{ orgToDelete?.memberCount || 0 }}
              {{
                orgToDelete?.memberCount === 1 ? 'member stays' : 'members stay'
              }}
              as accounts and leave this organization.
            </p>
            <p>
              Payment history blocks deletion. The placeholder organization
              cannot be deleted.
            </p>
          </template>
        </div>
      </template>
      <template #footer>
        <UButton
          label="Cancel"
          color="neutral"
          variant="ghost"
          :disabled="isDeleting"
          @click="closeDelete"
        />
        <UButton
          v-if="orgToDelete && orgToDelete.cardCount === 0"
          label="Delete"
          color="error"
          :loading="isDeleting"
          @click="onConfirmDelete"
        />
      </template>
    </UModal>
  </div>
</template>
