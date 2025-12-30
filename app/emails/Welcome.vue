<script setup lang="ts">
interface Props {
  name: string;
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
    <EBody style="background-color: #ffffff; color: #121212">
      <EContainer
        style="
          max-width: 479px;
          margin: 0 auto;
          padding: 0 32px 24px;
          font-weight: 400;
          letter-spacing: 0.4px;
        "
      >
        <EContainer style="border: 1px solid #e5e6e9">
          <EImg
            src="https://temporary.la-persona.com/images/emails/welcome-email-banner.jpg"
            alt="LA PERSONA digital card preview"
            style="width: 100%; margin-bottom: 32px; margin-top: -12px"
          />
          <EContainer style="padding: 0px 24px">
            <EText style="margin-top: -8px">Hi {{ props.name }},</EText>
            <EText style="margin-top: -12px">
              Welcome to <strong style="font-weight: 900">LA PERSONA</strong>.
            </EText>
            <EText style="margin-top: -12px; line-height: 1.5">
              I'm Min, one of the co-founders. Thank you for your interest in
              our Founders' Club invitation.
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
              Founders' Club offer is not a regular membership. It's a limited
              early access circle created to reward our first supporters with
              lifetime recognition, exclusive benefits, and a premium digital
              identity experience that won't be available again after product
              launch.
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
                download="founders-club-flyer"
                href="https://temporary.la-persona.com/pdfs/founders-club-flyer.pdf"
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
              <strong style="font-weight: 900">(Lifelong)</strong><br />
              • Regular Rate: MMK 48,000/year
            </EText>

            <EHr />

            <EHeading as="h4" style="margin-top: 32px; font-weight: 600">
              JOIN IN 3 SIMPLE STEP
            </EHeading>

            <EHeading as="h5" style="margin-top: 16px; font-weight: 600">
              1. REACH OUT TO US
            </EHeading>
            <EText style="margin: -16px 0 0 16px; line-height: 1.5">
              Start the conversation by sending us a message through any of the
              following channels:
            </EText>
            <EText style="margin: 6px 0 0 22px; line-height: 1.5">
              •
              <a
                style="text-decoration: underline; color: #121212"
                href="https://www.facebook.com/share/1A3rzUmSoh/"
                target="_black"
              >
                Facebook </a
              ><br />
              •
              <a
                style="text-decoration: underline; color: #121212"
                href="https://www.linkedin.com/company/la-persona-mm/"
                target="_blank"
              >
                LinkedIn </a
              ><br />
              •
              <a
                style="text-decoration: underline; color: #121212"
                href="mailto:minhtetmyet24@gmail.com"
              >
                Email
              </a>
            </EText>

            <EHeading as="h5" style="margin-top: 16px; font-weight: 600">
              2. CONFIRM YOUR ORDER
            </EHeading>
            <EText style="margin: -16px 0 0 16px; line-height: 1.5">
              We'll guide you through the details and finalize your
              confirmation.
            </EText>

            <EHeading as="h5" style="margin-top: 16px; font-weight: 600">
              3. SCHEDULE YOUR DESIGN CONSULTATION
            </EHeading>
            <EText style="margin: -16px 0 0 16px; line-height: 1.5">
              Book a dedicated session to craft your bespoke digital card with
              our team.
            </EText>

            <EText style="margin-top: 12px; line-height: 1.5">
              Feel free to DM us to explore more or ask any questions.
            </EText>

            <EText style="margin-top: 32px">
              Warmest Regards,<br />
              Min Htet Myet<br />
              Co-founder, <strong style="font-weight: 900">LA PERSONA</strong>
            </EText>
          </EContainer>
        </EContainer>
        <EText
          style="
            margin: 45px auto 0 auto;
            text-transform: uppercase;
            font-size: 13px;
            text-align: center;
            max-width: 300px;
          "
        >
          2 Lat Phrao 85 Alley, Khlong Chaokhun Sing, Wang Thonglang, Bangkok
          10310
        </EText>
        <EContainer style="max-width: 285px; margin: 32px auto 32px auto">
          <a
            style="
              text-decoration: underline;
              color: #121212;
              margin: 0 10px;
              font-size: 12px;
            "
            href="https://www.facebook.com/share/1A3rzUmSoh/"
            target="_black"
          >
            FACEBOOK
          </a>
          <a
            style="
              text-decoration: underline;
              color: #121212;
              margin: 0 10px;
              font-size: 13px;
            "
            href="https://www.instagram.com/lapersona.mm"
            target="_black"
          >
            INSTAGRAM
          </a>
          <a
            style="
              text-decoration: underline;
              color: #121212;
              margin: 0 10px;
              font-size: 13px;
            "
            href="https://www.linkedin.com/company/la-persona-mm/"
            target="_black"
          >
            LINKEDIN
          </a>
        </EContainer>
      </EContainer>
    </EBody>
  </EHtml>
</template>
