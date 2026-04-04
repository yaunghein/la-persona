<script setup lang="ts">
defineProps<{
  recipientName: string;
  bodyText: string;
}>();
</script>

<template>
  <EHtml>
    <EBody
      style="
        font-family: Arial, Helvetica, sans-serif;
        color: #111111;
        line-height: 1.6;
        margin: 0;
        padding: 16px;
      "
    >
      <EText style="margin: 0 0 12px">Hi {{ recipientName }},</EText>
      <EText style="margin: 0 0 12px; white-space: pre-wrap">{{ bodyText }}</EText>
      <EText style="margin: 0 0 12px">
        We will review your submission and follow up as soon as possible.
      </EText>
      <EText style="margin: 0; color: #444444; font-size: 13px">— LA PERSONA</EText>
    </EBody>
  </EHtml>
</template>
