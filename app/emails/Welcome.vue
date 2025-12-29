<script setup lang="ts">
interface Props {
  name: string;
}

defineProps<Props>();
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
    <EBody style="background-color: #ffffff; color: #121212">
      <EContainer
        style="
          max-width: 479px;
          margin: 0 auto;
          padding: 0 32px 24px;
          font-weight: 100;
          letter-spacing: 0.4px;
        "
      >
        <EImg
          src="https://temporary.la-persona.com/images/emails/welcome-email-banner.jpg"
          alt="LA PERSONA digital card preview"
          style="width: 100%; margin-bottom: 32px; margin-top: -12px"
        />

        <EText>Hi {{ name }},</EText>
        <EText style="margin-top: -12px">
          Welcome to <strong style="font-weight: 900">LA PERSONA</strong>.
        </EText>
        <EText style="margin-top: -12px; line-height: 1.5">
          I'm Min, one of the co-founders. Thank you for your interest in our
          Founders' Club invitation.
        </EText>

        <EText style="margin-top: 32px">
          AT LA <strong style="font-weight: 900">PERSONA</strong>
        </EText>
        <EText style="margin-top: -12px; line-height: 1.5">
          We design premium, modern 3D digital cards that elevate how
          professionals present themselves.
        </EText>

        <EText style="margin-top: 32px"> OUR MISSION IS SIMPLE </EText>
        <EText style="margin-top: -12px; line-height: 1.5">
          To help elevate your presence.
        </EText>

        <EButton
          href="https://www.la-persona.com/minhtetmyet"
          target="_blank"
          style="
            display: block;
            margin: 32px auto;
            background: #121212;
            color: #ffffff;
            padding: 14px 24px;
            border-radius: 999px;
            text-align: center;
            font-size: 14px;
          "
        >
          EXPLORE SAMPLE CARD
        </EButton>

        <EHr />

        <EHeading as="h4" style="margin-top: 32px; font-weight: 600">
          WHAT IS FOUNDERS' CLUB?
        </EHeading>

        <EText style="margin-top: -12px; line-height: 1.5">
          Founders' Club offer is not a regular membership. It's a limited early
          access circle created to reward our first supporters with lifetime
          recognition, exclusive benefits, and a premium digital identity
          experience that won't be available again after product launch.
        </EText>

        <EText style="margin: -12px 0 0 8px; line-height: 1.5">
          • Limited to 20 members<br />
          • VIP care<br />
          • Fully personalized
        </EText>

        <EText style="margin: 32px 0; line-height: 1.5">
          Download to see the exclusive benefits of Founders' Club.
          <a
            style="margin-top: -12px; color: #121212"
            download="la-persona-flyer"
            href="flyerDownloadUrl"
          >
            Download the Flyer
          </a>
        </EText>

        <EHr />

        <EHeading as="h4" style="margin-top: 32px; font-weight: 600">
          INVESTMENT
        </EHeading>

        <EText style="margin: -12px 0 0 8px; line-height: 1.5">
          • Founders' Club Rate:
          <strong style="font-weight: 900">MMK 120,000</strong><br />
          • Regular Rate: MMK 180,000
        </EText>

        <EText style="margin: 6px 0 32px 0">
          Flexible payment: one-time or split.
        </EText>

        <EHeading as="h4" style="margin-top: 32px; font-weight: 600">
          HOSTING FEE AFTER 1 YEAR
        </EHeading>

        <EText style="margin: -12px 0 32px 8px; line-height: 1.5">
          • Founders' Club Rate:
          <strong style="font-weight: 900">MMK 19,000</strong>/year
          <strong style="font-weight: 900">(Forever)</strong><br />
          • Regular Rate: MMK 48,000/year
        </EText>

        <EHr />

        <EHeading as="h4" style="margin-top: 32px; font-weight: 600">
          JOIN IN 3 SIMPLE STEP
        </EHeading>

        <EText style="margin: -12px 0 0 8px; line-height: 1.5">
          1. Get in touch with us by replying to this email.<br />
          2. Confirm your order.<br />
          3. Schedule your design consultation.
        </EText>

        <EText style="margin-top: 6px; line-height: 1.5">
          Feel free to DM us to explore more or ask any questions.
        </EText>

        <EText style="margin-top: 32px">
          Warmest Regards,<br />
          Min Htet Myet<br />
          Co-founder, <strong style="font-weight: 900">LA PERSONA</strong>
        </EText>
      </EContainer>
    </EBody>
  </EHtml>
</template>
