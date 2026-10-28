<script setup lang="ts">
withDefaults(
  defineProps<{
    primaryLabel: string;
    primaryMuted?: boolean;
    primaryDisabled?: boolean;
    primaryType?: 'button' | 'submit';
    secondaryLabel?: string;
    showPoweredBy?: boolean;
  }>(),
  {
    primaryType: 'button',
    showPoweredBy: true,
  }
);

const emit = defineEmits<{
  primary: [];
  secondary: [];
}>();
</script>

<template>
  <div class="shrink-0 border-t border-line px-6 py-4 sm:px-8 lg:px-16">
    <div
      class="mx-auto flex w-full max-w-120 flex-col items-center gap-4 sm:max-w-112"
    >
      <div class="flex w-full flex-col items-center gap-4">
        <button
          :type="primaryType"
          class="flex h-13 w-full cursor-pointer items-center justify-center rounded-full px-5 text-sm font-medium disabled:cursor-default disabled:opacity-70"
          :disabled="primaryDisabled"
          :class="
            primaryMuted
              ? 'bg-raised text-ink hover:bg-line'
              : 'bg-ink text-ink-inverse hover:bg-ink/90'
          "
          @click="primaryType === 'button' ? emit('primary') : undefined"
        >
          {{ primaryLabel }}
        </button>
        <button
          v-if="secondaryLabel"
          type="button"
          class="cursor-pointer text-sm font-medium text-ink underline underline-offset-4 hover:text-ink/80"
          @click="emit('secondary')"
        >
          {{ secondaryLabel }}
        </button>
      </div>
      <UiPoweredByLaPersona v-if="showPoweredBy" />
    </div>
  </div>
</template>
