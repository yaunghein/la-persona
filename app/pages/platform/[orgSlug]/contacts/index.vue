<script setup lang="ts">
import { format } from 'date-fns';
import { refDebounced } from '@vueuse/core';
import type { FeatureGuideItem } from '~/components/ui/feature-guide-modal.vue';
import type { ContactSummary } from '~~/shared/contracts/contact';
import type { ContactListScope } from '~/features/contact/composables/use-contact-queries';
import { roleHasPermission } from '~~/shared/permissions/organization';
import { ORGANIZATION_TYPES } from '~~/shared/utils/constants';
import {
  contactAvatarPhoto,
  contactVcardFileName,
  toContactVcard,
} from '~/features/contact/utils/contact-vcard';

definePageMeta({
  layout: 'platform',
});

type ViewMode = 'list' | 'grid';

const PAGE_SIZE: Record<ViewMode, number> = { list: 10, grid: 6 };
// Groups split across small pages are hard to read, so grouping loads the API maximum per page.
const GROUPED_PAGE_SIZE = 100;

const guideItems: FeatureGuideItem[] = [
  {
    icon: 'i-lucide-users',
    title: 'Track Every Connection',
    description:
      'See everyone who exchanged details with your persona cards in one organized list.',
  },
  {
    icon: 'i-lucide-user-plus',
    title: 'Add Contacts Manually',
    description:
      'Create a contact anytime, even when the exchange happened outside your persona card flow.',
  },
  {
    icon: 'i-lucide-download',
    title: 'Export for Follow-ups',
    description:
      'Download your current contacts view as CSV for outreach, reports, or team sharing.',
  },
  {
    icon: 'i-lucide-save',
    title: 'Save Contact',
    description: 'Save any contact to your phone.',
  },
];

const route = useRoute();
const router = useRouter();
const toast = useToast();
const isGuideOpen = await useFirstVisitGuide('contacts');

const orgSlug = computed(() => String(route.params.orgSlug || ''));
const { data: userOrgs, isLoading: isOrgsLoading } = useUserOrganizations();
const currentOrg = computed(() =>
  userOrgs.value?.find((org) => org.slug === orgSlug.value)
);
// The personal workspace shows contacts of every card the user holds.
const isPersonalWorkspace = computed(
  () => currentOrg.value?.type === ORGANIZATION_TYPES.PERSONAL
);
const canSeeOrigin = computed(
  () =>
    isPersonalWorkspace.value ||
    roleHasPermission(currentOrg.value?.role, 'contactExchange:readAll')
);
const isCompanyAdmin = computed(
  () =>
    currentOrg.value?.type === ORGANIZATION_TYPES.COMPANY &&
    currentOrg.value.role === 'admin'
);

const parseViewMode = (value: unknown): ViewMode =>
  value === 'grid' ? 'grid' : 'list';
const parsePage = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : 1;
};

const parseEventId = (value: unknown) =>
  typeof value === 'string' && value ? value : undefined;
const parseLabelIds = (value: unknown) =>
  typeof value === 'string' && value ? value.split(',') : [];
const parseCompanyGroup = (value: unknown): 'none' | 'member' | 'department' =>
  value === 'member' || value === 'department' ? value : 'none';

const viewMode = ref<ViewMode>(parseViewMode(route.query.view));
const page = ref(parsePage(route.query.page));
const { siblingCount, showEdges } = usePaginationWindow(0);
const eventId = ref(parseEventId(route.query.event));
const cardId = ref(parseEventId(route.query.card));
const departmentId = ref(parseEventId(route.query.department));
const companyGroup = ref(parseCompanyGroup(route.query.group));
const labelIds = ref(parseLabelIds(route.query.labels));
const labelIdsQuery = computed(() =>
  labelIds.value.length ? labelIds.value : undefined
);
const searchQuery = ref('');
const debouncedSearch = refDebounced(searchQuery, 250);
const search = computed(() => debouncedSearch.value.trim() || undefined);
const isGrouped = ref(route.query.group === 'label');
const pageSize = computed(() =>
  isGrouped.value || companyGroup.value !== 'none'
    ? GROUPED_PAGE_SIZE
    : PAGE_SIZE[viewMode.value]
);

