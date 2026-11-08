<script setup lang="ts">
import {
  LABEL_NAME_MAX_LENGTH,
  MAX_LABELS_PER_OWNER,
} from '~~/shared/constants/label';
import type { LabelSummary } from '~~/shared/contracts/label';

type ManagedLabel = LabelSummary & { carriesOver?: boolean };
type LabelChanges = { name?: string; color?: string; carriesOver?: boolean };

const props = defineProps<{
  labels: ManagedLabel[];
  loading?: boolean;
  /** Attendee labels can carry over to the person's next event. */
  showCarryOver?: boolean;
  /** What a label is attached to, singular (`contact`, `attendee`). */
  noun: string;
  createLabel: (
    input: Required<Omit<LabelChanges, 'carriesOver'>>
  ) => Promise<unknown>;
  updateLabel: (labelId: string, input: LabelChanges) => Promise<unknown>;
  deleteLabel: (labelId: string) => Promise<unknown>;
}>();

const open = defineModel<boolean>('open', { default: false });

const toast = useToast();

const isAtLimit = computed(() => props.labels.length >= MAX_LABELS_PER_OWNER);

function countLabel(count: number) {
  return `${count} ${props.noun}${count === 1 ? '' : 's'}`;
}

const newName = ref('');
const newColor = ref(nextLabelColor(props.labels));
const isCreating = ref(false);

watch(open, (isOpen) => {
  if (isOpen) newColor.value = nextLabelColor(props.labels);
});

async function addLabel() {
  const name = newName.value.trim();
  if (!name || isAtLimit.value) return;
  isCreating.value = true;
  try {
    await props.createLabel({ name, color: newColor.value });
    newName.value = '';
    newColor.value = nextLabelColor(props.labels);
  } catch (error) {
    toast.add({
      title: 'Could not create label',
      description: apiErrorMessage(error),
      color: 'error',
    });
  } finally {
    isCreating.value = false;
  }
}

async function saveLabel(label: ManagedLabel, input: LabelChanges) {
  try {
    await props.updateLabel(label.id, input);
  } catch (error) {
    toast.add({
      title: 'Could not update label',
      description: apiErrorMessage(error),
      color: 'error',
    });
  }
}

function renameLabel(label: ManagedLabel, event: Event) {
  const input = event.target as HTMLInputElement;
  const name = input.value.trim();
  if (!name) {
    input.value = label.name;
    return;
  }
  if (name !== label.name) saveLabel(label, { name });
}

const labelToDelete = ref<ManagedLabel | null>(null);
const isDeleteOpen = computed({
  get: () => labelToDelete.value !== null,
  set: (isOpen) => {
    if (!isOpen) labelToDelete.value = null;
  },
});
const isDeleting = ref(false);

function askToDelete(label: ManagedLabel) {
  labelToDelete.value = label;
}

async function confirmDelete() {
  const label = labelToDelete.value;
  if (!label) return;
  isDeleting.value = true;
  try {
    await props.deleteLabel(label.id);
    labelToDelete.value = null;
  } catch (error) {
    toast.add({
      title: 'Could not delete label',
      description: apiErrorMessage(error),
      color: 'error',
    });
  } finally {
    isDeleting.value = false;
  }
}

const inputBase =
  'h-10 rounded-[4px] border-line bg-raised text-sm text-ink placeholder:text-ink/50';
</script>

