<script setup lang="ts">
import { format } from 'date-fns';
import type { FeatureGuideItem } from '~/components/ui/feature-guide-modal.vue';
import type { ContactSummary } from '~~/shared/contracts/contact';
import type { ContactListScope } from '~/features/contact/composables/use-contact-queries';
import { roleHasPermission } from '~~/shared/permissions/organization';
import { ORGANIZATION_TYPES } from '~~/shared/utils/constants';
import {
  contactVcardFileName,
  toContactVcard,
} from '~/features/contact/utils/contact-vcard';

definePageMeta({
  layout: 'platform',
});

type ViewMode = 'list' | 'grid';

const PAGE_SIZE: Record<ViewMode, number> = { list: 10, grid: 6 };

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

const parseViewMode = (value: unknown): ViewMode =>
  value === 'grid' ? 'grid' : 'list';
const parsePage = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : 1;
};

const viewMode = ref<ViewMode>(parseViewMode(route.query.view));
const page = ref(parsePage(route.query.page));
const pageSize = computed(() => PAGE_SIZE[viewMode.value]);

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
  }),
  { enabled: () => !isOrgsLoading.value }
);

const contacts = computed(() => contactPage.value?.items ?? []);
const total = computed(() => contactPage.value?.total ?? 0);
const hasContacts = computed(() => total.value > 0);

const isCreateOpen = ref(false);
const manualContactForm = useTemplateRef('manualContactForm');
const contactToDelete = ref<ContactSummary | null>(null);
const isDeleteOpen = computed({
  get: () => contactToDelete.value !== null,
  set: (open) => {
    if (!open) contactToDelete.value = null;
  },
});
const { mutateAsync: deleteContact, isPending: isDeleting } =
  useDeleteContactMutation();

function saveContactToPhone(contact: ContactSummary) {
  downloadFile({
    blob: new Blob([toContactVcard(contact)], {
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
    const blob = await downloadContactsCsv(listScope.value);
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
  }
);

watch([viewMode, page], async ([view, current]) => {
  const query = { view, page: String(current) };
  if (route.query.view === query.view && route.query.page === query.page) {
    return;
  }
  await router.replace({ query: { ...route.query, ...query } });
});

// Stay on a real page after deletes shrink the list.
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
        <UButton
          size="lg"
          icon="material-symbols:info-outline"
          color="neutral"
          variant="ghost"
          class="flex cursor-pointer items-center justify-center rounded-full p-0 text-muted hover:bg-[#232323]"
          aria-label="Open contacts information"
          @click="openGuide"
        />
      </div>

      <div class="fixed right-4 top-3.75 flex items-center gap-2 sm:hidden">
        <UButton
          icon="material-symbols:list-alt-outline-sharp"
          color="neutral"
          variant="ghost"
          class="flex cursor-pointer items-center justify-center text-muted"
          aria-label="Toggle view"
          @click="setViewMode(viewMode === 'list' ? 'grid' : 'list')"
        />
        <UButton
          v-if="hasContacts"
          icon="material-symbols:download-sharp"
          color="neutral"
          variant="ghost"
          class="flex cursor-pointer items-center justify-center text-muted"
          aria-label="Export contacts"
          @click="exportContacts"
        />
      </div>

      <div
        class="contents w-full flex-wrap items-center gap-2 sm:flex sm:w-auto sm:flex-nowrap"
      >
        <UButton
          v-if="hasContacts"
          label="Create New Contact"
          leading-icon="i-lucide-plus"
          color="neutral"
          class="fixed bottom-6 left-1/2 z-10 -translate-x-1/2 shadow-lg sm:static sm:translate-x-0 sm:shadow-none flex h-10 text-sm cursor-pointer items-center justify-center rounded-full border-2 border-[#232323] bg-white px-5 font-medium text-dark hover:bg-white/90 active:hover:bg-white/80"
          @click="openCreateContact"
        />
        <UButton
          icon="i-material-symbols-download-sharp"
          color="neutral"
          variant="ghost"
          class="hidden h-10 w-16 cursor-pointer items-center justify-center rounded-full border-2 border-[#232323] bg-[#232323] p-0 px-5 text-white hover:bg-[#2a2a2a] sm:flex"
          aria-label="Export contacts"
          @click="exportContacts"
        />
        <UFieldGroup class="hidden sm:flex">
          <UButton
            icon="i-lucide-table-2"
            class="flex size-9 cursor-pointer items-center justify-center rounded-l-md border-2 border-[#232323] p-0 hover:bg-[#232323]"
            aria-label="List view"
            :variant="viewMode === 'list' ? 'solid' : 'ghost'"
            :class="
              viewMode === 'list' ? 'bg-[#232323] text-white' : 'text-muted'
            "
            @click="setViewMode('list')"
          />
          <UButton
            size="xl"
            icon="i-lucide-layout-grid"
            class="flex size-9 cursor-pointer items-center justify-center rounded-r-md border-2 border-[#232323] p-0 hover:bg-[#232323]"
            aria-label="Grid view"
            :variant="viewMode === 'grid' ? 'solid' : 'ghost'"
            :class="
              viewMode === 'grid' ? 'bg-[#232323] text-white' : 'text-muted'
            "
            @click="setViewMode('grid')"
          />
        </UFieldGroup>
      </div>
    </div>

    <USlideover
      v-model:open="isCreateOpen"
      side="right"
      inset
      title="CREATE NEW CONTACT"
      :ui="{
        header: 'border-b-2 border-[#232323] px-6 py-6',
        title: 'text-sm font-medium tracking-[1.4px] text-white uppercase',
        body: 'px-6',
      }"
    >
      <template #body>
        <ContactManualForm
          ref="manualContactForm"
          :organization-slug="orgSlug"
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
          class="h-10 cursor-pointer rounded-full bg-white pr-6 pl-5 text-sm font-medium text-dark hover:bg-white/90"
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
      <h2 class="text-base font-medium uppercase tracking-widest text-white">
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
        class="mt-2 h-10 text-sm rounded-full bg-white px-5 font-medium text-dark hover:bg-white/90"
        @click="openCreateContact"
      />
    </div>

    <div
      v-else-if="viewMode === 'list'"
      class="hide-scrollbar -mx-4 flex-1 overflow-y-hidden overflow-x-auto px-4 sm:mx-0 sm:px-0"
    >
      <ContactTable
        :contacts="contacts"
        :show-origin="canSeeOrigin"
        @save="saveContactToPhone"
        @delete="contactToDelete = $event"
      />
    </div>

    <ContactCardGrid
      v-else
      class="flex-1"
      :contacts="contacts"
      :show-origin="canSeeOrigin"
      @save="saveContactToPhone"
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
        :sibling-count="0"
        show-controls
        show-edges
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
    <span class="font-medium text-white">"{{ contactToDelete?.name }}"</span>
    will be removed.
  </UiConfirmDeleteModal>
</template>