const listScope = computed<ContactListScope>(() =>
  isPersonalWorkspace.value
    ? { workspace: true }
    : { organizationSlug: orgSlug.value }
);

const { data: contactPage, isLoading } = useContactsQuery(
  () => ({
    scope: listScope.value,
    limit: pageSize.value,
    offset: (page.value - 1) * pageSize.value,
    q: search.value,
    eventId: eventId.value,
    cardId: cardId.value,
    departmentId: departmentId.value,
    labelIds: labelIdsQuery.value,
  }),
  { enabled: () => !isOrgsLoading.value }
);

const contacts = computed(() => contactPage.value?.items ?? []);
const total = computed(() => contactPage.value?.total ?? 0);
const hasContacts = computed(() => total.value > 0);

const ALL_EVENTS = 'all';
const { data: contactEvents } = useContactEventsQuery(listScope, {
  enabled: () => !isOrgsLoading.value,
});
const eventFilterItems = computed(() => [
  { label: 'All events', value: ALL_EVENTS },
  ...(contactEvents.value?.items ?? []).map((item) => ({
    label: `${item.title} · ${format(new Date(item.startsAt), 'd MMM yyyy')}`,
    value: item.id,
  })),
]);

const { data: contactLabels } = useContactLabelsQuery();
const isLabelsOpen = ref(false);

const groupLabels = computed(() =>
  isGrouped.value
    ? (contactLabels.value ?? []).filter(
        (label) => !labelIds.value.length || labelIds.value.includes(label.id)
      )
    : undefined
);

type ContactGroup = 'none' | 'label' | 'member' | 'department';

const isFiltersOpen = ref(false);
const draft = reactive({
  event: ALL_EVENTS,
  card: 'all',
  department: 'all',
  labels: [] as string[],
  group: 'none' as ContactGroup,
});

const groupItems = computed(() => {
  const items: { label: string; value: ContactGroup }[] = [
    { label: 'No grouping', value: 'none' },
    { label: 'Group by label', value: 'label' },
  ];
  if (isCompanyAdmin.value) {
    items.push(
      { label: 'Group by member', value: 'member' },
      { label: 'Group by department', value: 'department' }
    );
  }
  return items;
});

function currentGroup(): ContactGroup {
  if (isGrouped.value) return 'label';
  return companyGroup.value;
}

function openFilters() {
  draft.event = eventId.value ?? ALL_EVENTS;
  draft.card = cardId.value ?? 'all';
  draft.department = departmentId.value ?? 'all';
  draft.labels = [...labelIds.value];
  draft.group = currentGroup();
  isFiltersOpen.value = true;
}

function closeFilters() {
  isFiltersOpen.value = false;
}

function applyFilters() {
  eventId.value = draft.event === ALL_EVENTS ? undefined : draft.event;
  cardId.value = draft.card === 'all' ? undefined : draft.card;
  departmentId.value =
    draft.department === 'all' ? undefined : draft.department;
  labelIds.value = [...draft.labels];
  isGrouped.value = draft.group === 'label';
  companyGroup.value =
    draft.group === 'member' || draft.group === 'department'
      ? draft.group
      : 'none';
  page.value = 1;
  isFiltersOpen.value = false;
}

function resetDraft() {
  draft.event = ALL_EVENTS;
  draft.card = 'all';
  draft.department = 'all';
  draft.labels = [];
  draft.group = 'none';
}

const activeFilterCount = computed(() => {
  let count = 0;
  if (eventId.value) count += 1;
  if (cardId.value) count += 1;
  if (departmentId.value) count += 1;
  if (labelIds.value.length) count += 1;
  if (isGrouped.value || companyGroup.value !== 'none') count += 1;
  return count;
});

const hasFilters = computed(
  () => !!search.value || activeFilterCount.value > 0
);

function clearFilters() {
  searchQuery.value = '';
  eventId.value = undefined;
  labelIds.value = [];
  cardId.value = undefined;
  departmentId.value = undefined;
  isGrouped.value = false;
  companyGroup.value = 'none';
  page.value = 1;
}

