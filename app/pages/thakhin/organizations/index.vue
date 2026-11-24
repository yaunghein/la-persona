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
import type { AdminOrganizationSummary } from '~~/shared/contracts/organization';

type OrgRow = AdminOrganizationSummary;

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
const isAssetsOpen = ref(false);
const assetsOrg = ref<OrgRow | null>(null);

const editForm = reactive({
  name: '',
  slug: '',
  description: '',
  guidelines: '',
  whyJoin: '',
  logoUrl: '',
  coverImageUrl: '',
  splineUrl: '',
  website: '',
  applyToMemberCards: false,
});
const isEditingCommunity = computed(
  () => editingRow.value?.type === ORGANIZATION_TYPES.COMMUNITY
);
const isEditingCompany = computed(
  () => editingRow.value?.type === ORGANIZATION_TYPES.COMPANY
);
const { normalizeUrlWithHttps } = useUrlNormalization();

const MEDIA_FIELDS = [
  'logoUrl',
  'coverImageUrl',
  'splineUrl',
  'website',
] as const;

/** Media as loaded, so unchanged values are left out of the save. */
let loadedMedia: Partial<Record<(typeof MEDIA_FIELDS)[number], string>> = {};

/** A value the form can't produce (e.g. a legacy path) never blocks a save. */
function changedMedia() {
  return Object.fromEntries(
    MEDIA_FIELDS.filter((field) => editForm[field] !== loadedMedia[field]).map(
      (field) => [
        field,
        field === 'website'
          ? normalizeUrlWithHttps(editForm.website)
          : editForm[field],
      ]
    )
  );
}

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
const isCreatingPersonal = computed(
  () => createForm.type === ORGANIZATION_TYPES.PERSONAL
);
const isCardsOpen = ref(false);
const cardsOrganizationId = ref<string | null>(null);

const typeItems = [
  {
    label: ORGANIZATION_TYPE_LABELS[ORGANIZATION_TYPES.PERSONAL],
    value: ORGANIZATION_TYPES.PERSONAL,
  },
  {
    label: ORGANIZATION_TYPE_LABELS[ORGANIZATION_TYPES.COMMUNITY],
    value: ORGANIZATION_TYPES.COMMUNITY,
  },
  {
    label: ORGANIZATION_TYPE_LABELS[ORGANIZATION_TYPES.COMPANY],
    value: ORGANIZATION_TYPES.COMPANY,
  },
];

const { data: orgsData, isLoading: pending } = useAdminOrganizationsQuery();
const { data: usersData, isLoading: usersPending } = useAdminUsersQuery();

const userItems = computed(() => usersData.value || []);

