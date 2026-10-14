<script setup lang="ts">
import EmailContactInfoCta from './components/EmailContactInfoCta.vue';
import EmailEventDetails from './components/EmailEventDetails.vue';
import EmailLayout from './components/EmailLayout.vue';
import EmailStep from './components/EmailStep.vue';
import {
  bodyStyle,
  boxStyle,
  fullWidthImageStyle,
} from './components/email-styles';

// Defaults are sample data for the email renderer devtools preview.
withDefaults(
  defineProps<{
    recipientName?: string;
    eventTitle?: string;
    eventDate?: string;
    eventTime?: string;
    eventLocation?: string;
    directionsUrl?: string | null;
    qrImageUrl?: string;
    /** Community artwork; the block is hidden when empty. */
    contactExchangeImageUrl?: string;
    contactInfoUrl?: string;
    /** Origin for /public images; empty keeps them relative for local preview. */
    assetBaseUrl?: string;
  }>(),
  {
    recipientName: 'Aung',
    eventTitle: 'Imagine First 2026',
    eventDate: '11 November 2026',
    eventTime: '1 PM - 6 PM',
    eventLocation: 'Design Institute',
    directionsUrl: 'https://maps.google.com',
    qrImageUrl: '/api/public/cards/sample-card/qr-ticket',
    contactExchangeImageUrl: '/images/emails/email-contact-exchange.png',
    contactInfoUrl: '#',
    assetBaseUrl: '',
  }
);
</script>

<template>
  <EmailLayout
    :preview="`Reminder: ${eventTitle} is coming up`"
    :boxed="false"
  >
    <EContainer :style="`${boxStyle}; padding-bottom: 20px`">
      <EContainer style="padding: 20px">
        <EText :style="`${bodyStyle}; margin-bottom: 8px`">
          Hi&nbsp;{{ recipientName }},
        </EText>
        <EText :style="bodyStyle">
          A quick reminder that <strong>{{ eventTitle }}</strong> is coming&nbsp;up!
        </EText>
        <EContainer style="margin-top: 32px">
          <EmailEventDetails
            :event-date="eventDate"
            :event-time="eventTime"
            :event-location="eventLocation"
            :directions-url="directionsUrl"
            :asset-base-url="assetBaseUrl"
          />
        </EContainer>
      </EContainer>

      <EContainer style="margin-top: 12px; padding: 0 20px">
        <EmailStep :number="1" :text-width="366">
          This QR is your digital event ticket. Show it to the organizer when
          you arrive to check&nbsp;in.
        </EmailStep>
        <EImg
          :src="qrImageUrl"
          :alt="`Your ${eventTitle} check-in QR`"
          :style="`${fullWidthImageStyle}; margin-top: 24px`"
        />
      </EContainer>

      <EContainer style="margin-top: 24px">
        <EContainer style="padding: 0 20px">
          <EmailStep :number="2" :text-width="300">
            During the event, scan other members' QR to see their contact
            information and exchange contacts&nbsp;easily.
          </EmailStep>
        </EContainer>
        <EImg
          v-if="contactExchangeImageUrl"
          :src="contactExchangeImageUrl"
          alt="Two phones exchanging community cards"
          :style="`${fullWidthImageStyle}; margin-top: 20px`"
        />
      </EContainer>
    </EContainer>

    <EContainer style="margin-top: 12px">
      <EmailContactInfoCta
        :href="contactInfoUrl"
        :asset-base-url="assetBaseUrl"
      />
    </EContainer>
  </EmailLayout>
</template>
