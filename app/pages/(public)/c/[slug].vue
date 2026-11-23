<script setup lang="ts">
import type { PublicCard } from '~~/shared/contracts/card';
import type { CreateContactExchangeRequest } from '~~/shared/contracts/contact';
import { Application } from '@splinetool/runtime';
import type { ConcreteComponent } from 'vue';
import {
  CARD_LINK_IMAGES,
  SOCIAL_MEDIA_LINK_LABELS,
} from '~~/shared/constants/card-link-options';
import { downloadFile } from '~/utils/share-or-download';
import { cardEditorPath } from '~/features/card/utils/card-badge';
import { applyCombinedCardToSpline } from '~/features/card/utils/spline-card';
import { vcfPhoneLines } from '~~/shared/utils/phone';
import { ORGANIZATION_TYPES } from '~~/shared/utils/constants';
import { ROUTES } from '~~/shared/utils/routes';

const route = useRoute();
const { normalizeCardLinkValue } = useUrlNormalization();

const { slug } = route.params;
type PublicCardResponse =
  | PublicCard
  | { availability: 'paused' | 'retired'; companyName: string };

const {
  data: cardResponse,
  error: cardError,
  refresh: refreshPublicCard,
} = await useFetch<PublicCardResponse>(`/api/public/cards/${slug}`);
const unavailable = computed(() =>
  cardResponse.value && 'availability' in cardResponse.value
    ? cardResponse.value
    : null
);
const card = computed(() =>
  cardResponse.value && !('availability' in cardResponse.value)
    ? cardResponse.value
    : null
);
const isMembersOnly = cardError.value?.statusCode === 401;

if (!card.value && !unavailable.value && !isMembersOnly) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Page not found',
  });
}

const { data: session } = await authClient.useSession(useFetch);
const { data: myCards, refetch: refetchMyCards } = useWorkspaceCardsQuery({
  enabled: () => !!session.value,
});

const ownCard = computed(
  () =>
    myCards.value?.find((myCard) => myCard.slug === card.value?.slug) ?? null
);

const cardFullName = computed(() =>
  [card.value?.firstName, card.value?.lastName].filter(Boolean).join(' ').trim()
);

const qrDetailLine = computed(() => {
  const position = card.value?.position?.trim();
  const company = card.value?.company?.trim();
  if (position && company) return `${position} · ${company}`;
  return position || company || '';
});

const seoTitle = computed(() => {
  const name = cardFullName.value;
  if (!name) return 'LA PERSONA';
  const position = card.value?.position?.trim();
  return position ? `${name} — ${position}` : name;
});

const seoDescription = computed(() => {
  const name = cardFullName.value || '🤓';
  const position = card.value?.position?.trim();
  const company = card.value?.company?.trim();

  if (position && company) {
    return `${name} — ${position} at ${company}. Save contact and connect on LA PERSONA.`;
  }
  if (position) {
    return `${name} — ${position}. Save contact and connect on LA PERSONA.`;
  }
  return `Connect with ${name} on LA PERSONA.`;
});

const shouldShowPoweredByLaPersona = computed(() => {
  const plan = card.value?.plan;
  const planCode = plan?.code;
  const isTrial = plan?.isTrial || plan?.status === 'trial';

  const isPremiumPlan = planCode === 'premium' || planCode === 'founder-club';
  const isPaidStandardPlan = planCode === 'standard' && !isTrial;

  return !isPremiumPlan && !isPaidStandardPlan;
});

usePageSeo({
  title: seoTitle,
  description: seoDescription,
  image: () => resolveObjectStorageUrl(card.value?.cardBackUrl),
  imageAlt: () => cardFullName.value || 'LA PERSONA',
  type: 'profile',
  noindex: isMembersOnly,
});

useInAppBrowserPreview(() => {
  const name = cardFullName.value;
  return {
    heading: name
      ? `Explore ${name}'s LA PERSONA Card in Your\u00a0Browser`
      : 'Explore This LA PERSONA Card in Your\u00a0Browser',
    cardBackUrl: resolveObjectStorageUrl(card.value?.cardBackUrl) || null,
  };
});

