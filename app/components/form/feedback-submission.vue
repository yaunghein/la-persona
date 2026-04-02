<script setup lang="ts">
import { useMutation } from '@tanstack/vue-query';
import type { FormErrorEvent, FormSubmitEvent } from '@nuxt/ui';
import type { FeedbackKind } from '~~/shared/types/feedback';
import {
  FEEDBACK_KIND_LABELS,
  feedbackSubmissionInsertSchema,
} from '~~/shared/types/feedback';

type FeedbackSubmissionFormState = {
  kind: FeedbackKind;
  message: string;
};

const props = withDefaults(
  defineProps<{
    kind?: FeedbackKind;
  }>(),
  {
    kind: 'feedback',
  }
);

const emit = defineEmits<{ close: []; submitted: [] }>();

const toast = useToast();
const success = ref(false);
const serverErrorMessage = ref<string | null>(null);

const state = reactive<FeedbackSubmissionFormState>({
  kind: props.kind,
  message: '',
});

const titleLabel = computed(() => FEEDBACK_KIND_LABELS[state.kind]);
const submitLabelByKind: Record<FeedbackKind, string> = {
  feedback: 'Submit Feedback',
  bug_report: 'Submit Bug Report',
  feature_request: 'Submit Feature Request',
};

const placeholderByKind: Record<FeedbackKind, string> = {
  feedback: 'Please describe your feedback.',
  bug_report:
    'Please describe the issue, expected behavior, and what actually happened.',
  feature_request:
    'Please describe the feature you need and how it would help your workflow.',
};

watch(
  () => props.kind,
  (kind) => {
    state.kind = kind;
    state.message = '';
    success.value = false;
    serverErrorMessage.value = null;
  }
);

const { mutate: submitFeedback, isPending: isSubmitting } = useMutation({
  mutationFn: async (payload: FeedbackSubmissionFormState) => {
    return await $fetch('/api/feedback', {
      method: 'POST',
      body: payload,
    });
  },
  onSuccess: () => {
    success.value = true;
    serverErrorMessage.value = null;
    state.message = '';

    toast.add({
      title: 'Submission Received',
      description: 'Thank you. Your submission has been saved successfully.',
      color: 'success',
    });

    emit('submitted');
  },
  onError: (err: any) => {
    const fallbackMessage =
      'Please try again in a moment. If the issue continues, contact support and we will help you right away.';
    serverErrorMessage.value =
      err?.data?.statusMessage || err?.message || fallbackMessage;

    toast.add({
      title: 'Submission Failed',
      description: serverErrorMessage.value || undefined,
      color: 'error',
    });
  },
});

function onSubmit(event: FormSubmitEvent<FeedbackSubmissionFormState>) {
  serverErrorMessage.value = null;
  submitFeedback(event.data);
}

function onFormError(event: FormErrorEvent) {
  const firstErrorId = event.errors[0]?.id;
  if (firstErrorId) {
    const element = document.getElementById(firstErrorId);
    element?.focus();
    element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  toast.add({
    title: 'Please check your form',
    description: 'Fix the highlighted fields and try again.',
    color: 'error',
  });
}

function clearServerError() {
  serverErrorMessage.value = null;
}
</script>

<template>
  <div v-if="success" class="h-full flex items-center justify-center">
    <div
      class="text-center flex flex-col items-center justify-center max-w-60 mx-auto"
    >
      <Icon name="i-material-symbols:verified" class="text-[#8BF667] size-24" />
      <div
        class="text-[#8BF667] uppercase text-xl font-semibold leading-none tracking-[2px] mt-8 mb-4"
      >
        Submission Received
      </div>
      <div class="text-sm mb-5 leading-normal">
        Your submission has been saved.
      </div>
      <div class="text-sm text-muted leading-normal mb-8">
        Thank you for helping us improve La Persona.
      </div>
      <UButton
        label="Back to Dashboard"
        class="rounded-full font-semibold px-8 cursor-pointer"
        size="xl"
        @click="emit('close')"
      />
    </div>
  </div>

  <div
    v-else-if="serverErrorMessage"
    class="h-full flex items-center justify-center"
  >
    <div
      class="text-center flex flex-col items-center justify-center max-w-76 mx-auto gap-8"
    >
      <Icon
        name="i-material-symbols-warning-rounded"
        class="text-[#FF3113] size-24"
      />
      <div class="space-y-4">
        <div
          class="text-[#FF3113] uppercase text-xl font-semibold leading-none tracking-[2px]"
        >
          Something Went Wrong
        </div>
        <p class="text-sm leading-[21px] text-white">
          We could not submit your feedback just yet.
        </p>
        <p class="text-sm leading-[21px] text-[#8b8b8b] whitespace-pre-line">
          {{ serverErrorMessage }}
        </p>
      </div>
      <UButton
        size="xl"
        label="Back"
        class="rounded-full bg-white px-6 text-dark hover:bg-white/90 cursor-pointer"
        @click="clearServerError"
      />
    </div>
  </div>

  <UForm
    v-else
    :state="state"
    :schema="feedbackSubmissionInsertSchema"
    @submit="onSubmit"
    @error="onFormError"
    class="space-y-8 pb-6 h-full flex flex-col"
  >
    <!-- <div class="space-y-4">
      <h1 class="text-[20px] font-medium uppercase tracking-widest text-white">
        {{ titleLabel }}
      </h1>
      <p class="text-sm leading-[21px] text-[#8b8b8b]">
        Please fill in the form below.
      </p>
    </div> -->

    <UFormField
      label="Message"
      name="message"
      class="[&_label]:mb-1 [&_label]:text-sm [&_label]:font-medium [&_label]:text-white"
    >
      <UTextarea
        v-model="state.message"
        :rows="7"
        :placeholder="placeholderByKind[state.kind]"
        class="w-full"
        :ui="{
          base: 'rounded-[4px] border-[#2a2a2a] bg-[#232323] text-sm text-white placeholder:text-white/50',
        }"
      />
    </UFormField>

    <div class="flex justify-end pt-2">
      <UButton
        type="submit"
        :label="submitLabelByKind[state.kind]"
        :loading="isSubmitting"
        icon="i-lucide-check"
        class="h-10 rounded-full bg-white px-5 text-dark hover:bg-white/90 cursor-pointer"
      />
    </div>
  </UForm>
</template>
