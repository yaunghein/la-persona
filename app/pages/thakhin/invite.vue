<script setup lang="ts">
import { card } from '#build/ui';

useSeoMeta({ ...getSeoTitle('GENERATE INVITE - LA PERSONA') });

const toast = useToast();

const state: any = reactive({
  cardId: undefined,
  minutes: 30,
});

const generatedUrl = ref('');
const isSubmitting = ref(false);

// Fetch unowned cards for the select menu
const { data: cards, pending: loadingCards } =
  await useFetch('/api/cards/unowned');

async function handleGenerate() {
  if (!state.cardId) return;

  isSubmitting.value = true;
  try {
    const res = await $fetch('/api/invite/generate', {
      method: 'POST',
      body: {
        cardId: state.cardId.id,
        minutes: state.minutes,
      },
    });
    generatedUrl.value = window.location.origin + res.url;
    toast.add({
      title: 'Success',
      description: 'Link generated successfully',
      color: 'success',
    });
  } catch (err) {
    toast.add({
      title: 'Error',
      description: 'Failed to generate link',
      color: 'error',
    });
  } finally {
    isSubmitting.value = false;
  }
}

const copyLink = () => {
  navigator.clipboard.writeText(generatedUrl.value);
  toast.add({
    title: 'Copied',
    description: 'Link copied to clipboard',
    color: 'neutral',
  });
};
</script>

<template>
  <UContainer class="py-10">
    <UCard class="max-w-2xl mx-auto bg-dark border-neutral-800">
      <template #header>
        <div class="flex items-center justify-between">
          <h1 class="text-xl font-bold uppercase tracking-tight text-white">
            Generate Invitation Link
          </h1>
          <UBadge color="primary" variant="subtle">Admin Only</UBadge>
        </div>
      </template>

      <div class="space-y-6 py-4">
        <USelectMenu
          v-model="state.cardId"
          :items="cards?.map((card) => ({ label: card.name, id: card.id }))"
          value-attribute="id"
          option-attribute="name"
          placeholder="Search cards..."
          size="xl"
          :loading="loadingCards"
        />

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <UInput v-model="state.minutes" type="number" size="xl" />
        </div>

        <UButton
          block
          size="xl"
          color="neutral"
          class="font-bold uppercase tracking-widest mt-4"
          :loading="isSubmitting"
          @click="handleGenerate"
        >
          Generate Invitation Link
        </UButton>

        <Transition
          enter-active-class="transition duration-300 ease-out"
          enter-from-class="transform scale-95 opacity-0"
          enter-to-class="transform scale-100 opacity-100"
        >
          <div
            v-if="generatedUrl"
            class="mt-8 p-4 rounded bg-white/5 border border-neutral-800 space-y-3"
          >
            <label
              class="text-[10px] font-bold uppercase tracking-widest text-neutral-500"
              >Shareable Invitation Link</label
            >
            <div class="flex gap-2">
              <UInput
                v-model="generatedUrl"
                readonly
                class="flex-1"
                variant="none"
              />
              <UButton
                icon="i-heroicons-clipboard"
                color="neutral"
                variant="ghost"
                @click="copyLink"
              />
            </div>
            <p
              class="text-[10px] text-primary-500 italic uppercase tracking-tighter"
            >
              Expires in {{ state.minutes }} minutes
            </p>
          </div>
        </Transition>
      </div>
    </UCard>
  </UContainer>
</template>
