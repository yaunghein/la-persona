<script setup lang="ts">
import type { CommunityAboutDTO } from '~~/shared/types/community-about';

const props = defineProps<{
  data: CommunityAboutDTO;
}>();

const emit = defineEmits<{
  quit: [];
  viewOrganizer: [];
}>();

const isInfoOpen = ref(false);

function hasHtml(value: string) {
  return (
    value
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .trim().length > 0
  );
}

const memberLabel = computed(
  () =>
    `${props.data.memberCount.toLocaleString()} ${
      props.data.memberCount === 1 ? 'Member' : 'Members'
    }`
);

const eventLabel = computed(
  () => `${props.data.eventCount.toLocaleString()} Event Hosted`
);

const foundedLabel = computed(() => `Founded in ${props.data.foundedYear}`);
</script>

<template>
  <div class="flex flex-col">
    <div class="flex items-center gap-3 pb-6 pt-2">
      <h1
        class="text-[1.75rem] font-normal leading-5 tracking-[0.175rem] uppercase text-white"
      >
        About community
      </h1>
      <UButton
        icon="i-material-symbols:info-outline"
        color="neutral"
        variant="ghost"
        class="size-5 cursor-pointer p-0 text-white hover:bg-transparent"
        aria-label="Open about community information"
        @click="
          () => {
            isInfoOpen = true;
          }
        "
      />
    </div>

    <div class="flex w-full flex-col">
      <div
        class="relative aspect-[1/0.25] w-full overflow-hidden rounded-t-lg bg-[#232323]"
      >
        <img
          v-if="data.coverImageUrl"
          :src="data.coverImageUrl"
          alt=""
          class="size-full object-cover"
        />
      </div>

      <div class="flex flex-col gap-8 rounded-b-lg bg-[#171717] p-8">
        <div class="flex items-center gap-6">
          <div
            class="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#232323]"
          >
            <img
              v-if="data.logoUrl"
              :src="data.logoUrl"
              :alt="data.name"
              class="size-full object-cover"
            />
            <UIcon
              v-else
              name="i-lucide-building-2"
              class="size-10 text-[#8b8b8b]"
            />
          </div>
          <div class="flex min-w-0 flex-col gap-4">
            <h2
              class="text-[1.75rem] font-normal leading-5 tracking-[0.175rem] uppercase text-white"
            >
              {{ data.name }}
            </h2>
            <p
              class="flex flex-wrap items-center gap-2 text-sm font-medium leading-5 text-[#8b8b8b]"
            >
              <span>{{ memberLabel }}</span>
              <span class="size-0.75 rounded-full bg-[#8b8b8b]" />
              <span>{{ eventLabel }}</span>
              <span class="size-0.75 rounded-full bg-[#8b8b8b]" />
              <span>{{ foundedLabel }}</span>
            </p>
          </div>
        </div>

        <div class="h-px w-full bg-[#232323]" />

        <section class="flex flex-col gap-4">
          <h3
            class="text-xl font-medium leading-[1.35] tracking-[0.125rem] uppercase text-white"
          >
            About
          </h3>
          <div
            v-if="hasHtml(data.description)"
            class="community-html text-sm font-medium leading-normal text-white max-w-4xl"
            v-html="data.description"
          />
          <p v-else class="text-sm font-medium leading-normal text-[#8b8b8b]">
            No description yet.
          </p>
        </section>

        <div class="h-px w-full bg-[#232323]" />

        <div class="grid grid-cols-1 items-start gap-8 sm:grid-cols-2">
          <section class="flex flex-col gap-4">
            <h3
              class="text-xl font-medium leading-[1.35] tracking-[0.125rem] uppercase text-white"
            >
              Community Guidelines
            </h3>
            <div
              v-if="hasHtml(data.guidelines)"
              class="community-html text-sm font-medium leading-normal text-white"
              v-html="data.guidelines"
            />
            <p v-else class="text-sm font-medium leading-normal text-[#8b8b8b]">
              No guidelines yet.
            </p>
          </section>

          <section class="flex flex-col gap-4">
            <h3
              class="text-xl font-medium leading-[1.35] tracking-[0.125rem] uppercase text-white"
            >
              People join {{ data.name }} to
            </h3>
            <div
              v-if="hasHtml(data.whyJoin)"
              class="community-html text-sm font-medium leading-normal text-white"
              v-html="data.whyJoin"
            />
            <p v-else class="text-sm font-medium leading-normal text-[#8b8b8b]">
              No details yet.
            </p>
          </section>
        </div>

        <div class="h-px w-full bg-[#232323]" />

        <div
          class="flex flex-col-reverse items-stretch justify-end gap-2.5 sm:flex-row sm:items-center"
        >
          <UButton
            label="Quit Community"
            leading-icon="i-lucide-log-out"
            color="neutral"
            variant="ghost"
            class="h-9 cursor-pointer justify-center rounded-full py-2 pr-6 pl-5 text-sm font-medium text-[#8b8b8b] hover:bg-[#232323] hover:text-white"
            @click="emit('quit')"
          />
          <UButton
            label="View Organizer"
            leading-icon="i-lucide-eye"
            color="neutral"
            class="h-9 cursor-pointer justify-center rounded-full bg-white py-2 pr-6 pl-5 text-sm font-medium text-dark hover:bg-white/90"
            @click="emit('viewOrganizer')"
          />
        </div>
      </div>
    </div>
  </div>

  <UModal
    v-model:open="isInfoOpen"
    title="About this community"
    :ui="{
      content: 'sm:max-w-[480px] rounded-lg bg-[#171717]',
      title: 'text-sm font-medium uppercase tracking-widest text-white',
      body: 'px-5 py-4 sm:px-6 sm:py-5',
    }"
  >
    <template #body>
      <div class="space-y-5">
        <div class="space-y-2">
          <h3
            class="text-lg font-medium tracking-widest uppercase text-white sm:text-xl"
          >
            Community about
          </h3>
          <p class="text-sm leading-relaxed text-[#8b8b8b]">
            See who this community is, how it runs, and why people join.
          </p>
        </div>
        <div class="flex justify-end">
          <UButton
            label="Understood"
            color="neutral"
            class="h-10 rounded-full bg-white px-5 font-medium text-dark hover:bg-white/90"
            @click="
              () => {
                isInfoOpen = false;
              }
            "
          />
        </div>
      </div>
    </template>
  </UModal>
</template>

<style scoped>
.community-html :deep(p) {
  margin: 0;
}

.community-html :deep(p + p) {
  margin-top: 0.75rem;
}

.community-html :deep(ul) {
  list-style-type: disc;
  list-style-position: outside;
  margin: 0;
  padding-inline-start: 1.25rem;
}

.community-html :deep(ol) {
  list-style-type: decimal;
  list-style-position: outside;
  margin: 0;
  padding-inline-start: 1.25rem;
}

.community-html :deep(li) {
  margin: 0;
  line-height: 1.5;
}

.community-html :deep(li + li) {
  margin-top: 0;
}

.community-html :deep(:is(ul, ol) > li::marker) {
  color: #ffffff;
}

.community-html :deep(a) {
  text-decoration: underline;
}
</style>
