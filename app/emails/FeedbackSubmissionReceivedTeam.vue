<script setup lang="ts">
defineProps<{
  kindLabel: string;
  message: string;
  submitterName: string;
  submitterEmail: string;
  organizationName: string;
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
      <EText style="margin: 0 0 12px; font-weight: 700"
        >New submission — {{ kindLabel }}</EText
      >
      <EText style="margin: 0 0 8px"
        >From: {{ submitterName }} &lt;{{ submitterEmail }}&gt;</EText
      >
      <EText style="margin: 0 0 8px"
        >Organization: {{ organizationName }}</EText
      >
      <EText style="margin: 0; white-space: pre-wrap">{{ message }}</EText>
    </EBody>
  </EHtml>
</template>
