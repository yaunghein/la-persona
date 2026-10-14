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
  <EContainer
    :style="`${boxStyle}; padding: 32px 20px 32px; text-align: center`"
  >
    <EText
      :style="`${titleStyle}; color: #121212; max-width: 260px; margin: 0 auto`"
    >
      All Your <strong>Contacts</strong> in one&nbsp;place
    </EText>
    <EText :style="`${bodyStyle}; color: #121212; margin-top: 12px`">
      See everyone who exchanged details with your community card in one
      organized&nbsp;list.
    </EText>
    <EmailButton :href="href" inline>Manage Your Contacts</EmailButton>
    <EImg
      :src="emailAsset(assetBaseUrl, 'email-contacts.png')"
      alt="Contacts list on LA PERSONA"
      :style="`${fullWidthImageStyle}; margin-top: 12px`"
    />
  </EContainer>
</template>
