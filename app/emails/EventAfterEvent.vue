<script setup lang="ts">
import EmailContactsCta from './components/EmailContactsCta.vue';
import EmailLayout from './components/EmailLayout.vue';
import {
  bodyStyle,
  boxStyle,
  fullWidthImageStyle,
  titleStyle,
} from './components/email-styles';

// Defaults are sample data for the email renderer devtools preview.
withDefaults(
  defineProps<{
    recipientName?: string;
    eventTitle?: string;
    /** Community artwork; the block is hidden when empty. */
    afterEventImageUrl?: string;
    contactsUrl?: string;
    /** Origin for /public images; empty keeps them relative for local preview. */
    assetBaseUrl?: string;
  }>(),
  {
    recipientName: 'Aung',
    eventTitle: 'Imagine First 2026',
    afterEventImageUrl: '/images/emails/email-la-persona.png',
    contactsUrl: '#',
    assetBaseUrl: '',
  }
);
</script>

<template>
  <EmailLayout
    :preview="`Thank you for being part of ${eventTitle}`"
    :boxed="false"
  >
    <EContainer :style="`${boxStyle}; padding: 24px 20px`">
      <EText :style="`${bodyStyle}; margin-bottom: 8px`">
        Hi&nbsp;{{ recipientName }},
      </EText>
      <EText :style="bodyStyle">
        Thank you for being part of&nbsp;<strong>{{ eventTitle }}</strong
        >!
      </EText>
      <EText :style="`${bodyStyle}; margin-top: 12px`">
        We hope you had a great time, met interesting people, and made
        connections worth&nbsp;keeping.
      </EText>
      <EText :style="`${bodyStyle}; margin-top: 12px`">
        Here's something to remember, your community card doesn't end with
        the&nbsp;event.
      </EText>
    </EContainer>

    <template v-if="afterEventImageUrl">
      <EText :style="`${titleStyle}; max-width: 340px; margin: 24px auto 0`">
        You can <strong>continue</strong> using your Community card&nbsp;to:
      </EText>
      <EImg
        :src="afterEventImageUrl"
        alt="Share your profile, stay ready, and register for future events"
        :style="`${fullWidthImageStyle}; margin-top: 24px`"
      />
    </template>

    <EContainer style="margin-top: 24px">
      <EmailContactsCta :href="contactsUrl" :asset-base-url="assetBaseUrl" />
    </EContainer>
  </EmailLayout>
</template>
