<script setup lang="ts">
const props = defineProps<{
  card: CardDTO;
}>();

const emit = defineEmits<{
  view: [card: CardDTO];
  edit: [card: CardDTO];
  delete: [card: CardDTO];
}>();
</script>

<template>
  <UCard class="overflow-hidden">
    <div class="space-y-1">
      <div class="flex items-center justify-between">
        <h3 class="font-semibold">
          {{ card.name }}
        </h3>

        <UBadge
          size="lg"
          variant="soft"
          :color="card.type === 'free' ? 'neutral' : 'primary'"
          class="capitalize"
        >
          {{ card.type }}
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
          size="xs"
          color="neutral"
          variant="ghost"
          target="_black"
          :to="`/${card.id}`"
        />
        <UButton
          icon="i-heroicons-pencil-square"
          size="xs"
          color="primary"
          variant="ghost"
          :to="`/platform/cards/${card.id}`"
        />
        <UButton
          icon="i-heroicons-trash"
          size="xs"
          color="error"
          variant="ghost"
          @click="emit('delete', card)"
        />
      </div>
    </template>
  </UCard>
</template>
