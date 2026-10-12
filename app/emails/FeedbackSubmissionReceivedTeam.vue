<script setup lang="ts">
import EmailDetails from './components/EmailDetails.vue';
import EmailLayout from './components/EmailLayout.vue';

const props = defineProps<{
  kindLabel: string;
  message: string;
  submitterName: string;
  submitterEmail: string;
  organizationName: string;
}>();

const rows = [
  { label: 'From', value: `${props.submitterName} <${props.submitterEmail}>` },
  { label: 'Organization', value: props.organizationName },
  { label: 'Message', value: props.message },
];
</script>

<template>
  <EmailLayout
    :show-banner="false"
    :preview="`New ${kindLabel.toLowerCase()} from ${submitterName}`"
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
      {{ kindLabel }}
    </EHeading>

    <EmailDetails :rows="rows" />
  </EmailLayout>
</template>
