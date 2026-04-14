<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query';
import { Application } from '@splinetool/runtime';
import type { ConcreteComponent } from 'vue';
import { SOCIAL_MEDIA_LINK_LABELS } from '~~/shared/constants/card-link-options';

function websiteLabelForSpline(website: string | null | undefined): string {
  if (!website?.trim()) return '';
  const raw = website.trim();
  try {
    const url = new URL(raw.includes('://') ? raw : `https://${raw}`);
    const host = url.hostname.toUpperCase();
    const path =
      url.pathname && url.pathname !== '/'
        ? url.pathname.replace(/\/$/, '').toUpperCase()
        : '';
    return path ? `${host}${path}` : host;
  } catch {
    return raw
      .replace(/^https?:\/\//i, '')
      .replace(/\/$/, '')
      .toUpperCase();
  }
}

const { trackEvent } = useAnalytics();
const runtimeConfig = useRuntimeConfig();

const { slug } = useRoute().params;
const { data: card } = await useFetch<CardDTO>(`/api/public/cards/${slug}`);

const isCardInFreeTrial = computed(
  () => card.value?.subscription?.effectiveStatus === 'trial'
);
useSeoMeta({ ...getSeoTitle(`${card.value?.firstName}`) });

onMounted(async () => {
  if (!card || !card.value) return;

  // Track View
  trackEvent({
    cardId: card.value.id,
    organizationId: card.value.organizationId,
    userId: card.value.userId,
    type: 'view',
    metadata: { path: useRoute().path },
  });

  const canvas = document.querySelector('#card') as HTMLCanvasElement;
  const spline = new Application(canvas);
  spline.load(card.value?.splineUrl + `?v=${new Date().getTime()}`).then(() => {
    if (!card.value) return;
    const fullname = [card.value.firstName, card.value.lastName]
      .filter(Boolean)
      .join(' ')
      .trim()
      .toUpperCase();
    spline.setVariables({
      name: fullname,
      position: card.value.position?.toUpperCase() || '',
      phone: card.value.phone || '',
      email: card.value.email?.toUpperCase() || '',
      website: websiteLabelForSpline(card.value.website),
    });
  });
});

const isMenuOpen = ref(false);
const isFormOpen = ref(false);
const isSuccess = ref(false);
const isValid = ref(true);
const isSubmitting = ref(false);
const isSavingContact = ref(false);
const error = ref('');
const toast = useToast();

const closeForm = () => {
  isFormOpen.value = false;
  setTimeout(() => {
    isSuccess.value = false;
    error.value = '';
  }, 750);
};

const onSubmit = async (e: SubmitEvent) => {
  const formData = new FormData(e.target as HTMLFormElement);
  const data = Object.fromEntries(formData.entries());

  isSubmitting.value = true;

  // await new Promise((r) => setTimeout(r, 3000));
  // console.log({ data });

  try {
    await $fetch('/api/email/send', {
      method: 'POST',
      body: {
        name: data.name,
        to: [data.ownerEmail],
        subject: `New Contact Exchange from ${(data.name as string).split(' ')[0]} 👋`,
        template: 'ContactExchange',
        email: data.email,
        phone: data.phone,
        company: data.company,
        position: data.position,
      },
    });

    await $fetch('/api/contact-exchange', {
      method: 'POST',
      body: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        company: data.company,
        position: data.position,
        cardId: card.value!.id,
      },
    });

    trackEvent({
      cardId: card.value!.id,
      organizationId: card.value!.organizationId,
      userId: card.value!.userId,
      type: 'save_action',
      metadata: { action: 'contact_exchange' },
    });

    isSuccess.value = true;
  } catch (error: any) {
    toast.add({
      title: 'Error while sending request.',
      description: error.statusMessage || 'Please try again.',
      color: 'error',
      icon: 'i-heroicons-x-circle',
      progress: false,
      duration: 10000,
    });
  } finally {
    isSubmitting.value = false;
  }
};

