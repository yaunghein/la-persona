<script setup lang="ts">
import {
  CARD_LINK_IMAGES,
  type CardLinkLabel,
} from '~~/shared/constants/card-link-options';

const props = defineProps<{ label: string }>();

const image = computed(
  () => CARD_LINK_IMAGES[props.label as CardLinkLabel] ?? ''
);

const glyph = 'size-5 shrink-0 text-ink/75 group-data-highlighted:text-ink';
</script>

<template>
  <img
    v-if="image"
    :src="image"
    alt=""
    class="size-5 shrink-0 rounded-full object-cover"
  />
  <IconPhone v-else-if="label === 'Phone'" :class="glyph" />
  <IconDirectMessage v-else-if="label === 'Direct Message'" :class="glyph" />
  <IconArrowDown v-else-if="label === 'Download Resume'" :class="glyph" />
  <IconBuyMeCoffee v-else-if="label === 'Buy Me Coffee'" :class="glyph" />
  <UIcon v-else name="i-lucide-globe" :class="glyph" />
</template>
