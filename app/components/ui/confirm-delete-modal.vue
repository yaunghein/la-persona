<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string;
    pending?: boolean;
    confirmLabel?: string;
  }>(),
  { pending: false, confirmLabel: 'Delete' }
);

const open = defineModel<boolean>('open', { required: true });
defineEmits<{ confirm: [] }>();

function close() {
  open.value = false;
}
</script>

<template>
  <UModal
    v-model:open="open"
    :close="false"
    :dismissible="!pending"
    :title="title"
    :ui="{
      content: 'bg-surface max-w-md',
      title: 'text-ink',
      body: 'pt-4',
      footer: 'justify-end gap-2',
    }"
  >
    <template #body>
      <p class="text-sm leading-relaxed text-soft">
        <slot />
      </p>
    </template>
    <template #footer>
      <UButton
        label="Cancel"
        color="neutral"
        variant="ghost"
        class="h-10 text-sm rounded-full px-5"
        :disabled="pending"
        @click="close"
      />
      <UButton
        :label="confirmLabel"
        color="error"
        class="h-10 text-sm rounded-full px-6 font-medium"
        :loading="pending"
        @click="$emit('confirm')"
      />
    </template>
  </UModal>
</template>