const iconMap: Record<string, string | ConcreteComponent> = {
  world: resolveComponent('IconWorld'),
  directMessage: resolveComponent('IconDirectMessage'),
  arrowDown: resolveComponent('IconArrowDown'),
  buyMeCoffee: resolveComponent('IconBuyMeCoffee'),
  saveContact: resolveComponent('IconSaveContact'),
};
const socialLinkLabelSet = new Set(
  SOCIAL_MEDIA_LINK_LABELS.map((label) => label.toLowerCase())
);

const linkAssetMap: Record<string, string> = {
  facebook: '/images/card/facebook.png',
  github: '/images/card/github.png',
  gmail: '/images/card/gmail.png',
  instagram: '/images/card/instagram.png',
  line: '/images/card/line.png',
  linkedin: '/images/card/linkedin.png',
  telegram: '/images/card/telegram.png',
  tiktok: '/images/card/tiktok.png',
  whatsapp: '/images/card/whatsapp.png',
  website: 'world',
  'direct message': 'world',
  portfolio: 'world',
  'case studies': 'world',
  booking: 'world',
};

function getLinkIcon(label: string) {
  const key = label.trim().toLowerCase();
  return linkAssetMap[key] || 'world';
}

function trackLinkClick(link: { label: string; value: string }) {
  if (!card.value) return;

  const normalizedLabel = (link.label || '').trim().toLowerCase();
  const isSocial = socialLinkLabelSet.has(normalizedLabel);

  trackEvent({
    cardId: card.value.id,
    organizationId: card.value.organizationId,
    userId: card.value.userId,
    type: isSocial ? 'social_click' : 'link_click',
    metadata: isSocial
      ? { platform: normalizedLabel, url: link.value }
      : { label: link.label, url: link.value },
  });
}

