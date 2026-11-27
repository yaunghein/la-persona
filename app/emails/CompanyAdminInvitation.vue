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
    :preview="`You're invited to administer ${organizationName} on LA PERSONA`"
  >
    <EText style="margin: 0; line-height: 1.5">
      You've been invited to
      <strong style="font-weight: 700">{{ organizationName }}</strong> on
      <strong style="font-weight: 900">LA&nbsp;PERSONA</strong> as
      company&nbsp;admin.
    </EText>

    <EText style="margin: 32px 0 0">AS THE COMPANY&nbsp;ADMIN</EText>
    <EText style="margin: 8px 0 0 8px; line-height: 1.5">
      • Share your own company&nbsp;card<br />
      • Manage cards and teams for your&nbsp;staff<br />
      • See every contact your team&nbsp;collects<br />
      • Track views and contacts in&nbsp;analytics
    </EText>

    <EmailButton :href="inviteUrl">ACCEPT INVITATION</EmailButton>

    <EHr style="border-color: #e5e6e9; margin: 0 0 24px" />

    <EmailFallbackLink :href="inviteUrl" />
  </EmailLayout>
</template>
