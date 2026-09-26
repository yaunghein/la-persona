<script setup lang="ts">
const props = defineProps<{
  text: string;
  play?: boolean;
}>();

const containerRef = ref<HTMLElement | null>(null);
const textRef = ref<HTMLElement | null>(null);
const overflowPx = ref(0);
const hovered = ref(false);
const reducedMotion = ref(false);

const playing = computed(
  () => (props.play || hovered.value) && overflowPx.value > 0 && !reducedMotion.value
);

const durationSeconds = computed(() =>
  Math.max(1.8, overflowPx.value / 28)
);

const phase = ref<'start' | 'moving' | 'end'>('start');

const maskClass = computed(() => {
  if (overflowPx.value <= 0) return '';
  if (phase.value === 'end') return 'marquee-mask-left';
  if (phase.value === 'moving') return 'marquee-mask-both';
  return 'marquee-mask-right';
});

watch(playing, (isPlaying) => {
  if (overflowPx.value <= 0) {
    phase.value = 'start';
    return;
  }
  if (reducedMotion.value) {
    phase.value = isPlaying ? 'end' : 'start';
    return;
  }
  phase.value = 'moving';
});

function onTransitionEnd(event: TransitionEvent) {
  if (event.propertyName !== 'transform') return;
  phase.value = playing.value ? 'end' : 'start';
}

function measure() {
  const container = containerRef.value;
  const text = textRef.value;
  if (!container || !text) return;
  overflowPx.value = Math.max(0, text.scrollWidth - container.clientWidth);
}

let observer: ResizeObserver | null = null;

onMounted(() => {
  reducedMotion.value = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;
  measure();
  observer = new ResizeObserver(() => measure());
  if (containerRef.value) observer.observe(containerRef.value);
});

onUnmounted(() => {
  observer?.disconnect();
});

watch(
  () => props.text,
  async () => {
    await nextTick();
    measure();
  }
);
</script>

<template>
  <span
    ref="containerRef"
    class="block min-w-0 overflow-hidden"
    :class="maskClass"
    @mouseenter="hovered = true"
    @mouseleave="hovered = false"
  >
    <span
      ref="textRef"
      class="inline-block whitespace-nowrap will-change-transform"
      :style="{
        transform: playing ? `translateX(-${overflowPx}px)` : 'translateX(0)',
        transitionProperty: 'transform',
        transitionDuration: reducedMotion ? '0ms' : `${durationSeconds}s`,
        transitionTimingFunction: 'ease-in-out',
      }"
      @transitionend="onTransitionEnd"
    >
      {{ text }}
    </span>
  </span>
</template>

<style scoped>
.marquee-mask-right {
  -webkit-mask-image: linear-gradient(
    90deg,
    #000 0,
    #000 calc(100% - 0.75rem),
    transparent
  );
  mask-image: linear-gradient(90deg, #000 0, #000 calc(100% - 0.75rem), transparent);
}

.marquee-mask-left {
  -webkit-mask-image: linear-gradient(90deg, transparent, #000 0.75rem, #000 100%);
  mask-image: linear-gradient(90deg, transparent, #000 0.75rem, #000 100%);
}

.marquee-mask-both {
  -webkit-mask-image: linear-gradient(
    90deg,
    transparent,
    #000 0.75rem,
    #000 calc(100% - 0.75rem),
    transparent
  );
  mask-image: linear-gradient(
    90deg,
    transparent,
    #000 0.75rem,
    #000 calc(100% - 0.75rem),
    transparent
  );
}
</style>
