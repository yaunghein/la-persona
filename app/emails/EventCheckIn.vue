<script setup lang="ts">
import EmailContactsCta from './components/EmailContactsCta.vue';
import EmailLayout from './components/EmailLayout.vue';
import EmailStep from './components/EmailStep.vue';
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
    /** Yangon time, e.g. "2:15 PM, 11 November 2026". */
    checkedInAt?: string;
    /** Community artwork; the block is hidden when empty. */
    contactExchangeImageUrl?: string;
    contactsUrl?: string;
    /** Origin for /public images; empty keeps them relative for local preview. */
    assetBaseUrl?: string;
  }>(),
  {
    recipientName: 'Aung',
    eventTitle: 'Imagine First 2026',
    checkedInAt: '2:15 PM, 11 November 2026',
    contactExchangeImageUrl: '/images/emails/email-contact-exchange.png',
    contactsUrl: '#',
    assetBaseUrl: '',
  }
);
</script>

<template>
  <EmailLayout :preview="`You're checked in to ${eventTitle}`" :boxed="false">
    <EContainer :style="`${boxStyle}; padding: 24px 20px`">
      <EText :style="`${bodyStyle}; margin-bottom: 8px`">
        Hi&nbsp;{{ recipientName }},
      </EText>
      <EText :style="bodyStyle">
        You're checked in to <strong>{{ eventTitle }}</strong
        >. Welcome, and enjoy the&nbsp;event!
      </EText>
      <EText
        :style="`${bodyStyle}; margin-top: 12px; font-size: 12px; letter-spacing: 1.2px; color: #6b6d7c`"
      >
        Checked in at&nbsp;{{ checkedInAt }}
      </EText>
    </EContainer>

    <EContainer
      :style="`${boxStyle}; margin-top: 12px; padding-top: 32px; padding-bottom: 20px`"
    >
      <EText :style="`${titleStyle}; margin-bottom: 24px`">
        Make the most of&nbsp;<strong>today</strong>
      </EText>
      <EContainer style="padding: 0 20px">
        <EmailStep :number="1" :text-width="300">
          Scan other members' QR to see their contact information and exchange
          contacts&nbsp;easily.
        </EmailStep>
      </EContainer>
      <EImg
        v-if="contactExchangeImageUrl"
        :src="contactExchangeImageUrl"
        alt="Two phones exchanging community cards"
        :style="`${fullWidthImageStyle}; margin-top: 20px`"
      />
      <EContainer style="margin-top: 24px; padding: 0 20px">
        <EmailStep :number="2" :text-width="300">
          Show your own QR whenever someone wants your details. It works for the
          whole&nbsp;event.
        </EmailStep>
      </EContainer>
    </EContainer>

    <EContainer style="margin-top: 12px">
      <EmailContactsCta :href="contactsUrl" :asset-base-url="assetBaseUrl" />
    </EContainer>
  </EmailLayout>
</template>
