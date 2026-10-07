<script setup lang="ts">
definePageMeta({
  layout: 'thakhin',
});

import type { DropdownMenuItem, TableColumn } from '@nuxt/ui';
import { useQuery, useQueryClient } from '@tanstack/vue-query';
import {
  ORGANIZATION_TYPES,
  ORGANIZATION_TYPE_LABELS,
  type OrganizationType,
} from '~~/shared/utils/constants';
import { communityCardPath } from '~~/shared/utils/routes';
import { useThakhinTable } from '~/composables/thakhin-table';
import {
  THAKHIN_ACTIONS_COLUMN,
  THAKHIN_TABLE_UI,
  thakhinSortableHeader,
} from '~/utils/thakhin-table';

type OrgRow = {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  metadata: unknown;
  type: OrganizationType;
  createdAt: string;
  memberCount: number;
  cardCount: number;
};

type OrgCommunity = {
  description: string;
  guidelines: string;
  whyJoin: string;
  logoUrl: string;
  coverImageUrl: string;
  splineUrl: string;
  wallpaperUrl: string;
  cardBackUrl: string;
};

type OrgDetail = {
  id: string;
  name: string;
  slug: string;
  type: OrganizationType;
  createdAt: string;
  members: { id: string; role: string; userName: string; userEmail: string }[];
  cards: {
    id: string;
    slug: string;
    firstName: string;
    lastName: string | null;
    userId: string | null;
  }[];
  community: OrgCommunity | null;
};

const toast = useToast();
const queryClient = useQueryClient();
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
  applyToMemberCards: false,
});

const createForm = reactive({
  name: '',
  slug: '',
  type: ORGANIZATION_TYPES.COMMUNITY as OrganizationType,
  ownerUserId: undefined as string | undefined,
});

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

type UserOption = {
  id: string;
  name: string;
  email: string;
  label: string;
  avatar?: { src: string };
};

const { data: orgsData, isLoading: pending } = useQuery({
  queryKey: QUERY_KEYS.adminOrganizations,
  queryFn: () => $fetch<OrgRow[]>('/api/organizations/admin'),
});

const { data: usersData, isLoading: usersPending } = useQuery({
  queryKey: QUERY_KEYS.adminUsers,
  queryFn: () => $fetch<UserOption[]>('/api/users/admin'),
});

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
} = useThakhinTable(() => filteredRows.value.length);

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
  editForm.applyToMemberCards = false;
  isEditOpen.value = true;

  if (row.type !== ORGANIZATION_TYPES.COMMUNITY) return;

  const detail = await $fetch<{
    community: OrgCommunity | null;
  }>(`/api/organizations/admin/${row.id}`);
  if (editingRow.value?.id !== row.id || !detail.community) return;
  editForm.description = detail.community.description;
  editForm.guidelines = detail.community.guidelines;
  editForm.whyJoin = detail.community.whyJoin;
  editForm.logoUrl = detail.community.logoUrl;
  editForm.coverImageUrl = detail.community.coverImageUrl;
  editForm.splineUrl = detail.community.splineUrl;
  editForm.wallpaperUrl = detail.community.wallpaperUrl;
  editForm.cardBackUrl = detail.community.cardBackUrl;
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
    const saved = await $fetch<{ cardsUpdated?: number }>(
      `/api/organizations/admin/${editingRow.value.id}`,
      {
        method: 'PATCH',
        body: {
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
                applyToMemberCards: editForm.applyToMemberCards,
              }
            : {}),
        },
      }
    );
    await queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.adminOrganizations,
    });
    if ((saved.cardsUpdated || 0) > 0) {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminCards });
    }
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
      orgDetail.value = await $fetch<OrgDetail>(
        `/api/organizations/admin/${editedId}`
      );
    }
  } catch (error: any) {
    toast.add({
      title: 'Update failed',
      description:
        error?.data?.statusMessage ||
        error?.statusMessage ||
        'Please try again.',
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

  isCreating.value = true;
  try {
    await $fetch('/api/organizations/admin', {
      method: 'POST',
      body: {
        name,
        type: createForm.type,
        slug: createForm.slug.trim() || undefined,
        ownerUserId: createForm.ownerUserId || undefined,
      },
    });
    await queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.adminOrganizations,
    });
    toast.add({
      title: 'Organization created',
      color: 'success',
    });
    closeCreate();
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
    orgDetail.value = await $fetch<OrgDetail>(
      `/api/organizations/admin/${row.id}`
    );
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

function detailAsRow(): OrgRow | null {
  const detail = orgDetail.value;
  if (!detail) return null;
  return (
    rows.value.find((item) => item.id === detail.id) ?? {
      id: detail.id,
      name: detail.name,
      slug: detail.slug,
      logo: detail.community?.logoUrl || null,
      metadata: null,
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
    await $fetch(`/api/organizations/admin/${orgToDelete.value.id}`, {
      method: 'DELETE',
    });
    await queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.adminOrganizations,
    });
    await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminOverview });
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
  { accessorKey: 'name', header: thakhinSortableHeader('NAME') },
  { accessorKey: 'slug', header: thakhinSortableHeader('SLUG') },
  { accessorKey: 'memberCount', header: thakhinSortableHeader('MEMBERS') },
  { accessorKey: 'cardCount', header: thakhinSortableHeader('CARDS') },
  { accessorKey: 'type', header: thakhinSortableHeader('TYPE') },
  { accessorKey: 'createdAt', header: thakhinSortableHeader('CREATED') },
  THAKHIN_ACTIONS_COLUMN,
];

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

