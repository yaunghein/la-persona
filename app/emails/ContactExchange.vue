<script setup lang="ts">
interface Props {
  name: string;
  email: string;
  phone: string;
  company: string;
}

const props = defineProps<Props>();

const subject = encodeURIComponent(`Great meeting you / LA PERSONA Connection`);
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
            margin-bottom: 48px;
            text-align: center;
          "
        >
          LA <strong>PERSONA</strong>
        </EText>

        <EContainer
          style="
            border: 1px solid #e5e6e9;
            padding: 40px 24px 18px 24px;
            border-radius: 0px;
          "
        >
          <EHeading
            as="h3"
            style="
              font-weight: 600;
              text-align: center;
              margin-bottom: 24px;
              margin-top: 0;
            "
          >
            CONTACT EXCHANGE
          </EHeading>

          <EText
            style="
              font-size: 15px;
              line-height: 1.6;
              color: #121212;
              text-align: center;
              margin-bottom: 32px;
            "
          >
            You have successfully exchanged contact information via your
            <strong style="font-weight: 700">LA PERSONA</strong> digital card.
            Here are the details of your new connection:
          </EText>

          <EContainer style="padding: 0 10px">
            <EText
              style="
                margin: 0;
                font-size: 11px;
                color: #888888;
                text-transform: uppercase;
                letter-spacing: 1px;
              "
            >
              Name
            </EText>
            <EText
              style="margin: 4px 0 20px 0; font-weight: 600; font-size: 15px"
            >
              {{ props.name || 'N/A' }}
            </EText>

            <EText
              style="
                margin: 0;
                font-size: 11px;
                color: #888888;
                text-transform: uppercase;
                letter-spacing: 1px;
              "
            >
              Company
            </EText>
            <EText
              style="margin: 4px 0 20px 0; font-weight: 600; font-size: 15px"
              >{{ props.company || 'N/A' }}</EText
            >

            <EText
              style="
                margin: 0;
                font-size: 11px;
                color: #888888;
                text-transform: uppercase;
                letter-spacing: 1px;
              "
            >
              Email
            </EText>
            <EText
              style="margin: 4px 0 20px 0; font-weight: 600; font-size: 15px"
            >
              {{ props.email || 'N/A' }}
            </EText>

            <EText
              style="
                margin: 0;
                font-size: 11px;
                color: #888888;
                text-transform: uppercase;
                letter-spacing: 1px;
              "
            >
              Phone
            </EText>
            <EText style="margin: 4px 0 0 0; font-weight: 600; font-size: 15px">
              {{ props.phone || 'N/A' }}
            </EText>
          </EContainer>

          <EButton
            :href="'mailto:' + props.email + '?subject=' + subject"
            style="
              display: block;
              margin: 40px auto 32px auto;
              background: #121212;
              color: #ffffff;
              padding: 16px 24px;
              border-radius: 999px;
              text-align: center;
              font-size: 13px;
              font-weight: 700;
              letter-spacing: 0.5px;
              text-decoration: none;
            "
          >
            SEND A FOLLOW-UP EMAIL
          </EButton>

          <EHr style="border-color: #e5e6e9; margin: 42px 0 32px 0" />

          <EText
            style="
              font-size: 13px;
              line-height: 1.6;
              text-align: center;
              color: #666666;
              font-style: italic;
            "
          >
            We're securing this contact for you. You'll be able to manage all
            your connections in your personal dashboard as soon as our platform
            launches.
          </EText>
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
