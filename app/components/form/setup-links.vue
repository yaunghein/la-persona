<script setup lang="ts">
import { useQuery, useMutation } from '@tanstack/vue-query';
import type { FormSubmitEvent } from '#ui/types';

const emit = defineEmits<{
  back: [];
  completed: [];
}>();

const route = useRoute();
const toast = useToast();
const slug = computed(() => route.params.slug as string);

const { data: card } = useQuery<SelectCard>({
  queryKey: ['cards', slug],
  queryFn: () => $fetch(`/api/cards/${slug.value}`),
});

// 1. Initialize with one empty link placeholder
const state = reactive({
  id: undefined as string | number | undefined,
  socials: [{ label: 'LinkedIn', value: '' }] as {
    label: string;
    value: string;
  }[],
});

watch(
  card,
  (val) => {
    if (!val) return;
    state.id = val.id;

    // 2. If card has socials, use them; otherwise, keep the default one
    if (val.socials && val.socials.length > 0) {
      state.socials = [...val.socials];
    } else {
      state.socials = [{ label: 'LinkedIn', value: '' }];
    }
  },
  { immediate: true }
);

const { mutate: submitRequest, isPending: isSubmitting } = useMutation({
  mutationFn: async (formData: typeof state) => {
    return await $fetch(`/api/cards`, {
      method: 'PATCH',
      body: {
        ...formData,
        id: state.id,
      },
    });
  },
  onSuccess: () => {
    toast.add({
      title: 'Update Requested',
      description: 'Your profile changes are now pending review.',
      color: 'success',
    });
    emit('completed');
    navigateTo(`/platform/${route.params.orgSlug}/cards`);
  },
  onError: (err: any) => {
    toast.add({
      title: 'Submission Failed',
      description: err.data?.statusMessage || 'Action failed',
      color: 'error',
    });
  },
});

function onSubmit() {
  // Simple validation: ensure the first link isn't empty
  if (state.socials.length === 0 || !state.socials?.[0]?.value) {
    toast.add({
      title: 'Input Required',
      description: 'Please add at least one link.',
      color: 'warning',
    });
    return;
  }
  submitRequest(state);
}

const addLink = () => {
  state.socials.push({ label: 'LinkedIn', value: '' });
};

const removeLink = (index: number) => {
  // 1. Ensure state.socials exists before checking length
  if (state.socials && state.socials.length > 1) {
    state.socials.splice(index, 1);
  } else if (state.socials?.[0]) {
    // 2. If it's the last one, clear it instead of deleting
    state.socials[0].value = '';
    toast.add({
      title: 'Notice',
      description: 'At least one link is required.',
      color: 'neutral',
    });
  }
};
</script>

<template>
  <div class="bg-elevated/25 rounded-md p-8">
    <h1 class="text-xl font-semibold tracking-[2px] uppercase leading-none">
      Finish setting up
    </h1>
    <p class="mt-4 mb-8 text-sm text-muted">
      Create your La Persona business card in two steps.
    </p>

    <UForm :state="state" @submit="onSubmit" class="space-y-6">
      <div class="space-y-4">
        <div class="flex justify-between items-center">
          <p class="text-sm font-medium text-gray-200">
            Social / Professional Links (Required)
          </p>
          <UButton
            icon="i-heroicons-plus-circle"
            size="sm"
            variant="soft"
            label="Add Link"
            @click="addLink"
          />
        </div>

        <div
          v-for="(link, index) in state.socials"
          :key="index"
          class="flex flex-col md:flex-row gap-3 items-start md:items-center"
        >
          <USelectMenu
            v-model="link.label"
            variant="soft"
            :options="[
              'LinkedIn',
              'Twitter',
              'Instagram',
              'GitHub',
              'Portfolio',
            ]"
            class="w-full md:w-40"
            size="xl"
          />
          <UInput
            v-model="link.value"
            placeholder="https://..."
            class="flex-1 w-full"
            size="xl"
            variant="soft"
          />
          <UButton
            icon="i-heroicons-trash"
            color="error"
            variant="ghost"
            :disabled="state.socials.length === 1 && !link.value"
            @click="removeLink(index)"
          />
        </div>
      </div>

      <div class="flex justify-end pt-6 gap-4 border-t border-white/10">
        <UButton
          type="button"
          class="rounded-full px-6 font-semibold"
          variant="ghost"
          @click="emit('back')"
        >
          Back
        </UButton>
        <UButton
          type="submit"
          class="rounded-full px-6 font-semibold"
          color="primary"
          :loading="isSubmitting"
        >
          Complete Setup
        </UButton>
      </div>
    </UForm>
  </div>
</template>
