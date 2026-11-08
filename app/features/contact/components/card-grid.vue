<script setup lang="ts">
import type { ContactSummary } from '~~/shared/contracts/contact';
import type { Label } from '~~/shared/contracts/label';
import {
  contactOriginLabel,
  contactOriginPath,
} from '~~/shared/utils/contact-origin';

const props = defineProps<{
  contacts: ContactSummary[];
  showOrigin: boolean;
  /** When set, cards are grouped under these labels. */
  groupLabels?: Label[];
}>();

defineEmits<{
  save: [contact: ContactSummary];
  edit: [contact: ContactSummary];
  delete: [contact: ContactSummary];
}>();

const collapsedGroupKeys = ref<string[]>([]);

const groups = computed<LabelGroup<ContactSummary>[]>(() =>
  props.groupLabels
    ? groupByLabel(props.contacts, props.groupLabels)
    : [{ key: 'all', label: null, items: props.contacts }]
);

function toggleGroup(key: string) {
  collapsedGroupKeys.value = collapsedGroupKeys.value.includes(key)
    ? collapsedGroupKeys.value.filter((item) => item !== key)
    : [...collapsedGroupKeys.value, key];
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <section v-for="group in groups" :key="group.key" class="flex flex-col">
      <div
        v-if="groupLabels"
        class="rounded-md bg-raised/40 px-4 py-2.5"
        :class="!collapsedGroupKeys.includes(group.key) && 'mb-4'"
      >
        <UiLabelGroupHeader
          :label="group.label"
          :count="group.items.length"
          :collapsed="collapsedGroupKeys.includes(group.key)"
          @toggle="toggleGroup(group.key)"
        />
      </div>
      <div
        v-if="!collapsedGroupKeys.includes(group.key)"
        class="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3"
      >
        <UCard
          v-for="contact in group.items"
          :key="contact.id"
          :ui="{
            root: 'rounded-[8px] bg-surface border border-transparent',
            body: 'p-5 sm:p-4',
            footer: 'border-t border-raised p-5 sm:p-4',
          }"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0 space-y-2">
              <p
                class="flex items-center gap-1 text-xl font-medium leading-none text-ink sm:text-[20px]"
              >
                {{ contact.name }}
                <ContactPersonaBadge
                  v-if="contact.personaCardSlug"
                  :card-slug="contact.personaCardSlug"
                />
              </p>
              <p class="text-md leading-none text-muted sm:text-sm">
                {{ contact.position || 'No role' }}
              </p>
            </div>
            <UiLabelDots :labels="contact.labels" class="-mt-1 shrink-0" />
          </div>

          <div
            class="mt-12 space-y-4 text-md leading-none text-muted sm:mt-10 sm:space-y-2 sm:text-sm"
          >
            <p>{{ contact.phone || 'N/A' }}</p>
            <p>{{ contact.email || 'N/A' }}</p>
            <p>{{ contact.company || 'N/A' }}</p>
          </div>

          <div
            v-if="contact.event || contact.note"
            class="mt-6 space-y-1 text-md leading-snug sm:text-sm"
          >
            <p v-if="contact.event" class="flex items-center gap-1.5 text-ink">
              <UIcon
                name="i-lucide-calendar"
                class="size-4 shrink-0 text-muted"
              />
              Met at {{ contact.event.title }}
            </p>
            <p v-if="contact.note" class="line-clamp-2 text-muted">
              {{ contact.note }}
            </p>
          </div>

          <template #footer>
            <div
              class="flex items-end"
              :class="showOrigin ? 'justify-between' : 'justify-end'"
            >
              <div v-if="showOrigin">
                <p class="text-[14px] text-muted sm:text-xs">Origin</p>
                <UButton
                  v-if="contactOriginPath(contact)"
                  size="xl"
                  :to="contactOriginPath(contact)"
                  color="neutral"
                  variant="link"
                  class="mt-2 h-auto p-0 text-md leading-none text-ink underline-offset-2 sm:mt-1 sm:text-sm"
                >
                  {{ contactOriginLabel(contact) }}
                </UButton>
                <p
                  v-else
                  class="mt-2 text-md leading-none text-ink sm:mt-1 sm:text-sm"
                >
                  {{ contactOriginLabel(contact) }}
                </p>
              </div>

              <ContactActionsMenu
                :contact="contact"
                @save="$emit('save', $event)"
                @edit="$emit('edit', $event)"
                @delete="$emit('delete', $event)"
              />
            </div>
          </template>
        </UCard>
      </div>
    </section>
  </div>
</template>
