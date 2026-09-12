<script setup lang="ts">
defineProps<{
  organizerName: string;
}>();

const emit = defineEmits<{
  next: [];
  cancel: [];
}>();

const benefits = [
  {
    icon: 'i-lucide-pencil',
    iconClass: 'size-5',
    lead: 'Quickly register and check-in',
    rest: (name: string) => ` for ${name} Events`,
  },
  {
    icon: 'i-lucide-arrow-left-right',
    iconClass: 'size-[1.125rem]',
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
      <div class="mx-auto flex w-full max-w-120 flex-col gap-6 sm:max-w-140">
        <h1
          class="text-[1.75rem] font-medium leading-tight tracking-[0.175rem] uppercase text-white"
        >
          Mingalarbar
        </h1>

        <div class="flex flex-col gap-3 text-sm leading-normal text-[#8b8b8b]">
          <p>
            Welcome to <span class="text-white">{{ organizerName }}</span>.
          </p>
          <p>
            You don't have a La Persona Account yet. Create your free La Persona
            account to register for the event and receive your Community Persona
            Card.
          </p>
        </div>

        <div class="flex flex-col gap-3">
          <p class="text-sm leading-normal text-[#8b8b8b]">
            With the community persona card, you can;
          </p>
          <div class="flex flex-col divide-y divide-[#2a2a2a]">
            <div
              v-for="item in benefits"
              :key="item.lead"
              class="flex items-start gap-2 px-4 py-6"
            >
              <UIcon
                :name="item.icon"
                class="mt-0.5 shrink-0 text-white"
                :class="item.iconClass"
              />
              <p class="text-sm leading-normal text-[#8b8b8b]">
                <span class="text-white">{{ item.lead }}</span
                >{{ item.rest(organizerName) }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <CommunityEventOnboardingFooter
      primary-label="Create Account"
      secondary-label="Cancel"
      @primary="emit('next')"
      @secondary="emit('cancel')"
    />
  </div>
</template>
