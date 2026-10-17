<script setup lang="ts">
import EmailButton from './components/EmailButton.vue';
import EmailLayout from './components/EmailLayout.vue';
import { noWidows } from './components/email-styles';

defineProps<{
  recipientName: string;
  bodyText: string;
  platformUrl: string;
}>();
</script>

<template>
  <EmailLayout preview="We received your payment and receipt">
    <EHeading as="h4" style="margin: 0; font-weight: 600; letter-spacing: 1px">
      PAYMENT RECEIVED
    </EHeading>
    <EText style="margin: 12px 0 0">Hi&nbsp;{{ recipientName }},</EText>
    <EText style="margin: 8px 0 0; line-height: 1.5; white-space: pre-wrap">{{
      noWidows(bodyText)
    }}</EText>

    <EText style="margin: 32px 0 0">WHAT HAPPENS&nbsp;NEXT</EText>
    <EText style="margin: 8px 0 0; line-height: 1.5">
      Our team will review your receipt and email you as soon as it's confirmed.
      You don't need to do anything in the&nbsp;meantime.
    </EText>

    <EmailButton :href="platformUrl">OPEN LA PERSONA</EmailButton>

    <EText style="margin: 0">
      Warmest Regards,<br />
      <strong style="font-weight: 900">LA&nbsp;PERSONA</strong> Team
    </EText>
  </EmailLayout>
</template>
