<script setup lang="ts">
import EmailButton from './components/EmailButton.vue';
import EmailFallbackLink from './components/EmailFallbackLink.vue';
import EmailLayout from './components/EmailLayout.vue';

defineProps<{ url: string }>();
</script>

<template>
  <EmailLayout preview="Your secure sign-in link for LA PERSONA">
    <EHeading as="h4" style="margin: 0; font-weight: 600; letter-spacing: 1px">
      SIGN IN TO LA PERSONA
    </EHeading>
    <EText style="margin: 12px 0 0; line-height: 1.5">
      Tap the button below to sign in securely. No password needed.
    </EText>

    <EmailButton :href="url">SIGN IN TO LA PERSONA</EmailButton>

    <EText style="margin: 0 0 24px; line-height: 1.5; color: #555555">
      This link expires in 30 minutes. If you didn't request it, you can safely
      ignore this email.
    </EText>

    <EHr style="border-color: #e5e6e9; margin: 0 0 24px" />

    <EmailFallbackLink :href="url" />
  </EmailLayout>
</template>
