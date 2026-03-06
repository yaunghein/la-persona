<script setup lang="ts">
definePageMeta({
  layout: 'platform',
});

useSeoMeta({ ...getSeoTitle('Cards - LA PERSONA') });

const route = useRoute();
const runtimeConfig = useRuntimeConfig();
const toast = useToast();

const {
  data: cards,
  pending,
  error,
  refresh,
} = await useFetch<CardDTO[]>('/api/cards');

const isSlideoverOpen = ref(false);
const isPendingInfoOpen = ref(false);
const selectedPendingCardName = ref('');
const isDeleteConfirmOpen = ref(false);
const isDeleting = ref(false);
const selectedCardToDelete = ref<CardDTO | null>(null);

const getS3Url = (path?: string | null) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;

  const bucket = runtimeConfig.public.awsBucketName;
  const region = runtimeConfig.public.awsRegion;
  return `https://${bucket}.s3.${region}.amazonaws.com/${path}`;
};

function openPendingInfo(cardName: string) {
  selectedPendingCardName.value = cardName;
  isPendingInfoOpen.value = true;
}

function openDeleteConfirm(card: CardDTO) {
  selectedCardToDelete.value = card;
  isDeleteConfirmOpen.value = true;
}

function closeDeleteConfirm() {
  isDeleteConfirmOpen.value = false;
  selectedCardToDelete.value = null;
}

async function onConfirmDelete() {
  if (!selectedCardToDelete.value) return;

  isDeleting.value = true;
  try {
    await $fetch(`/api/cards/${selectedCardToDelete.value.slug}`, {
      method: 'DELETE',
    });

    toast.add({
      title: 'Card deleted',
      description: 'The card has been removed successfully.',
      color: 'success',
    });

    closeDeleteConfirm();
    await refresh();
  } catch (error: any) {
    toast.add({
      title: 'Delete failed',
      description:
        error?.data?.statusMessage || error?.statusMessage || 'Try again.',
      color: 'error',
    });
  } finally {
    isDeleting.value = false;
  }
}

function getCardBadgeLabel(card: CardDTO) {
  if (card.subscription?.status === 'pending_approval')
    return 'Pending Approval';
  if (card.subscription?.status === 'trial' || card.subscription?.isTrial)
    return 'Standard (Trial)';

  const planCode = card.subscription?.planCode;
  if (planCode === 'founder_club') return "Founders' Club";
  if (planCode === 'premium') return 'Premium';
  if (planCode === 'standard') return 'Standard';
  return 'No Plan';
}

function getCardBadgeColor(card: CardDTO) {
  if (card.subscription?.status === 'pending_approval') return 'warning';
  if (card.subscription?.status === 'active') return 'success';
  return 'neutral';
}
</script>

