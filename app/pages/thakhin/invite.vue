<script setup lang="ts">
useSeoMeta({ ...getSeoTitle('Generate Invite - LA PERSONA') });

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
  <UContainer class="py-12">
    <div class="max-w-xl mx-auto bg-dark border border-accented p-8 rounded-lg">
      <div class="space-y-6">
        <div class="flex items-center justify-between mb-5">
          <h1 class="text-xl font-bold uppercase tracking-tight text-white">
            Generate Invitation Link
          </h1>
          <UBadge
            color="neutral"
            variant="outline"
            class="text-[10px] uppercase tracking-widest px-2 py-0"
          >
            Admin
          </UBadge>
        </div>

        <div>
          <label class="block text-xs font-bold text-muted uppercase mb-2">
            Select Available Card
          </label>
          <USelectMenu
            v-model="state.cardId"
            :items="cards?.map((card) => ({ label: card.name, id: card.id }))"
            placeholder="Search unclaimed cards..."
            size="xl"
            class="w-full"
            :loading="loadingCards"
            :ui-menu="{ background: 'bg-dark', border: 'border-accented' }"
          />
        </div>

        <div>
          <label class="block text-xs font-bold text-muted uppercase mb-2">
            Expiry Time (Minutes)
          </label>
          <UInput
            v-model="state.minutes"
            type="number"
            placeholder="30"
            size="xl"
            class="w-full"
          />
        </div>

        <UButton
          block
          size="xl"
          color="neutral"
          class="uppercase tracking-widest mt-4 rounded-full"
          :loading="isSubmitting"
          @click="handleGenerate"
        >
          Generate
        </UButton>

        <Transition
          enter-active-class="transition duration-300 ease-out"
          enter-from-class="transform scale-95 opacity-0"
          enter-to-class="transform scale-100 opacity-100"
        >
          <div
            v-if="generatedUrl"
            class="mt-8 pt-6 border-t border-accented space-y-4"
          >
            <div>
              <label
                class="block text-[10px] font-bold uppercase tracking-[0.2em] text-primary-500 mb-3"
              >
                Secure Invitation URL
              </label>
              <div
                class="flex items-center bg-white/5 border border-accented rounded-lg px-2 py-1"
              >
                <UInput
                  v-model="generatedUrl"
                  readonly
                  class="flex-1"
                  variant="none"
                  color="neutral"
                />
                <UButton
                  icon="i-heroicons-clipboard-document"
                  color="neutral"
                  variant="ghost"
                  class="rounded-md"
                  @click="copyLink"
                />
              </div>
            </div>

            <p
              class="text-[10px] text-muted uppercase tracking-widest text-center"
            >
              * Valid for {{ state.minutes }} minutes from generation
            </p>
          </div>
        </Transition>
      </div>
    </div>
  </UContainer>
</template>
