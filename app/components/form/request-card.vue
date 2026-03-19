<script setup lang="ts">
import imageCompression from 'browser-image-compression';
import { useMutation } from '@tanstack/vue-query';
import type { FormError, FormErrorEvent, FormSubmitEvent } from '@nuxt/ui';
import { derivePlanCodeFromSource } from '~~/shared/utils/subscription';
import {
  CARD_LINK_SELECT_ITEMS,
  createEmptyCardLink,
} from '~~/shared/constants/card-link-options';
import {
  createLinkTypeItemsWithCustom,
  getCustomSocialLabelMissingIndexes,
  resolveSocialLinksForSubmission,
  type SocialFormLink,
} from '~~/shared/utils/social-links';

type RequestCardFormState = {
  type: 'new_design' | 'existing_design';
  name: string;
  position: string;
  company: string;
  phone: string;
  email: string;
  website: string;
  sourceCardId: string;
  socials: SocialFormLink[];
};

const emit = defineEmits<{ close: []; submitted: [] }>();

const toast = useToast();
const runtimeConfig = useRuntimeConfig();

const state = reactive<RequestCardFormState>({
  type: 'new_design' as 'new_design' | 'existing_design',
  name: '',
  position: '',
  company: '',
  phone: '',
  email: '',
  website: '',
  sourceCardId: '',
  socials: [{ ...createEmptyCardLink(), customLabel: '' }],
});
const receiptFile = ref<File | null>(null);
const receiptPreviewUrl = ref<string | null>(null);
const success = ref(false);

const { data: cards } = await useFetch<CardDTO[]>('/api/cards');
const { data: plans } = await useFetch<
  {
    code: string;
    name: string;
    priceMinor: number;
    currency: string;
    billingCycle: string;
    isActive: boolean;
  }[]
>('/api/subscriptions/plans');

const typeItems = [
  {
    value: 'new_design',
    label: 'New Design',
    description: 'A fresh, bespoke design crafted for this card.',
  },
  {
    value: 'existing_design',
    label: 'Use Existing Design',
    description: 'Same design as a previous card, with different information.',
  },
];

const designItems = computed(() =>
  (cards.value || []).map((designCard) => ({
    value: designCard.id,
    label: `${designCard.firstName} ${designCard.lastName || ''}`.trim(),
    description: 'Use this card back design',
    cardBackUrl: designCard.cardBackUrl,
    firstName: designCard.firstName,
  }))
);

const selectedSourceCard = computed(() =>
  (cards.value || []).find((card) => card.id === state.sourceCardId)
);

const derivedPlanCode = computed(() =>
  derivePlanCodeFromSource(selectedSourceCard.value?.subscription)
);

const derivedPlan = computed(() =>
  (plans.value || []).find((plan) => plan.code === derivedPlanCode.value)
);
const linkTypeItems = computed<string[][]>(() =>
  createLinkTypeItemsWithCustom(CARD_LINK_SELECT_ITEMS)
);

function formatCurrency(amountMinor: number, currency: string) {
  return `${currency} ${amountMinor.toLocaleString()}`;
}

function getS3Url(path?: string | null) {
  if (!path) return '';
  if (path.startsWith('http')) return path;

  const bucket = runtimeConfig.public.awsBucketName;
  const region = runtimeConfig.public.awsRegion;
  return `https://${bucket}.s3.${region}.amazonaws.com/${path}`;
}

const addLink = () => {
  state.socials.push({ ...createEmptyCardLink(), customLabel: '' });
};
const removeLink = (index: number) => {
  state.socials.splice(index, 1);
};

watch(
  () => state.type,
  (type) => {
    if (type === 'new_design') state.sourceCardId = '';
  }
);

watch(receiptFile, (file) => {
  if (receiptPreviewUrl.value) URL.revokeObjectURL(receiptPreviewUrl.value);
  receiptPreviewUrl.value = file ? URL.createObjectURL(file) : null;
});

