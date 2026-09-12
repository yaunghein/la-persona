<script setup lang="ts">
const emit = defineEmits<{
  next: [];
}>();
</script>

<template>
  <div class="flex h-full min-h-0 flex-col">
    <div
      class="hide-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto p-6 sm:p-8 lg:px-16 lg:py-10"
    >
      <div
        class="mx-auto flex min-h-0 w-full max-w-120 flex-1 flex-col gap-8 sm:max-w-140"
      >
        <div class="flex flex-col gap-6">
          <h1
            class="text-[1.75rem] font-medium leading-tight tracking-[0.175rem] uppercase text-white"
          >
            Keep your card ready
          </h1>
          <p class="text-sm leading-normal text-[#8b8b8b]">
            Set the lock screen wallpaper on your phone for faster checkin at
            the event and to share your contact with other members faster.
          </p>
        </div>

        <div class="flex flex-1 items-center justify-center py-8">
          <div
            class="flex w-70 flex-col gap-6 rounded-lg border border-[#2a2a2a] bg-[#232323] p-5"
          >
            <div class="flex flex-col gap-1">
              <p class="text-base font-medium leading-5 text-white">
                Aung Pyae Kyaw
              </p>
              <p class="text-xs leading-5 text-[#8b8b8b]">Designer</p>
            </div>
            <div class="flex flex-col gap-1 text-xs leading-5 text-[#8b8b8b]">
              <p>+66 1234 5678</p>
              <p>aung@la-persona.com</p>
              <p>N/A</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <CommunityEventOnboardingFooter
      primary-label="Download Wallpaper"
      @primary="emit('next')"
    />
  </div>
</template>
