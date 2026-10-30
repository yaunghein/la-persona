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
  <EmailLayout
    :preview="`You're invited to own ${organizationName} on LA PERSONA`"
  >
    <EText style="margin: 0; line-height: 1.5">
      You've been invited to
      <strong style="font-weight: 700">{{ organizationName }}</strong> on
      <strong style="font-weight: 900">LA&nbsp;PERSONA</strong> as
      community&nbsp;organizer.
    </EText>

    <EText style="margin: 32px 0 0">AS THE COMMUNITY&nbsp;ORGANIZER</EText>
    <EText style="margin: 8px 0 0 8px; line-height: 1.5">
      • Share your own community&nbsp;card<br />
      • Invite and manage your&nbsp;members<br />
      • Run events with registration and&nbsp;check-in<br />
      • See views, contacts and attendance in&nbsp;analytics
    </EText>

    <EmailButton :href="inviteUrl">ACCEPT INVITATION</EmailButton>

    <EHr style="border-color: #e5e6e9; margin: 0 0 24px" />

    <EmailFallbackLink :href="inviteUrl" />
  </EmailLayout>
</template>
