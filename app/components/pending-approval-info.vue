<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    open: boolean;
    cardName?: string;
  }>(),
  {
    cardName: 'This card',
  }
);

const emit = defineEmits<{
  'update:open': [value: boolean];
}>();

const modalOpen = computed({
  get: () => props.open,
  set: (value: boolean) => emit('update:open', value),
});
</script>

<template>
  <UModal
    v-model:open="modalOpen"
    title="Pending Approval"
    :ui="{
      content: 'bg-[#171717] border border-[#2a2a2a]',
      header: 'border-b border-[#2a2a2a]',
      title: 'text-white',
    }"
  >
    <template #body>
      <div class="space-y-4 text-sm text-[#bcbcbc] leading-relaxed">
        <p>
          <span class="text-white font-medium">{{ cardName }}</span>
          is currently under payment verification.
        </p>
        <p>
          Your card is created and visible now, but some features may stay
          limited until the payment is approved by our team.
        </p>
        <p>
          If a payment is identified as invalid or fraudulent, we reserve the
          right to suspend or remove the card and revoke related access.
        </p>
        <p class="text-[#8b8b8b]">
          Need help? Please contact support for verification updates.
        </p>
      </div>
    </template>
  </UModal>
</template>
