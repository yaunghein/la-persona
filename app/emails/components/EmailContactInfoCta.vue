<script setup lang="ts">
import EmailButton from './EmailButton.vue';
import {
  bodyStyle,
  boxStyle,
  emailAsset,
  fullWidthImageStyle,
  titleStyle,
} from './email-styles';

defineProps<{ href: string; assetBaseUrl: string }>();
</script>

<template>
  <EContainer :style="`${boxStyle}; background: #121212; text-align: center`">
    <EContainer style="padding: 20px">
      <EText
        :style="`${titleStyle}; color: #ffffff; max-width: 260px; margin: 0 auto`"
      >
        Keep Your Contact Info&nbsp;<strong>Updated</strong>
      </EText>
      <EText :style="`${bodyStyle}; color: #ffffff; margin-top: 12px`">
        Make sure your contact information is up to date so other members can
        easily reach you after the&nbsp;event.
      </EText>
      <EmailButton :href="href" inline light>
        Update Your Contact Info
      </EmailButton>
    </EContainer>
    <EImg
      :src="emailAsset(assetBaseUrl, 'email-contact-info-update.png')"
      alt="Contact information form on LA PERSONA"
      :style="fullWidthImageStyle"
    />
  </EContainer>
</template>
