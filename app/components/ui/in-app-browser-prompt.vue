<script setup lang="ts">
import type { InAppBrowserPreview } from '~/composables/use-in-app-browser';

defineProps<{
  preview: InAppBrowserPreview | null;
  canOpenExternally: boolean;
}>();

const emit = defineEmits<{
  open: [];
  dismiss: [];
}>();
</script>

<template>
  <div
    role="dialog"
    aria-modal="true"
    aria-labelledby="in-app-browser-title"
    class="fixed inset-0 z-100 overflow-y-auto bg-canvas text-ink"
  >
    <div
      class="mx-auto flex min-h-full w-full max-w-md flex-col justify-between gap-12 p-6 pt-13"
    >
      <div class="flex flex-col gap-4">
        <h1
          id="in-app-browser-title"
          class="text-xl leading-6.75 font-medium tracking-widest uppercase"
        >
          {{ preview?.heading ?? 'Open This Page in Your Browser' }}
        </h1>
        <div class="space-y-4.25 text-sm leading-5.25 text-subtle">
          <p>
            Opening this link in a social media browser may affect some features
            and require you to sign in again&nbsp;later.
          </p>
          <p>
            For the best experience, we kindly ask you to open this link in your
            default&nbsp;browser.
          </p>
        </div>
      </div>

      <div class="flex flex-col gap-8">
        <div
          v-if="preview?.cardBackUrl"
          class="rounded-2xl border border-ink bg-raised p-3"
        >
          <UiSkeletonImage
            :src="preview.cardBackUrl"
            alt=""
            width="720"
            class="h-auto w-full rounded"
          />
        </div>
        <div
          v-else-if="preview?.item"
          class="flex gap-4 rounded-2xl border border-ink bg-raised p-3"
        >
          <UiSkeletonImage
            v-if="preview.item.imageUrl"
            :src="preview.item.imageUrl"
            alt=""
            width="224"
            class="size-28 shrink-0 rounded object-cover"
          />
          <div
            v-else
            class="grid size-28 shrink-0 place-items-center rounded bg-line-strong"
          >
            <UIcon name="i-lucide-image" class="size-6 text-subtle" />
          </div>
          <div class="flex min-w-0 flex-1 flex-col justify-center gap-1">
            <p
              class="line-clamp-2 text-[0.9375rem] leading-normal font-medium tracking-widest wrap-break-word uppercase"
            >
              {{ preview.item.title }}
            </p>
            <p
              v-if="preview.item.description"
              class="line-clamp-3 text-sm leading-normal text-subtle"
            >
              {{ preview.item.description }}
            </p>
          </div>
        </div>

        <div class="flex flex-col items-center gap-6">
          <UButton
            v-if="canOpenExternally"
            label="Open in Browser"
            color="neutral"
            block
            class="h-13 rounded-full bg-ink text-sm font-bold text-ink-inverse"
            @click="emit('open')"
          />
          <button
            type="button"
            class="text-sm font-bold underline underline-offset-4"
            @click="emit('dismiss')"
          >
            Open Here Anyway
          </button>
        </div>
      </div>

      <div class="flex flex-col gap-3 text-sm leading-5.25">
        <p>
          {{ canOpenExternally ? 'Button not working?' : 'To open it there:' }}
        </p>
        <ol class="max-w-66 list-outside list-decimal pl-5 text-subtle">
          <li>Tap the three dots (⋯) in the top corner of your&nbsp;screen.</li>
          <li>Select Open in Browser or Open in&nbsp;Safari/Chrome.</li>
        </ol>
      </div>
    </div>
  </div>
</template>
