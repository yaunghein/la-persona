<script setup lang="ts">
import type { CommunityAbout } from '~~/shared/contracts/organization';

const props = defineProps<{
  data: CommunityAbout;
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
const coverSrc = computed(() => communityCoverSrc(props.data.coverImageUrl));
const logoSrc = computed(() =>
  communityLogoSrc(props.data.logoUrl, props.data.name)
);
</script>

<template>
  <div class="flex flex-col">
    <div class="flex items-center gap-3 pb-6 pt-2">
      <h1
        class="text-xl font-normal leading-tight tracking-widest uppercase text-ink sm:text-2xl"
      >
        About community
      </h1>
      <UButton
        icon="i-material-symbols:info-outline"
        color="neutral"
        variant="ghost"
        class="size-5 cursor-pointer p-0 text-ink hover:bg-transparent"
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
        class="relative flex aspect-[1/0.25] w-full items-center justify-center overflow-hidden rounded-t-lg bg-raised"
      >
        <UiSkeletonImage
          v-if="coverSrc"
          :src="coverSrc"
          alt=""
          width="1024"
          class="size-full object-cover"
        />
        <UIcon
          v-else
          name="i-lucide-image"
          class="size-6 text-subtle sm:size-8"
          aria-hidden="true"
        />
      </div>

      <div
        class="flex flex-col gap-8 rounded-b-lg bg-surface px-5 py-8 sm:px-8"
      >
        <div class="flex items-start gap-4 sm:gap-6">
          <div
            class="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-raised sm:size-20"
          >
            <UiSkeletonImage
              :src="logoSrc"
              :alt="data.name"
              width="96"
              height="96"
              class="size-full object-cover"
            />
          </div>
          <div class="flex min-w-0 flex-col gap-2">
            <h2
              class="text-lg font-normal leading-tight tracking-widest uppercase text-ink sm:text-2xl"
            >
              {{ data.name }}
            </h2>
            <ul
              class="flex flex-col gap-0.5 text-sm font-medium leading-5 text-subtle"
            >
              <li>{{ memberLabel }}</li>
              <li>{{ eventLabel }}</li>
              <li>{{ foundedLabel }}</li>
            </ul>
          </div>
        </div>

        <div class="h-px w-full bg-raised" />

        <section class="flex flex-col gap-4">
          <h3
            class="text-sm font-medium leading-snug tracking-widest uppercase text-ink sm:text-base"
          >
            About
          </h3>
          <div
            v-if="hasHtml(data.description)"
            class="community-html text-sm font-medium leading-normal text-ink max-w-4xl"
            v-html="data.description"
          />
          <p v-else class="text-sm font-medium leading-normal text-subtle">
            No description yet.
          </p>
        </section>

        <div class="h-px w-full bg-raised" />

        <div class="grid grid-cols-1 items-start gap-8 sm:grid-cols-2">
          <section class="flex flex-col gap-4">
            <h3
              class="text-sm font-medium leading-snug tracking-widest uppercase text-ink sm:text-base"
            >
              Community Guidelines
            </h3>
            <div
              v-if="hasHtml(data.guidelines)"
              class="community-html text-sm font-medium leading-normal text-ink"
              v-html="data.guidelines"
            />
            <p v-else class="text-sm font-medium leading-normal text-subtle">
              No guidelines yet.
            </p>
          </section>

          <section class="flex flex-col gap-4">
            <h3
              class="text-sm font-medium leading-snug tracking-widest uppercase text-ink sm:text-base"
            >
              People join {{ data.name }} to
            </h3>
            <div
              v-if="hasHtml(data.whyJoin)"
              class="community-html text-sm font-medium leading-normal text-ink"
              v-html="data.whyJoin"
            />
            <p v-else class="text-sm font-medium leading-normal text-subtle">
              No details yet.
            </p>
          </section>
        </div>

        <div class="h-px w-full bg-raised" />

        <div
          class="flex flex-col-reverse items-stretch justify-end gap-2.5 sm:flex-row sm:items-center"
        >
          <UButton
            label="Quit Community"
            leading-icon="i-lucide-log-out"
            color="error"
            variant="soft"
            class="h-10 cursor-pointer justify-center rounded-full pr-6 pl-5 text-sm font-medium"
            @click="emit('quit')"
          />
          <UButton
            label="View Organizer"
            leading-icon="i-lucide-eye"
            color="neutral"
            class="h-10 cursor-pointer justify-center rounded-full bg-ink pr-6 pl-5 text-sm font-medium text-ink-inverse hover:bg-ink/90"
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
      content: 'sm:max-w-120 rounded-lg bg-surface',
      title: 'text-sm font-medium uppercase tracking-widest text-ink',
      body: 'px-5 py-4 sm:px-6 sm:py-5',
    }"
  >
    <template #body>
      <div class="space-y-5">
        <div class="space-y-2">
          <h3
            class="text-lg font-medium tracking-widest uppercase text-ink sm:text-xl"
          >
            Community about
          </h3>
          <p class="text-sm leading-relaxed text-subtle">
            See who this community is, how it runs, and why people join.
          </p>
        </div>
        <div class="flex justify-end">
          <UButton
            label="Understood"
            color="neutral"
            class="h-10 text-sm rounded-full bg-ink px-5 font-medium text-ink-inverse hover:bg-ink/90"
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
  color: var(--lp-ink);
}

.community-html :deep(a) {
  text-decoration: underline;
}
</style>
