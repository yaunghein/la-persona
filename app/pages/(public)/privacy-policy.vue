<script setup lang="ts">
useSeoMeta({ ...getSeoTitle('Terms & Privacy Policy - LA PERSONA') });

const termsSections = [
  {
    title: '1. About La Persona',
    body: [
      'La Persona provides digital business cards and related tools that help professionals present, share, and manage their contact information and personal links online.',
      'By accessing or using La Persona, you agree to these Terms.',
    ],
  },
  {
    title: '2. Your Account',
    bullets: [
      'You are responsible for the accuracy of the information you provide.',
      'You must keep your login access secure.',
      'You may not use La Persona for unlawful, misleading, or harmful purposes.',
    ],
  },
  {
    title: '3. Your Content',
    body: [
      'You retain full ownership of all content you upload or link to (name, contact details, portfolio links, media, etc.).',
      'By using La Persona, you grant us permission to display your content on your digital card, share it when someone scans or accesses your card, and store/process it to provide our services.',
      'We do not claim ownership of your content.',
    ],
  },
  {
    title: '4. Digital Cards & Availability',
    bullets: [
      'Your digital card is hosted on our platform and accessible via link or QR code.',
      'We aim for reliable availability but do not guarantee uninterrupted access at all times.',
      'Features and designs may evolve over time as we improve the platform.',
    ],
  },
  {
    title: '5. Payments & Subscriptions',
    bullets: [
      'One-time fees and recurring fees (e.g. hosting or updates) will be clearly stated before payment.',
      'Payments are non-refundable unless otherwise stated.',
      'Failure to renew paid services may result in limited access or deactivation.',
    ],
  },
  {
    title: '6. Acceptable Use',
    bullets: [
      'Do not upload illegal, abusive, or misleading content.',
      'Do not impersonate others or misrepresent your identity.',
      'Do not attempt to disrupt or exploit the platform.',
      'We reserve the right to suspend or terminate accounts that violate these rules.',
    ],
  },
  {
    title: '7. Termination',
    body: [
      'You may stop using La Persona at any time.',
      'We may suspend or terminate access if these Terms are violated.',
    ],
  },
  {
    title: '8. Limitation of Liability',
    bullets: [
      'La Persona is provided "as is".',
      'We are not liable for lost business opportunities.',
      'We are not liable for data loss caused by third parties.',
      'We are not liable for indirect or consequential damages.',
    ],
  },
  {
    title: '9. Changes to These Terms',
    body: [
      'We may update these Terms from time to time.',
      'Continued use means you accept the updated version.',
    ],
  },
];

const privacySections = [
  {
    title: '1. Information We Collect',
    bullets: [
      'Name, job title, and company',
      'Email address and phone number',
      'Social links, websites, portfolio links',
      'Contacts exchanged through the platform',
      'Usage data to improve the service',
    ],
  },
  {
    title: '2. How We Use Your Information',
    bullets: [
      'Create and display your digital card',
      'Enable contact exchange and saving',
      'Communicate with you about your account',
      'Improve platform performance and features',
    ],
  },
  {
    title: '3. Contact Exchange',
    bullets: [
      'People receive only the information you choose to share.',
      'We do not sell or rent contact data.',
      'Each exchange is logged for your reference.',
    ],
  },
  {
    title: '4. Data Storage & Security',
    body: [
      'We take reasonable steps to protect your data using industry-standard practices.',
      'No online service can guarantee 100% security.',
    ],
  },
  {
    title: '5. Sharing Your Data',
    body: ['We do not sell your personal data.'],
    bullets: [
      'We may share limited data with trusted service providers (hosting, analytics, payments).',
      'We may disclose data to legal authorities if required by law.',
    ],
  },
  {
    title: '6. Your Rights',
    bullets: [
      'Request updates or corrections to your data',
      'Request deletion of your account and its data (subject to legal requirements)',
    ],
  },
  {
    title: '7. Cookies',
    body: [
      'We may use cookies or similar technologies to improve user experience and analytics.',
    ],
  },
  {
    title: '8. Updates to This Policy',
    body: [
      'We may update this Privacy Policy as the platform evolves.',
      'Changes will be posted on this page.',
    ],
  },
];
</script>

