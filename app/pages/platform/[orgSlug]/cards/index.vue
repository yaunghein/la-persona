<script setup lang="ts">
definePageMeta({
  layout: 'platform',
});

useSeoMeta({ ...getSeoTitle('Cards - LA PERSONA') });

const { data: cards, pending, error } = await useFetch<CardDTO[]>('/api/cards');

const isSlideoverOpen = ref(false);
</script>

<template>
  <div class="flex w-full items-center justify-between">
    <h1
      class="text-[1.75rem] font-medium tracking-[0.17rem] uppercase leading-none"
    >
      Your Persona Cards
    </h1>

    <USlideover
      v-model:open="isSlideoverOpen"
      side="right"
      inset
      title="REQUEST NEW CARD"
    >
      <UButton
        label="New Card"
        class="rounded-full font-semibold px-4 cursor-pointer"
        icon="i-lucide-plus"
        size="lg"
      />
      <template #body>
        <FormRequestCard @close="isSlideoverOpen = false" />
      </template>
    </USlideover>
  </div>

  <div v-if="cards" class="grid grid-cols-3">
    <UCard v-for="card in cards" variant="outline" class="bg-white/2">
      <div class="aspect-5/3 relative">
        <UBadge
          class="absolute -top-4 -right-4 bg-white/10 uppercase text-white font-semibold"
          color="neutral"
          size="sm"
        >
          Founders' Club Edition
        </UBadge>
      </div>

      <template #footer>
        <div>
          <div>{{ card.firstName }} {{ card.lastName }}</div>
        </div>
        <div class="mt-4 flex items-center justify-start gap-2">
          <UButton
            icon="i-lucide-scan-eye"
            color="primary"
            size="sm"
            class="bg-white/5 text-white hover:bg-white/15 active:hover:bg-white/20"
            target="_blank"
            :href="`/yaunghein/${card.slug}`"
          />
          <UButton
            icon="i-lucide-square-pen"
            color="primary"
            size="sm"
            class="bg-white/5 text-white hover:bg-white/15 active:hover:bg-white/20"
            :href="`/platform/cards/${card.slug}`"
          />
          <UButton
            icon="i-lucide-trash"
            color="primary"
            size="sm"
            class="bg-white/5 text-red-500 hover:bg-white/15 ml-auto active:hover:bg-white/20"
          />
        </div>
      </template>
    </UCard>
  </div>

  <UContainer v-else class="h-[calc(100vh-10rem)] min-h-96">
    <div class="flex flex-col items-center justify-center text-center h-full">
      <div
        class="bg-[#232323] w-11 aspect-square flex items-center justify-center rounded-sm"
      >
        <UIcon
          name="i-material-symbols:cards-stack-outline-sharp"
          class="w-5 h-5"
        />
      </div>
      <h2 class="text-sm tracking-[1.4px] font-semibold uppercase mt-8 mb-4">
        No cards in here yet
      </h2>
      <p class="text-muted max-w-sm text-sm leading-relaxed">
        It looks like you don't have any card yet.<br />
        Create one to get started.
      </p>
    </div>
  </UContainer>
</template>
