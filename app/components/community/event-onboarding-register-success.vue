<script setup lang="ts">
defineProps<{
  eventTitle: string;
}>();

const emit = defineEmits<{
  next: [];
  skip: [];
}>();
</script>

<template>
  <div class="flex h-full min-h-0 flex-col">
    <div
      class="shrink-0 px-6 py-6 text-center text-sm font-bold leading-[1.1] text-white sm:px-8 lg:px-16"
    >
      You're all set
    </div>

    <div
      class="flex min-h-0 flex-1 flex-col items-center justify-center gap-2.5 px-6 py-13 text-center sm:px-8 lg:px-16"
    >
      <UIcon name="i-material-symbols:verified" class="size-23 text-green" />
      <div class="flex w-full max-w-88 flex-col items-center gap-4">
        <p
          class="text-xl font-medium leading-[1.35] tracking-[2px] uppercase text-green"
        >
          We'll see you there.
        </p>
        <p class="text-sm leading-normal text-white">
          You're registered for
          <span class="font-bold">{{ eventTitle }}.</span>
          We'll send you a reminder before the event.
        </p>
      </div>
    </div>

    <CommunityEventOnboardingFooter
      primary-label="Learn How to Use Community Card"
      primary-muted
      secondary-label="May be later"
      @primary="emit('next')"
      @secondary="emit('skip')"
    />
  </div>
</template>