<template>
  <div
    class="min-h-dvh bg-[#111111] px-4 py-10 text-white sm:px-6 sm:py-14 lg:px-8"
  >
    <UContainer class="max-w-5xl">
      <div class="mx-auto mb-10 max-w-3xl text-center">
        <NuxtLink
          to="/"
          class="mx-auto mb-10 inline-flex px-7 py-4"
          aria-label="Back to home"
        >
          <div class="w-44 text-white">
            <IconLogo />
          </div>
        </NuxtLink>
        <h1 class="text-3xl font-medium uppercase tracking-widest sm:text-4xl">
          Terms & Privacy Policy
        </h1>
        <p class="mt-4 text-sm text-[#8b8b8b]">Last updated: March 10, 2026</p>
      </div>

      <div class="space-y-6">
        <section
          class="rounded-[12px] border border-[#262626] bg-[#141414] p-5 sm:p-7"
        >
          <h2
            class="mb-6 text-2xl font-medium uppercase tracking-widest text-white"
          >
            Terms of Service
          </h2>
          <div class="divide-y divide-[#262626]">
            <div
              v-for="section in termsSections"
              :key="section.title"
              class="px-4 py-4 sm:px-5 sm:py-8"
            >
              <h3
                class="text-base font-medium uppercase tracking-widest text-white"
              >
                {{ section.title }}
              </h3>
              <p
                v-for="paragraph in section.body || []"
                :key="paragraph"
                class="mt-3 text-sm leading-7 text-[#bcbcbc]"
              >
                {{ paragraph }}
              </p>
              <ul
                v-if="section.bullets?.length"
                class="mt-3 space-y-2 pl-4 text-sm text-[#bcbcbc]"
              >
                <li
                  v-for="item in section.bullets"
                  :key="item"
                  class="list-disc leading-7"
                >
                  {{ item }}
                </li>
              </ul>
            </div>
            <div class="px-5 pt-3 sm:pt-7 text-sm text-[#bcbcbc]">
              Questions about these Terms?
              <a
                href="mailto:duodesignlab.mm@gmail.com"
                class="ml-1 underline decoration-[#525252] underline-offset-4"
              >
                duodesignlab.mm@gmail.com
              </a>
            </div>
          </div>
        </section>

        <section
          class="rounded-[12px] border border-[#262626] bg-[#141414] p-5 sm:p-7"
        >
          <h2
            class="mb-6 text-2xl font-medium uppercase tracking-widest text-white"
          >
            Privacy Policy
          </h2>
          <div class="divide-y divide-[#262626]">
            <div
              v-for="section in privacySections"
              :key="section.title"
              class="px-4 py-4 sm:px-5 sm:py-8"
            >
              <h3
                class="text-base font-medium uppercase tracking-widest text-white"
              >
                {{ section.title }}
              </h3>
              <p
                v-for="paragraph in section.body || []"
                :key="paragraph"
                class="mt-3 text-sm leading-7 text-[#bcbcbc]"
              >
                {{ paragraph }}
              </p>
              <ul
                v-if="section.bullets?.length"
                class="mt-3 space-y-2 pl-4 text-sm text-[#bcbcbc]"
              >
                <li
                  v-for="item in section.bullets"
                  :key="item"
                  class="list-disc leading-7"
                >
                  {{ item }}
                </li>
              </ul>
            </div>
            <div class="px-5 pt-3 sm:pt-7 text-sm text-[#bcbcbc]">
              Privacy-related questions?
              <a
                href="mailto:duodesignlab.mm@gmail.com"
                class="ml-1 underline decoration-[#525252] underline-offset-4"
              >
                duodesignlab.mm@gmail.com
              </a>
            </div>
          </div>
        </section>
      </div>
    </UContainer>
  </div>
</template>
