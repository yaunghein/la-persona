<script setup lang="ts">
import EmailContactInfoCta from './components/EmailContactInfoCta.vue';
import EmailEventDetails from './components/EmailEventDetails.vue';
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
    eventDate?: string;
    eventTime?: string;
    eventLocation?: string;
    directionsUrl?: string | null;
    qrImageUrl?: string;
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
    contactInfoUrl: '#',
    assetBaseUrl: '',
  }
);

// \u00A0 keeps the last two words together, so no line ends on one word.
const checkInSteps = [
  'Find your QR attached to this\u00A0email.',
  'Show your QR to the organizer when you\u00A0arrive.',
  "Once checked in, you're ready to enjoy the\u00A0event!",
];
</script>

<template>
  <EmailLayout :preview="`You're registered for ${eventTitle}`" :boxed="false">
    <EContainer :style="boxStyle">
      <EContainer style="padding: 24px 20px">
        <EText :style="`${bodyStyle}; margin-bottom: 8px`">
          Hi&nbsp;{{ recipientName }},
        </EText>
        <EText :style="bodyStyle">
          You registered for <strong>{{ eventTitle }}</strong
          >, and now have your own Community&nbsp;Card.
        </EText>
      </EContainer>
      <EImg
        :src="qrImageUrl"
        :alt="`Your ${eventTitle} check-in QR`"
        :style="fullWidthImageStyle"
      />
    </EContainer>

    <EContainer style="margin-top: 32px">
      <EmailEventDetails
        :event-date="eventDate"
        :event-time="eventTime"
        :event-location="eventLocation"
        :directions-url="directionsUrl"
        :asset-base-url="assetBaseUrl"
      />
    </EContainer>

    <EContainer
      :style="`${boxStyle}; margin-top: 32px; padding: 32px 10px; text-align: center`"
    >
      <EText :style="`${titleStyle}; margin-bottom: 24px`">
        How to <strong>check&nbsp;in</strong>
      </EText>
      <EmailStep
        v-for="(step, index) in checkInSteps"
        :key="step"
        :number="index + 1"
        :style="index ? 'margin-top: 12px' : ''"
      >
        {{ step }}
      </EmailStep>
      <EText
        :style="`${bodyStyle}; margin-top: 24px; font-weight: 700; text-transform: uppercase`"
      >
        Pro Tip:
      </EText>
      <EText :style="`${bodyStyle}; margin-top: 12px`">
        Scan other members' QR to view their Community Cards and exchange
        contact&nbsp;information.
      </EText>
    </EContainer>

    <EContainer style="margin-top: 12px">
      <EmailContactInfoCta
        :href="contactInfoUrl"
        :asset-base-url="assetBaseUrl"
      />
    </EContainer>
  </EmailLayout>
</template>
