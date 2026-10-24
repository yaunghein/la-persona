<script setup lang="ts">
import EmailButton from './components/EmailButton.vue';
import EmailFallbackLink from './components/EmailFallbackLink.vue';
import EmailLayout from './components/EmailLayout.vue';

defineProps<{
  organizationName: string;
  inviteUrl: string;
}>();
</script>

<template>
  <EmailLayout :preview="`${organizationName} is ready for you on LA PERSONA`">
    <EHeading as="h4" style="margin: 0; font-weight: 600; letter-spacing: 1px">
      YOUR COMMUNITY IS READY
    </EHeading>
    <EText style="margin: 12px 0 0; line-height: 1.5">
      You've been invited to own
      <strong style="font-weight: 700">{{ organizationName }}</strong> on
      <strong style="font-weight: 900">LA&nbsp;PERSONA</strong>.
    </EText>

    <EText style="margin: 32px 0 0">AS THE&nbsp;OWNER</EText>
    <EText style="margin: 8px 0 0 8px; line-height: 1.5">
      • Get your community card<br />
      • Set up your community's&nbsp;look<br />
      • Invite members and run&nbsp;events
    </EText>

    <EmailButton :href="inviteUrl">ACCEPT INVITATION</EmailButton>

    <EHr style="border-color: #e5e6e9; margin: 0 0 24px" />

    <EmailFallbackLink :href="inviteUrl" />
  </EmailLayout>
</template>
