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
    :preview="`You're invited to join ${organizationName} on LA PERSONA`"
  >
    <EHeading as="h4" style="margin: 0; font-weight: 600; letter-spacing: 1px">
      YOU'RE INVITED
    </EHeading>
    <EText style="margin: 12px 0 0; line-height: 1.5">
      <strong style="font-weight: 700">{{ organizationName }}</strong> has set
      up your company card on
      <strong style="font-weight: 900">LA&nbsp;PERSONA</strong>.
    </EText>

    <EText style="margin: 32px 0 0">AS A TEAM&nbsp;MEMBER</EText>
    <EText style="margin: 8px 0 0 8px; line-height: 1.5">
      • Get your company&nbsp;card<br />
      • Share it with a tap or QR&nbsp;code<br />
      • Keep every contact you meet in one&nbsp;place
    </EText>

    <EmailButton :href="inviteUrl">ACCEPT INVITATION</EmailButton>

    <EHr style="border-color: #e5e6e9; margin: 0 0 24px" />

    <EmailFallbackLink :href="inviteUrl" />
  </EmailLayout>
</template>