<template>
  <div class="flex w-full items-center justify-between">
    <h1
      class="text-[1.75rem] font-medium tracking-[0.17rem] uppercase leading-none"
    >
      Your Persona Cards
    </h1>

    <USlideover
      v-model:open="isSlideoverOpen"
      side="right"
      inset
      title="REQUEST NEW CARD"
      :ui="{
        header: 'border-b-2 border-[#232323] px-6 py-6',
        title: 'text-sm font-medium tracking-[1.4px] text-white uppercase',
        body: 'px-6',
      }"
    >
      <UButton
        label="Request New Card"
        class="rounded-full bg-white px-6 font-medium text-dark hover:bg-white/90 cursor-pointer"
        icon="i-lucide-plus"
        size="md"
      />
      <template #body>
        <FormRequestCard
          @close="isSlideoverOpen = false"
          @submitted="refresh()"
        />
      </template>
    </USlideover>
  </div>

  <div
    v-if="cards"
    class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
  >
    <UCard
      v-for="card in cards"
      :key="card.id"
      variant="outline"
      class="bg-white/2"
      :ui="{ body: 'p-14 sm:p-14' }"
    >
      <div class="aspect-5/3 relative">
        <img
          v-if="card.cardBackUrl"
          :src="getS3Url(card.cardBackUrl)"
          :alt="`${card.firstName} ${card.lastName || ''} card back`"
          class="h-full w-full object-cover rounded-md"
        />
        <div
          v-else
          class="h-full w-full rounded-md bg-[#1f1f1f] border border-[#2a2a2a] flex items-center justify-center"
        >
          <UIcon
            name="i-material-symbols:cards-star-outline-rounded"
            class="size-8 text-[#8b8b8b]"
          />
        </div>
        <UBadge
          class="absolute -top-10 -right-10 uppercase font-semibold"
          :class="{
            'cursor-pointer bg-amber-500/20 text-amber-300':
              card.subscription?.status === 'pending_approval',
            'bg-[#232323] text-white':
              card.subscription?.status !== 'pending_approval',
          }"
          :color="getCardBadgeColor(card)"
          size="sm"
          @click="
            card.subscription?.status === 'pending_approval' &&
            openPendingInfo(`${card.firstName} ${card.lastName || ''}`.trim())
          "
        >
          {{ getCardBadgeLabel(card) }}
        </UBadge>
      </div>

      <template #footer>
        <div>
          <div>{{ card.firstName }} {{ card.lastName }}</div>
        </div>
        <div class="mt-4 flex items-center justify-start gap-2">
          <UButton
            icon="i-lucide-scan-eye"
            color="primary"
            size="sm"
            class="bg-white/5 text-white hover:bg-white/15 active:hover:bg-white/20"
            target="_blank"
            :href="`/yaunghein/${card.slug}`"
          />
          <UButton
            icon="i-lucide-square-pen"
            color="primary"
            size="sm"
            class="bg-white/5 text-white hover:bg-white/15 active:hover:bg-white/20"
            :href="`/platform/${route.params.orgSlug}/cards/${card.slug}`"
          />
          <UButton
            icon="i-lucide-trash"
            color="primary"
            size="sm"
            class="bg-white/5 text-red-500 hover:bg-white/15 ml-auto active:hover:bg-white/20"
            @click="openDeleteConfirm(card)"
          />
        </div>
      </template>
    </UCard>
  </div>

  <UContainer v-else class="h-[calc(100vh-10rem)] min-h-96">
    <div class="flex flex-col items-center justify-center text-center h-full">
      <div
        class="bg-[#232323] w-11 aspect-square flex items-center justify-center rounded-sm"
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

  <UModal
    v-model:open="isPendingInfoOpen"
    title="Pending Approval"
    :ui="{
      content: 'bg-[#171717] border border-[#2a2a2a]',
      header: 'border-b border-[#2a2a2a]',
      title: 'text-white',
    }"
  >
    <template #body>
      <div class="space-y-4 text-sm text-[#bcbcbc] leading-relaxed">
        <p>
          <span class="text-white font-medium">{{
            selectedPendingCardName
          }}</span>
          is currently under payment verification.
        </p>
        <p>
          Your card is created and visible now, but some features may stay
          limited until the payment is approved by our team.
        </p>
        <p>
          If a payment is identified as invalid or fraudulent, we reserve the
          right to suspend or remove the card and revoke related access.
        </p>
        <p class="text-[#8b8b8b]">
          Need help? Please contact support for verification updates.
        </p>
      </div>
    </template>
  </UModal>

  <UModal
    v-model:open="isDeleteConfirmOpen"
    :close="false"
    :dismissible="!isDeleting"
    :ui="{
      content: 'bg-[#171717] max-w-md',
      title: 'text-white',
      body: 'pt-4',
      footer: 'justify-end gap-2',
    }"
    title="Delete Card?"
  >
    <template #body>
      <p class="text-sm text-[#bcbcbc] leading-relaxed">
        This action cannot be undone. The card
        <span class="text-white font-medium">
          "{{ selectedCardToDelete?.firstName }}
          {{ selectedCardToDelete?.lastName || '' }}"
        </span>
        and related subscription records will be removed.
      </p>
    </template>

    <template #footer>
      <UButton
        label="Cancel"
        color="neutral"
        variant="ghost"
        :disabled="isDeleting"
        @click="closeDeleteConfirm"
      />
      <UButton
        label="Delete"
        color="error"
        :loading="isDeleting"
        @click="onConfirmDelete"
      />
    </template>
  </UModal>
</template>
