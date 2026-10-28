<script setup lang="ts">
// NuxtImg that pulses like USkeleton until the image has loaded.
// Attributes (class, width, alt, ...) fall through to the <img>, so layout is unchanged.
const props = defineProps<{ src?: string | null }>();

const image = useTemplateRef<{ $el?: HTMLImageElement }>('image');
const isLoaded = ref(false);
// Only fade in images the user actually waited for; cached ones show at once.
const shouldFadeIn = ref(true);

watch(
  () => props.src,
  () => {
    isLoaded.value = false;
    shouldFadeIn.value = true;
  }
);

// Server-rendered or cached images can finish (load or fail) before hydration
// attaches @load / @error.
onMounted(() => {
  const element = image.value?.$el;
  if (!props.src || !element?.complete) return;
  shouldFadeIn.value = false;
  isLoaded.value = true;
});
</script>

<template>
  <NuxtImg
    ref="image"
    :src="src || undefined"
    :class="
      isLoaded
        ? shouldFadeIn && 'motion-safe:animate-fade-in'
        : 'motion-safe:animate-skeleton bg-elevated text-transparent'
    "
    @load="isLoaded = true"
    @error="isLoaded = true"
  />
</template>