const { data: workspaceCards } = useWorkspaceCardsQuery({
  enabled: () => isPersonalWorkspace.value,
});
const { data: companyCards, refresh: refreshCompanyCards } = useFetch<{
  items: {
    id: string;
    holderName: string | null;
    firstName: string;
    lastName: string | null;
  }[];
}>(() => `/api/organizations/${orgSlug.value}/company-cards` as string, {
  immediate: false,
  watch: false,
});
const { data: companyDepartments, refresh: refreshCompanyDepartments } =
  useFetch<{ items: { id: string; name: string }[] }>(
    () => `/api/organizations/${orgSlug.value}/departments` as string,
    { immediate: false, watch: false }
  );
watch(
  isCompanyAdmin,
  (isAdmin) => {
    if (!isAdmin) return;
    refreshCompanyCards();
    refreshCompanyDepartments();
  },
  { immediate: true }
);

const personalCardFilterItems = computed(() => [
  { label: 'All cards', value: 'all' },
  ...(workspaceCards.value ?? []).map((item) => ({
    label:
      item.organization.type === ORGANIZATION_TYPES.PERSONAL
        ? 'Personal'
        : item.organization.name,
    value: item.id,
  })),
]);
const companyCardFilterItems = computed(() => [
  { label: 'All members', value: 'all' },
  ...(companyCards.value?.items ?? []).map((item) => ({
    label:
      item.holderName ||
      `${item.firstName} ${item.lastName ?? ''}`.trim() ||
      'Vacant',
    value: item.id,
  })),
]);
const departmentFilterItems = computed(() => [
  { label: 'All departments', value: 'all' },
  ...(companyDepartments.value?.items ?? []).map((item) => ({
    label: item.name,
    value: item.id,
  })),
]);
const formFieldClass =
  '[&_label]:mb-1 [&_label]:text-sm [&_label]:font-medium [&_label]:text-ink';
const modalSelectUi = {
  base: 'h-[47px] w-full rounded-[4px] border border-line bg-raised px-4 text-sm text-ink',
  content: 'border border-line bg-surface',
  item: 'text-ink data-[highlighted]:bg-raised',
  value: 'text-ink',
  placeholder: 'text-ink/50',
};
const companyGroups = computed(() => {
  if (companyGroup.value === 'none') return null;
  const groups = new Map<string, ContactSummary[]>();
  for (const contact of contacts.value) {
    const label =
      companyGroup.value === 'department'
        ? contact.card?.departmentName || 'No department'
        : contact.card?.holderName || contact.card?.name || 'Unassigned';
    groups.set(label, [...(groups.get(label) ?? []), contact]);
  }
  return [...groups.entries()].map(([label, items]) => ({ label, items }));
});

// Kept after closing so the slideover body doesn't blank out while it animates away.
const contactToEdit = ref<ContactSummary | null>(null);
const isEditOpen = ref(false);
const editContactForm = useTemplateRef('editContactForm');
const isCreateOpen = ref(false);
const manualContactForm = useTemplateRef('manualContactForm');
const { data: registeredEvents, isLoading: isRegisteredEventsLoading } =
  useRegisteredEventsQuery({
    enabled: () => isEditOpen.value || isCreateOpen.value,
  });

function openEditContact(contact: ContactSummary) {
  contactToEdit.value = contact;
  isEditOpen.value = true;
}

const contactToDelete = ref<ContactSummary | null>(null);
const isDeleteOpen = computed({
  get: () => contactToDelete.value !== null,
  set: (open) => {
    if (!open) contactToDelete.value = null;
  },
});
const { mutateAsync: deleteContact, isPending: isDeleting } =
  useDeleteContactMutation();

async function saveContactToPhone(contact: ContactSummary) {
  const photo = await contactAvatarPhoto(contact.avatarUrl);
  downloadFile({
    blob: new Blob([toContactVcard(contact, photo)], {
      type: 'text/vcard;charset=utf-8',
    }),
    fileName: contactVcardFileName(contact),
  });
}

async function confirmDelete() {
  const contact = contactToDelete.value;
  if (!contact) return;
  try {
    await deleteContact(contact.id);
    toast.add({
      title: 'Contact deleted',
      description: `"${contact.name}" was removed.`,
      color: 'success',
    });
    contactToDelete.value = null;
  } catch (error: any) {
    toast.add({
      title: 'Delete failed',
      description: error?.data?.statusMessage || 'Please try again.',
      color: 'error',
    });
  }
}

