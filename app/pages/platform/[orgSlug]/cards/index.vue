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
const requestForm = useTemplateRef('requestForm');
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

function openGuide() {
  isGuideOpen.value = true;
}

function openRequestForm() {
  isRequestOpen.value = true;
}

function closeRequestForm() {
  isRequestOpen.value = false;
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
        <UButton
          size="lg"
          icon="material-symbols:info-outline"
          color="neutral"
          variant="ghost"
          class="flex items-center justify-center rounded-full p-0 text-muted hover:bg-[#232323] cursor-pointer"
          aria-label="Open cards information"
          @click="openGuide"
        />
      </div>

      <UButton
        label="Request New Card"
        leading-icon="i-lucide-plus"
        color="neutral"
        class="fixed bottom-6 left-1/2 z-10 -translate-x-1/2 shadow-lg sm:static sm:translate-x-0 sm:shadow-none h-10 text-sm cursor-pointer flex items-center justify-center rounded-full bg-white px-5 font-medium text-dark hover:bg-white/90 active:hover:bg-white/80"
        @click="openRequestForm"
      />
    </div>

    <USlideover
      v-model:open="isRequestOpen"
      side="right"
      inset
      title="REQUEST NEW CARD"
      :ui="{
        header: 'border-b-2 border-[#232323] px-6 py-6',
        title: 'text-sm font-medium tracking-[1.4px] text-white uppercase',
        body: 'px-6',
        content: 'bg-[#171717]',
      }"
    >
      <template #body>
        <CardRequestForm ref="requestForm" @close="closeRequestForm" />
      </template>

      <template v-if="!requestForm?.success" #footer>
        <UButton
          type="submit"
          form="card-request-form"
          label="Send Request"
          leading-icon="i-lucide-send"
          color="neutral"
          :loading="requestForm?.isSubmitting"
          class="h-10 cursor-pointer rounded-full bg-white pr-6 pl-5 text-sm font-medium text-dark hover:bg-white/90"
        />
      </template>
    </USlideover>

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
      />

      <BillingPremiumCardCta />
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
    <span class="font-medium text-white">
      "{{ cardToDelete ? cardHolderName(cardToDelete) : '' }}"
    </span>
    and related subscription records will be removed.
  </UiConfirmDeleteModal>
</template>