function escapeVcfValue(value: string) {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function toBase64(buffer: ArrayBuffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

function resolveCardAvatarUrl(avatarUrl: string | null | undefined) {
  const raw = String(avatarUrl || '').trim();
  if (!raw) return null;
  if (
    raw.startsWith('http://') ||
    raw.startsWith('https://') ||
    raw.startsWith('/') ||
    raw.startsWith('data:')
  ) {
    return raw;
  }

  const bucket = runtimeConfig.public.awsBucketName;
  const region = runtimeConfig.public.awsRegion;
  if (!bucket || !region) return raw;

  return `https://${bucket}.s3.${region}.amazonaws.com/${raw}`;
}

async function getPhotoForVcf() {
  const avatarUrl = resolveCardAvatarUrl(card.value?.avatarUrl);
  const candidateUrls = [
    avatarUrl
      ? `/api/s3/image-proxy?url=${encodeURIComponent(avatarUrl)}`
      : null,
    avatarUrl,
    '/images/favicon.png',
  ].filter(Boolean) as string[];

  for (const rawUrl of candidateUrls) {
    try {
      const response = await fetch(rawUrl, { cache: 'no-store' });
      if (!response.ok) continue;

      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const mimeType = (blob.type || '').toUpperCase();
      const imageType = mimeType.includes('PNG') ? 'PNG' : 'JPEG';

      return {
        base64: toBase64(arrayBuffer),
        imageType,
      };
    } catch {
      // Try next image source.
    }
  }

  return null;
}

function buildCardVcf(photo: { base64: string; imageType: string } | null) {
  if (!card.value) return '';

  const firstName = (card.value.firstName || '').trim();
  const lastName = (card.value.lastName || '').trim();
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN;CHARSET=UTF-8:${escapeVcfValue(fullName)}`,
    `N;CHARSET=UTF-8:${escapeVcfValue(lastName)};${escapeVcfValue(firstName)};;;`,
    photo ? `PHOTO;ENCODING=b;TYPE=${photo.imageType}:${photo.base64}` : '',
    card.value.phone ? `TEL;TYPE=CELL:${escapeVcfValue(card.value.phone)}` : '',
    card.value.email
      ? `EMAIL;CHARSET=UTF-8;TYPE=INTERNET:${escapeVcfValue(card.value.email)}`
      : '',
    card.value.position
      ? `TITLE;CHARSET=UTF-8:${escapeVcfValue(card.value.position)}`
      : '',
    card.value.company
      ? `ORG;CHARSET=UTF-8:${escapeVcfValue(card.value.company)}`
      : '',
    card.value.website
      ? `URL;TYPE=WORK:${escapeVcfValue(card.value.website)}`
      : '',
    ...(Array.isArray(card.value.socials)
      ? card.value.socials
          .filter((link) => link?.label?.trim() && link?.value?.trim())
          .map(
            (link) =>
              `URL;TYPE=${escapeVcfValue(link.label)}:${escapeVcfValue(link.value)}`
          )
      : []),
    `REV:${new Date().toISOString()}`,
    'END:VCARD',
  ].filter(Boolean);

  return `${lines.join('\r\n')}\r\n`;
}

function sanitizeFilename(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'contact'
  );
}

async function onSaveContact() {
  if (!card.value || isSavingContact.value) return;

  isSavingContact.value = true;
  try {
    const photo = await getPhotoForVcf();
    const vcf = buildCardVcf(photo);
    if (!vcf) throw new Error('Unable to generate VCF.');

    const fileName = `${sanitizeFilename(
      `${card.value.firstName} ${card.value.lastName || ''}`.trim()
    )}.vcf`;
    const blob = new Blob([vcf], { type: 'text/vcard;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    trackEvent({
      cardId: card.value.id,
      organizationId: card.value.organizationId,
      userId: card.value.userId,
      type: 'save_action',
      metadata: { action: 'vcf_download' },
    });
  } catch {
    toast.add({
      title: 'Unable to save contact',
      description: 'Please try again.',
      color: 'error',
      icon: 'i-heroicons-x-circle',
    });
  } finally {
    isSavingContact.value = false;
  }
}
</script>

<template>
  <div v-if="card" class="relative z-10 h-dvh w-screen overflow-hidden">
    <div class="absolute inset-0 w-full h-full">
      <canvas id="card" class="h-full w-full"></canvas>
    </div>

    <div
      class="absolute bottom-8 left-0 right-0 flex w-full gap-3 px-5 transition duration-750 sm:mx-auto sm:max-w-96"
      :class="{
        'translate-y-full': isMenuOpen || isFormOpen,
        'translate-y-0': !isMenuOpen || !isFormOpen,
      }"
    >
      <button
        @click="isFormOpen = !isFormOpen"
        class="grid flex-1 place-items-center rounded-full border border-white/10 bg-white/10 text-sm font-bold"
      >
        Exchange Contact
      </button>
      <button
        @click="isMenuOpen = !isMenuOpen"
        class="grid aspect-square w-13 shrink-0 place-items-center rounded-full border border-white/10 bg-white/10"
      >
        <div class="aspect-square w-6">
          <IconMenu />
        </div>
      </button>
    </div>

    <div
      class="fixed inset-0 top-auto -mb-px h-[calc(100dvh-3.5rem)] w-full scale-[1.005] rounded-t-xl border border-white/10 bg-dark transition duration-750 sm:mx-auto sm:max-w-104"
      :class="{
        'translate-y-0': isFormOpen,
        'translate-y-[101%]': !isFormOpen,
      }"
    >
      <div class="flex h-full flex-col">
        <div
          class="flex items-center justify-center border-b border-white/10 py-6 text-center text-sm font-bold transition duration-750"
          :class="{
            'opacity-100': isFormOpen,
            'opacity-0': !isFormOpen,
          }"
        >
          Exchange Contact
        </div>

        <div
          v-if="isSuccess"
          class="flex flex-1 flex-col items-center justify-center gap-6"
        >
          <div class="text-sm font-bold leading-none tracking-[0.1rem]">
            You're all set!
          </div>
          <p
            class="mx-auto max-w-[16rem] text-center text-xs font-light leading-normal tracking-[0.1rem]"
          >
            Tap below to save {{ card.firstName }}'s contact directly to your
            phone.
          </p>
        </div>

        <div v-else class="hide-scrollbar flex-1 overflow-y-scroll">
          <div
            class="mx-auto max-w-52 pt-8 text-center text-sm font-light leading-normal sm:max-w-[18rem]"
          >
            Share your information to receive this contact and stay connected.
          </div>
          <form
            id="form"
            autocomplete="off"
            class="flex flex-col gap-7 px-5 py-9"
            @submit.prevent="onSubmit"
          >
            <label
              class="flex flex-col gap-3 text-xs font-light tracking-[0.1rem]"
            >
              Your Name*
              <input
                name="name"
                type="text"
                autocomplete="off"
                required
                class="h-[2.8rem] w-full appearance-none border border-white/10 bg-transparent px-4 text-sm font-light tracking-[0.1rem] transition duration-500 placeholder:text-xs placeholder:tracking-[0.1rem] placeholder:text-white/20 hover:border-white/20 focus:border-white/50 focus:outline-none sm:h-[3.13rem] sm:px-6"
              />
            </label>
            <PhoneInput />
            <label
              class="flex flex-col gap-3 text-xs font-light tracking-[0.1rem]"
            >
              Email Address*
              <input
                name="email"
                type="email"
                autocomplete="off"
                required
                class="h-[2.8rem] w-full appearance-none border border-white/10 bg-transparent px-4 text-sm font-light tracking-[0.1rem] transition duration-500 placeholder:text-xs placeholder:tracking-[0.1rem] placeholder:text-white/20 hover:border-white/20 focus:border-white/50 focus:outline-none sm:h-[3.13rem] sm:px-6"
              />
            </label>

            <label
              class="flex flex-col gap-3 text-xs font-light tracking-[0.1rem]"
            >
              Company (Optional)
              <input
                name="company"
                type="text"
                autocomplete="off"
                class="h-[2.8rem] w-full appearance-none border border-white/10 bg-transparent px-4 text-sm font-light tracking-[0.1rem] transition duration-500 placeholder:text-xs placeholder:tracking-[0.1rem] placeholder:text-white/20 hover:border-white/20 focus:border-white/50 focus:outline-none sm:h-[3.13rem] sm:px-6"
              />
            </label>

            <label
              class="flex flex-col gap-3 text-xs font-light tracking-[0.1rem]"
            >
              Role / Position (Optional)
              <input
                name="position"
                type="text"
                autocomplete="off"
                class="h-[2.8rem] w-full appearance-none border border-white/10 bg-transparent px-4 text-sm font-light tracking-[0.1rem] transition duration-500 placeholder:text-xs placeholder:tracking-[0.1rem] placeholder:text-white/20 hover:border-white/20 focus:border-white/50 focus:outline-none sm:h-[3.13rem] sm:px-6"
              />
            </label>
            <input type="hidden" name="ownerEmail" :value="card.email" />
          </form>
        </div>
        <div
          class="flex flex-col items-center justify-center gap-6 border-t border-white/10 px-5 py-8"
        >
          <button
            v-if="isSuccess"
            :disabled="isSavingContact"
            class="cursor-pointer w-full rounded-full border border-white/10 bg-white py-4 text-center text-xs font-bold leading-none tracking-[0.1rem] text-dark transition-all duration-500 disabled:bg-white/10 disabled:text-white/20"
            @click="onSaveContact"
          >
            {{ isSavingContact ? 'Preparing Contact...' : 'Save Contact' }}
          </button>
          <!-- <a
            v-if="isSuccess"
            :href="card.vcf"
            :download="`${card.id}.vcf`"
            class="cursor-pointer w-full rounded-full border border-white/10 bg-white py-4 text-center text-xs font-bold leading-none tracking-[0.1rem] text-dark transition-all duration-500 disabled:bg-white/10 disabled:text-white/20"
          >
            Save Contact
          </a> -->
          <button
            v-else
            type="submit"
            form="form"
            :disabled="!isValid || isSubmitting"
            class="cursor-pointer relative w-full rounded-full border border-white/10 bg-white py-4 text-xs font-bold leading-none tracking-[0.1rem] text-dark transition-all duration-500 disabled:bg-white/10 disabled:text-white/20"
          >
            Continue
            <div
              v-if="isSubmitting"
              class="absolute right-[0.26rem] top-[51.75%] -translate-y-1/2"
            >
              <div
                class="inline-block size-9 animate-spin rounded-full border border-current border-t-transparent text-white/20"
                role="status"
                aria-label="loading"
              >
                <span class="sr-only">Loading...</span>
              </div>
            </div>
          </button>

          <div
            v-if="error"
            class="flex cursor-pointer items-start gap-3 sm:gap-6"
          >
            <span
              class="text-center text-xs font-light leading-normal tracking-[0.1rem] text-red-600 sm:text-sm"
            >
              {{ error }}
            </span>
          </div>

          <button
            @click="closeForm"
            class="text-xs font-bold leading-none tracking-[0.1rem] underline underline-offset-4"
          >
            Cancel
          </button>

          <div v-if="isCardInFreeTrial" class="mt-2 w-full">
            <PoweredByLaPersona />
          </div>
        </div>
      </div>
    </div>

    <div
      class="fixed inset-0 top-auto -mb-px w-full scale-[1.005] rounded-t-xl border border-white/10 bg-dark py-6 transition duration-750 sm:mx-auto sm:max-w-104"
      :class="{
        'translate-y-0': isMenuOpen,
        'translate-y-100': !isMenuOpen,
      }"
    >
      <div>
        <button
          @click="isMenuOpen = false"
          class="absolute right-4 top-4 grid aspect-square w-8 place-items-center rounded-full border border-white/10 bg-white/10 transition duration-750"
          :class="{
            'opacity-100': isMenuOpen,
            'opacity-0': !isMenuOpen,
          }"
        >
          <div class="aspect-square w-[0.62rem]">
            <IconClose />
          </div>
        </button>
        <div
          class="text-center text-sm font-bold transition duration-750"
          :class="{
            'opacity-100': isMenuOpen,
            'opacity-0': !isMenuOpen,
          }"
        >
          Explore
        </div>
        <div
          class="hide-scrollbar mt-8 flex justify-start gap-3 overflow-x-scroll px-5"
        >
          <template
            v-if="card.socials"
            v-for="(link, index) in card.socials"
            :key="index"
          >
            <a
              :href="link.value"
              target="_blank"
              class="flex shrink-0 flex-col items-center gap-4 transition duration-750"
              :class="isMenuOpen ? 'opacity-100' : 'opacity-0'"
              :style="{ transitionDelay: `${(index + 1) * 100}ms` }"
              @click="trackLinkClick(link)"
            >
              <div
                class="grid aspect-square w-[4.56rem] overflow-hidden rounded-full"
              >
                <img
                  v-if="getLinkIcon(link.label).includes('.')"
                  :src="getLinkIcon(link.label)"
                  :alt="link.label"
                  class="aspect-square h-full w-full object-cover"
                />
                <div
                  v-else
                  class="grid aspect-square h-full w-full place-items-center rounded-full bg-white/10"
                >
                  <div class="aspect-square w-8">
                    <component :is="iconMap[getLinkIcon(link.label)]" />
                  </div>
                </div>
              </div>
              <div class="max-w-16 text-center text-xs leading-[1.1]">
                {{ link.label }}
              </div>
            </a>

            <!-- <a
              v-else
              :href="link.href"
              target="_blank"
              class="flex shrink-0 flex-col items-center gap-4 transition duration- 750"
              :class="isMenuOpen ? 'opacity-100' : 'opacity-0'"
              :style="{ transitionDelay: `${(index + 1) * 100}ms` }"
            >
              <div
                class="grid aspect-square w-[4.56rem] place-items-center rounded-full bg-white/10"
              >
                <div class="aspect-square w-8">
                  <component :is="iconMap[link.icon]" />
                </div>
              </div>
              <div class="max-w-16 text-center text-xs leading-[1.1]">
                {{ link.label }}
              </div>
            </a> -->
          </template>
        </div>
        <div
          v-if="isCardInFreeTrial"
          class="mt-8 px-5 transition duration-750"
          :class="{
            'opacity-100': isMenuOpen,
            'opacity-0': !isMenuOpen,
          }"
          :style="{
            transitionDelay: `${((card?.socials?.length ?? 0) + 1) * 100}ms`,
          }"
        >
          <PoweredByLaPersona />
        </div>
      </div>
    </div>
  </div>
</template>
