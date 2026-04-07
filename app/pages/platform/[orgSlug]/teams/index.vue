<script setup lang="ts">
definePageMeta({
  layout: 'platform',
});

const teaserItems = [
  {
    icon: 'i-lucide-users',
    title: 'Invite Team Members',
    description:
      'Add teammates and keep everyone connected to the same organization workspace.',
  },
  {
    icon: 'i-lucide-bar-chart-3',
    title: 'Manage Teammates',
    description:
      'Owners can view teammate analytics, manage teammate info, and oversee team activity in one place.',
  },
  {
    icon: 'i-lucide-credit-card',
    title: 'Pay for Teammates',
    description:
      'Handle teammate billing from one workspace so payments stay simple and organized.',
  },
  {
    icon: 'i-lucide-contact-round',
    title: 'Teammate Contact Exchanges',
    description:
      'See contact exchanges made by teammates to track follow-ups and team impact.',
  },
];

const toast = useToast();

const onContactClick = () => {
  toast.add({
    title: 'Teams early access',
    description:
      'Please contact us and we will help you set up collaborative access.',
    color: 'neutral',
  });
};
</script>

<template>
  <div class="flex sm:min-h-[calc(100dvh-7rem)] items-center justify-center">
    <div
      class="w-full max-w-106 overflow-hidden rounded-[8px] border border-[#232323] bg-[#171717]"
    >
      <div
        class="flex items-center justify-between border-b-2 border-[#232323] p-4 sm:p-6"
      >
        <h2 class="text-sm font-medium uppercase tracking-widest text-white">
          What is teams?
        </h2>
        <UBadge
          label="Coming Soon"
          size="sm"
          color="neutral"
          variant="soft"
          class="uppercase tracking-wide"
        />
      </div>

      <div class="p-4 sm:p-6">
        <div class="space-y-4 sm:space-y-8">
          <div class="space-y-2">
            <h3
              class="text-md sm:text-xl font-medium uppercase tracking-widest text-white"
            >
              Collaborate across your organization
            </h3>
            <p class="text-sm leading-[21px] text-muted">
              Teams will help owners manage teammates, billing, and contact
              exchange visibility in one place.
            </p>
          </div>

          <div class="space-y-0">
            <div
              v-for="(item, index) in teaserItems"
              :key="item.title"
              class="px-2 sm:px-4 py-3"
              :class="
                index < teaserItems.length - 1
                  ? 'border-b border-[#2a2a2a]'
                  : ''
              "
            >
              <div class="flex items-start gap-2">
                <UIcon
                  :name="item.icon"
                  class="shrink-0 mt-0.5 size-5 text-white"
                />
                <div>
                  <p class="text-[14px] text-white">{{ item.title }}</p>
                  <p class="mt-2 text-[14px] text-muted">
                    {{ item.description }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- <div class="flex justify-end">
            <UButton size="xl"
              label="Contact Us For Early Access"
              color="neutral"
              class="cursor-pointer rounded-full bg-white px-6 text-dark hover:bg-white/90"
              @click="onContactClick"
            />
          </div> -->
        </div>
      </div>
    </div>
  </div>
</template>
