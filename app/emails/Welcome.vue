<script setup lang="ts">
import EmailLayout from './components/EmailLayout.vue';

interface Props {
  name: string;
}

const props = defineProps<Props>();
</script>

<template>
  <EmailLayout
    preview="Welcome to LA PERSONA — your Founders' Club invitation"
    show-banner
  >
    <EText style="margin-top: -8px">Hi&nbsp;{{ props.name }},</EText>
    <EText style="margin-top: -12px">
      Welcome to <strong style="font-weight: 900">LA&nbsp;PERSONA</strong>.
    </EText>
    <EText style="margin-top: -12px; line-height: 1.5">
      I'm Min, one of the co-founders. Thank you for your interest in our
      Founders' Club&nbsp;invitation.
    </EText>

    <EText style="margin-top: 32px">
      AT LA&nbsp;<strong style="font-weight: 900">PERSONA</strong>
    </EText>
    <EText style="margin-top: -12px; line-height: 1.5">
      We design premium, modern 3D digital cards that elevate how professionals
      present&nbsp;themselves.
    </EText>

    <EText style="margin-top: 32px"> OUR MISSION IS&nbsp;SIMPLE </EText>
    <EText style="margin-top: -12px; line-height: 1.5">
      To help elevate your&nbsp;presence.
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
      WHAT IS FOUNDERS'&nbsp;CLUB?
    </EHeading>

    <EText style="margin-top: -12px; line-height: 1.5">
      Founders' Club offer is not a regular membership. It's a limited early
      access circle created to reward our first supporters with lifetime
      recognition, exclusive benefits, and a premium digital identity experience
      that won't be available again after product&nbsp;launch.
    </EText>

    <EText style="margin: -12px 0 0 8px; line-height: 1.5">
      • Limited to 20 members<br />
      • VIP care<br />
      • Fully&nbsp;personalized
    </EText>

    <EText style="margin: 32px 0; line-height: 1.5">
      Download to see the exclusive benefits of Founders' Club.
      <a
        style="margin-top: -12px; color: #121212"
        download="founders-club-flyer"
        href="https://temporary.la-persona.com/pdfs/founders-club-flyer.pdf"
      >
        Download the&nbsp;Flyer
      </a>
    </EText>

    <EHr />

    <EHeading as="h4" style="margin-top: 32px; font-weight: 600">
      INVESTMENT
    </EHeading>

    <EText style="margin: -12px 0 0 8px; line-height: 1.5">
      • Founders' Club Rate:
      <strong style="font-weight: 900">MMK 120,000</strong><br />
      • Regular Rate: MMK&nbsp;180,000
    </EText>

    <EText style="margin: 6px 0 32px 0">
      Flexible payment: one-time or&nbsp;split.
    </EText>

    <EHeading as="h4" style="margin-top: 32px; font-weight: 600">
      HOSTING FEE AFTER 1&nbsp;YEAR
    </EHeading>

    <EText style="margin: -12px 0 32px 8px; line-height: 1.5">
      • Founders' Club Rate:
      <strong style="font-weight: 900">MMK 19,000</strong>/year
      <strong style="font-weight: 900">(Lifelong)</strong><br />
      • Regular Rate: MMK&nbsp;48,000/year
    </EText>

    <EHr />

    <EHeading as="h4" style="margin-top: 32px; font-weight: 600">
      JOIN IN 3 SIMPLE&nbsp;STEP
    </EHeading>

    <EHeading as="h5" style="margin-top: 16px; font-weight: 600">
      1. REACH OUT TO&nbsp;US
    </EHeading>
    <EText style="margin: -16px 0 0 16px; line-height: 1.5">
      Start the conversation by sending us a message through any of the
      following&nbsp;channels:
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
      2. CONFIRM YOUR&nbsp;ORDER
    </EHeading>
    <EText style="margin: -16px 0 0 16px; line-height: 1.5">
      We'll guide you through the details and finalize your&nbsp;confirmation.
    </EText>

    <EHeading as="h5" style="margin-top: 16px; font-weight: 600">
      3. SCHEDULE YOUR DESIGN&nbsp;CONSULTATION
    </EHeading>
    <EText style="margin: -16px 0 0 16px; line-height: 1.5">
      Book a dedicated session to craft your bespoke digital card with our&nbsp;team.
    </EText>

    <EText style="margin-top: 12px; line-height: 1.5">
      Feel free to DM us to explore more or ask any&nbsp;questions.
    </EText>

    <EText style="margin-top: 32px">
      Warmest Regards,<br />
      Min Htet Myet<br />
      Co-founder, <strong style="font-weight: 900">LA&nbsp;PERSONA</strong>
    </EText>
  </EmailLayout>
</template>
