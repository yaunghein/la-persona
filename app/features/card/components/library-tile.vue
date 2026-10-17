<script setup lang="ts">
import type { CardDetail } from '~~/shared/contracts/card';
import {
  cardBadgeColor,
  cardBadgeLabel,
  cardEditorPath,
  cardHolderName,
  isCardPendingApproval,
  isCommunityCard,
} from '~/features/card/utils/card-badge';

const props = defineProps<{ card: CardDetail }>();
const emit = defineEmits<{
  delete: [card: CardDetail];
  showPendingInfo: [cardName: string];
}>();

const isCommunity = computed(() => isCommunityCard(props.card));
const isPending = computed(
  () => !isCommunity.value && isCardPendingApproval(props.card)
);
const hasSplinePreview = computed(() => !!props.card.splineUrl?.trim());

function onBadgeClick() {
  if (isPending.value) emit('showPendingInfo', cardHolderName(props.card));
}
</script>

<template>
  <UCard
    variant="outline"
    class="aspect-[1/0.9] w-full min-h-0 overflow-hidden bg-[#232323]"
    :ui="{
      root: 'flex h-full min-h-0 flex-col',
      body: 'min-h-0 flex-1 p-8 lg:p-10',
      footer: 'shrink-0 bg-[#171717]',
    }"
  >
    <div class="relative h-full min-h-0">
      <NuxtImg
        v-if="card.cardBackUrl"
        :src="resolveObjectStorageUrl(card.cardBackUrl)"
        :alt="`${cardHolderName(card)} card back`"
        width="640"
        class="absolute inset-0 m-auto size-full rounded-md object-contain"
      />
      <div
        v-else
        class="flex h-full w-full items-center justify-center rounded-md border border-[#2a2a2a] bg-[#1f1f1f]"
      >
        <UIcon
          name="i-material-symbols:cards-star-outline-rounded"
          class="size-8 text-[#8b8b8b]"
        />
      </div>
      <UBadge
        class="absolute -right-6.5 -top-6.5 max-w-[70%] font-semibold xs:-right-9.5 xs:-top-9.5 sm:-right-7.5 sm:-top-7.5"
        :class="[
          isCommunity ? 'normal-case' : 'uppercase',
          isPending
            ? 'cursor-pointer bg-amber-500/20 text-amber-300'
            : 'bg-[#171717] text-white',
        ]"
        :color="cardBadgeColor(card)"
        size="sm"
        @click="onBadgeClick"
      >
        <UiOverflowMarquee v-if="isCommunity" :text="cardBadgeLabel(card)" />
        <template v-else>{{ cardBadgeLabel(card) }}</template>
      </UBadge>
    </div>

    <template #footer>
      <div>{{ cardHolderName(card) }}</div>
      <div class="mt-4 flex items-center justify-start gap-2">
        <UButton
          v-if="hasSplinePreview"
          icon="i-lucide-scan-eye"
          color="primary"
          size="sm"
          class="bg-white/5 text-white hover:bg-white/15 active:hover:bg-white/20"
          target="_blank"
          :href="`/c/${card.slug}`"
          aria-label="Preview card"
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
            aria-label="Preview card"
          />
          <template #content>3D card is still cooking.</template>
        </UPopover>
        <UButton
          icon="i-lucide-square-pen"
          color="primary"
          size="sm"
          class="bg-white/5 text-white hover:bg-white/15 active:hover:bg-white/20"
          :href="cardEditorPath(card)"
          aria-label="Edit card"
        />
        <UButton
          v-if="!isCommunity"
          icon="i-lucide-trash"
          color="primary"
          size="sm"
          class="ml-auto bg-white/5 text-red-500 hover:bg-white/15 active:hover:bg-white/20"
          aria-label="Delete card"
          @click="emit('delete', card)"
        />
      </div>
    </template>
  </UCard>
</template>
