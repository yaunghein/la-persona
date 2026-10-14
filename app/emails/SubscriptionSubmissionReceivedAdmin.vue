<script setup lang="ts">
import EmailButton from './components/EmailButton.vue';
import EmailDetails from './components/EmailDetails.vue';
import EmailLayout from './components/EmailLayout.vue';

const props = defineProps<{
  payerName: string;
  payerEmail: string;
  submissionTitle: string;
  detailLines: string[];
  requestsDashboardUrl?: string;
}>();

const rows = [
  { label: 'From', value: `${props.payerName} <${props.payerEmail}>` },
  { label: 'Details', value: props.detailLines.join('\n') },
];
</script>

<template>
  <EmailLayout
    :preview="`New ${submissionTitle} from ${payerName}`"
  >
    <EText
      style="
        margin: 0;
        font-size: 11px;
        color: #888888;
        letter-spacing: 1px;
        text-transform: uppercase;
      "
    >
      New submission
    </EText>
    <EHeading
      as="h4"
      style="
        margin: 4px 0 0;
        font-weight: 600;
        letter-spacing: 1px;
        text-transform: uppercase;
      "
    >
      {{ submissionTitle }}
    </EHeading>

    <EmailDetails :rows="rows" />

    <EmailButton v-if="requestsDashboardUrl" :href="requestsDashboardUrl">
      OPEN REQUESTS PAGE
    </EmailButton>
  </EmailLayout>
</template>
