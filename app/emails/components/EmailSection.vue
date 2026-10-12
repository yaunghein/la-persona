<script setup lang="ts">
withDefaults(defineProps<{ centered?: boolean }>(), { centered: false });
</script>

<template>
  <EContainer
    :style="`border: 1px solid #e5e6e9; padding: ${centered ? '32px 20px 24px' : '16px 20px 20px'}; margin-bottom: 8px; text-align: ${centered ? 'center' : 'left'}`"
  >
    <slot />
  </EContainer>
</template>
