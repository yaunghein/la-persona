<script setup lang="ts">
defineProps<{
  rows: { label: string; value: string }[];
}>();
</script>

<template>
  <EContainer style="margin: 24px 0">
    <template v-for="row in rows" :key="row.label">
      <EText
        style="
          margin: 0;
          font-size: 11px;
          color: #888888;
          text-transform: uppercase;
          letter-spacing: 1px;
        "
      >
        {{ row.label }}
      </EText>
      <EText
        style="
          margin: 4px 0 20px;
          font-weight: 600;
          font-size: 15px;
          white-space: pre-wrap;
          word-break: break-word;
        "
      >
        {{ row.value || 'N/A' }}
      </EText>
    </template>
  </EContainer>
</template>
