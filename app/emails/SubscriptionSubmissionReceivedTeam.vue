<script setup lang="ts">
defineProps<{
  payerName: string;
  payerEmail: string;
  submissionTitle: string;
  detailLines: string[];
  requestsDashboardUrl?: string;
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
        >New submission — {{ submissionTitle }}</EText
      >
      <EText style="margin: 0 0 8px"
        >From: {{ payerName }} &lt;{{ payerEmail }}&gt;</EText
      >
      <EText
        v-for="(line, i) in detailLines"
        :key="i"
        style="margin: 0 0 4px; white-space: pre-wrap"
      >
        {{ line }}
      </EText>
      <EText v-if="requestsDashboardUrl" style="margin: 24px 0 0">
        <a
          :href="requestsDashboardUrl"
          style="
            display: inline-block;
            padding: 10px 20px;
            background-color: #111111;
            color: #ffffff;
            text-decoration: none;
            border-radius: 9999px;
            font-weight: 600;
            font-size: 14px;
          "
        >
          Open Requests Page
        </a>
      </EText>
    </EBody>
  </EHtml>
</template>
