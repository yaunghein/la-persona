<script setup lang="ts">
import EmailButton from './components/EmailButton.vue';
import EmailFallbackLink from './components/EmailFallbackLink.vue';
import EmailLayout from './components/EmailLayout.vue';

defineProps<{ inviteUrl: string }>();
</script>

<template>
  <EmailLayout preview="Your LA PERSONA digital card is ready to claim">
    <EHeading as="h4" style="margin: 0; font-weight: 600; letter-spacing: 1px">
      YOUR CARD IS&nbsp;READY
    </EHeading>
    <EText style="margin: 12px 0 0; line-height: 1.5">
      Your <strong style="font-weight: 900">LA&nbsp;PERSONA</strong> digital
      card has been prepared for you. Accept the invitation to claim it and
      finish setting up your&nbsp;profile.
    </EText>

    <EText style="margin: 32px 0 0">WHAT YOU&nbsp;GET</EText>
    <EText style="margin: 8px 0 0 8px; line-height: 1.5">
      • A premium 3D digital card<br />
      • Effortless contact exchange<br />
      • Details that are always up to&nbsp;date
    </EText>

    <EmailButton :href="inviteUrl">ACCEPT INVITATION</EmailButton>

    <EHr style="border-color: #e5e6e9; margin: 0 0 24px" />

    <EmailFallbackLink :href="inviteUrl" />
  </EmailLayout>
</template>
