<script setup lang="ts">
import type { DropdownMenuItem, TableColumn, TabsItem } from '@nuxt/ui';
import type {
  CommunityMember,
  CommunityMembersData,
  CommunityMembersTab,
} from '~~/shared/types/community-members';

const props = defineProps<{
  data: CommunityMembersData;
}>();

const emit = defineEmits<{
  invite: [];
  export: [];
}>();

const toast = useToast();
const searchQuery = ref('');
const activeTab = ref<CommunityMembersTab>('all');
const page = ref(1);
const itemsPerPage = 10;
const isInfoOpen = ref(false);
const isProfileOpen = ref(false);
const selectedMember = ref<CommunityMember | null>(null);

const tabCounts = computed(() => {
  const members = props.data.members;
  return {
    all: members.length,
    active: members.filter((m) => m.status === 'active').length,
    pending: members.filter((m) => m.status === 'pending').length,
  };
});

const tabItems = computed<TabsItem[]>(() => [
  { label: `All Members (${tabCounts.value.all})`, value: 'all' },
  { label: `Active Members (${tabCounts.value.active})`, value: 'active' },
  { label: `Pending Members (${tabCounts.value.pending})`, value: 'pending' },
]);

const selectedTab = computed({
  get: () => activeTab.value,
  set: (value: string | number) => {
    activeTab.value = String(value) as CommunityMembersTab;
  },
});

const filteredMembers = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();

  return props.data.members.filter((member) => {
    if (activeTab.value !== 'all' && member.status !== activeTab.value) {
      return false;
    }

    if (!query) return true;

    return (
      member.name.toLowerCase().includes(query) ||
      member.role.toLowerCase().includes(query) ||
      member.company.toLowerCase().includes(query) ||
      member.status.toLowerCase().includes(query) ||
      (member.email || '').toLowerCase().includes(query)
    );
  });
});

const total = computed(() => filteredMembers.value.length);
const pagedMembers = computed(() => {
  const start = (page.value - 1) * itemsPerPage;
  return filteredMembers.value.slice(start, start + itemsPerPage);
});

watch([searchQuery, activeTab], () => {
  page.value = 1;
});

watch(filteredMembers, () => {
  const maxPage = Math.max(1, Math.ceil(total.value / itemsPerPage));
  if (page.value > maxPage) page.value = maxPage;
});

const columns: TableColumn<CommunityMember>[] = [
  { accessorKey: 'name', header: 'NAME' },
  { accessorKey: 'company', header: 'COMPANY' },
  { accessorKey: 'connections', header: 'CONNECTIONS' },
  { id: 'events', header: 'EVENTS' },
  { accessorKey: 'status', header: 'STATUS' },
  { id: 'actions', header: '' },
];

function getActionItems(member: CommunityMember): DropdownMenuItem[][] {
  return [
    [
      {
        label: 'View member',
        icon: 'i-lucide-user',
        onSelect: () => openProfile(member),
      },
      {
        label: 'Remove',
        icon: 'i-lucide-user-minus',
        color: 'error',
        onSelect: () => {
          toast.add({
            title: 'Remove member',
            description: 'Removal is not wired yet.',
            color: 'warning',
          });
        },
      },
    ],
  ];
}

function openProfile(member: CommunityMember) {
  selectedMember.value = member;
  isProfileOpen.value = true;
}

function openInfo() {
  isInfoOpen.value = true;
}

function closeInfo() {
  isInfoOpen.value = false;
}
</script>

