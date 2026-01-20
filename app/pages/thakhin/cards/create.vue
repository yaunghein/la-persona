<script setup lang="ts">
useSeoMeta({ ...getSeoTitle('CREATE CARD - LA PERSONA') });

const toast = useToast();
const isSubmitting = ref(false);

const typeOptions = [
  { label: "Founders' Club Edition", value: 'founders_club' },
  { label: 'Standard Edition', value: 'standard' },
];

const state = reactive({
  name: '',
  position: '',
  splineUrl: '',
  type: 'founders_club',
});

async function onCreate() {
  if (!state.name || !state.position) {
    toast.add({
      title: 'Error',
      description: 'Name and Position are required',
      color: 'error',
    });
    return;
  }

  isSubmitting.value = true;
  try {
    const newCard = await $fetch('/api/cards', {
      method: 'POST',
      body: state,
    });

    toast.add({
      title: 'Card Created',
      description: `"${newCard?.name}" is ready.`,
      color: 'success',
    });

    navigateTo('/thakhin/invite');
  } catch (err: any) {
    toast.add({
      title: 'Creation Failed',
      description: err.data?.message || err.statusMessage,
      color: 'error',
    });
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <UContainer class="py-12">
    <div class="max-w-xl mx-auto bg-dark border border-accented p-8 rounded-lg">
      <div class="space-y-6">
        <div>
          <label class="block text-xs font-bold text-muted uppercase mb-2">
            Name
          </label>
          <UInput
            v-model="state.name"
            placeholder="e.g. John Doe"
            size="xl"
            class="w-full"
          />
        </div>

        <div>
          <label class="block text-xs font-bold text-muted uppercase mb-2">
            Professional Title
          </label>
          <UInput
            v-model="state.position"
            placeholder="e.g. Senior Designer"
            size="xl"
            class="w-full"
          />
        </div>

        <div>
          <label class="block text-xs font-bold text-muted uppercase mb-2">
            Spline URL
          </label>
          <UInput
            v-model="state.splineUrl"
            placeholder="https://prod.spline.design/..."
            size="xl"
            class="w-full"
          />
        </div>

        <div>
          <label class="block text-xs font-bold text-muted uppercase mb-2">
            Edition Type
          </label>
          <USelect
            v-model="state.type"
            :items="typeOptions"
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
          @click="onCreate"
        >
          Create Card
        </UButton>
      </div>
    </div>
  </UContainer>
</template>
