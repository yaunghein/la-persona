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
    icon: 'i-lucide-shield-check',
    title: 'Assign Roles',
    description:
      'Set owner and member permissions so sensitive actions stay protected.',
  },
  {
    icon: 'i-lucide-folder-sync',
    title: 'Shared Access',
    description:
      'Manage cards, contacts, and billing together without switching accounts.',
  },
  {
    icon: 'i-lucide-bell-ring',
    title: 'Activity Visibility',
    description: 'Track key workspace updates as your organization grows.',
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
  <div class="flex min-h-[calc(100dvh-7rem)] items-center justify-center py-6">
    <div
      class="w-full max-w-164 overflow-hidden rounded-[8px] border border-[#232323] bg-[#171717]"
    >
      <div
        class="flex items-center justify-between border-b-2 border-[#232323] px-6 pb-[26px] pt-6"
      >
        <h2 class="text-sm font-medium uppercase tracking-widest text-white">
          What is teams?
        </h2>
        <UBadge
          label="Coming Soon"
          color="neutral"
          variant="soft"
          class="uppercase tracking-wide"
        />
      </div>

      <div class="p-6">
        <div class="space-y-8">
          <div class="space-y-4">
            <h3
              class="text-[20px] font-medium leading-[27px] uppercase tracking-widest text-white"
            >
              Collaborate across your organization
            </h3>
            <p class="text-sm leading-[21px] text-muted">
              Teams will help you manage members, permissions, and shared
              workflows in one place.
            </p>
          </div>

          <div class="space-y-0">
            <div
              v-for="(item, index) in teaserItems"
              :key="item.title"
              class="px-4 py-3"
              :class="
                index < teaserItems.length - 1
                  ? 'border-b border-[#2a2a2a]'
                  : ''
              "
            >
              <div class="flex items-start gap-2">
                <UIcon :name="item.icon" class="mt-0.5 size-5 text-white" />
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
            <UButton
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
