<script setup lang="ts">
withDefaults(
  defineProps<{
    preview?: string;
    showBanner?: boolean;
    boxed?: boolean;
  }>(),
  { preview: '', showBanner: true, boxed: true }
);

const BANNER_URL =
  'https://www.la-persona.com/images/emails/welcome-email-banner.jpg';

const socialLinks = [
  { label: 'FACEBOOK', href: 'https://www.facebook.com/share/1A3rzUmSoh/' },
  { label: 'INSTAGRAM', href: 'https://www.instagram.com/lapersona.mm' },
  {
    label: 'LINKEDIN',
    href: 'https://www.linkedin.com/company/la-persona-mm/',
  },
];
</script>

<template>
  <EHtml>
    <EHead>
      <EFont
        font-family="Inter"
        :fallback-font-family="['Arial', 'sans-serif']"
        :web-font="{
          url: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;700',
          format: 'woff2',
        }"
      />
    </EHead>
    <EPreview v-if="preview">{{ preview }}</EPreview>
    <EBody
      style="background-color: #ffffff; color: #121212; margin: 0; padding: 0"
    >
      <EContainer
        style="
          max-width: 479px;
          margin: 0 auto;
          padding: 0 32px 24px;
          font-weight: 400;
          letter-spacing: 0.4px;
        "
      >
        <EText
          v-if="!showBanner"
          style="
            font-size: 16px;
            font-weight: 500;
            letter-spacing: 2px;
            margin: 40px 0 32px;
            text-align: center;
          "
        >
          LA <strong>PERSONA</strong>
        </EText>

        <slot v-if="!boxed" />
        <EContainer v-else style="border: 1px solid #e5e6e9">
          <EImg
            v-if="showBanner"
            :src="BANNER_URL"
            alt="LA PERSONA digital card preview"
            style="width: 100%; margin-bottom: 32px; margin-top: -12px"
          />
          <EContainer
            :style="`padding: ${showBanner ? '0' : '32px'} 24px 32px`"
          >
            <slot />
          </EContainer>
        </EContainer>

        <EText
          style="
            margin-top: 40px;
            font-size: 14px;
            text-align: center;
            color: #121212;
            font-weight: 500;
            text-transform: uppercase;
          "
        >
          Elevating Professional Presence.
        </EText>

        <EContainer
          style="max-width: 285px; margin: 24px auto 32px; text-align: center"
        >
          <a
            v-for="link in socialLinks"
            :key="link.label"
            :href="link.href"
            target="_blank"
            style="
              text-decoration: underline;
              color: #121212;
              margin: 0 10px;
              font-size: 12px;
              font-weight: 600;
            "
          >
            {{ link.label }}
          </a>
        </EContainer>
      </EContainer>
    </EBody>
  </EHtml>
</template>
