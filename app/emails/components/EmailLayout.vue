<script setup lang="ts">
withDefaults(
  defineProps<{
    preview?: string;
    /** Marketing banner; only the Welcome email shows it. */
    showBanner?: boolean;
    boxed?: boolean;
  }>(),
  { preview: '', showBanner: false, boxed: true }
);

const BANNER_URL =
  'https://www.la-persona.com/images/emails/welcome-email-banner.jpg';

// Gmail and desktop Outlook ignore web fonts and use the fallbacks.
const fontFaces = [
  {
    weight: 400,
    url: 'https://fonts.gstatic.com/s/redhatdisplay/v21/8vIf7wUr0m80wwYf0QCXZzYzUoTK8RZQvRd-D1NYbmyWQk8z-FWZk33xGQ.woff2',
  },
  {
    weight: 500,
    url: 'https://fonts.gstatic.com/s/redhatdisplay/v21/8vIf7wUr0m80wwYf0QCXZzYzUoTK8RZQvRd-D1NYbl6WQk8z-FWZk33xGQ.woff2',
  },
  {
    weight: 700,
    url: 'https://fonts.gstatic.com/s/redhatdisplay/v21/8vIf7wUr0m80wwYf0QCXZzYzUoTK8RZQvRd-D1NYbouRQk8z-FWZk33xGQ.woff2',
  },
];

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
        v-for="face in fontFaces"
        :key="face.weight"
        font-family="Red Hat Display"
        :fallback-font-family="['Arial', 'Helvetica', 'sans-serif']"
        :font-weight="face.weight"
        :web-font="{ url: face.url, format: 'woff2' }"
      />
      <!-- Older templates style text inline; this evens out their lines too. -->
      <EStyle>p, h1, h2, h3, h4 { text-wrap: pretty; }</EStyle>
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
          LA&nbsp;<strong>PERSONA</strong>
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

        <EContainer
          style="max-width: 285px; margin: 40px auto 32px; text-align: center"
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
          <EText style="margin: 16px 0 0">
            <a
              href="https://www.la-persona.com"
              target="_blank"
              style="
                text-decoration: underline;
                color: #121212;
                font-size: 12px;
                font-weight: 600;
              "
            >
              www.la-persona.com
            </a>
          </EText>
        </EContainer>
      </EContainer>
    </EBody>
  </EHtml>
</template>