let splineApp: Application | null = null;

function disposeSpline() {
  splineApp?.dispose();
  splineApp = null;
}

onMounted(async () => {
  if (!card || !card.value) return;

  // Track View
  recordCardInteraction(card.value!.slug, {
    type: 'view',
    metadata: { path: route.path },
  });

  loading.value = true;

  const canvas = document.querySelector('#card') as HTMLCanvasElement | null;
  if (!canvas) return;
  const spline = new Application(canvas);
  splineApp = spline;
  spline
    .load(card.value?.splineUrl + `?v=${new Date().getTime()}`)
    .then(() => {
      if (splineApp !== spline) return;
      loading.value = false;
      if (!card.value) return;
      applyCombinedCardToSpline(spline, {
        firstName: card.value.firstName,
        lastName: card.value.lastName,
        position: card.value.position,
        phone: card.value.phone,
        phoneCountryCode: card.value.phoneCountryCode,
        email: card.value.email,
        website: card.value.website,
        planCode: card.value.plan?.code,
        joinedAt: card.value.joinedAt,
      });
    });
});

const isMenuOpen = ref(false);
const isQrOpen = ref(false);

const qrScale = ref(0.84);
let qrVelocity = 0;
let qrFrame = 0;

function springQrScale(target: number) {
  cancelAnimationFrame(qrFrame);
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    qrVelocity = 0;
    qrScale.value = target;
    return;
  }
  let value = qrScale.value;
  let last = performance.now();
  const stiffness = 380;
  const damping = 16;
  const step = (now: number) => {
    const dt = Math.min((now - last) / 1000, 0.032);
    last = now;
    qrVelocity += (-stiffness * (value - target) - damping * qrVelocity) * dt;
    value += qrVelocity * dt;
    qrScale.value = value;
    if (Math.abs(value - target) < 0.0005 && Math.abs(qrVelocity) < 0.008) {
      qrVelocity = 0;
      qrScale.value = target;
      return;
    }
    qrFrame = requestAnimationFrame(step);
  };
  qrFrame = requestAnimationFrame(step);
}

watch(isQrOpen, (open) => {
  springQrScale(open ? 1 : 0.84);
});

onBeforeUnmount(() => {
  disposeSpline();
  cancelAnimationFrame(qrFrame);
});

function toggleExplore() {
  isMenuOpen.value = !isMenuOpen.value;
  if (isMenuOpen.value) isQrOpen.value = false;
}

function toggleCardQr() {
  isQrOpen.value = !isQrOpen.value;
  if (isQrOpen.value) isMenuOpen.value = false;
}

const router = useRouter();
const canGoBack = ref(false);

onMounted(() => {
  canGoBack.value = typeof router.options.history.state.back === 'string';
});

function goBack() {
  if (canGoBack.value) {
    router.back();
    return;
  }
  if (ownCard.value) {
    navigateTo(`/platform/${ownCard.value.organization.slug}/cards`);
  }
}
const isLinksOpen = ref(false);

function openLinkManager() {
  isLinksOpen.value = true;
}

const isFormOpen = ref(false);
const isSuccess = ref(false);
const isValid = ref(true);
const isSubmitting = ref(false);
const isSavingContact = ref(false);
const isSeamlessExchanging = ref(false);
const isPickingCard = ref(false);
const successMode = ref<'visitor' | 'seamless' | null>(null);
const loading = ref(false);
const error = ref('');
const toast = useToast();

const cardDisplayName = computed(() =>
  [card.value?.firstName, card.value?.lastName].filter(Boolean).join(' ').trim()
);
const exchangeButtonLabel = computed(() =>
  isSeamlessExchanging.value ? 'Connecting...' : 'Exchange Contact'
);
const successTitle = computed(() =>
  successMode.value === 'seamless'
    ? 'Successfully Connected'
    : "You're all set!"
);
const successDescription = computed(() =>
  successMode.value === 'seamless'
    ? `${cardDisplayName.value || 'This contact'} has been added to your Contacts.`
    : `Tap below to save ${card.value?.firstName || 'this person'}'s contact directly to your phone.`
);
const isSeamlessSuccess = computed(
  () => isSuccess.value && successMode.value === 'seamless'
);

