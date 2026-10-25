<script setup lang="ts">
import { IconExchange } from '#components';

defineProps<{
  organizerName: string;
}>();

const emit = defineEmits<{
  next: [];
  cancel: [];
}>();

const benefits = [
  {
    icon: 'i-material-symbols:edit-outline-sharp',
    iconClass: 'size-5',
    lead: 'Quickly register and check-in',
    rest: (name: string) => ` for ${name} Events`,
  },
  {
    icon: IconExchange,
    iconClass: 'size-4.5',
    lead: 'Exchange contact details',
    rest: () => ' with everyone through your persona card,',
  },
  {
    icon: 'i-material-symbols:perm-contact-calendar-sharp',
    iconClass: 'size-5',
    lead: 'Easily revisit, manage',
    rest: () => ' your important contacts',
  },
];
</script>

<template>
  <div class="flex h-full min-h-0 flex-col">
    <div
      class="hide-scrollbar min-h-0 flex-1 overflow-y-auto p-6 sm:p-8 lg:px-16 lg:py-10"
    >
      <div class="mx-auto flex w-full max-w-120 flex-col gap-6 sm:max-w-112">
        <h1
          class="text-[1.75rem] font-medium leading-tight tracking-[0.175rem] uppercase text-ink"
        >
          Mingalarbar
        </h1>

        <div class="flex flex-col gap-3 text-sm leading-normal text-subtle">
          <p>
            Welcome to <span class="text-ink">{{ organizerName }}</span
            >.
          </p>
          <p>
            You don’t have a La Persona Account yet. Create your free La Persona
            account to register for the event and receive your
            Community&nbsp;Card.
          </p>
        </div>

        <div class="flex flex-col gap-3">
          <p class="text-sm leading-normal text-subtle">
            With the community card, you&nbsp;can;
          </p>
          <div class="flex flex-col divide-y divide-line">
            <div
              v-for="item in benefits"
              :key="item.lead"
              class="flex items-start gap-2 px-4 py-6"
            >
              <span
                class="mt-px flex size-5 shrink-0 items-center justify-center text-ink"
              >
                <UIcon
                  v-if="typeof item.icon === 'string'"
                  :name="item.icon"
                  :class="item.iconClass"
                />
                <component :is="item.icon" v-else :class="item.iconClass" />
              </span>
              <p class="text-sm leading-normal text-subtle">
                <span class="text-ink">{{ item.lead }}</span
                >{{ item.rest(organizerName) }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <EventOnboardingFooter
      primary-label="Create Account"
      secondary-label="Cancel"
      @primary="emit('next')"
      @secondary="emit('cancel')"
    />
  </div>
</template>
