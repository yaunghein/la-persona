<script setup lang="ts">
defineProps<{ href: string }>();
</script>

<template>
  <EText style="margin: 0; font-size: 12px; line-height: 1.5; color: #888888">
    If the button doesn't work, paste this link into your&nbsp;browser:
  </EText>
  <EText
    style="
      margin: 4px 0 0;
      font-size: 12px;
      line-height: 1.5;
      color: #888888;
      word-break: break-all;
    "
  >
    {{ href }}
  </EText>
</template>
