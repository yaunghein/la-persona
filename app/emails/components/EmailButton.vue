<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{ href: string; inline?: boolean; light?: boolean }>(),
  { inline: false, light: false }
);

const colors = computed(() =>
  props.light
    ? 'background: #ffffff; color: #121212'
    : 'background: #121212; color: #ffffff'
);
</script>

<template>
  <EContainer v-if="inline" style="margin: 24px 0 0; text-align: center">
    <EButton
      :href="href"
      target="_blank"
      :style="`display: inline-block; ${colors}; padding: 13px 24px; border-radius: 999px; font-size: 14px; font-weight: 700; text-decoration: none`"
    >
      <slot />
    </EButton>
  </EContainer>
  <EButton
    v-else
    :href="href"
    target="_blank"
    :style="`display: block; margin: 32px auto; ${colors}; padding: 14px 24px; border-radius: 999px; text-align: center; font-size: 14px; text-decoration: none`"
  >
    <slot />
  </EButton>
</template>
