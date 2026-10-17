<script setup lang="ts">
import { bodyStyle } from './email-styles';

withDefaults(defineProps<{ number: number; textWidth?: number }>(), {
  textWidth: 240,
});
</script>

<template>
  <EContainer style="text-align: center">
    <EText
      style="
        margin: 0 auto 12px;
        display: inline-block;
        padding: 2px 9px;
        border-radius: 30px;
        background: #121212;
        color: #ffffff;
        font-size: 14px;
        font-weight: 700;
        line-height: 1.5;
      "
    >
      {{ number }}
    </EText>
    <EText
      :style="`${bodyStyle}; max-width: ${textWidth}px; margin: 0 auto; text-wrap: balance`"
    >
      <slot />
    </EText>
  </EContainer>
</template>
