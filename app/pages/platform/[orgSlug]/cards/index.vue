<script setup lang="ts">
import type { FeatureGuideItem } from '~/components/ui/feature-guide-modal.vue';
import type { CardDetail } from '~~/shared/contracts/card';
import { cardHolderName } from '~/features/card/utils/card-badge';

definePageMeta({
  layout: 'platform',
});

useSeoMeta({ ...getSeoTitle('Cards - LA PERSONA') });

const guideItems: FeatureGuideItem[] = [
  {
    icon: 'i-lucide-eye',
    title: 'View Your Cards',
    description:
      'Personal cards and community cards you belong to show up together.',
  },
  {
    icon: 'i-lucide-chevrons-up',
    title: 'Upgrade When Ready',
    description:
      'Move from trial or standard to premium with the guided payment flow.',
  },
  {
    icon: 'i-lucide-plus',
    title: 'Request New Card',
    description: 'Submit a new card request using fresh or existing designs.',
  },
  {
    icon: 'i-lucide-scan-eye',
    title: 'Preview & Edit',
    description:
      'Open each card to preview, update information, and download wallpapers.',
  },
];

const toast = useToast();
const isGuideOpen = await useFirstVisitGuide('cards');
const { data: cards, isLoading } = useWorkspaceCardsQuery();
const { mutateAsync: deleteCard, isPending: isDeleting } =
  useDeleteCardMutation();

const isRequestOpen = ref(false);
const pendingCardName = ref<string | null>(null);
const isPendingInfoOpen = computed({
  get: () => pendingCardName.value !== null,
  set: (open) => {
    if (!open) pendingCardName.value = null;
  },
});
const cardToDelete = ref<CardDetail | null>(null);
const isDeleteOpen = computed({
  get: () => cardToDelete.value !== null,
  set: (open) => {
    if (!open) cardToDelete.value = null;
  },
});
const qrCard = ref<CardDetail | null>(null);
const isQrOpen = ref(false);
const qrScale = ref(0.84);
let qrVelocity = 0;
let qrFrame = 0;
let qrSettle = 0;
const qrDetail = computed(() => {
  const card = qrCard.value;
  if (!card) return '';
  const position = card.position?.trim();
  const company = card.company?.trim();
  if (position && company) return `${position} · ${company}`;
  return position || company || '';
});

function springQrScale(target: number, onSettle?: () => void) {
  cancelAnimationFrame(qrFrame);
  const settleId = ++qrSettle;
  const finish = () => {
    if (settleId !== qrSettle) return;
    onSettle?.();
  };
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    qrVelocity = 0;
    qrScale.value = target;
    finish();
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
      finish();
      return;
    }
    qrFrame = requestAnimationFrame(step);
  };
  qrFrame = requestAnimationFrame(step);
}

function openQr(card: CardDetail) {
  cancelAnimationFrame(qrFrame);
  qrSettle += 1;
  qrVelocity = 0;
  qrScale.value = 0.84;
  isQrOpen.value = false;
  qrCard.value = card;
  nextTick(() => {
    requestAnimationFrame(() => {
      isQrOpen.value = true;
      springQrScale(1);
    });
  });
}

function closeQr() {
  if (!qrCard.value || !isQrOpen.value) return;
  isQrOpen.value = false;
  springQrScale(0.84, () => {
    if (!isQrOpen.value) qrCard.value = null;
  });
}

function onQrKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') closeQr();
}

watch(qrCard, (card) => {
  if (!import.meta.client) return;
  document.body.style.overflow = card ? 'hidden' : '';
  if (card) window.addEventListener('keydown', onQrKeydown);
  else window.removeEventListener('keydown', onQrKeydown);
});

onBeforeUnmount(() => {
  cancelAnimationFrame(qrFrame);
  document.body.style.overflow = '';
  window.removeEventListener('keydown', onQrKeydown);
});

function openGuide() {
  isGuideOpen.value = true;
}

function openRequestForm() {
  isRequestOpen.value = true;
}

async function confirmDelete() {
  if (!cardToDelete.value) return;
  try {
    await deleteCard(cardToDelete.value.slug);
    toast.add({
      title: 'Card deleted',
      description: 'The card has been removed successfully.',
      color: 'success',
    });
    cardToDelete.value = null;
  } catch (error) {
    toast.add({
      title: 'Delete failed',
      description: apiErrorMessage(error, 'Try again.'),
      color: 'error',
    });
  }
}
</script>

