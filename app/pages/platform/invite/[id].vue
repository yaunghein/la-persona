<script setup lang="ts">
useSeoMeta({ ...getSeoTitle('Invitation - LA PERSONA') });

const route = useRoute();
const { id } = route.params;

const pending = ref(true);
const error = ref<any>(null);
const data = ref<any>(null);

onMounted(async () => {
  try {
    const response = await $fetch('/api/invite', {
      method: 'POST',
      body: { id },
    });

    data.value = response;
    pending.value = false;

    // if (response?.success) {
    //   setTimeout(() => {
    //     navigateTo(
    //       response.card?.subscription?.planCode === 'founder_club'
    //         ? '/platform/cards'
    //         : '/platform'
    //     );
    //   }, 4000);
    // }
  } catch (err: any) {
    pending.value = false;
    error.value = err;
  }
});
</script>

<template>
  <UContainer class="flex flex-col items-center justify-center min-h-screen">
    <div
      class="w-full max-w-md overflow-hidden bg-dark border-neutral-800 px-8 py-10"
    >
      <div
        v-if="pending"
        class="flex flex-col items-center text-center space-y-6"
      >
        <div class="relative">
          <UIcon
            name="i-heroicons-arrow-path"
            class="w-16 h-16 animate-spin text-primary-500"
          />
          <div
            class="absolute inset-0 blur-xl bg-primary-500/20 animate-pulse"
          />
        </div>
        <div>
          <h2 class="text-2xl font-bold tracking-tight text-white uppercase">
            Kha Na Wait Oo
          </h2>
          <p class="text-neutral-400 mt-2 text-sm leading-relaxed">
            Linking your unique digital identity to your profile. <br />
            Please do not refresh.
          </p>
        </div>
      </div>

      <div
        v-else-if="error"
        class="flex flex-col items-center text-center space-y-6"
      >
        <div
          class="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center"
        >
          <UIcon
            name="i-heroicons-exclamation-triangle"
            class="w-10 h-10 text-red-500"
          />
        </div>
        <div>
          <h2 class="text-2xl font-bold text-white uppercase">Link Invalid</h2>
          <p class="text-neutral-400 mt-2 text-sm">
            {{
              error.statusMessage ||
              'This invitation has expired or has already been claimed.'
            }}
          </p>
        </div>
        <UButton size="xl"
          to="/platform"
          color="neutral"
          variant="outline"
          class="mt-4 px-8"
        >
          Return to Dashboard
        </UButton>
      </div>

      <div v-else class="flex flex-col items-center text-center space-y-6">
        <div
          class="w-20 h-20 rounded-full bg-primary-500/10 flex items-center justify-center"
        >
          <UIcon
            name="i-heroicons-check-badge-20-solid"
            class="w-12 h-12 text-primary-500"
          />
        </div>

        <div>
          <h2 class="text-3xl font-black text-white uppercase tracking-tighter">
            Welcome
          </h2>
          <p class="text-neutral-400 mt-2">
            Card
            <span class="text-white font-medium">"{{ data?.card?.name }}"</span>
            has been successfully activated.
          </p>
        </div>

        <div class="w-full pt-4">
          <UButton
            to="/platform/cards"
            block
            size="xl"
            color="neutral"
            variant="solid"
            class="uppercase tracking-tight rounded-full"
          >
            Enter Platform
          </UButton>
        </div>
      </div>
    </div>
  </UContainer>
</template>
