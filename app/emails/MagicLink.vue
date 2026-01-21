<script setup lang="ts">
interface Props {
  url: string;
}
const props = defineProps<Props>();
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
    <EBody
      style="background-color: #ffffff; color: #121212; margin: 0; padding: 0"
    >
      <EContainer
        style="
          max-width: 479px;
          margin: 0 auto;
          padding: 40px 32px;
          font-weight: 400;
          letter-spacing: 0.4px;
        "
      >
        <EText
          style="
            font-size: 16px;
            font-weight: 500;
            letter-spacing: 2px;
            margin-bottom: 24px;
            text-align: center;
          "
        >
          LA <strong>PERSONA</strong>
        </EText>

        <EContainer
          style="
            /* border: 1px solid #e5e6e9; */
            padding: 0;
            border-radius: 0px;
          "
        >
          <EButton
            :href="url"
            style="
              display: block;
              margin: 40px auto 32px auto;
              background: #121212;
              color: #ffffff;
              padding: 16px 24px;
              border-radius: 999px;
              text-align: center;
              font-size: 13px;
              font-weight: 500;
              letter-spacing: 0.5px;
              text-decoration: none;
            "
          >
            SIGN IN to LA PERSONA
          </EButton>
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

        <EText
          style="
            margin: 12px auto -10px auto;
            text-transform: uppercase;
            font-size: 12px;
            text-align: center;
            max-width: 320px;
            line-height: 1.5;
            color: #121212;
          "
        >
          2 Lat Phrao 85 Alley, Khlong Chaokhun Sing, Wang Thonglang, Bangkok
          10310
        </EText>

        <EContainer
          style="max-width: 285px; margin: 32px auto 0 auto; text-align: center"
        >
          <a
            style="
              text-decoration: underline;
              color: #121212;
              margin: 0 10px;
              font-size: 12px;
              font-weight: 600;
            "
            href="https://www.facebook.com/share/1A3rzUmSoh/"
            target="_blank"
          >
            FACEBOOK
          </a>
          <a
            style="
              text-decoration: underline;
              color: #121212;
              margin: 0 10px;
              font-size: 12px;
              font-weight: 600;
            "
            href="https://www.instagram.com/lapersona.mm"
            target="_blank"
          >
            INSTAGRAM
          </a>
          <a
            style="
              text-decoration: underline;
              color: #121212;
              margin: 0 10px;
              font-size: 12px;
              font-weight: 600;
            "
            href="https://www.linkedin.com/company/la-persona-mm/"
            target="_blank"
          >
            LINKEDIN
          </a>
        </EContainer>
      </EContainer>
    </EBody>
  </EHtml>
</template>
