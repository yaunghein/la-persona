<script setup lang="ts">
import type { TabsItem } from '@nuxt/ui';
import type { CommunityEventDetailTab } from '~~/shared/types/community-event-detail';

const props = defineProps<{
  title: string;
  status: 'upcoming' | 'past';
  activeTab: CommunityEventDetailTab;
}>();

const emit = defineEmits<{
  back: [];
  edit: [];
  share: [];
  'update:activeTab': [tab: CommunityEventDetailTab];
}>();

const tabItems: TabsItem[] = [
  { label: 'Dashboard', value: 'overview' },
  { label: 'Attendees', value: 'attendees' },
  { label: 'Check-in', value: 'check-in' },
];

const selectedTab = computed({
  get: () => props.activeTab,
  set: (value: string | number) => {
    emit('update:activeTab', String(value) as CommunityEventDetailTab);
  },
});
</script>

<template>
  <div class="flex min-h-[calc(100dvh-11rem)] flex-1 flex-col gap-8 pb-8">
    <div class="flex flex-col gap-8 pt-2 sm:pt-0">
      <div
        class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
      >
        <div class="flex min-w-0 items-start gap-3">
          <UButton
            icon="i-lucide-chevron-left"
            color="primary"
            class="size-9! bg-white/5 mt-1 mr-1 sm:mr-2 text-white hover:bg-white/10 active:hover:bg-white/20 flex items-center justify-center"
            aria-label="Back to events"
            @click="emit('back')"
          />
          <div class="flex min-w-0 flex-wrap items-start gap-x-0 gap-y-2">
            <h1
              class="max-w-124 text-xl font-normal leading-[1.2] tracking-[0.175rem] uppercase text-white sm:text-[1.75rem]"
            >
              {{ title }}
            </h1>
            <span
              class="mt-1 rounded-md bg-white/10 px-2 py-1 text-[0.625rem] font-medium tracking-wider text-white uppercase"
            >
              {{ status === 'upcoming' ? 'Upcoming' : 'Past' }}
            </span>
          </div>
        </div>

        <div class="flex shrink-0 items-center gap-2 sm:pt-1">
          <UButton
            label="Edit Event Details"
            leading-icon="i-lucide-pencil"
            color="neutral"
            :ui="{ leadingIcon: 'size-4' }"
            class="h-10 cursor-pointer rounded-full bg-white py-2 pr-6 pl-5 text-sm font-medium text-dark hover:bg-white/90"
            @click="emit('edit')"
          />
          <UButton
            icon="i-lucide-link"
            color="neutral"
            aria-label="Copy event link"
            :ui="{ leadingIcon: 'size-4' }"
            class="h-10! w-20! cursor-pointer rounded-full p-0 text-white flex items-center justify-center bg-white/5 hover:bg-white/15 active:hover:bg-white/20"
            @click="emit('share')"
          />
        </div>
      </div>

      <UTabs
        v-model="selectedTab"
        :items="tabItems"
        :content="false"
        color="neutral"
        variant="pill"
        size="lg"
        :ui="{
          root: 'items-start w-fit max-w-full',
          list: 'bg-[#171717] w-fit max-w-full rounded-lg p-1 overflow-x-auto',
          indicator: 'bg-[#232323]',
          trigger:
            'data-[state=active]:text-white data-[state=inactive]:text-[#8b8b8b] rounded-md px-4 py-2.5 grow-0',
        }"
      />
    </div>

    <div class="flex min-h-0 flex-1 flex-col">
      <slot />
    </div>
  </div>
</template>