const rows = computed(() => orgsData.value || []);
const typeFilter = useQueryState<'all' | OrganizationType>('type', 'all');

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
  editForm.website = '';
  editForm.applyToMemberCards = false;
  loadedMedia = Object.fromEntries(
    MEDIA_FIELDS.map((field) => [field, editForm[field]])
  );
  isEditOpen.value = true;

  if (
    row.type !== ORGANIZATION_TYPES.COMMUNITY &&
    row.type !== ORGANIZATION_TYPES.COMPANY
  )
    return;

  const detail = await adminApi.getOrganization(row.id);
  if (editingRow.value?.id !== row.id) return;
  const brand = detail.community ?? detail.company;
  if (!brand) return;
  if (detail.community) {
    editForm.description = detail.community.description;
    editForm.guidelines = detail.community.guidelines;
    editForm.whyJoin = detail.community.whyJoin;
  }
  editForm.logoUrl = brand.logoUrl;
  editForm.coverImageUrl = brand.coverImageUrl;
  editForm.splineUrl = brand.splineUrl;
  editForm.website = detail.company?.website ?? '';
  loadedMedia = Object.fromEntries(
    MEDIA_FIELDS.map((field) => [field, editForm[field]])
  );
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
      ...(isEditingCommunity.value
        ? {
            description: editForm.description,
            guidelines: editForm.guidelines,
            whyJoin: editForm.whyJoin,
            ...changedMedia(),
            applyToMemberCards: editForm.applyToMemberCards,
          }
        : {}),
      ...(isEditingCompany.value ? changedMedia() : {}),
    });
    await invalidateAdmin();
    const cardsUpdated = saved.cardsUpdated || 0;
    toast.add({
      title: 'Organization updated',
      description: isEditingCompany.value
        ? `Updated ${cardsUpdated} company ${cardsUpdated === 1 ? 'card' : 'cards'}.`
        : editForm.applyToMemberCards
          ? cardsUpdated > 0
            ? `Copied spline, wallpaper, and card back onto ${cardsUpdated} member ${cardsUpdated === 1 ? 'card' : 'cards'}.`
            : 'No member cards to update.'
          : undefined,
      color: 'success',
    });
    closeEdit();
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
        : isCreatingPersonal.value
          ? { ownerUserId: createForm.ownerUserId || undefined }
          : {}),
    });
    await invalidateAdmin();
    toast.add({
      title: 'Organization created',
      description:
        isCreatingCommunity.value && ownerEmail
          ? `Organizer invitation sent to ${ownerEmail}.`
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
        label: 'Edit',
        icon: 'i-lucide-pencil',
        onSelect: () => openEdit(row),
      },
      ...(row.type === ORGANIZATION_TYPES.COMMUNITY ||
      row.type === ORGANIZATION_TYPES.COMPANY
        ? [
            {
              label: 'Upload assets',
              icon: 'i-lucide-image-up',
              onSelect: () => openAssets(row),
            },
            ...(row.type === ORGANIZATION_TYPES.COMPANY
              ? [
                  {
                    label: 'Cards',
                    icon: 'i-lucide-id-card',
                    onSelect: () => {
                      cardsOrganizationId.value = row.id;
                      isCardsOpen.value = true;
                    },
                  },
                ]
              : []),
          ]
        : []),
      {
        label: 'Delete',
        icon: 'i-lucide-trash-2',
        color: 'error',
        onSelect: () => openDelete(row),
      },
    ],
  ];
}

function openAssets(row: OrgRow) {
  assetsOrg.value = row;
  isAssetsOpen.value = true;
}