<template>
  <div class="flex min-h-[calc(100dvh-11rem)] flex-col">
    <div class="flex flex-col gap-8 pt-2 sm:pt-0">
      <div
        class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div class="flex items-center gap-3">
          <h1
            class="text-xl font-normal leading-5 tracking-[0.175rem] uppercase text-white sm:text-[1.75rem]"
          >
            {{ data.title }}
          </h1>
          <UButton
            icon="i-material-symbols:info-outline"
            color="neutral"
            variant="ghost"
            class="size-5 cursor-pointer p-0 text-white hover:bg-transparent"
            aria-label="Open members information"
            @click="openInfo"
          />
        </div>

        <div class="flex items-center gap-2">
          <UButton
            label="Invite Member"
            leading-icon="i-material-symbols:add"
            color="neutral"
            class="h-9 cursor-pointer rounded-full bg-white py-2 pr-6 pl-5 text-sm font-medium text-dark hover:bg-white/90"
            @click="emit('invite')"
          />
          <UButton
            icon="i-material-symbols:download-sharp"
            color="neutral"
            class="h-9 cursor-pointer rounded-full bg-[#232323] px-5 py-2 text-white hover:bg-[#2a2a2a]"
            aria-label="Export members"
            @click="emit('export')"
          />
        </div>
      </div>

      <div class="flex flex-col gap-6">
        <UInput
          v-model="searchQuery"
          :placeholder="data.searchPlaceholder"
          trailing-icon="i-lucide-search"
          color="neutral"
          variant="soft"
          class="w-full flex-1"
          :ui="{
            base: 'h-10 rounded-full border-0 bg-[#232323] px-5 text-sm font-medium text-white ring-0 placeholder:text-[#8b8b8b] focus-visible:ring-0',
            trailing: 'pe-4',
            trailingIcon: 'size-4 text-[#8b8b8b]',
          }"
        />

        <UTabs
          v-model="selectedTab"
          :items="tabItems"
          :content="false"
          color="neutral"
          variant="pill"
          :ui="{
            root: 'w-fit',
            list: 'bg-[#171717] w-fit rounded-lg p-1',
            indicator: 'bg-[#232323]',
            trigger:
              'data-[state=active]:text-white data-[state=inactive]:text-[#8b8b8b] rounded-md px-4 py-2.5 grow-0',
          }"
        />
      </div>
    </div>

    <div class="hide-scrollbar flex-1 overflow-x-auto pt-2 pb-6">
      <UTable
        :data="pagedMembers"
        :columns="columns"
        :ui="{
          th: 'px-4 py-4 border-b border-[#232323] text-xs font-medium tracking-wide uppercase text-white',
          td: 'px-4 py-4 border-b border-[#232323] text-sm',
          tr: 'bg-transparent',
          empty: 'py-16 text-center text-sm text-muted',
        }"
        class="w-full min-w-225"
      >
        <template #name-cell="{ row }">
          <div class="flex flex-col gap-0.5">
            <span class="font-medium text-white">{{ row.original.name }}</span>
            <span class="text-sm text-[#8b8b8b]">{{ row.original.role }}</span>
          </div>
        </template>
        <template #company-cell="{ row }">
          <span class="text-[#8b8b8b]">{{ row.original.company }}</span>
        </template>
        <template #connections-cell="{ row }">
          <span class="text-[#8b8b8b]">{{ row.original.connections }}</span>
        </template>
        <template #events-cell="{ row }">
          <span class="text-[#8b8b8b]"
            >{{ row.original.eventsAttended }} attended</span
          >
        </template>
        <template #status-cell="{ row }">
          <span
            :class="
              row.original.status === 'active' ? 'text-white' : 'text-[#8b8b8b]'
            "
          >
            {{ row.original.status === 'active' ? 'Active' : 'Pending' }}
          </span>
        </template>
        <template #actions-cell="{ row }">
          <UDropdownMenu :items="getActionItems(row.original)">
            <UButton
              size="xl"
              icon="i-mdi-dots-vertical"
              color="neutral"
              variant="ghost"
              class="text-muted"
            />
          </UDropdownMenu>
        </template>
      </UTable>
    </div>

    <div class="mt-auto flex items-center justify-end pt-2">
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
  </div>

  <UModal
    v-model:open="isInfoOpen"
    title="What are members?"
    :ui="{
      content: 'sm:max-w-[480px] rounded-lg bg-[#171717]',
      title: 'text-sm font-medium uppercase tracking-widest text-white',
      body: 'px-5 py-4 sm:px-6 sm:py-5',
    }"
  >
    <template #body>
      <div class="space-y-5 sm:space-y-6">
        <div class="space-y-2">
          <h3
            class="text-lg font-medium leading-tight tracking-widest uppercase text-white sm:text-xl"
          >
            Grow your community
          </h3>
          <p class="text-sm leading-relaxed text-[#8b8b8b]">
            Invite people, track participation, and manage who belongs in your
            community.
          </p>
        </div>

        <div class="space-y-0">
          <div
            v-for="(item, index) in data.infoItems"
            :key="item.title"
            class="py-3 sm:py-3.5"
            :class="
              index < data.infoItems.length - 1
                ? 'border-b border-[#2a2a2a]'
                : ''
            "
          >
            <div class="flex items-start gap-3">
              <UIcon
                :name="item.icon"
                class="mt-0.5 size-4.5 shrink-0 text-white sm:size-5"
              />
              <div class="min-w-0">
                <p class="text-sm font-medium text-white">{{ item.title }}</p>
                <p class="mt-1.5 text-sm leading-relaxed text-[#8b8b8b]">
                  {{ item.description }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div class="flex justify-end">
          <UButton
            size="md"
            label="Understood"
            color="neutral"
            class="h-10 justify-center rounded-full bg-white px-5 font-medium text-dark hover:bg-white/90"
            @click="closeInfo"
          />
        </div>
      </div>
    </template>
  </UModal>

  <CommunityMemberProfileSlideover
    v-model:open="isProfileOpen"
    :member="selectedMember"
  />
</template>
