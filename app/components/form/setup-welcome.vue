<script setup lang="ts">
const emit = defineEmits<{
  enter: [];
}>();
</script>

<template>
  <section class="flex min-h-dvh items-center justify-center">
    <div class="flex w-full max-w-88 flex-col items-center gap-8 text-center">
      <div class="space-y-8">
        <p
          class="text-xl font-medium uppercase tracking-widest leading-[2px] text-white -mt-2"
        >
          Welcome to
        </p>
        <div class="mx-auto w-88 text-white aspect-[1/0.11]">
          <IconLogo />
        </div>
      </div>

      <p class="max-w-63.25 text-sm leading-normal text-muted mb-1">
        Everything you need to make a lasting first impression in one place.
      </p>

      <UButton
        color="neutral"
        class="rounded-full bg-white px-6 text-sm font-medium text-dark hover:bg-white/90"
        icon="material-symbols:keyboard-double-arrow-right"
        @click="emit('enter')"
      >
        Enter
      </UButton>
    </div>
  </section>
</template>
