<script setup lang="ts">
import EmailButton from './components/EmailButton.vue';
import EmailLayout from './components/EmailLayout.vue';
import EmailSection from './components/EmailSection.vue';

defineProps<{
  recipientName: string;
  eventTitle: string;
  organizationName: string;
  wallpaperUrl: string;
  platformUrl: string;
}>();

const PREVIEW_IMAGE_URL =
  'https://www.la-persona.com/images/emails/welcome-email-banner.jpg';

const bodyStyle =
  'margin: 0; font-size: 14px; line-height: 1.5; letter-spacing: 1.4px; color: #00041f';
const titleStyle =
  'margin: 0; font-size: 20px; line-height: 1.5; letter-spacing: 2px; text-transform: uppercase; font-weight: 400; color: #00041f';
const imageStyle = 'display: block; width: 100%; max-width: 380px; margin: 24px auto 0';
</script>

<template>
  <EmailLayout
    :preview="`You're registered for ${eventTitle}`"
    :show-banner="false"
    :boxed="false"
  >
    <EmailSection>
      <EText :style="`${bodyStyle}; margin-bottom: 8px`">
        Hi {{ recipientName }},
      </EText>
      <EText :style="bodyStyle">
        You registered for <strong>{{ eventTitle }}</strong>, and you now have
        your own Community Card.
      </EText>

      <EImg
        :src="PREVIEW_IMAGE_URL"
        :alt="`${organizationName} community card`"
        :style="imageStyle"
      />

      <EText :style="`${bodyStyle}; margin-top: 24px; margin-bottom: 8px`">
        With your Community Card, you can:
      </EText>
      <EText :style="`${bodyStyle}; padding-left: 8px`">
        • Join community events and activities<br />
        • Easily share your profile and contact information with other members
        or anybody.
      </EText>
    </EmailSection>

    <EmailSection centered>
      <EText :style="titleStyle">
        <strong>One QR</strong> for check-in &amp; contact exchange
      </EText>
      <EText :style="`${bodyStyle}; margin-top: 12px`">
        {{ organizationName }} QR wallpaper can be used for faster check-in at
        the event and easily share your contact info with others.
      </EText>

      <EImg
        :src="PREVIEW_IMAGE_URL"
        alt="Community QR wallpaper"
        :style="imageStyle"
      />

      <EmailButton :href="wallpaperUrl" inline>Download QR</EmailButton>
    </EmailSection>

    <EmailSection centered>
      <EText :style="titleStyle">
        <strong>Manage</strong> your community card
      </EText>
      <EText :style="`${bodyStyle}; margin-top: 12px`">
        Update your contact information, manage your contacts and community
        cards.
      </EText>

      <EImg
        :src="PREVIEW_IMAGE_URL"
        alt="LA PERSONA platform"
        :style="imageStyle"
      />

      <EmailButton :href="platformUrl" inline>Go to Platform</EmailButton>
    </EmailSection>
  </EmailLayout>
</template>