const selectMenuUi = {
  base: 'h-[47px] w-full rounded-[4px] border-[#2a2a2a] bg-[#232323] px-3 text-sm text-white',
  content: 'border border-[#2a2a2a] bg-[#232323]',
  item: 'text-white data-[highlighted]:bg-[#2a2a2a]',
  value: 'text-white',
  placeholder: 'text-white/50',
  input: 'bg-[#232323] text-white placeholder:text-white/50',
};
</script>

<template>
  <div class="flex flex-col gap-6">
    <ThakhinPageHeader
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
    </ThakhinPageHeader>

    <ThakhinTableFrame
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
        :ui="THAKHIN_TABLE_UI"
        class="w-full"
        @select="(_event, row) => openOrg(row.original)"
      >
        <template #name-cell="{ row }">
          <span class="font-medium text-white">{{ row.original.name }}</span>
        </template>
        <template #slug-cell="{ row }">
          <span class="font-mono text-xs text-white/55">{{ row.original.slug }}</span>
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
          <span class="text-white/55">{{ formatDate(row.original.createdAt) }}</span>
        </template>
        <template #actions-cell="{ row }">
          <ThakhinRowMenu :items="getActionItems(row.original)" />
        </template>
      </UTable>
    </ThakhinTableFrame>

    <USlideover
      v-model:open="isCreateOpen"
      side="right"
      inset
      title="CREATE ORGANIZATION"
      :ui="{
        header: 'border-b-2 border-[#232323] px-6 py-6',
        title: 'text-sm font-medium tracking-[1.4px] text-white uppercase',
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
            <UFormField label="Owner" :class="formFieldClass">
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

          <div
            class="mt-6 flex justify-end gap-2 border-t border-[#232323] pt-6"
          >
            <UButton
              size="xl"
              label="Cancel"
              color="neutral"
              variant="ghost"
              class="rounded-full px-5 text-white hover:bg-[#232323]"
              @click="closeCreate"
            />
            <UButton
              size="xl"
              label="Create"
              color="neutral"
              :loading="isCreating"
              class="rounded-full bg-white px-6 font-medium text-dark hover:bg-white/90"
              @click="onCreate"
            />
          </div>
        </div>
      </template>
    </USlideover>

    <USlideover
      v-model:open="isEditOpen"
      side="right"
      inset
      title="EDIT ORGANIZATION"
      :ui="{
        header: 'border-b-2 border-[#232323] px-6 py-6',
        title: 'text-sm font-medium tracking-[1.4px] text-white uppercase',
        body: 'px-6',
      }"
    >
      <template #body>
        <div class="py-2">
          <p class="mb-4 text-sm leading-relaxed text-[#8b8b8b]">
            Changing the slug updates platform URLs that use
            <span class="font-mono text-white/80"
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
              <div class="rounded-lg border border-white/10 bg-white/[0.03] p-4">
                <UCheckbox
                  v-model="editForm.applyToMemberCards"
                  label="Update existing member cards"
                  :ui="{ label: 'text-sm font-medium text-white' }"
                />
                <p class="mt-2 text-xs leading-relaxed text-white/50">
                  Member cards keep the spline, wallpaper, and card back they
                  received when they joined. Turn this on to copy the three
                  values above onto every card in this community.
                </p>
              </div>
              <UFormField label="Description" :class="formFieldClass">
                <CommunityRichTextEditor
                  v-model="editForm.description"
                  placeholder="Describe the community"
                />
              </UFormField>
              <UFormField label="Guidelines" :class="formFieldClass">
                <CommunityRichTextEditor
                  v-model="editForm.guidelines"
                  placeholder="Community guidelines"
                />
              </UFormField>
              <UFormField label="Why join" :class="formFieldClass">
                <CommunityRichTextEditor
                  v-model="editForm.whyJoin"
                  placeholder="Why people should join"
                />
              </UFormField>
            </template>
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
              @click="closeEdit"
            />
            <UButton
              size="xl"
              label="Save"
              color="neutral"
              :loading="isSaving"
              class="rounded-full bg-white px-6 font-medium text-dark hover:bg-white/90"
              @click="onSaveEdit"
            />
          </div>
        </div>
      </template>
    </USlideover>

    <USlideover
      v-model:open="orgOpen"
      side="right"
      inset
      :title="orgDetail?.name || 'Organization'"
      :ui="{
        content: 'bg-[#121212]',
        header: 'border-b-2 border-[#232323] px-6 py-6',
        title: 'truncate text-lg font-medium text-white',
        body: 'px-6',
        footer: 'border-t border-[#232323] px-6 py-4',
      }"
    >
      <template #body>
        <div v-if="orgLoading" class="py-10 text-sm text-white/45">
          Loading organization…
        </div>
        <div v-else-if="orgDetail" class="space-y-8 py-2">
          <div class="flex items-start justify-between gap-4">
            <div class="min-w-0">
              <p class="truncate font-mono text-xs text-white/45">
                /{{ orgDetail.slug }}
              </p>
              <p class="mt-1 text-xs text-white/40">
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
            <div class="rounded-lg border border-white/10 px-4 py-3">
              <p class="text-xs text-white/45">Members</p>
              <p class="mt-1 text-2xl font-semibold tabular-nums text-white">
                {{ orgDetail.members.length }}
              </p>
            </div>
            <div class="rounded-lg border border-white/10 px-4 py-3">
              <p class="text-xs text-white/45">Cards</p>
              <p class="mt-1 text-2xl font-semibold tabular-nums text-white">
                {{ orgDetail.cards.length }}
              </p>
            </div>
          </div>

          <section v-if="orgDetail.community" class="space-y-3">
            <h3 class="text-xs font-medium tracking-wide text-white/45 uppercase">
              Brand
            </h3>
            <dl class="divide-y divide-white/10 overflow-hidden rounded-lg border border-white/10">
              <div v-for="row in brandRows" :key="row.label" class="px-4 py-3">
                <dt class="text-xs text-white/45">{{ row.label }}</dt>
                <dd class="mt-1 break-all font-mono text-xs leading-relaxed text-white/85">
                  {{ row.value || '—' }}
                </dd>
              </div>
            </dl>
          </section>

          <section v-if="copyRows.length" class="space-y-4">
            <div v-for="row in copyRows" :key="row.label">
              <h3 class="text-xs font-medium tracking-wide text-white/45 uppercase">
                {{ row.label }}
              </h3>
              <p class="mt-2 line-clamp-4 text-sm leading-relaxed text-white/75">
                {{ row.value }}
              </p>
            </div>
          </section>

          <section class="space-y-3">
            <h3 class="text-xs font-medium tracking-wide text-white/45 uppercase">
              Members
            </h3>
            <p v-if="orgDetail.members.length === 0" class="text-sm text-white/45">
              No members.
            </p>
            <ul v-else class="divide-y divide-white/10 overflow-hidden rounded-lg border border-white/10">
              <li
                v-for="member in orgDetail.members"
                :key="member.id"
                class="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div class="min-w-0">
                  <p class="truncate text-sm text-white">{{ member.userName }}</p>
                  <p class="truncate text-xs text-white/45">{{ member.userEmail }}</p>
                </div>
                <UBadge color="neutral" variant="subtle" class="shrink-0 capitalize">
                  {{ member.role }}
                </UBadge>
              </li>
            </ul>
          </section>

          <section class="space-y-3">
            <h3 class="text-xs font-medium tracking-wide text-white/45 uppercase">
              Cards
            </h3>
            <p v-if="orgDetail.cards.length === 0" class="text-sm text-white/45">
              No cards.
            </p>
            <ul v-else class="divide-y divide-white/10 overflow-hidden rounded-lg border border-white/10">
              <li
                v-for="item in orgDetail.cards"
                :key="item.id"
                class="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div class="min-w-0">
                  <p class="truncate text-sm text-white">
                    {{ [item.firstName, item.lastName].filter(Boolean).join(' ') || item.slug }}
                  </p>
                  <p class="truncate font-mono text-xs text-white/45">/c/{{ item.slug }}</p>
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
        <div class="flex justify-end gap-2">
          <UButton
            label="Delete"
            color="error"
            variant="ghost"
            @click="openDeleteFromDetail"
          />
          <UButton
            label="Edit"
            color="neutral"
            class="rounded-full bg-white px-5 font-medium text-dark hover:bg-white/90"
            @click="openEditFromDetail"
          />
        </div>
      </template>
    </USlideover>

    <UModal
      v-model:open="isDeleteOpen"
      :close="false"
      :dismissible="!isDeleting"
      :ui="{ content: 'bg-[#171717] max-w-md' }"
      title="Delete organization?"
    >
      <template #body>
        <div class="space-y-3 text-sm leading-relaxed text-white/70">
          <p v-if="(orgToDelete?.cardCount || 0) > 0">
            <span class="font-medium text-white">{{ orgToDelete?.name }}</span>
            still has {{ orgToDelete?.cardCount }}
            {{ orgToDelete?.cardCount === 1 ? 'card' : 'cards' }}.
            Delete or move those cards first. Deleting the organization would
            remove them.
          </p>
          <template v-else-if="orgToDelete">
            <p>
              <span class="font-medium text-white">{{ orgToDelete?.name }}</span>
              will be removed.
              {{ orgToDelete?.memberCount || 0 }}
              {{ orgToDelete?.memberCount === 1 ? 'member stays' : 'members stay' }}
              as accounts and leave this organization.
            </p>
            <p>Payment history blocks deletion. The placeholder organization cannot be deleted.</p>
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
