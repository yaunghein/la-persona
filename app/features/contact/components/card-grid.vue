<script setup lang="ts">
import type { ContactSummary } from '~~/shared/contracts/contact';
import {
  contactOriginLabel,
  contactOriginPath,
} from '~~/shared/utils/contact-origin';

defineProps<{
  contacts: ContactSummary[];
  showOrigin: boolean;
}>();

defineEmits<{
  save: [contact: ContactSummary];
  delete: [contact: ContactSummary];
}>();
</script>

<template>
  <div class="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
    <UCard
      v-for="contact in contacts"
      :key="contact.id"
      :ui="{
        root: 'rounded-[8px] bg-[#171717] border border-transparent',
        body: 'p-5 sm:p-4',
        footer: 'border-t border-[#232323] p-5 sm:p-4',
      }"
    >
      <div class="space-y-2">
        <p
          class="flex items-center gap-1 text-xl font-medium leading-none text-white sm:text-[20px]"
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

      <div
        class="mt-12 space-y-4 text-md leading-none text-muted sm:mt-10 sm:space-y-2 sm:text-sm"
      >
        <p>{{ contact.phone || 'N/A' }}</p>
        <p>{{ contact.email || 'N/A' }}</p>
        <p>{{ contact.company || 'N/A' }}</p>
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
              class="mt-2 h-auto p-0 text-md leading-none text-white underline-offset-2 sm:mt-1 sm:text-sm"
            >
              {{ contactOriginLabel(contact) }}
            </UButton>
            <p v-else class="mt-2 text-md leading-none text-white sm:mt-1 sm:text-sm">
              {{ contactOriginLabel(contact) }}
            </p>
          </div>

          <ContactActionsMenu
            :contact="contact"
            @save="$emit('save', $event)"
            @delete="$emit('delete', $event)"
          />
        </div>
      </template>
    </UCard>
  </div>
</template>
