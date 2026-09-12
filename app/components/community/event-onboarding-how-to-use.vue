<script setup lang="ts">
const emit = defineEmits<{
  done: [];
}>();

const steps = [
  {
    title: 'Save your QR wallpaper',
    body: "Download your Community Card wallpaper and set it as your phone's lock screen.",
  },
  {
    title: 'Check in at the event',
    body: 'Show your QR code to the organizer for a quick check-in.',
  },
  {
    title: 'Share your contact',
    body: 'Show your QR code to other members so they can save your contact information.',
  },
  {
    title: 'Connect with other members',
    body: "Scan another member's QR code to save their contact information.",
  },
];
</script>

<template>
  <div class="flex h-full min-h-0 flex-col">
    <div
      class="hide-scrollbar min-h-0 flex-1 overflow-y-auto p-6 sm:p-8 lg:px-16 lg:py-10"
    >
      <div class="mx-auto flex w-full max-w-120 flex-col gap-8 sm:max-w-140">
        <h1
          class="text-[1.75rem] font-medium leading-tight tracking-[0.175rem] uppercase text-white"
        >
          How to use your Community Card
        </h1>

        <div class="flex flex-col divide-y divide-[#2a2a2a]">
          <div
            v-for="(item, index) in steps"
            :key="item.title"
            class="flex items-start gap-2 px-4 py-6"
          >
            <span class="shrink-0 text-sm leading-normal text-white">
              {{ index + 1 }}.
            </span>
            <div class="flex min-w-0 flex-col gap-2">
              <p class="text-sm leading-normal text-white">{{ item.title }}</p>
              <p class="text-sm leading-normal text-[#8b8b8b]">{{ item.body }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <CommunityEventOnboardingFooter
      primary-label="Got it"
      primary-muted
      @primary="emit('done')"
    />
  </div>
</template>
