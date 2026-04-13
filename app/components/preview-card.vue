<script setup lang="ts">
const props = defineProps<{
  card: CardDTO;
}>();

const emit = defineEmits<{
  view: [card: CardDTO];
  edit: [card: CardDTO];
  delete: [card: CardDTO];
}>();

const planBadge = computed(() => {
  const planCode = props.card.subscription?.planCode;
  const isTrial = props.card.subscription?.isTrial;
  const status = props.card.subscription?.status;

  if (!planCode || isTrial || status === 'trial') {
    return { label: 'Trial', color: 'neutral' as const };
  }

  if (planCode === 'founder-club') {
    return { label: "Founders' Club", color: 'primary' as const };
  }

  if (planCode === 'premium') {
    return { label: 'Premium', color: 'primary' as const };
  }

  return { label: 'Standard', color: 'neutral' as const };
});
</script>

<template>
  <UCard class="overflow-hidden">
    <div class="space-y-1">
      <div class="flex items-center justify-between">
        <h3 class="font-semibold">
          {{ card.firstName }} {{ card.lastName ?? '' }}
        </h3>

        <UBadge
          size="lg"
          variant="soft"
          :color="planBadge.color"
          class="capitalize"
        >
          {{ planBadge.label }}
        </UBadge>
      </div>

      <p class="text-sm text-neutral-500">
        {{ card.position }}
      </p>
    </div>

    <template #footer>
      <div class="flex items-center gap-1">
        <UButton
          icon="i-heroicons-eye"
          size="xl"
          color="neutral"
          variant="ghost"
          target="_black"
          :to="`/${card.id}`"
        />
        <UButton
          icon="i-heroicons-pencil-square"
          size="xl"
          color="primary"
          variant="ghost"
          :to="`/platform/cards/${card.id}`"
        />
        <UButton
          icon="i-heroicons-trash"
          size="xl"
          color="error"
          variant="ghost"
          @click="emit('delete', card)"
        />
      </div>
    </template>
  </UCard>
</template>
