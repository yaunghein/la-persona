<script setup lang="ts">
// NuxtImg that pulses like USkeleton until the image has loaded.
// Attributes (class, width, alt, ...) fall through to the <img>, so layout is unchanged.
const props = defineProps<{ src?: string | null }>();

const image = useTemplateRef<{ $el?: HTMLImageElement }>('image');
const isLoaded = ref(false);

watch(
  () => props.src,
  () => {
    isLoaded.value = false;
  }
);

// Server-rendered or cached images can finish before hydration attaches @load.
onMounted(() => {
  const element = image.value?.$el;
  if (element?.complete && element.naturalWidth > 0) isLoaded.value = true;
});
</script>

<template>
  <NuxtImg
    ref="image"
    :src="src || undefined"
    :class="isLoaded ? undefined : 'animate-pulse bg-elevated'"
    @load="isLoaded = true"
    @error="isLoaded = true"
  />
</template>
