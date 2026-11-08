<script setup lang="ts">
import { MAX_LABELS_PER_OWNER } from '~~/shared/constants/label';
import type { Label } from '~~/shared/contracts/label';

const props = defineProps<{
  labels: Label[];
  placeholder: string;
  /** Typing a new name offers `Create "…"`. */
  creatable?: boolean;
  /** Shows a "Manage labels" link in the dropdown footer. */
  manageable?: boolean;
  loading?: boolean;
  ui?: Record<string, string>;
}>();

const emit = defineEmits<{ create: [name: string]; manage: [] }>();

const selectedIds = defineModel<string[]>({ required: true });
const open = ref(false);

const isAtLimit = computed(() => props.labels.length >= MAX_LABELS_PER_OWNER);

function manage() {
  open.value = false;
  emit('manage');
}
</script>

<template>
  <USelectMenu
    v-model="selectedIds"
    v-model:open="open"
    multiple
    :items="labels"
    value-key="id"
    label-key="name"
    icon="i-lucide-tag"
    :placeholder="placeholder"
    :loading="loading"
    :create-item="creatable && !isAtLimit"
    :search-input="{
      placeholder: creatable ? 'Find or create a label' : 'Find a label',
    }"
    :ui="ui"
    @create="emit('create', $event)"
  >
    <template #item-leading="{ item }">
      <span
        class="size-2.5 shrink-0 self-center rounded-full ring-1 ring-inset ring-ink/15"
        :style="{ backgroundColor: item.color }"
      />
    </template>

    <template #empty>
      <span class="text-sm text-subtle">
        {{ creatable ? 'Type a name to create a label.' : 'No labels yet.' }}
      </span>
    </template>

    <template v-if="creatable || manageable" #content-bottom>
      <div
        class="flex items-center justify-between gap-3 border-t border-line px-3 py-2 text-xs"
      >
        <button
          v-if="manageable"
          type="button"
          class="cursor-pointer font-medium text-ink hover:underline"
          @click="manage"
        >
          Manage labels
        </button>
        <span v-else-if="isAtLimit" class="text-subtle">
          Limit of {{ MAX_LABELS_PER_OWNER }} labels&nbsp;reached
        </span>
        <span class="ml-auto tabular-nums text-subtle">
          {{ labels.length }}/{{ MAX_LABELS_PER_OWNER }}
        </span>
      </div>
    </template>
  </USelectMenu>
</template>
