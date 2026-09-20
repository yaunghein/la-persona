<script setup lang="ts">
const props = defineProps<{
  firstName?: string | null;
  lastName?: string | null;
  position?: string | null;
  phone?: string | null;
  email?: string | null;
  wallpaperUrl?: string | null;
}>();

const emit = defineEmits<{
  next: [];
  skip: [];
}>();

const toast = useToast();

const displayName = computed(() =>
  [props.firstName, props.lastName].filter(Boolean).join(' ').trim() || 'Your name'
);

async function onDownload() {
  if (!props.wallpaperUrl) {
    toast.add({
      title: 'Wallpaper not ready',
      description: 'You can download it later from your community card page.',
      color: 'neutral',
    });
    emit('skip');
    return;
  }

  window.open(props.wallpaperUrl, '_blank', 'noopener,noreferrer');
  emit('next');
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col">
    <div
      class="hide-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto p-6 sm:p-8 lg:px-16 lg:py-10"
    >
      <div
        class="mx-auto flex min-h-0 w-full max-w-120 flex-1 flex-col gap-8 sm:max-w-140"
      >
        <div class="flex flex-col gap-6">
          <h1
            class="text-[1.75rem] font-medium leading-tight tracking-[0.175rem] uppercase text-white"
          >
            Keep your card ready
          </h1>
          <p class="text-sm leading-normal text-[#8b8b8b]">
            Set the lock screen wallpaper on your phone for faster check-in at
            the event and to share your contact with other members faster.
          </p>
          <p class="text-sm leading-normal text-[#8b8b8b]">
            You can always download this wallpaper later from your community
            card page.
          </p>
        </div>

        <div class="flex flex-1 items-center justify-center py-8">
          <div
            class="flex w-70 flex-col gap-6 rounded-lg border border-[#2a2a2a] bg-[#232323] p-5"
          >
            <div class="flex flex-col gap-1">
              <p class="text-base font-medium leading-5 text-white">
                {{ displayName }}
              </p>
              <p class="text-xs leading-5 text-[#8b8b8b]">
                {{ position || 'Member' }}
              </p>
            </div>
            <div class="flex flex-col gap-1 text-xs leading-5 text-[#8b8b8b]">
              <p>{{ phone || '—' }}</p>
              <p>{{ email || '—' }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <CommunityEventOnboardingFooter
      primary-label="Download Wallpaper"
      secondary-label="Skip"
      @primary="onDownload"
      @secondary="emit('skip')"
    />
  </div>
</template>