const closeForm = () => {
  isFormOpen.value = false;
  setTimeout(() => {
    isSuccess.value = false;
    isPickingCard.value = false;
    successMode.value = null;
    error.value = '';
  }, 750);
};

const onExchangeContactClick = async () => {
  if (!session.value) {
    isFormOpen.value = !isFormOpen.value;
    return;
  }
  if (!card.value || isSeamlessExchanging.value) return;

  isMenuOpen.value = false;
  exchangeSeamlessly();
};

const personalCards = computed(() =>
  (myCards.value ?? []).filter(
    (myCard) => myCard.organization.type === ORGANIZATION_TYPES.PERSONAL
  )
);

/** Without `cardId` the server picks the visitor's card; it asks back only when they must choose. */
const exchangeSeamlessly = async (cardId?: string) => {
  if (!card.value || isSeamlessExchanging.value) return;

  isSeamlessExchanging.value = true;
  try {
    await $fetch(`/api/public/cards/${card.value.slug}/contact-exchanges`, {
      method: 'POST',
      body: { mode: 'seamless', cardId } satisfies CreateContactExchangeRequest,
    });

    recordCardInteraction(card.value!.slug, {
      type: 'save_action',
      metadata: { action: 'seamless_exchange' },
    });

    successMode.value = 'seamless';
    isPickingCard.value = false;
    isSuccess.value = true;
    isFormOpen.value = true;
  } catch (error) {
    const code = apiErrorCode(error);
    if (code === 'card_choice_required') {
      if (!myCards.value) await refetchMyCards();
      isPickingCard.value = true;
      isFormOpen.value = true;
      return;
    }
    if (code === 'card_required') {
      isFormOpen.value = true;
      toast.add({
        title: 'Seamless Exchange unavailable',
        description:
          "You don't have a La Persona card yet, so please share your details below.",
        color: 'info',
        icon: 'i-heroicons-information-circle',
        progress: false,
        duration: 6000,
      });
      return;
    }
    toast.add({
      title: 'Unable to connect',
      description: apiErrorMessage(error),
      color: 'error',
      icon: 'i-heroicons-x-circle',
      progress: false,
      duration: 10000,
    });
  } finally {
    isSeamlessExchanging.value = false;
  }
};

