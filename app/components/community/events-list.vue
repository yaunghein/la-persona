<script setup lang="ts">
import type { TabsItem } from '@nuxt/ui';
import type {
  CommunityEvent,
  CommunityEventsData,
} from '~~/shared/types/community-events';

const props = defineProps<{
  data: CommunityEventsData;
}>();

const emit = defineEmits<{
  create: [];
  edit: [event: CommunityEvent];
  share: [event: CommunityEvent];
}>();

type EventsTab = 'upcoming' | 'past';

const searchQuery = ref('');
const activeTab = ref<EventsTab>('upcoming');
const page = ref(1);
const itemsPerPage = 6;
const isInfoOpen = ref(false);

const tabCounts = computed(() => {
  const events = props.data.events;
  return {
    upcoming: events.filter((event) => event.status === 'upcoming').length,
    past: events.filter((event) => event.status === 'past').length,
  };
});

const tabItems = computed<TabsItem[]>(() => [
  { label: `Upcoming Events (${tabCounts.value.upcoming})`, value: 'upcoming' },
  { label: `Past Events (${tabCounts.value.past})`, value: 'past' },
]);

const selectedTab = computed({
  get: () => activeTab.value,
  set: (value: string | number) => {
    activeTab.value = String(value) as EventsTab;
  },
});

const filteredEvents = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();

  return props.data.events.filter((event) => {
    if (event.status !== activeTab.value) {
      return false;
    }

    if (!query) return true;

    return (
      event.title.toLowerCase().includes(query) ||
      event.location.toLowerCase().includes(query) ||
      event.dateLabel.toLowerCase().includes(query)
    );
  });
});

const total = computed(() => filteredEvents.value.length);
const pagedEvents = computed(() => {
  const start = (page.value - 1) * itemsPerPage;
  return filteredEvents.value.slice(start, start + itemsPerPage);
});

watch([searchQuery, activeTab], () => {
  page.value = 1;
});

watch(filteredEvents, () => {
  const maxPage = Math.max(1, Math.ceil(total.value / itemsPerPage));
  if (page.value > maxPage) page.value = maxPage;
});

function openInfo() {
  isInfoOpen.value = true;
}

function closeInfo() {
  isInfoOpen.value = false;
}

function onShare(event: CommunityEvent) {
  emit('share', event);
}

function onEdit(event: CommunityEvent) {
  emit('edit', event);
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
            aria-label="Open events information"
            @click="openInfo"
          />
        </div>

        <UButton
          label="Create Event"
          leading-icon="i-material-symbols:add"
          color="neutral"
          class="h-9 w-fit cursor-pointer rounded-full bg-white py-2 pr-6 pl-5 text-sm font-medium text-dark hover:bg-white/90"
          @click="emit('create')"
        />
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

    <div
      class="grid flex-1 grid-cols-1 items-start gap-6 py-8 pb-10 sm:grid-cols-2 xl:grid-cols-3"
    >
      <article
        v-for="event in pagedEvents"
        :key="event.id"
        class="flex flex-col rounded-lg"
      >
        <div class="relative aspect-[1/0.67] w-full overflow-hidden rounded-t-lg">
          <img
            :src="event.imageUrl"
            :alt="event.title"
            class="size-full object-cover"
          />
          <span
            class="absolute top-1.5 right-1.5 rounded-md bg-dark px-2.5 py-1.5 text-[0.625rem] font-medium tracking-wider text-white uppercase"
          >
            {{ event.status === 'upcoming' ? 'Upcoming' : 'Past' }}
          </span>
        </div>

        <div
          class="flex justify-between gap-2 rounded-b-lg bg-[#171717] px-5 pt-5 pb-6"
        >
          <div class="flex min-w-0 flex-col gap-1">
            <h2 class="line-clamp-1 text-base leading-5 text-white">
              {{ event.title }}
            </h2>
            <p
              class="flex items-center gap-x-2 text-xs leading-5 text-[#8b8b8b]"
            >
              <span>{{ event.dateLabel }}</span>
              <span>•</span>
              <span class="line-clamp-1">{{ event.location }}</span>
            </p>
          </div>

          <div class="flex items-center gap-3 justify-between">
            <UButton
              icon="i-lucide-pencil"
              color="neutral"
              class="group cursor-pointer rounded-[6px] bg-[#232323] text-white hover:bg-[#2a2a2a]"
              aria-label="Edit event"
              @click="onEdit(event)"
              :ui="{
                leadingIcon:
                  'size-5 opacity-50 transition-opacity group-hover:opacity-100',
              }"
            />
            <UButton
              icon="material-symbols:ios-share-rounded"
              color="neutral"
              variant="ghost"
              class="group cursor-pointer rounded-[6px] bg-[#232323] text-white hover:bg-[#2a2a2a]"
              aria-label="Share event"
              @click="onShare(event)"
              :ui="{
                leadingIcon:
                  'size-5.5 opacity-50 transition-opacity group-hover:opacity-100',
              }"
            />
          </div>
        </div>
      </article>

      <div
        v-if="!pagedEvents.length"
        class="col-span-full flex items-center justify-center py-20 text-sm text-[#8b8b8b]"
      >
        No events match your search.
      </div>
    </div>

    <div class="mt-auto flex items-center justify-end pt-0 pb-10">
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
    title="What are events?"
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
            Host community events
          </h3>
          <p class="text-sm leading-relaxed text-[#8b8b8b]">
            Create events, manage registration, and keep your community coming
            back.
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
</template>
