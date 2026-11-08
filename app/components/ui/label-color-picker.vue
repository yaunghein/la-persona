<script setup lang="ts">
import {
  LABEL_BRAND_COLORS,
  LABEL_EXTRA_COLORS,
} from '~~/shared/constants/label';

defineProps<{ labelName?: string }>();

const color = defineModel<string>({ required: true });

const HEX_COLOR = /^#[0-9a-f]{6}$/;

const open = ref(false);
// The model changes once, when the popover closes, so dragging the custom picker doesn't save on every frame.
const draft = ref(color.value);
const hexInput = ref(color.value);

const shownColor = computed(() => (open.value ? draft.value : color.value));

function toHex(value: string) {
  const trimmed = value.trim().toLowerCase();
  return trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
}

const isHexValid = computed(() => HEX_COLOR.test(toHex(hexInput.value)));

const applyHexInput = useDebounceFn(() => {
  if (isHexValid.value) draft.value = toHex(hexInput.value);
}, 300);

watch(hexInput, applyHexInput);

watch(open, (isOpen) => {
  if (isOpen) {
    draft.value = color.value;
    hexInput.value = color.value;
    return;
  }
  // A hex typed just before closing hasn't passed the debounce yet.
  if (isHexValid.value) draft.value = toHex(hexInput.value);
  if (draft.value !== color.value) color.value = draft.value;
});

function pickSwatch(value: string) {
  draft.value = value;
  hexInput.value = value;
  open.value = false;
}

function pickCustom(value: string | undefined) {
  if (!value) return;
  draft.value = value.toLowerCase();
  hexInput.value = draft.value;
}
</script>

<template>
  <UPopover
    v-model:open="open"
    :content="{ align: 'start', side: 'bottom', sideOffset: 8 }"
    :ui="{ content: 'border border-line bg-surface p-3' }"
  >
    <button
      type="button"
      class="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full hover:bg-raised"
      :aria-label="labelName ? `Color of ${labelName}` : 'Label color'"
    >
      <span
        class="size-3.5 rounded-full ring-1 ring-inset ring-ink/15"
        :style="{ backgroundColor: shownColor }"
      />
    </button>

    <template #content>
      <div class="flex flex-col gap-3">
        <div
          v-for="(palette, index) in [LABEL_BRAND_COLORS, LABEL_EXTRA_COLORS]"
          :key="index"
          class="grid grid-cols-10 gap-1.5"
          :class="index > 0 && 'border-t border-line pt-3'"
        >
          <button
            v-for="swatch in palette"
            :key="swatch"
            type="button"
            class="size-5 cursor-pointer rounded-full ring-1 ring-inset ring-ink/15 transition-transform hover:scale-110"
            :class="
              draft === swatch &&
              'ring-2 ring-offset-2 ring-offset-surface ring-ink'
            "
            :style="{ backgroundColor: swatch }"
            :aria-label="swatch"
            :aria-pressed="draft === swatch"
            @click="pickSwatch(swatch)"
          />
        </div>

        <div class="flex flex-col gap-2 border-t border-line pt-3">
          <p class="text-xs font-medium tracking-widest text-subtle uppercase">
            Custom
          </p>
          <div class="flex items-start gap-3">
            <UColorPicker
              :model-value="draft"
              size="sm"
              @update:model-value="pickCustom"
            />
            <div class="flex min-w-0 flex-1 flex-col gap-2">
              <span
                class="h-10 w-full rounded-md ring-1 ring-inset ring-ink/15"
                :style="{ backgroundColor: draft }"
              />
              <UInput
                v-model="hexInput"
                :color="isHexValid ? 'neutral' : 'error'"
                :highlight="!isHexValid"
                maxlength="7"
                aria-label="Hex color"
                placeholder="#c8a97e"
                spellcheck="false"
                :ui="{
                  base: 'h-9 rounded-[4px] border-line bg-raised font-mono text-sm text-ink',
                }"
              />
              <p v-if="!isHexValid" class="text-xs text-error">
                Use 6 hex digits.
              </p>
            </div>
          </div>
        </div>
      </div>
    </template>
  </UPopover>
</template>
