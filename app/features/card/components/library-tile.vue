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

const toast = useToast();
const { mutateAsync: updateCard, isPending: isUpdatingVisibility } =
  useUpdateCardMutation(() => props.card.slug);
const isPublic = computed(() => props.card.visibility === 'public');
const visibilityHint = computed(() => {
  const label = cardBadgeLabel(props.card);
  return isPublic.value
    ? `Anyone can see your ${label}\u00a0card.`
    : `Only LA PERSONA users can see your ${label}\u00a0card.`;
});

async function changeVisibility(makePublic: boolean) {
  try {
    await updateCard({ visibility: makePublic ? 'public' : 'members' });
    const label = cardBadgeLabel(props.card);
    toast.add({
      title: makePublic ? 'Card is public' : 'Card is members only',
      description: makePublic
        ? `Anyone can see your ${label} card\u00a0now.`
        : `Only LA PERSONA users can see your ${label} card\u00a0now.`,
      color: 'success',
    });
  } catch (error) {
    toast.add({
      title: 'Could not change card visibility',
      description: apiErrorMessage(error),
      color: 'error',
    });
  }
}

function onBadgeClick() {
  if (isPending.value) emit('showPendingInfo', cardHolderName(props.card));
}
</script>

<template>
  <UCard
    variant="outline"
    class="aspect-[1/0.9] w-full min-h-0 cursor-pointer overflow-hidden bg-raised"
    :ui="{
      root: 'flex h-full min-h-0 flex-col',
      body: 'min-h-0 flex-1 p-8 lg:p-10',
      footer: 'shrink-0 bg-surface',
    }"
    @click="navigateTo(cardEditorPath(card))"
  >
    <div class="relative h-full min-h-0">
      <UiSkeletonImage
        v-if="card.cardBackUrl"
        :src="resolveObjectStorageUrl(card.cardBackUrl)"
        :alt="`${cardHolderName(card)} card back`"
        width="640"
        class="absolute inset-0 m-auto size-full rounded-md object-contain"
      />
      <div
        v-else
        class="flex h-full w-full items-center justify-center rounded-md border border-line bg-[#ececef] dark:bg-[#1f1f1f]"
      >
        <UIcon
          name="i-material-symbols:cards-star-outline-rounded"
          class="size-8 text-subtle"
        />
      </div>
      <UBadge
        class="absolute -right-6.5 -top-6.5 max-w-[70%] font-semibold xs:-right-9.5 xs:-top-9.5 sm:-right-7.5 sm:-top-7.5"
        :class="[
          isCommunity ? 'normal-case' : 'uppercase',
          isPending
            ? 'cursor-pointer bg-amber-500/20 text-amber-700 dark:text-amber-300'
            : 'bg-surface text-ink',
        ]"
        :color="cardBadgeColor(card)"
        size="sm"
        @click.stop="onBadgeClick"
      >
        <UiOverflowMarquee v-if="isCommunity" :text="cardBadgeLabel(card)" />
        <template v-else>{{ cardBadgeLabel(card) }}</template>
      </UBadge>
    </div>

    <template #footer>
      <div>{{ cardHolderName(card) }}</div>
      <div class="mt-4 flex items-center justify-start gap-2" @click.stop>
        <UButton
          v-if="hasSplinePreview"
          icon="i-lucide-scan-eye"
          color="primary"
          size="sm"
          class="bg-ink/5 text-ink hover:bg-ink/15 active:hover:bg-ink/20"
          target="_blank"
          :href="`/c/${card.slug}`"
          aria-label="Preview card"
        />
        <UPopover
          v-else
          :ui="{
            content:
              'max-w-[240px] rounded-md border border-line bg-surface p-3 text-sm text-ink leading-relaxed',
          }"
        >
          <UButton
            icon="i-lucide-scan-eye"
            color="primary"
            size="sm"
            class="bg-ink/5 text-ink hover:bg-ink/15 active:hover:bg-ink/20"
            aria-label="Preview card"
          />
          <template #content>3D card is still cooking.</template>
        </UPopover>
        <UButton
          icon="i-lucide-square-pen"
          color="primary"
          size="sm"
          class="bg-ink/5 text-ink hover:bg-ink/15 active:hover:bg-ink/20"
          :href="cardEditorPath(card)"
          aria-label="Edit card"
        />
        <div class="ml-auto flex items-center gap-3">
          <UButton
            v-if="!isCommunity"
            icon="i-lucide-trash-2"
            color="error"
            variant="soft"
            size="sm"
            aria-label="Delete card"
            @click="emit('delete', card)"
          />
          <!-- The span takes the tooltip's data-state; on USwitch it would override checked/unchecked. -->
          <UTooltip :text="visibilityHint">
            <span class="flex">
              <USwitch
                :model-value="isPublic"
                :disabled="isUpdatingVisibility"
                checked-icon="i-lucide-globe"
                unchecked-icon="i-lucide-lock"
                size="md"
                :ui="{
                  container: 'h-7',
                  base: 'h-7 w-12 px-0.5 data-[state=checked]:bg-ink/5 data-[state=unchecked]:bg-ink/5',
                  thumb:
                    'size-5 shadow-none data-[state=checked]:translate-x-5 data-[state=checked]:bg-ink data-[state=unchecked]:bg-ink/20',
                  icon: 'size-3 group-data-[state=checked]:text-dark group-data-[state=unchecked]:text-ink',
                }"
                :aria-label="visibilityHint"
                @update:model-value="changeVisibility"
              />
            </span>
          </UTooltip>
        </div>
      </div>
    </template>
  </UCard>
</template>