<template>
  <div class="space-y-6 pb-20 sm:pb-0">
    <div
      class="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <div class="flex items-center justify-between gap-2">
        <h1
          class="text-2xl font-medium uppercase tracking-widest leading-tight"
        >
          Your Cards
        </h1>
        <UTooltip text="What is cards?">
          <UButton
            size="lg"
            icon="material-symbols:info-outline"
            color="neutral"
            variant="ghost"
            class="flex items-center justify-center rounded-full p-0 text-muted hover:bg-raised cursor-pointer"
            aria-label="What is cards?"
            @click="openGuide"
          />
        </UTooltip>
      </div>

      <UButton
        label="Request New Card"
        leading-icon="i-lucide-plus"
        color="neutral"
        class="fixed bottom-6 left-1/2 z-10 -translate-x-1/2 shadow-lg sm:static sm:translate-x-0 sm:shadow-none h-10 text-sm cursor-pointer flex items-center justify-center rounded-full bg-ink px-5 font-medium text-ink-inverse hover:bg-ink/90"
        @click="openRequestForm"
      />
    </div>

    <CardRequestSlideover v-model:open="isRequestOpen" />

    <UiFeatureGuideModal
      v-model:open="isGuideOpen"
      title="What is cards?"
      heading="Your cards, all in one place"
      description="Manage your card library and subscription actions quickly."
      :items="guideItems"
    />

    <div
      v-if="isLoading"
      class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 sm:gap-6"
    >
      <USkeleton
        v-for="index in 3"
        :key="index"
        class="aspect-[1/0.9] w-full rounded-lg"
      />
    </div>

    <div
      v-else-if="cards?.length"
      class="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 sm:gap-6 xl:grid-cols-3"
    >
      <CardLibraryTile
        v-for="card in cards"
        :key="card.id"
        :card="card"
        @delete="cardToDelete = $event"
        @show-pending-info="pendingCardName = $event"
        @show-qr="openQr"
      />

      <BillingPremiumCardCta @request="openRequestForm" />
    </div>

    <UContainer v-else class="h-[calc(100vh-10rem)] min-h-96">
      <div class="flex flex-col items-center justify-center text-center h-full">
        <div
          class="bg-raised w-11 aspect-square flex items-center justify-center rounded-sm"
        >
          <UIcon
            name="i-material-symbols:cards-stack-outline-sharp"
            class="w-5 h-5"
          />
        </div>
        <h2 class="text-sm tracking-[1.4px] font-semibold uppercase mt-8 mb-4">
          No cards in here yet
        </h2>
        <p class="text-muted max-w-sm text-sm leading-relaxed">
          It looks like you don't have any card yet.<br />
          Create one to get started.
        </p>
      </div>
    </UContainer>
  </div>

  <CardPendingApprovalInfo
    v-model:open="isPendingInfoOpen"
    :card-name="pendingCardName ?? ''"
  />

  <UiConfirmDeleteModal
    v-model:open="isDeleteOpen"
    title="Delete Card?"
    :pending="isDeleting"
    @confirm="confirmDelete"
  >
    This action cannot be undone. The card
    <span class="font-medium text-ink">
      "{{ cardToDelete ? cardHolderName(cardToDelete) : '' }}"
    </span>
    and related subscription records will be removed.
  </UiConfirmDeleteModal>

  <Teleport to="body">
    <div
      v-if="qrCard"
      class="fixed inset-0 z-50 flex items-center justify-center bg-[#232323] px-6 transition-opacity duration-200 ease-out motion-reduce:transition-none"
      :class="isQrOpen ? 'opacity-100' : 'pointer-events-none opacity-0'"
      role="dialog"
      aria-modal="true"
      :aria-label="`QR code for ${cardHolderName(qrCard)}`"
    >
      <div class="flex flex-col items-center gap-8">
        <div class="origin-center" :style="{ transform: `scale(${qrScale})` }">
          <CardQrPanel
            :slug="qrCard.slug"
            :name="cardHolderName(qrCard)"
            :detail="qrDetail"
          />
        </div>
        <button
          type="button"
          aria-label="Close QR code"
          class="grid aspect-square w-10 shrink-0 place-items-center rounded-full border border-line-heavy bg-line-strong text-ink transition duration-300 hover:bg-ink/10"
          @click="closeQr"
        >
          <span class="grid size-5 place-items-center">
            <IconCloseRounded />
          </span>
        </button>
      </div>
    </div>
  </Teleport>
</template>
