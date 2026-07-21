<script setup lang="ts">
definePageMeta({
  layout: 'platform',
});
</script>

<template>
  <div class="flex sm:min-h-[calc(100dvh-7rem)] items-center justify-center">
    <div
      class="w-full max-w-106 overflow-hidden rounded-[8px] border border-[#232323] bg-[#171717]"
    >
      <div
        class="flex items-center justify-between border-b-2 border-[#232323] p-4 sm:p-6"
      >
        <h2 class="text-sm font-medium uppercase tracking-widest text-white">
          Members
        </h2>
        <UBadge
          label="Coming Soon"
          size="sm"
          color="neutral"
          variant="soft"
          class="uppercase tracking-wide"
        />
      </div>
      <div class="space-y-2 p-4 sm:p-6">
        <h3
          class="text-md sm:text-xl font-medium uppercase tracking-widest text-white"
        >
          Manage event members
        </h3>
        <p class="text-sm leading-5.25 text-muted">
          Member management for event organizer workspaces is on the way.
        </p>
      </div>
    </div>
  </div>
</template>
