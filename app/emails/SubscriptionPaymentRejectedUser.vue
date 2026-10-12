<script setup lang="ts">
import EmailButton from './components/EmailButton.vue';
import EmailLayout from './components/EmailLayout.vue';

defineProps<{
  recipientName: string;
  bodyText: string;
  platformUrl: string;
}>();
</script>

<template>
  <EmailLayout preview="An update on your payment">
    <EHeading as="h4" style="margin: 0; font-weight: 600; letter-spacing: 1px">
      PAYMENT UPDATE
    </EHeading>
    <EText style="margin: 12px 0 0">Hi {{ recipientName }},</EText>
    <EText style="margin: 8px 0 0; line-height: 1.5; white-space: pre-wrap">{{
      bodyText
    }}</EText>

    <EmailButton :href="platformUrl">OPEN LA PERSONA</EmailButton>

    <EText style="margin: 0">
      Warmest Regards,<br />
      <strong style="font-weight: 900">LA PERSONA</strong> Team
    </EText>
  </EmailLayout>
</template>
