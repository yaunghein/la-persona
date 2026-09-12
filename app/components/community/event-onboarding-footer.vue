<script setup lang="ts">
defineProps<{
  primaryLabel: string;
  primaryMuted?: boolean;
  secondaryLabel?: string;
}>();

const emit = defineEmits<{
  primary: [];
  secondary: [];
}>();
</script>

<template>
  <div
    class="shrink-0 border-t border-[#2a2a2a] px-6 pt-8 pb-4 sm:px-8 lg:px-16"
  >
    <div
      class="mx-auto flex w-full max-w-120 flex-col items-center gap-8 sm:max-w-140"
    >
      <div class="flex w-full flex-col items-center gap-6">
        <button
          type="button"
          class="flex h-13 w-full cursor-pointer items-center justify-center rounded-full px-2.5 text-sm font-bold"
          :class="
            primaryMuted
              ? 'bg-[#232323] text-white hover:bg-[#2a2a2a]'
              : 'bg-white text-dark hover:bg-white/90'
          "
          @click="emit('primary')"
        >
          {{ primaryLabel }}
        </button>
        <button
          v-if="secondaryLabel"
          type="button"
          class="cursor-pointer text-sm font-bold text-white underline"
          @click="emit('secondary')"
        >
          {{ secondaryLabel }}
        </button>
      </div>
      <PoweredByLaPersona />
    </div>
  </div>
</template>