<template>
  <USlideover
    v-model:open="open"
    side="right"
    inset
    title="Labels"
    close-icon="i-material-symbols:close-small"
    :ui="{
      content: 'bg-surface',
      header: 'border-b-2 border-raised px-6 py-6',
      title: 'text-sm font-medium tracking-[1.4px] text-ink uppercase',
      body: 'px-6',
    }"
  >
    <template #title>
      Labels
      <span class="ml-2 tabular-nums text-subtle">
        {{ labels.length }}/{{ MAX_LABELS_PER_OWNER }}
      </span>
    </template>

    <template #body>
      <p v-if="showCarryOver" class="pb-4 text-sm leading-relaxed text-subtle">
        Carry over copies a label onto the person's next event in this
        community. You can still change it on that&nbsp;event.
      </p>

      <div v-if="loading" class="flex flex-col gap-2">
        <USkeleton
          v-for="index in 4"
          :key="index"
          class="h-12 w-full rounded-md"
        />
      </div>

      <p
        v-else-if="!labels.length"
        class="py-12 text-center text-sm text-subtle"
      >
        No labels yet. Create your first one&nbsp;below.
      </p>

      <ul v-else class="flex flex-col">
        <li
          v-for="label in labels"
          :key="label.id"
          class="flex items-center gap-2 border-b border-line py-2"
        >
          <UiLabelColorPicker
            :model-value="label.color"
            :label-name="label.name"
            @update:model-value="saveLabel(label, { color: $event })"
          />
          <UInput
            :model-value="label.name"
            variant="none"
            :maxlength="LABEL_NAME_MAX_LENGTH"
            :aria-label="`Name of ${label.name}`"
            class="min-w-0 flex-1"
            :ui="{
              base: 'h-9 rounded-[4px] px-2 text-sm font-medium text-ink hover:bg-raised focus:bg-raised',
            }"
            @change="renameLabel(label, $event)"
            @keydown.enter="($event.target as HTMLInputElement).blur()"
          />
          <span
            class="w-8 shrink-0 text-right text-xs tabular-nums text-subtle"
            :title="countLabel(label.usageCount)"
          >
            {{ label.usageCount }}
          </span>
          <UTooltip v-if="showCarryOver" text="Carry over to future events">
            <!-- The span takes the tooltip's data-state; on USwitch it would override checked/unchecked. -->
            <span class="flex">
              <USwitch
                :model-value="label.carriesOver"
                size="sm"
                :aria-label="`Carry ${label.name} over to future events`"
                @update:model-value="saveLabel(label, { carriesOver: $event })"
              />
            </span>
          </UTooltip>
          <UTooltip :text="`Delete ${label.name}`">
            <UButton
              icon="i-lucide-trash-2"
              color="neutral"
              variant="ghost"
              class="text-muted"
              :aria-label="`Delete ${label.name}`"
              @click="askToDelete(label)"
            />
          </UTooltip>
        </li>
      </ul>
    </template>

    <template #footer>
      <form class="flex w-full flex-col gap-2" @submit.prevent="addLabel">
        <div class="flex items-center gap-2">
          <UiLabelColorPicker v-model="newColor" :label-name="newName" />
          <UInput
            v-model="newName"
            placeholder="New label"
            :maxlength="LABEL_NAME_MAX_LENGTH"
            :disabled="isAtLimit"
            class="min-w-0 flex-1"
            :ui="{ base: inputBase }"
          />
          <UButton
            type="submit"
            label="Add"
            leading-icon="i-lucide-plus"
            color="neutral"
            :loading="isCreating"
            :disabled="isAtLimit || !newName.trim()"
            class="h-10 cursor-pointer rounded-full bg-ink pr-5 pl-4 text-sm font-medium text-ink-inverse hover:bg-ink/90"
          />
        </div>
        <p v-if="isAtLimit" class="text-xs text-subtle">
          Limit of {{ MAX_LABELS_PER_OWNER }} labels reached. Delete one to add
          a new&nbsp;label.
        </p>
      </form>
    </template>
  </USlideover>

  <UiConfirmDeleteModal
    v-model:open="isDeleteOpen"
    title="Delete Label?"
    :pending="isDeleting"
    @confirm="confirmDelete"
  >
    <span class="font-medium text-ink">"{{ labelToDelete?.name }}"</span>
    <template v-if="labelToDelete?.usageCount">
      will be removed from
      {{ countLabel(labelToDelete.usageCount) }}. This can't be&nbsp;undone.
    </template>
    <template v-else> will be deleted. This can't be&nbsp;undone. </template>
  </UiConfirmDeleteModal>
</template>
