<script setup lang="ts">
defineProps<{
  organizerName: string;
}>();

const emit = defineEmits<{
  next: [];
}>();

const progressReady = ref(false);
let advanceTimer: ReturnType<typeof setTimeout> | null = null;

onMounted(() => {
  requestAnimationFrame(() => {
    progressReady.value = true;
  });
  advanceTimer = setTimeout(() => {
    emit('next');
  }, 2000);
});

onBeforeUnmount(() => {
  if (advanceTimer) clearTimeout(advanceTimer);
});
</script>

<template>
  <div class="flex h-full min-h-0 flex-col">
    <div class="flex min-h-0 flex-1 flex-col justify-center p-6 sm:p-8 lg:px-16">
      <div class="mx-auto flex w-full max-w-120 flex-col gap-8 sm:max-w-140">
        <h1
          class="text-[1.75rem] font-medium leading-tight tracking-[0.175rem] uppercase text-white"
        >
          Setting up your
          <span class="font-bold">{{ organizerName }} card</span>
        </h1>
        <div class="relative h-0.5 w-full bg-[#2a2a2a]">
          <div
            class="absolute inset-y-0 left-0 bg-white transition-[width] duration-[2000ms] ease-linear"
            :class="progressReady ? 'w-3/4' : 'w-0'"
          />
        </div>
      </div>
    </div>
    <div class="shrink-0 px-6 py-4 sm:px-8 lg:px-16">
      <PoweredByLaPersona />
    </div>
  </div>
</template>