const onSubmit = async (e: SubmitEvent) => {
  const formData = new FormData(e.target as HTMLFormElement);
  const data = Object.fromEntries(formData.entries());

  isSubmitting.value = true;

  try {
    await $fetch(`/api/public/cards/${card.value!.slug}/contact-exchanges`, {
      method: 'POST',
      body: {
        mode: 'form',
        name: String(data.name ?? ''),
        email: String(data.email ?? ''),
        phone: String(data.phone ?? ''),
        phoneCountryCode: String(data.phoneCountryCode ?? '') || null,
        company: String(data.company ?? ''),
        position: String(data.position ?? ''),
      },
    });

    recordCardInteraction(card.value!.slug, {
      type: 'save_action',
      metadata: { action: 'contact_exchange' },
    });

    successMode.value = 'visitor';
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
  phone: resolveComponent('IconPhone'),
};
const socialLinkLabelSet = new Set(
  SOCIAL_MEDIA_LINK_LABELS.map((label) => label.toLowerCase())
);

const linkAssetMap: Record<string, string> = {
  facebook: '/images/card/facebook.png',
  github: '/images/card/github.png',
  gmail: '/images/card/gmail.png',
  instagram: '/images/card/instagram.webp',
  line: '/images/card/line.png',
  linkedin: '/images/card/linkedin.png',
  telegram: '/images/card/telegram.png',
  tiktok: '/images/card/tiktok.png',
  viber: '/images/card/viber.png',
  whatsapp: '/images/card/whatsapp.png',
  address: CARD_LINK_IMAGES.Address ?? 'world',
  website: 'world',
  phone: 'phone',
  'direct message': 'directMessage',
  'download resume': 'arrowDown',
  'buy me coffee': 'buyMeCoffee',
  portfolio: 'world',
  'case studies': 'world',
  'make appointment': CARD_LINK_IMAGES['Make Appointment'] ?? 'world',
  booking: CARD_LINK_IMAGES['Make Appointment'] ?? 'world',
};

function getLinkIcon(label: string) {
  const key = label.trim().toLowerCase();
  return linkAssetMap[key] || 'world';
}

function trackLinkClick(link: { label: string; value: string }) {
  if (!card.value) return;

  const normalizedLabel = (link.label || '').trim().toLowerCase();
  const isSocial = socialLinkLabelSet.has(normalizedLabel);

  recordCardInteraction(card.value!.slug, {
    type: isSocial ? 'social_click' : 'link_click',
    metadata: isSocial
      ? { platform: normalizedLabel, url: link.value }
      : { label: link.label, url: link.value },
  });
}

function vcfUrlKey(value: string) {
  return value.trim().toLowerCase().replace(/\/+$/, '');
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

type VcfPhoto = { base64: string; imageType: 'JPEG' | 'PNG' };

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

  return resolveObjectStorageUrl(raw);
}

function avatarHost(url: string) {
  if (!/^https?:\/\//i.test(url)) return undefined;
  try {
    const host = new URL(url).host;
    return /^[a-z0-9.-]+(?::\d+)?$/i.test(host) ? host : undefined;
  } catch {
    return undefined;
  }
}

function imageKind(bytes: Uint8Array, mimeType: string) {
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return 'jpeg';
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return 'png';
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'webp';
  }

  const mime = mimeType.toLowerCase();
  if (mime.includes('png')) return 'png';
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpeg';
  if (mime.includes('webp')) return 'webp';
  return null;
}

async function photoFromBlob(blob: Blob): Promise<VcfPhoto | null> {
  const buffer = await blob.arrayBuffer();
  const kind = imageKind(new Uint8Array(buffer), blob.type);
  if (kind !== 'jpeg' && kind !== 'png') return null;
  return {
    base64: toBase64(buffer),
    imageType: kind === 'png' ? 'PNG' : 'JPEG',
  };
}

async function getPhotoForVcf(): Promise<{
  photo: VcfPhoto | null;
  host?: string;
}> {
  const avatarUrl = resolveCardAvatarUrl(card.value?.avatarUrl);
  if (!avatarUrl) return { photo: null };

  const host = avatarHost(avatarUrl);
  for (const rawUrl of [imageProxyUrl(avatarUrl), avatarUrl]) {
    try {
      const response = await fetch(rawUrl, { cache: 'no-store' });
      if (!response.ok) continue;
      const photo = await photoFromBlob(await response.blob());
      if (photo) return { photo };
    } catch {
      continue;
    }
  }

  return { photo: null, ...(host ? { host } : {}) };
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
    ...vcfPhoneLines(card.value.phone, card.value.phoneCountryCode).map(
      (value) => `TEL;TYPE=CELL:${escapeVcfValue(value)}`
    ),
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
          // Email, phone and website already have their own lines above.
          .filter((link) => !/^(mailto|tel):/i.test(link.value.trim()))
          .filter(
            (link) =>
              !card.value?.website ||
              vcfUrlKey(link.value) !== vcfUrlKey(card.value.website)
          )
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
    const { photo, host } = await getPhotoForVcf();
    const vcf = buildCardVcf(photo);
    if (!vcf) throw new Error('Unable to generate VCF.');

    const fileName = `${sanitizeFilename(
      `${card.value.firstName} ${card.value.lastName || ''}`.trim()
    )}.vcf`;
    const blob = new Blob([vcf], { type: 'text/vcard;charset=utf-8' });
    downloadFile({ blob, fileName });

    recordCardInteraction(card.value!.slug, {
      type: 'save_action',
      metadata: {
        action: 'vcf_download',
        ...(host ? { photoHost: host } : {}),
      },
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
  <div
    v-if="unavailable"
    class="flex h-dvh items-center justify-center bg-[#232323] px-6 text-center text-white"
  >
    <p class="max-w-sm text-lg">
      {{
        unavailable.availability === 'retired'
          ? `This person is no longer with ${unavailable.companyName}.`
          : 'This card is currently unavailable.'
      }}
    </p>
  </div>
  <div
    v-else-if="card"
    class="relative z-10 h-dvh w-screen overflow-hidden bg-[#232323]"
  >
    <div
      class="absolute inset-0 h-full w-full origin-center transition duration-300 ease-out motion-reduce:transition-none"
      :class="
        isQrOpen
          ? 'pointer-events-none scale-95 opacity-0'
          : 'scale-100 opacity-100'
      "
    >
      <div
        v-if="loading"
        class="inline-block size-12 animate-spin rounded-full border border-current border-t-transparent text-ink/20 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        role="status"
        aria-label="loading"
      >
        <span class="sr-only">Loading...</span>
      </div>
      <canvas id="card" class="h-full w-full"></canvas>
    </div>

    <div
      v-if="ownCard"
      class="pointer-events-none absolute inset-0 flex items-center justify-center px-6"
      :aria-hidden="!isQrOpen"
    >
      <div
        class="origin-center transition-opacity duration-200 ease-out motion-reduce:transition-none"
        :class="isQrOpen ? 'opacity-100' : 'opacity-0'"
        :style="{ transform: `scale(${qrScale})` }"
      >
        <CardQrPanel
          v-if="card"
          :slug="card.slug"
          :name="cardFullName"
          :detail="qrDetailLine"
        />
      </div>
    </div>

    <div
      v-if="canGoBack || ownCard"
      class="absolute top-8 left-0 right-0 flex w-full px-5 sm:mx-auto sm:max-w-96"
    >
      <button
        type="button"
        aria-label="Back"
        class="grid aspect-square w-9 place-items-center rounded-lg border border-line-heavy bg-line-strong transition duration-300 hover:bg-ink/10"
        @click="goBack"
      >
        <UIcon name="i-lucide-chevron-left" class="size-5" />
      </button>
    </div>

    <div
      class="absolute bottom-8 left-0 right-0 flex w-full gap-3 px-5 transition duration-750 sm:mx-auto sm:max-w-96"
      :class="{
        'translate-y-full': isMenuOpen || isFormOpen,
        'translate-y-0': !isMenuOpen || !isFormOpen,
      }"
    >
      <NuxtLink
        v-if="ownCard"
        :to="cardEditorPath(ownCard)"
        class="btn-press grid flex-1 place-items-center rounded-full border border-line-heavy bg-line-strong text-sm font-bold hover:bg-ink/10"
      >
        Manage Card
      </NuxtLink>
      <button
        v-else
        :disabled="isSeamlessExchanging"
        @click="onExchangeContactClick"
        class="grid flex-1 place-items-center rounded-full border border-line-heavy bg-line-strong text-sm font-bold transition duration-300 hover:bg-ink/10 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-line-strong"
      >
        {{ exchangeButtonLabel }}
      </button>
      <UTooltip text="Explore">
        <button
          type="button"
          aria-label="Explore"
          @click="toggleExplore"
          class="grid aspect-square w-13 shrink-0 place-items-center rounded-full border border-line-heavy bg-line-strong transition duration-300 hover:bg-ink/10"
        >
          <div class="aspect-square w-6">
            <IconMenu />
          </div>
        </button>
      </UTooltip>
      <UTooltip v-if="ownCard" :text="isQrOpen ? 'Close' : 'QR code'">
        <button
          type="button"
          :aria-label="isQrOpen ? 'Close QR code' : 'Show QR code'"
          :aria-pressed="isQrOpen"
          class="grid aspect-square w-13 shrink-0 place-items-center rounded-full border border-line-heavy bg-line-strong transition duration-300 hover:bg-ink/10"
          @click="toggleCardQr"
        >
          <div
            class="grid place-items-center"
            :class="isQrOpen ? 'size-6.5' : 'size-5.5'"
          >
            <IconCloseRounded v-if="isQrOpen" />
            <IconQrCode v-else />
          </div>
        </button>
      </UTooltip>
    </div>

    <div
      class="fixed inset-0 top-auto -mb-px h-[calc(100dvh-3.5rem)] w-full scale-[1.005] rounded-t-xl border border-line-heavy bg-canvas transition duration-750 sm:mx-auto sm:max-w-104"
      :class="{
        'translate-y-0': isFormOpen,
        'translate-y-[101%]': !isFormOpen,
      }"
    >
      <div class="flex h-full flex-col">
        <div
          class="flex items-center justify-center border-b border-line-heavy py-6 text-center text-sm font-bold transition duration-750"
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
          <Icon
            v-if="isSeamlessSuccess"
            name="i-material-symbols:verified"
            class="size-13 text-success-ink"
          />
          <div
            class="text-center"
            :class="
              isSeamlessSuccess
                ? 'w-35.5 text-base font-medium uppercase leading-6.75 tracking-[1.6px] text-success-ink'
                : 'text-sm font-bold leading-none tracking-[0.1rem]'
            "
          >
            {{ successTitle }}
          </div>
          <p
            class="mx-auto text-center"
            :class="
              isSeamlessSuccess
                ? 'max-w-[16rem] text-sm font-normal leading-5.25 text-ink'
                : 'max-w-[16rem] text-xs font-light leading-normal tracking-[0.1rem]'
            "
          >
            {{ successDescription }}
          </p>
        </div>

        <div
          v-else-if="isPickingCard"
          class="hide-scrollbar flex-1 overflow-y-scroll"
        >
          <div
            class="mx-auto max-w-52 pt-8 text-center text-sm font-light leading-normal sm:max-w-[18rem]"
          >
            Choose which of your cards to&nbsp;share.
          </div>
          <ul class="flex flex-col gap-3 px-5 py-9">
            <li v-for="myCard in personalCards" :key="myCard.id">
              <button
                type="button"
                :disabled="isSeamlessExchanging"
                class="flex w-full cursor-pointer flex-col gap-1 border border-line-heavy px-4 py-4 text-left transition duration-500 hover:border-ink/20 disabled:cursor-not-allowed disabled:opacity-50 sm:px-6"
                @click="exchangeSeamlessly(myCard.id)"
              >
                <span class="text-sm font-bold tracking-[0.1rem]">
                  {{
                    [myCard.firstName, myCard.lastName]
                      .filter(Boolean)
                      .join(' ')
                  }}
                </span>
                <span
                  v-if="myCard.position || myCard.company"
                  class="text-xs font-light tracking-[0.1rem] text-ink/60"
                >
                  {{
                    [myCard.position, myCard.company]
                      .filter(Boolean)
                      .join(' • ')
                  }}
                </span>
              </button>
            </li>
          </ul>
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
                class="h-[2.8rem] w-full appearance-none border border-line-heavy bg-transparent px-4 text-sm font-light tracking-[0.1rem] transition duration-500 placeholder:text-xs placeholder:tracking-[0.1rem] placeholder:text-ink/20 hover:border-ink/20 focus:border-ink/50 focus:outline-none sm:h-[3.13rem] sm:px-6"
              />
            </label>
            <ContactPhoneInput split-country />
            <label
              class="flex flex-col gap-3 text-xs font-light tracking-[0.1rem]"
            >
              Email Address*
              <input
                name="email"
                type="email"
                autocomplete="off"
                required
                class="h-[2.8rem] w-full appearance-none border border-line-heavy bg-transparent px-4 text-sm font-light tracking-[0.1rem] transition duration-500 placeholder:text-xs placeholder:tracking-[0.1rem] placeholder:text-ink/20 hover:border-ink/20 focus:border-ink/50 focus:outline-none sm:h-[3.13rem] sm:px-6"
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
                class="h-[2.8rem] w-full appearance-none border border-line-heavy bg-transparent px-4 text-sm font-light tracking-[0.1rem] transition duration-500 placeholder:text-xs placeholder:tracking-[0.1rem] placeholder:text-ink/20 hover:border-ink/20 focus:border-ink/50 focus:outline-none sm:h-[3.13rem] sm:px-6"
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
                class="h-[2.8rem] w-full appearance-none border border-line-heavy bg-transparent px-4 text-sm font-light tracking-[0.1rem] transition duration-500 placeholder:text-xs placeholder:tracking-[0.1rem] placeholder:text-ink/20 hover:border-ink/20 focus:border-ink/50 focus:outline-none sm:h-[3.13rem] sm:px-6"
              />
            </label>
          </form>
        </div>
        <div
          class="flex flex-col items-center justify-center gap-6 border-t border-line-heavy px-5 py-8"
        >
          <button
            v-if="isSuccess"
            :disabled="isSavingContact"
            class="cursor-pointer w-full rounded-full border border-line-heavy bg-ink py-4 text-center text-xs font-bold leading-none tracking-[0.1rem] text-ink-inverse transition-all duration-500 disabled:bg-line-strong disabled:text-ink/20"
            @click="onSaveContact"
          >
            {{ isSavingContact ? 'Preparing Contact...' : 'Save Contact' }}
          </button>
          <!-- <a
            v-if="isSuccess"
            :href="card.vcf"
            :download="`${card.id}.vcf`"
            class="cursor-pointer w-full rounded-full border border-line-heavy bg-ink py-4 text-center text-xs font-bold leading-none tracking-[0.1rem] text-ink-inverse transition-all duration-500 disabled:bg-line-strong disabled:text-ink/20"
          >
            Save Contact
          </a> -->
          <button
            v-else-if="!isPickingCard"
            type="submit"
            form="form"
            :disabled="!isValid || isSubmitting"
            class="cursor-pointer relative w-full rounded-full border border-line-heavy bg-ink py-4 text-xs font-bold leading-none tracking-[0.1rem] text-ink-inverse transition-all duration-500 disabled:bg-line-strong disabled:text-ink/20"
          >
            Continue
            <div
              v-if="isSubmitting"
              class="absolute right-[0.26rem] top-[51.75%] -translate-y-1/2"
            >
              <div
                class="inline-block size-9 animate-spin rounded-full border border-current border-t-transparent text-ink/20"
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
            v-if="!isSuccess && !isPickingCard"
            @click="
              successMode = 'visitor';
              isSuccess = true;
            "
            class="text-xs font-bold leading-none tracking-[0.1rem] underline underline-offset-4"
          >
            Skip for now
          </button>

          <button
            v-if="isSuccess || isPickingCard"
            @click="closeForm"
            class="text-xs font-bold leading-none tracking-[0.1rem] underline underline-offset-4"
          >
            Cancel
          </button>

          <div v-if="shouldShowPoweredByLaPersona" class="mt-2 w-full">
            <UiPoweredByLaPersona />
          </div>
        </div>
      </div>
    </div>

    <div
      class="fixed inset-0 top-auto -mb-px w-full scale-[1.005] rounded-t-xl border border-line-heavy bg-canvas py-6 transition duration-750 sm:mx-auto sm:max-w-104"
      :class="{
        'translate-y-0': isMenuOpen,
        'translate-y-100': !isMenuOpen,
      }"
    >
      <div>
        <UTooltip text="Close">
          <button
            type="button"
            aria-label="Close"
            @click="isMenuOpen = false"
            class="absolute right-4 top-4 grid aspect-square w-8 place-items-center rounded-full border border-line-heavy bg-line-strong transition duration-750"
            :class="{
              'opacity-100': isMenuOpen,
              'opacity-0': !isMenuOpen,
            }"
          >
            <div class="aspect-square w-[0.62rem]">
              <IconClose />
            </div>
          </button>
        </UTooltip>
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
          class="hide-scrollbar mt-8 flex gap-3 overflow-x-scroll px-5"
          :class="
            ownCard && !card.socials?.length
              ? 'justify-center'
              : 'justify-start'
          "
        >
          <a
            v-for="(link, index) in card.socials"
            :key="`${link.label}-${link.value}-${index}`"
            :href="normalizeCardLinkValue(link.value, link.label)"
            target="_blank"
            class="flex shrink-0 flex-col items-center gap-4 transition duration-750"
            :class="isMenuOpen ? 'opacity-100' : 'opacity-0'"
            :style="{ transitionDelay: `${(index + 1) * 100}ms` }"
            @click="trackLinkClick(link)"
          >
            <div
              class="grid aspect-square w-[4.56rem] overflow-hidden rounded-full"
            >
              <UiSkeletonImage
                v-if="getLinkIcon(link.label).includes('.')"
                :src="getLinkIcon(link.label)"
                :alt="link.label"
                width="73"
                height="73"
                class="aspect-square h-full w-full object-cover"
              />
              <div
                v-else
                class="grid aspect-square h-full w-full place-items-center rounded-full bg-line-strong"
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
          <button
            v-if="ownCard"
            type="button"
            class="group flex shrink-0 cursor-pointer flex-col items-center gap-4 transition duration-750"
            :class="isMenuOpen ? 'opacity-100' : 'opacity-0'"
            :style="{
              transitionDelay: `${((card.socials?.length ?? 0) + 1) * 100}ms`,
            }"
            @click="openLinkManager"
          >
            <div
              class="relative grid aspect-square w-[4.56rem] place-items-center text-ink/45 transition-colors duration-300 group-hover:text-ink"
            >
              <svg
                viewBox="0 0 80 80"
                class="absolute inset-0 size-full"
                aria-hidden="true"
              >
                <circle
                  cx="40"
                  cy="40"
                  r="37"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.75"
                  stroke-linecap="round"
                  stroke-dasharray="0.15 6.6"
                />
              </svg>
              <UIcon
                name="i-lucide-plus"
                class="size-6 text-ink/75 transition duration-300 group-hover:text-ink"
              />
            </div>
            <div
              class="text-center text-xs leading-[1.1] whitespace-nowrap text-ink/70 transition duration-300 group-hover:text-ink"
            >
              {{ card.socials?.length ? 'Add\u00a0More' : 'Add\u00a0Links' }}
            </div>
          </button>
        </div>
        <div
          v-if="shouldShowPoweredByLaPersona"
          class="mt-8 px-5 transition duration-750"
          :class="{
            'opacity-100': isMenuOpen,
            'opacity-0': !isMenuOpen,
          }"
          :style="{
            transitionDelay: `${((card?.socials?.length ?? 0) + (ownCard && card.socials?.length ? 2 : 1)) * 100}ms`,
          }"
        >
          <UiPoweredByLaPersona />
        </div>
      </div>
    </div>

    <CardLinksSlideover
      v-if="ownCard"
      v-model:open="isLinksOpen"
      :slug="ownCard.slug"
      :socials="card.socials ?? []"
      @saved="refreshPublicCard()"
    />
  </div>

  <main
    v-else-if="isMembersOnly"
    class="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center"
  >
    <UIcon name="i-lucide-lock" class="size-8 text-muted" />
    <h1 class="text-base font-medium uppercase tracking-widest text-ink">
      Members only
    </h1>
    <p class="max-w-80 text-sm text-muted">
      This card is only visible to LA PERSONA members. Sign in to&nbsp;view it.
    </p>
    <UButton
      label="Sign in"
      color="neutral"
      class="mt-2 h-10 text-sm rounded-full bg-ink px-8 font-medium text-ink-inverse hover:bg-ink/90"
      :to="{ path: ROUTES.SIGN_IN, query: { redirectTo: route.fullPath } }"
    />
  </main>
</template>