watch(
  () => [route.query.focus, (orgsData.value || []).length] as const,
  () => {
    const id = String(route.query.focus || '');
    if (!id) return;
    const row = (orgsData.value || []).find((item) => item.id === id);
    if (row) openEdit(row);
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

function typeTone(type: OrganizationType): AdminPillTone {
  if (type === ORGANIZATION_TYPES.COMMUNITY) return 'gold';
  if (type === ORGANIZATION_TYPES.COMPANY) return 'info';
  return 'ink';
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
  <div :class="ADMIN_PAGE_CLASS">
    <AdminPageHeader
      title="Organizations"
      description-class="max-w-107"
      description="Create a personal or community space, correct its name and settings, or delete one with no cards and no&nbsp;payments."
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
          placeholder="Search name or slug"
          color="neutral"
          variant="soft"
          class="w-full sm:w-64"
          :ui="ADMIN_SEARCH_UI"
        />
        <USelect
          v-model="typeFilter"
          :items="typeFilterItems"
          :ui="ADMIN_FILTER_UI"
          class="w-full sm:w-44"
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
        @select="(_event, row) => openEdit(row.original)"
      >
        <template #name-cell="{ row }">
          <span class="font-medium text-ink">{{ row.original.name }}</span>
        </template>
        <template #slug-cell="{ row }">
          <span class="font-mono text-xs text-muted">{{
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
          <AdminStatusPill
            :label="ORGANIZATION_TYPE_LABELS[row.original.type]"
            :tone="typeTone(row.original.type)"
          />
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
      v-model:open="isCreateOpen"
      side="right"
      inset
      title="CREATE ORGANIZATION"
      :ui="ADMIN_SLIDEOVER_UI"
    >
      <template #body>
        <form
          id="create-organization-form"
          novalidate
          @submit.prevent="onCreate"
          class="py-2"
        >
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
              label="Organizer email"
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
            <UFormField
              v-else-if="isCreatingPersonal"
              label="Owner"
              :class="formFieldClass"
            >
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
        </form>
      </template>

      <template #footer>
        <UButton
          label="Cancel"
          color="neutral"
          variant="ghost"
          :class="ADMIN_GHOST_BUTTON_CLASS"
          @click="closeCreate"
        />
        <UButton
          label="Create"
          color="neutral"
          :loading="isCreating"
          :class="ADMIN_SLIDEOVER_BUTTON_CLASS"
          type="submit"
          form="create-organization-form"
        />
      </template>
    </USlideover>

    <USlideover
      v-model:open="isEditOpen"
      side="right"
      inset
      title="EDIT ORGANIZATION"
      :ui="ADMIN_SLIDEOVER_UI"
    >
      <template #body>
        <div class="py-2">
          <p class="mb-4 text-sm leading-relaxed text-subtle">
            Changing the slug updates platform URLs that use
            <span class="font-mono text-soft"
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
                class="w-full"
                size="xl"
                :ui="inputUi"
              />
            </UFormField>
            <template v-if="isEditingCommunity || isEditingCompany">
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
            </template>
            <template v-if="isEditingCompany">
              <UFormField label="Website" :class="formFieldClass">
                <UInput
                  v-model="editForm.website"
                  placeholder="https://"
                  class="w-full"
                  size="xl"
                  :ui="inputUi"
                />
              </UFormField>
              <p class="text-xs leading-relaxed text-ink/50">
                The name, website and Spline scene are copied onto every company
                card when you&nbsp;save.
              </p>
            </template>
            <template v-if="isEditingCommunity">
              <div class="rounded-lg border border-raised bg-ink/[0.03] p-4">
                <UCheckbox
                  v-model="editForm.applyToMemberCards"
                  label="Update existing member cards"
                  :ui="{ label: 'text-sm font-medium text-ink' }"
                />
                <p class="mt-2 text-xs leading-relaxed text-ink/50">
                  Member cards keep the spline, wallpaper, and card back they
                  received when they joined. Turn this on to copy those three
                  onto every card in this community when you&nbsp;save.
                </p>
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
          :class="ADMIN_GHOST_BUTTON_CLASS"
          @click="closeEdit"
        />
        <UButton
          label="Save"
          color="neutral"
          :loading="isSaving"
          :class="ADMIN_SLIDEOVER_BUTTON_CLASS"
          @click="onSaveEdit"
        />
      </template>
    </USlideover>

    <AdminBrandAssetsSlideover
      v-model:open="isAssetsOpen"
      :organization="assetsOrg"
    />

    <UModal
      v-model:open="isDeleteOpen"
      :close="false"
      :dismissible="!isDeleting"
      :ui="{ content: 'bg-surface max-w-md' }"
      title="Delete organization?"
    >
      <template #body>
        <div class="space-y-3 text-sm leading-relaxed text-soft">
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
          class="h-10 cursor-pointer rounded-full px-5 text-sm font-medium"
          :disabled="isDeleting"
          @click="closeDelete"
        />
        <UButton
          v-if="orgToDelete && orgToDelete.cardCount === 0"
          label="Delete"
          color="error"
          class="h-10 cursor-pointer rounded-full px-6 text-sm font-medium"
          :loading="isDeleting"
          @click="onConfirmDelete"
        />
      </template>
    </UModal>
    <AdminCompanyCardsSlideover
      v-model:open="isCardsOpen"
      :organization-id="cardsOrganizationId"
    />
  </div>
</template>
