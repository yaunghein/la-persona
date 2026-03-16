<script setup lang="ts">
definePageMeta({
  layout: 'platform',
});

import { useQuery } from '@tanstack/vue-query';

useSeoMeta({ ...getSeoTitle('Cards - LA PERSONA') });

const route = useRoute();
const runtimeConfig = useRuntimeConfig();
const toast = useToast();
const isInfoOpen = ref(false);
const { data: session } = await authClient.useSession(useFetch);
const hasSeenInfoPopup = useLocalStorage(
  `lp-info-popup:cards:${session.value?.user.id || 'anonymous'}`,
  false
);

onMounted(() => {
  if (hasSeenInfoPopup.value) return;
  isInfoOpen.value = true;
  hasSeenInfoPopup.value = true;
});

const {
  data: cards,
  isLoading: pending,
  error,
  refetch: refresh,
} = useQuery<CardDTO[]>({
  queryKey: ['cards'],
  queryFn: async () => $fetch('/api/cards'),
});

const isSlideoverOpen = ref(false);
const isPendingInfoOpen = ref(false);
const selectedPendingCardName = ref('');
const isDeleteConfirmOpen = ref(false);
const isDeleting = ref(false);
const selectedCardToDelete = ref<CardDTO | null>(null);
const infoItems = [
  {
    icon: 'i-lucide-eye',
    title: 'View Your Cards',
    description: 'See all your cards and each plan status in one place.',
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
      'Open each card to preview, update information, and manage subscriptions.',
  },
];

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
  if (card.subscription?.status === 'pending_approval') return 'Pending';
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

function hasSplinePreview(card: CardDTO) {
  return Boolean(card.splineUrl?.trim());
}
</script>

<template>
  <div
    class="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
  >
    <div class="flex items-center gap-2">
      <h1 class="text-2xl font-medium uppercase tracking-widest leading-tight">
        Your Cards
      </h1>
      <UButton
        icon="material-symbols:info-outline"
        color="neutral"
        variant="ghost"
        class="size-6 flex items-center justify-center rounded-full p-0 text-muted hover:bg-[#232323] cursor-pointer"
        aria-label="Open cards information"
        @click="isInfoOpen = true"
      />
    </div>

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
        class="w-full sm:w-auto rounded-full bg-white px-6 font-medium text-dark hover:bg-white/90 cursor-pointer"
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

  <UModal
    v-model:open="isInfoOpen"
    :close="false"
    :ui="{
      content:
        'max-w-[480px] rounded-[8px] border border-[#232323] bg-[#171717]',
      body: 'p-0',
    }"
  >
    <template #content>
      <div class="overflow-hidden rounded-[8px] bg-[#171717]">
        <div
          class="flex items-center justify-between border-b-2 border-[#232323] px-6 pb-[26px] pt-6"
        >
          <h2 class="text-sm font-medium uppercase tracking-widest text-white">
            What is cards?
          </h2>
          <UButton
            icon="i-lucide-x"
            color="neutral"
            variant="ghost"
            class="size-6 flex items-center justify-center rounded-full p-0 text-white hover:bg-[#232323]"
            aria-label="Close info"
            @click="isInfoOpen = false"
          />
        </div>
        <div class="p-6">
          <div class="space-y-8">
            <div class="space-y-4">
              <h3
                class="text-[20px] font-medium leading-[27px] uppercase tracking-widest text-white"
              >
                Your cards, all in one place
              </h3>
              <p class="text-sm leading-[21px] text-[#8b8b8b]">
                Manage your card library and subscription actions quickly.
              </p>
            </div>

            <div class="space-y-0">
              <div
                v-for="(item, index) in infoItems"
                :key="item.title"
                class="px-4 py-3"
                :class="
                  index < infoItems.length - 1
                    ? 'border-b border-[#2a2a2a]'
                    : ''
                "
              >
                <div class="flex items-start gap-2">
                  <UIcon :name="item.icon" class="mt-0.5 size-5 text-white" />
                  <div>
                    <p class="text-[14px] text-white">{{ item.title }}</p>
                    <p class="mt-2 text-[14px] text-[#8b8b8b]">
                      {{ item.description }}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div class="flex justify-end">
              <UButton
                label="Understood"
                color="neutral"
                class="rounded-full bg-white px-6 text-dark hover:bg-white/90"
                @click="isInfoOpen = false"
              />
            </div>
          </div>
        </div>
      </div>
    </template>
  </UModal>

  <div
    v-if="cards"
    class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 sm:gap-6"
  >
    <UCard
      v-for="card in cards"
      :key="card.id"
      variant="outline"
      class="bg-white/2"
      :ui="{ body: 'p-5 sm:p-8 lg:p-10' }"
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
          class="absolute right-3 top-3 sm:-top-7.5 sm:-right-7.5 uppercase font-semibold"
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
            v-if="hasSplinePreview(card)"
            icon="i-lucide-scan-eye"
            color="primary"
            size="sm"
            class="bg-white/5 text-white hover:bg-white/15 active:hover:bg-white/20"
            target="_blank"
            :href="`/yaunghein/${card.slug}`"
          />
          <UPopover
            v-else
            :ui="{
              content:
                'max-w-[240px] rounded-md border border-[#2a2a2a] bg-[#171717] p-3 text-sm text-white leading-relaxed',
            }"
          >
            <UButton
              icon="i-lucide-scan-eye"
              color="primary"
              size="sm"
              class="bg-white/5 text-white hover:bg-white/15 active:hover:bg-white/20"
            />

            <template #content>3D card is still cooking.</template>
          </UPopover>
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

  <PendingApprovalInfo
    v-model:open="isPendingInfoOpen"
    :card-name="selectedPendingCardName"
  />

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