async function exportContacts() {
  if (!hasContacts.value) {
    toast.add({
      title: 'Nothing to export',
      description: 'No contacts available in the current table.',
      color: 'warning',
    });
    return;
  }
  try {
    const blob = await downloadContactsCsv(listScope.value, {
      q: search.value,
      eventId: eventId.value,
      labelIds: labelIdsQuery.value,
      cardId: cardId.value,
      departmentId: departmentId.value,
    });
    downloadFile({
      blob,
      fileName: `contacts-${orgSlug.value || 'org'}-${format(new Date(), 'yyyy-MM-dd')}.csv`,
    });
  } catch (error: any) {
    toast.add({
      title: 'Export failed',
      description: error?.data?.statusMessage || 'Please try again.',
      color: 'error',
    });
  }
}

function openGuide() {
  isGuideOpen.value = true;
}

function openCreateContact() {
  isCreateOpen.value = true;
}

function closeCreateContact() {
  isCreateOpen.value = false;
}

function setViewMode(mode: ViewMode) {
  if (viewMode.value === mode) return;
  viewMode.value = mode;
  page.value = 1;
}

watch(
  () => route.query,
  (query) => {
    viewMode.value = parseViewMode(query.view);
    page.value = parsePage(query.page);
    eventId.value = parseEventId(query.event);
    labelIds.value = parseLabelIds(query.labels);
    isGrouped.value = query.group === 'label';
    cardId.value = parseEventId(query.card);
    departmentId.value = parseEventId(query.department);
    companyGroup.value = parseCompanyGroup(query.group);
  }
);

watch(
  [
    viewMode,
    page,
    eventId,
    labelIds,
    isGrouped,
    cardId,
    departmentId,
    companyGroup,
  ],
  async ([view, current, event, , grouped]) => {
    const query = {
      view,
      page: String(current),
      event,
      labels: labelIdsQuery.value?.join(','),
      card: cardId.value,
      department: departmentId.value,
      group: grouped
        ? 'label'
        : companyGroup.value === 'none'
          ? undefined
          : companyGroup.value,
    };
    if (
      route.query.view === query.view &&
      route.query.page === query.page &&
      parseEventId(route.query.event) === event &&
      parseEventId(route.query.labels) === query.labels &&
      parseEventId(route.query.group) === query.group &&
      parseEventId(route.query.card) === query.card &&
      parseEventId(route.query.department) === query.department
    ) {
      return;
    }
    await router.replace({ query: { ...route.query, ...query } });
  }
);

// Stay on a real page after deletes shrink the list.
watch(search, () => {
  page.value = 1;
});

watch(total, (count) => {
  const lastPage = Math.max(1, Math.ceil(count / pageSize.value));
  if (page.value > lastPage) page.value = lastPage;
});
</script>

