<script setup lang="ts">
import EmailButton from './components/EmailButton.vue';
import EmailFallbackLink from './components/EmailFallbackLink.vue';
import EmailLayout from './components/EmailLayout.vue';

defineProps<{
  inviterName: string;
  organizationName: string;
  inviteUrl: string;
}>();
</script>

<template>
  <EmailLayout
    :preview="`${inviterName} invited you to volunteer with ${organizationName}`"
  >
    <EHeading as="h4" style="margin: 0; font-weight: 600; letter-spacing: 1px">
      YOU'RE INVITED TO&nbsp;VOLUNTEER
    </EHeading>
    <EText style="margin: 12px 0 0; line-height: 1.5">
      <strong style="font-weight: 700">{{ inviterName }}</strong> invited you to
      join <strong style="font-weight: 700">{{ organizationName }}</strong> as a
      volunteer on <strong style="font-weight: 900">LA&nbsp;PERSONA</strong>.
    </EText>

    <EText style="margin: 32px 0 0">AS A&nbsp;VOLUNTEER</EText>
    <EText style="margin: 8px 0 0 8px; line-height: 1.5">
      • Check in attendees at community events<br />
      • Get your community card<br />
      • Connect with fellow&nbsp;members
    </EText>

    <EmailButton :href="inviteUrl">ACCEPT INVITATION</EmailButton>

    <EHr style="border-color: #e5e6e9; margin: 0 0 24px" />

    <EmailFallbackLink :href="inviteUrl" />
  </EmailLayout>
</template>