const { mutate: insertCardRequest, isPending: isLoading } = useMutation({
  mutationFn: async (formData: RequestCardFormState) => {
    if (!receiptFile.value) {
      throw new Error('Please upload a payment receipt');
    }

    if (formData.type === 'existing_design' && !state.sourceCardId) {
      throw new Error('Please choose an existing design card');
    }

    const compressed = await imageCompression(receiptFile.value, {
      maxSizeMB: 0.8,
      maxWidthOrHeight: 1200,
    });

    const { uploadUrl, fileKey } = await $fetch('/api/s3/presigned', {
      method: 'POST',
      body: {
        fileType: compressed.type,
        fileName: receiptFile.value.name,
      },
    });

    await fetch(uploadUrl, {
      method: 'PUT',
      body: compressed,
      headers: { 'Content-Type': compressed.type },
    });

    const { type, sourceCardId, ...cardData } = formData;
    const socials = resolveSocialLinksForSubmission(state.socials).filter(
      (social) => social.label || social.value
    );
    return await $fetch('/api/cards/new-request', {
      method: 'POST',
      body: {
        type,
        cardData: {
          ...cardData,
          socials: socials.length > 0 ? socials : undefined,
          sourceCardId: type === 'existing_design' ? sourceCardId : undefined,
        },
        paymentReceiptUrl: fileKey,
      },
    });
  },
  onSuccess: () => {
    if (receiptPreviewUrl.value) URL.revokeObjectURL(receiptPreviewUrl.value);
    receiptPreviewUrl.value = null;
    receiptFile.value = null;
    success.value = true;

    toast.add({
      title: 'Request Submitted',
      description: 'Your new card request is now pending review.',
      color: 'success',
    });

    emit('submitted');
  },
  onError: (err: any) => {
    toast.add({
      title: 'Submission Failed',
      description:
        err.message || 'An error occurred while uploading. Please try again.',
      color: 'error',
    });
  },
});

function getIssueKey(path: PropertyKey[]) {
  if (path[0] === 'type') return 'type';
  if (path[0] !== 'cardData') return null;

  const [_, field, index, nestedField] = path;
  if (
    field === 'socials' &&
    typeof index === 'number' &&
    typeof nestedField === 'string'
  ) {
    return `socials.${index}.${nestedField}`;
  }

  if (typeof field === 'string') return field;
  return null;
}

function buildPayloadForValidation(formData: RequestCardFormState) {
  const socials = resolveSocialLinksForSubmission(formData.socials).filter(
    (social) => social.label || social.value
  );

  return {
    type: formData.type,
    paymentReceiptUrl: 'client-validation-placeholder',
    cardData: {
      name: formData.name.trim(),
      position: formData.position.trim(),
      company: formData.company.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim(),
      website: formData.website.trim(),
      sourceCardId:
        formData.type === 'existing_design'
          ? formData.sourceCardId.trim() || undefined
          : undefined,
      socials: socials.length > 0 ? socials : undefined,
    },
  };
}

function normalizeFormState(
  formData: Partial<RequestCardFormState>
): RequestCardFormState {
  return {
    type: formData.type || 'new_design',
    name: formData.name || '',
    position: formData.position || '',
    company: formData.company || '',
    phone: formData.phone || '',
    email: formData.email || '',
    website: formData.website || '',
    sourceCardId: formData.sourceCardId || '',
    socials: formData.socials || [],
  };
}

function validate(formData: Partial<RequestCardFormState>): FormError[] {
  const normalized = normalizeFormState(formData);
  const errors: FormError[] = [];

  const result = cardRequestInsertSchema.safeParse(
    buildPayloadForValidation(normalized)
  );

  if (!result.success) {
    result.error.issues.forEach((issue) => {
      const key = getIssueKey(issue.path);
      if (!key || errors.some((error) => error.name === key)) return;
      errors.push({ name: key, message: issue.message });
    });
  }

  if (
    normalized.type === 'existing_design' &&
    !normalized.sourceCardId.trim()
  ) {
    errors.push({
      name: 'sourceCardId',
      message: 'Please choose an existing design card',
    });
  }

  if (!receiptFile.value) {
    errors.push({
      name: 'receiptFile',
      message: 'Please upload a payment receipt',
    });
  }

  const missingCustomIndexes = getCustomSocialLabelMissingIndexes(
    state.socials
  );
  missingCustomIndexes.forEach((index) => {
    if (errors.some((error) => error.name === `socials.${index}.customLabel`)) {
      return;
    }
    errors.push({
      name: `socials.${index}.customLabel`,
      message: 'Custom label is required.',
    });
  });

  return errors;
}