<template>
  <div
    class="flex flex-col gap-5 sm:gap-8"
    :class="hasContacts ? 'pb-20 sm:pb-0' : 'min-h-[calc(100dvh-7rem)]'"
  >
    <div
      class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:pb-0"
    >
      <div class="flex items-center gap-2">
        <h1
          class="text-2xl font-medium uppercase leading-tight tracking-widest"
        >
          People you've connected with
        </h1>
        <UTooltip text="What is Contacts?">
          <UButton
            size="lg"
            icon="material-symbols:info-outline"
            color="neutral"
            variant="ghost"
            class="flex cursor-pointer items-center justify-center rounded-full p-0 text-muted hover:bg-raised"
            aria-label="What is Contacts?"
            @click="openGuide"
          />
        </UTooltip>
      </div>

      <div class="fixed right-4 top-3.75 flex items-center gap-2 sm:hidden">
        <UTooltip
          :text="
            viewMode === 'list' ? 'Switch to grid view' : 'Switch to list view'
          "
        >
          <UButton
            icon="material-symbols:list-alt-outline-sharp"
            color="neutral"
            variant="ghost"
            class="flex cursor-pointer items-center justify-center text-muted"
            :aria-label="
              viewMode === 'list'
                ? 'Switch to grid view'
                : 'Switch to list view'
            "
            @click="setViewMode(viewMode === 'list' ? 'grid' : 'list')"
          />
        </UTooltip>
        <UTooltip v-if="hasContacts" text="Export contacts">
          <UButton
            icon="material-symbols:download-sharp"
            color="neutral"
            variant="ghost"
            class="flex cursor-pointer items-center justify-center text-muted"
            aria-label="Export contacts"
            @click="exportContacts"
          />
        </UTooltip>
      </div>

      <div
        class="contents w-full flex-wrap items-center gap-2 sm:flex sm:w-auto sm:flex-nowrap"
      >
        <UButton
          v-if="hasContacts"
          label="Create New Contact"
          leading-icon="i-lucide-plus"
          color="neutral"
          class="fixed bottom-6 left-1/2 z-10 -translate-x-1/2 shadow-lg sm:static sm:translate-x-0 sm:shadow-none flex h-10 text-sm cursor-pointer items-center justify-center rounded-full border-2 border-raised bg-ink px-5 font-medium text-ink-inverse hover:bg-ink/90"
          @click="openCreateContact"
        />
        <UTooltip text="Export contacts" class="hidden sm:flex">
          <UButton
            icon="i-material-symbols-download-sharp"
            color="neutral"
            variant="ghost"
            class="h-10 w-16 cursor-pointer items-center justify-center rounded-full border-2 border-raised bg-raised p-0 px-5 text-ink hover:bg-line"
            aria-label="Export contacts"
            @click="exportContacts"
          />
        </UTooltip>
        <UFieldGroup class="hidden sm:flex">
          <UTooltip text="List view">
            <UButton
              icon="i-lucide-table-2"
              class="flex size-9 cursor-pointer items-center justify-center rounded-l-md border-2 border-raised p-0 hover:bg-raised"
              aria-label="List view"
              :variant="viewMode === 'list' ? 'solid' : 'ghost'"
              :class="viewMode === 'list' ? 'bg-raised text-ink' : 'text-muted'"
              @click="setViewMode('list')"
            />
          </UTooltip>
          <UTooltip text="Grid view">
            <UButton
              size="xl"
              icon="i-lucide-layout-grid"
              class="flex size-9 cursor-pointer items-center justify-center rounded-r-md border-2 border-raised p-0 hover:bg-raised"
              aria-label="Grid view"
              :variant="viewMode === 'grid' ? 'solid' : 'ghost'"
              :class="viewMode === 'grid' ? 'bg-raised text-ink' : 'text-muted'"
              @click="setViewMode('grid')"
            />
          </UTooltip>
        </UFieldGroup>
      </div>
    </div>

    <div class="flex items-center gap-2">
      <UInput
        v-model="searchQuery"
        placeholder="Search contacts"
        trailing-icon="i-lucide-search"
        color="neutral"
        variant="soft"
        class="min-w-0 flex-1"
        :ui="{
          base: 'h-10 rounded-full border-0 bg-raised px-5 text-sm font-medium text-ink ring-0 placeholder:text-subtle focus-visible:ring-0',
          trailing: 'pe-4',
          trailingIcon: 'size-4 text-subtle',
        }"
      />
      <div class="relative shrink-0">
        <UButton
          icon="i-lucide-sliders-horizontal"
          color="neutral"
          class="flex size-10 cursor-pointer items-center justify-center rounded-full p-0 text-ink hover:bg-line"
          :class="activeFilterCount ? 'bg-ink/15' : 'bg-raised'"
          aria-label="Filters"
          @click="openFilters"
        />
        <span
          v-if="activeFilterCount"
          class="pointer-events-none absolute top-2 right-2 size-1.5 rounded-full bg-gold"
        />
      </div>
    </div>

    <UModal
      v-model:open="isFiltersOpen"
      title="Filters"
      :ui="{
        content: 'sm:max-w-[440px] rounded-lg bg-surface',
        title: 'text-sm font-medium uppercase tracking-widest text-ink',
        body: 'px-5 py-4 sm:px-6 sm:py-5',
        footer: 'flex w-full items-center justify-between',
      }"
    >
      <template #body>
        <div class="flex flex-col gap-4">
          <UFormField
            v-if="eventFilterItems.length > 1"
            label="Where you met"
            :class="formFieldClass"
          >
            <USelectMenu
              v-model="draft.event"
              :items="eventFilterItems"
              value-key="value"
              :search-input="{ placeholder: 'Search events' }"
              class="w-full"
              :ui="modalSelectUi"
            />
          </UFormField>
          <UFormField
            v-if="isPersonalWorkspace && personalCardFilterItems.length > 1"
            label="Card"
            :class="formFieldClass"
          >
            <USelectMenu
              v-model="draft.card"
              :items="personalCardFilterItems"
              value-key="value"
              :search-input="false"
              class="w-full"
              :ui="modalSelectUi"
            />
          </UFormField>
          <UFormField
            v-if="isCompanyAdmin"
            label="Member"
            :class="formFieldClass"
          >
            <USelectMenu
              v-model="draft.card"
              :items="companyCardFilterItems"
              value-key="value"
              :search-input="false"
              class="w-full"
              :ui="modalSelectUi"
            />
          </UFormField>
          <UFormField
            v-if="isCompanyAdmin"
            label="Department"
            :class="formFieldClass"
          >
            <USelectMenu
              v-model="draft.department"
              :items="departmentFilterItems"
              value-key="value"
              :search-input="false"
              class="w-full"
              :ui="modalSelectUi"
            />
          </UFormField>
          <UFormField label="Labels" :class="formFieldClass">
            <UiLabelSelect
              v-model="draft.labels"
              :labels="contactLabels ?? []"
              placeholder="All labels"
              manageable
              aria-label="Filter by label"
              class="w-full"
              :ui="modalSelectUi"
              @manage="isLabelsOpen = true"
            />
          </UFormField>
          <UFormField label="Group by" :class="formFieldClass">
            <USelectMenu
              v-model="draft.group"
              :items="groupItems"
              value-key="value"
              :search-input="false"
              class="w-full"
              :ui="modalSelectUi"
            />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <UButton
          label="Reset"
          color="neutral"
          variant="ghost"
          class="h-10 cursor-pointer rounded-full px-5 text-sm"
          @click="resetDraft"
        />
        <div class="flex items-center gap-2">
          <UButton
            label="Cancel"
            color="neutral"
            variant="ghost"
            class="h-10 cursor-pointer rounded-full px-5 text-sm"
            @click="closeFilters"
          />
          <UButton
            label="Apply"
            color="neutral"
            class="h-10 cursor-pointer rounded-full bg-ink px-5 text-sm font-medium text-ink-inverse hover:bg-ink/90"
            @click="applyFilters"
          />
        </div>
      </template>
    </UModal>

    <ContactLabelsSlideover v-model:open="isLabelsOpen" />

    <USlideover
      v-model:open="isCreateOpen"
      side="right"
      inset
      title="CREATE NEW CONTACT"
      :ui="{
        header: 'border-b-2 border-raised px-6 py-6',
        title: 'text-sm font-medium tracking-[1.4px] text-ink uppercase',
        body: 'px-6',
      }"
    >
      <template #body>
        <ContactManualForm
          ref="manualContactForm"
          :organization-slug="orgSlug"
          :events="registeredEvents?.items ?? []"
          :events-loading="isRegisteredEventsLoading"
          @created="closeCreateContact"
        />
      </template>

      <template #footer>
        <UButton
          type="submit"
          form="manual-contact-form"
          label="Create New Contact"
          leading-icon="i-lucide-plus"
          color="neutral"
          :loading="manualContactForm?.isPending"
          class="h-10 cursor-pointer rounded-full bg-ink pr-6 pl-5 text-sm font-medium text-ink-inverse hover:bg-ink/90"
        />
      </template>
    </USlideover>

    <USlideover
      v-model:open="isEditOpen"
      side="right"
      inset
      title="EDIT CONTACT"
      :ui="{
        header: 'border-b-2 border-raised px-6 py-6',
        title: 'text-sm font-medium tracking-[1.4px] text-ink uppercase',
        body: 'px-6',
      }"
    >
      <template v-if="contactToEdit" #body>
        <ContactEditForm
          ref="editContactForm"
          :contact="contactToEdit"
          :events="registeredEvents?.items ?? []"
          :events-loading="isRegisteredEventsLoading"
          @saved="isEditOpen = false"
        />
      </template>

      <template #footer>
        <UButton
          type="submit"
          form="edit-contact-form"
          label="Save Changes"
          leading-icon="i-lucide-check"
          color="neutral"
          :loading="editContactForm?.isPending"
          class="h-10 cursor-pointer rounded-full bg-ink pr-6 pl-5 text-sm font-medium text-ink-inverse hover:bg-ink/90"
        />
      </template>
    </USlideover>

    <div v-if="isLoading" class="flex-1 space-y-3">
      <USkeleton
        v-for="index in 6"
        :key="index"
        class="h-16 w-full rounded-md"
      />
    </div>

    <div
      v-else-if="!hasContacts"
      class="flex flex-1 flex-col items-center justify-center gap-4"
    >
      <UIcon
        name="i-material-symbols:perm-contact-calendar-sharp"
        class="size-8 text-muted"
      />
      <template v-if="hasFilters">
        <h2 class="text-base font-medium uppercase tracking-widest text-ink">
          No contacts match these&nbsp;filters
        </h2>
        <UButton
          label="Clear filters"
          color="neutral"
          variant="ghost"
          class="h-10 text-sm rounded-full px-5"
          @click="clearFilters"
        />
      </template>
      <template v-else>
        <h2 class="text-base font-medium uppercase tracking-widest text-ink">
          No contacts yet
        </h2>
        <p class="max-w-[18rem] text-center text-sm text-muted">
          Once people exchange contacts with your persona card, they will appear
          here.
        </p>
        <UButton
          label="Create New Contact"
          leading-icon="i-lucide-plus"
          color="neutral"
          class="mt-2 h-10 text-sm rounded-full bg-ink px-5 font-medium text-ink-inverse hover:bg-ink/90"
          @click="openCreateContact"
        />
      </template>
    </div>

    <div v-else-if="companyGroups" class="flex flex-col gap-6">
      <section
        v-for="group in companyGroups"
        :key="group.label"
        class="flex flex-col gap-2"
      >
        <h2 class="text-xs font-medium uppercase tracking-widest text-muted">
          {{ group.label }}
        </h2>
        <ContactTable
          :contacts="group.items"
          :show-origin="canSeeOrigin"
          @save="saveContactToPhone"
          @edit="openEditContact"
          @delete="contactToDelete = $event"
        />
      </section>
    </div>

    <div
      v-else-if="viewMode === 'list'"
      class="hide-scrollbar -mx-4 flex-1 overflow-y-hidden overflow-x-auto px-4 sm:mx-0 sm:px-0"
    >
      <ContactTable
        :contacts="contacts"
        :show-origin="canSeeOrigin"
        :group-labels="groupLabels"
        @save="saveContactToPhone"
        @edit="openEditContact"
        @delete="contactToDelete = $event"
      />
    </div>

    <ContactCardGrid
      v-else
      class="flex-1"
      :contacts="contacts"
      :show-origin="canSeeOrigin"
      :group-labels="groupLabels"
      @save="saveContactToPhone"
      @edit="openEditContact"
      @delete="contactToDelete = $event"
    />

    <div
      v-if="hasContacts"
      class="mt-auto flex items-center justify-center pt-4 sm:justify-end sm:pt-0"
    >
      <UPagination
        v-model:page="page"
        :total="total"
        :items-per-page="pageSize"
        :sibling-count="siblingCount"
        :show-edges="showEdges"
        show-controls
        color="neutral"
        variant="outline"
        active-color="neutral"
        active-variant="solid"
        first-icon="i-lucide-chevrons-left"
        prev-icon="i-lucide-chevron-left"
        next-icon="i-lucide-chevron-right"
        last-icon="i-lucide-chevrons-right"
      />
    </div>
  </div>

  <UiFeatureGuideModal
    v-model:open="isGuideOpen"
    title="What is Contacts?"
    heading="Your network, all in one place"
    description="Capture, review, and act on every contact."
    :items="guideItems"
  />

  <UiConfirmDeleteModal
    v-model:open="isDeleteOpen"
    title="Delete Contact?"
    :pending="isDeleting"
    @confirm="confirmDelete"
  >
    This action cannot be undone. The contact
    <span class="font-medium text-ink">"{{ contactToDelete?.name }}"</span>
    will be removed.
  </UiConfirmDeleteModal>
</template>