function onSubmit(event: FormSubmitEvent<RequestCardFormState>) {
  insertCardRequest(event.data);
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
        Request Received
      </div>
      <div class="text-sm mb-5 leading-normal">
        Your request has been submitted.
      </div>
      <div class="text-sm text-muted leading-normal mb-8">
        We received your details and payment receipt. The request status is now
        pending and our team will review it soon.
      </div>
      <UButton
        label="Back to Dashboard"
        class="rounded-full font-semibold px-8 cursor-pointer"
        size="lg"
        @click="emit('close')"
      />
    </div>
  </div>
  <UForm
    v-else
    :state="state"
    :validate="validate"
    @submit="onSubmit"
    @error="onFormError"
    class="space-y-8 pb-6"
  >
    <div class="space-y-4">
      <h1 class="text-[20px] font-medium uppercase tracking-widest text-white">
        NEW CARD REQUEST FORM
      </h1>
      <p class="text-sm leading-[21px] text-[#8b8b8b]">
        Whether you're creating a new identity or reusing an existing design,
        we'll take care of the rest.
      </p>
    </div>

    <UFormField
      label="What would you like to create?"
      name="type"
      class="[&_label]:mb-3 [&_label]:text-sm [&_label]:font-medium [&_label]:text-white"
    >
      <URadioGroup
        v-model="state.type"
        value-key="value"
        :items="typeItems"
        color="neutral"
        variant="table"
        class="w-full [&_label]:mb-0!"
        :ui="{
          fieldset: 'space-y-0',
          item: 'border-[#2a2a2a] bg-[#171717] px-4 py-3 -mb-px last:mb-0 rounded-none first:rounded-t-[4px] last:rounded-b-[4px]',
          label: 'text-sm text-white',
          description: 'mt-2 text-sm text-[#8b8b8b]',
          container: 'items-start',
        }"
      />
    </UFormField>

    <UFormField
      v-if="state.type === 'existing_design'"
      label="Choose one of the design"
      name="sourceCardId"
      class="[&_label]:mb-3 [&_label]:text-sm [&_label]:font-medium [&_label]:text-white"
    >
      <URadioGroup
        v-model="state.sourceCardId"
        :items="designItems"
        value-key="value"
        color="neutral"
        variant="table"
        class="w-full [&_label]:mb-0!"
        :ui="{
          fieldset: 'space-y-0',
          item: 'border-[#2a2a2a] bg-[#171717] px-4 py-3 -mb-px last:mb-0 rounded-none first:rounded-t-[4px] last:rounded-b-[4px]',
          container: 'items-start gap-2',
          label: 'text-sm text-white',
          description: 'mt-2 text-sm text-[#8b8b8b]',
        }"
      >
        <template #description="{ item }">
          <div class="mt-2 space-y-2">
            <p class="text-sm text-[#8b8b8b]">Use this card back design</p>
            <img
              v-if="item.cardBackUrl"
              :src="getS3Url(item.cardBackUrl)"
              :alt="`${item.firstName} card back`"
              class="w-56 aspect-[1/0.57] rounded bg-[#1f1f1f]"
            />
            <div
              v-else
              class="flex h-[121px] w-[200px] items-center justify-center rounded-[4px] bg-[#2a2a2a] text-xs text-[#8b8b8b]"
            >
              No card back image
            </div>
          </div>
        </template>
      </URadioGroup>
    </UFormField>

    <div
      v-if="state.type === 'existing_design' && state.sourceCardId"
      class="rounded-[6px] border border-[#2a2a2a] bg-[#1f1f1f] p-4 space-y-2"
    >
      <div class="text-xs uppercase tracking-wide text-[#8b8b8b]">
        Calculated Subscription
      </div>
      <div class="text-sm text-white font-medium">
        {{ derivedPlan?.name || derivedPlanCode || 'Unknown Plan' }}
      </div>
      <div class="text-sm text-[#8b8b8b]">
        {{
          derivedPlan
            ? `${formatCurrency(derivedPlan.priceMinor, derivedPlan.currency)} / ${derivedPlan.billingCycle}`
            : 'Price unavailable'
        }}
      </div>
    </div>

    <p class="text-sm leading-[21px] text-white">
      Please provide the details you'd like to appear on this card.
    </p>

    <div class="space-y-6">
      <UFormField
        label="Full Name"
        name="name"
        class="w-full [&_label]:mb-3 [&_label]:text-sm [&_label]:font-medium [&_label]:text-white"
      >
        <UInput
          v-model="state.name"
          class="w-full"
          placeholder="John Doe"
          :ui="{
            base: 'h-[47px] rounded-[4px] border-[#2a2a2a] bg-[#232323] text-sm text-white placeholder:text-white/50',
          }"
        />
      </UFormField>

      <UFormField
        label="Professional Title / Role"
        name="position"
        class="w-full [&_label]:mb-3 [&_label]:text-sm [&_label]:font-medium [&_label]:text-white"
      >
        <UInput
          v-model="state.position"
          class="w-full"
          placeholder="Senior Designer"
          :ui="{
            base: 'h-[47px] rounded-[4px] border-[#2a2a2a] bg-[#232323] text-sm text-white placeholder:text-white/50',
          }"
        />
      </UFormField>

      <UFormField
        label="Company / Brand Name"
        name="company"
        class="w-full [&_label]:mb-3 [&_label]:text-sm [&_label]:font-medium [&_label]:text-white"
      >
        <UInput
          v-model="state.company"
          class="w-full"
          placeholder="Acme Inc."
          :ui="{
            base: 'h-[47px] rounded-[4px] border-[#2a2a2a] bg-[#232323] text-sm text-white placeholder:text-white/50',
          }"
        />
      </UFormField>

      <UFormField
        label="Phone Number"
        name="phone"
        class="w-full [&_label]:mb-3 [&_label]:text-sm [&_label]:font-medium [&_label]:text-white"
      >
        <UInput
          v-model="state.phone"
          class="w-full"
          placeholder="+1 (555) 123-4567"
          :ui="{
            base: 'h-[47px] rounded-[4px] border-[#2a2a2a] bg-[#232323] text-sm text-white placeholder:text-white/50',
          }"
        />
      </UFormField>

      <UFormField
        label="Email Address"
        name="email"
        class="w-full [&_label]:mb-3 [&_label]:text-sm [&_label]:font-medium [&_label]:text-white"
      >
        <UInput
          v-model="state.email"
          class="w-full"
          placeholder="john@example.com"
          :ui="{
            base: 'h-[47px] rounded-[4px] border-[#2a2a2a] bg-[#232323] text-sm text-white placeholder:text-white/50',
          }"
        />
      </UFormField>

      <UFormField
        label="Personal Website / Portfolio"
        name="website"
        class="w-full [&_label]:mb-3 [&_label]:text-sm [&_label]:font-medium [&_label]:text-white"
      >
        <UInput
          v-model="state.website"
          class="w-full"
          placeholder="https://johndoe.com"
          :ui="{
            base: 'h-[47px] rounded-[4px] border-[#2a2a2a] bg-[#232323] text-sm text-white placeholder:text-white/50',
          }"
        />
      </UFormField>
    </div>

    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-medium text-white">
          Social / Professional Links
        </h3>
        <UButton
          icon="i-lucide-plus"
          size="xs"
          variant="soft"
          label="Add Link"
          class="rounded-full bg-[#232323] text-white hover:bg-[#2a2a2a]"
          @click="addLink"
        />
      </div>

      <div
        v-for="(link, index) in state.socials"
        :key="index"
        class="flex gap-3 overflow-x-scroll hide-scrollbar"
      >
        <UFormField class="w-32 shrink-0" :name="`socials.${index}.label`">
          <USelectMenu
            v-model="link.label"
            :items="linkTypeItems"
            :search-input="false"
            class="w-full"
            :ui="{
              base: 'h-[47px] rounded-[4px] border-[#2a2a2a] bg-[#232323] text-sm text-white',
            }"
          />
        </UFormField>
        <UFormField
          v-if="link.label === 'Custom'"
          class="w-32 shrink-0"
          :name="`socials.${index}.customLabel`"
        >
          <UInput
            v-model="link.customLabel"
            placeholder="Custom Label"
            class="w-full"
            :ui="{
              base: 'h-[47px] rounded-[4px] border-[#2a2a2a] bg-[#232323] text-sm text-white placeholder:text-white/50',
            }"
          />
        </UFormField>
        <UFormField
          class="flex-1 min-w-52 shrink-0"
          :name="`socials.${index}.value`"
        >
          <UInput
            v-model="link.value"
            placeholder="https://..."
            class="w-full"
            :ui="{
              base: 'h-[47px] rounded-[4px] border-[#2a2a2a] bg-[#232323] text-sm text-white placeholder:text-white/50',
            }"
          />
        </UFormField>
        <UButton
          icon="i-lucide-x"
          variant="ghost"
          @click="removeLink(index)"
          class="max-h-11.75"
        />
      </div>
    </div>

    <UFormField
      label="Upload Payment Receipt"
      name="receiptFile"
      class="[&_label]:mb-3 [&_label]:text-sm [&_label]:font-medium [&_label]:text-white"
    >
      <UFileUpload
        v-model="receiptFile"
        accept="image/*"
        icon="i-lucide-upload"
        label="Drop your receipt here"
        description="PNG, JPG or WebP"
        class="w-full min-h-42"
        :ui="{
          root: '[&_img]:object-contain',
          base: 'rounded-[4px] border-[#2a2a2a] bg-[#232323]',
          label: 'text-sm text-white',
          description: 'text-xs text-[#8b8b8b]',
        }"
      />
    </UFormField>

    <div class="flex items-center justify-end pt-2">
      <UButton
        type="submit"
        label="Send Request"
        :loading="isLoading"
        icon="i-material-symbols:keyboard-double-arrow-right"
        class="rounded-full bg-white px-6 text-dark hover:bg-white/90"
      />
    </div>
  </UForm>
</template>
