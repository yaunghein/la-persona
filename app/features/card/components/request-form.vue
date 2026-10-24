<script setup lang="ts">
import type { FormError, FormErrorEvent, FormSubmitEvent } from '@nuxt/ui';
import { useSortable } from '@vueuse/integrations/useSortable';
import { derivePlanCodeFromSource } from '~~/shared/utils/subscription';
import { RequestedCardDetails } from '~~/shared/contracts/card';
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
import type { PrefilledContactLinks } from '~/features/card/composables/use-contact-link-prefill';

type RequestCardFormState = {
  type: 'new_design' | 'existing_design';
  name: string;
  position: string;
  company: string;
  phone: string;
  phoneCountryCode: string;
  email: string;
  website: string;
  sourceCardId: string;
  socials: SocialFormLink[];
  prefilledLinks: PrefilledContactLinks;
};

const props = defineProps<{ organizationSlug: string }>();
const emit = defineEmits<{ close: []; submitted: [] }>();

const organizationSlug = toRef(props, 'organizationSlug');
const toast = useToast();
const {
  normalizeUrlWithHttps,
  normalizeLinkValuesWithHttps,
  isValidPublicWebUrl,
  isValidCardLinkValue,
} = useUrlNormalization();

const { state, reset: resetForm } = useFormDraft<RequestCardFormState>(
  () => `org:${organizationSlug.value}:request-card`,
  () => ({
    type: 'new_design',
    name: '',
    position: '',
    company: '',
    phone: '',
    phoneCountryCode: 'MM',
    email: '',
    website: '',
    sourceCardId: '',
    socials: [],
    prefilledLinks: {},
  })
);
const { prefill: prefillContactLink } = useContactLinkPrefill(state);
const socialsListEl = ref<HTMLElement | null>(null);
const isSocialSlideoverOpen = ref(false);
const socialEditorMode = ref<'create' | 'edit'>('create');
const editingSocialIndex = ref<number | null>(null);
const pendingDeleteSocialIndex = ref<number | null>(null);
const isDeleteSocialConfirmOpen = ref(false);
const socialDraft = reactive<SocialFormLink>({
  ...createEmptyCardLink(),
  customLabel: '',
});
const socialsSortable = computed({
  get: () => state.socials,
  set: (value) => {
    state.socials = value;
  },
});
const receiptFile = ref<File | null>(null);
const receiptPreviewUrl = ref<string | null>(null);
const success = ref(false);

const { data: cards } = useOrganizationCardsQuery(organizationSlug);
const { data: plans } = useSubscriptionPlansQuery();
const { mutate: submitCardRequest, isPending: isLoading } =
  useSubmitCardRequestMutation(organizationSlug);

const typeItems = [
  {
    value: 'new_design',
    label: 'New Design',
    description: 'A custom-crafted design created specifically for this card.',
  },
  {
    value: 'existing_design',
    label: 'Existing Design',
    description:
      'Use the same design as an existing card with different contact information.',
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

const premiumPlanMeta = computed(() =>
  (plans.value || []).find((plan) => plan.code === 'premium' && plan.isActive)
);

const showPricingSummary = computed(() => {
  if (state.type === 'new_design') return Boolean(premiumPlanMeta.value);
  return Boolean(state.sourceCardId && derivedPlan.value);
});

/** Amount shown on KBZ Pay QR line (premium plan price for new; source plan price for existing). */
const requestPaymentTotalMinor = computed(() => {
  if (state.type === 'new_design' && premiumPlanMeta.value) {
    return premiumPlanMeta.value.priceMinor;
  }
  if (
    state.type === 'existing_design' &&
    state.sourceCardId &&
    derivedPlan.value
  ) {
    return derivedPlan.value.priceMinor;
  }
  return 0;
});

const requestPaymentCurrency = computed(() => {
  if (state.type === 'new_design' && premiumPlanMeta.value) {
    return premiumPlanMeta.value.currency.toUpperCase();
  }
  if (derivedPlan.value) return derivedPlan.value.currency;
  return 'MMK';
});

const linkTypeItems = computed<string[][]>(() =>
  createLinkTypeItemsWithCustom(CARD_LINK_SELECT_ITEMS)
);

function formatMinorAmount(amountMinor: number, currency: string) {
  return `${amountMinor.toLocaleString()} ${currency}`;
}

const requestQrAmountLabel = computed(() => {
  if (requestPaymentTotalMinor.value === 0) return 'Free of charge';
  return formatMinorAmount(
    requestPaymentTotalMinor.value,
    requestPaymentCurrency.value
  );
});

function billingDurationLabel(cycle?: string | null) {
  const c = (cycle || 'yearly').toLowerCase();
  if (c === 'yearly') return '1 Year';
  if (c === 'monthly') return '1 Month';
  return cycle ? cycle.replace(/_/g, ' ') : '1 Year';
}

function resetSocialDraft() {
  socialDraft.label = createEmptyCardLink().label;
  socialDraft.value = '';
  socialDraft.customLabel = '';
}

function openCreateLinkSlideover() {
  socialEditorMode.value = 'create';
  editingSocialIndex.value = null;
  resetSocialDraft();
  isSocialSlideoverOpen.value = true;
}

function openEditLinkSlideover(index: number) {
  const link = state.socials[index];
  if (!link) return;

  socialEditorMode.value = 'edit';
  editingSocialIndex.value = index;
  socialDraft.label = link.label || createEmptyCardLink().label;
  socialDraft.value = link.value || '';
  socialDraft.customLabel = link.customLabel || '';
  isSocialSlideoverOpen.value = true;
}

function closeSocialSlideover() {
  isSocialSlideoverOpen.value = false;
  editingSocialIndex.value = null;
  resetSocialDraft();
}

function resolveSocialLabel(link: SocialFormLink) {
  return link.label === 'Custom' ? link.customLabel || 'Custom' : link.label;
}

function validateSocialDraft(): FormError[] {
  const errors: FormError[] = [];

  if (!String(socialDraft.label || '').trim()) {
    errors.push({
      name: 'socialDraft.label',
      message: 'Please choose a link type.',
    });
  }

  if (
    socialDraft.label === 'Custom' &&
    !String(socialDraft.customLabel || '').trim()
  ) {
    errors.push({
      name: 'socialDraft.customLabel',
      message: 'Custom label is required.',
    });
  }

  if (!String(socialDraft.value || '').trim()) {
    errors.push({
      name: 'socialDraft.value',
      message: 'Please enter a link.',
    });
  } else if (!isValidCardLinkValue(socialDraft.value, socialDraft.label)) {
    errors.push({
      name: 'socialDraft.value',
      message: 'Please enter a valid link.',
    });
  }

  return errors;
}

function saveSocialDraft() {
  const errors = validateSocialDraft();

  if (errors.length > 0) {
    toast.add({
      title: 'Validation Error',
      description: errors[0]?.message || 'Please check the link details.',
      color: 'error',
    });
    return;
  }

  const nextLink: SocialFormLink = {
    label: socialDraft.label,
    value: String(socialDraft.value || '').trim(),
    customLabel: String(socialDraft.customLabel || '').trim(),
  };

  if (
    socialEditorMode.value === 'edit' &&
    editingSocialIndex.value !== null &&
    state.socials[editingSocialIndex.value]
  ) {
    state.socials.splice(editingSocialIndex.value, 1, nextLink);
  } else {
    state.socials.push(nextLink);
  }

  closeSocialSlideover();
}

function requestRemoveLink(index: number) {
  pendingDeleteSocialIndex.value = index;
  isDeleteSocialConfirmOpen.value = true;
}

function closeDeleteSocialConfirm() {
  pendingDeleteSocialIndex.value = null;
  isDeleteSocialConfirmOpen.value = false;
}

function confirmRemoveLink() {
  if (pendingDeleteSocialIndex.value === null) return;
  state.socials.splice(pendingDeleteSocialIndex.value, 1);
  closeDeleteSocialConfirm();
}

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

watch(
  () => socialDraft.label,
  (label) => {
    if (label !== 'Custom') {
      socialDraft.customLabel = '';
    }
  }
);

watch(socialsListEl, (el) => {
  if (!el) return;
  useSortable(socialsListEl, socialsSortable, {
    animation: 200,
    handle: '.drag-handle',
    draggable: '.sortable-link-row',
    ghostClass: 'sortable-ghost',
    chosenClass: 'sortable-chosen',
    dragClass: 'sortable-drag',
    fallbackOnBody: true,
    swapThreshold: 0.65,
    invertSwap: true,
  });
});

watch(isSocialSlideoverOpen, (open) => {
  if (!open) {
    editingSocialIndex.value = null;
    resetSocialDraft();
  }
});

function toRequestedCard(formData: RequestCardFormState) {
  const socials = normalizeLinkValuesWithHttps(
    resolveSocialLinksForSubmission(formData.socials)
  ).filter((social) => social.label || social.value);
  return {
    name: formData.name.trim(),
    position: formData.position.trim(),
    company: formData.company.trim(),
    phone: formData.phone.trim(),
    phoneCountryCode: formData.phoneCountryCode,
    email: formData.email.trim(),
    website: normalizeUrlWithHttps(formData.website),
    socials,
  };
}

const isUploadingReceipt = ref(false);

defineExpose({
  success,
  isSubmitting: computed(() => isLoading.value || isUploadingReceipt.value),
});

async function requestCard(formData: RequestCardFormState) {
  if (!receiptFile.value) return;
  isUploadingReceipt.value = true;
  let receiptUrl: string;
  try {
    receiptUrl = await uploadImage(
      receiptFile.value,
      { organizationSlug: organizationSlug.value },
      { maxSizeMB: 0.8, maxWidthOrHeight: 1200 }
    );
  } catch (error) {
    toast.add({
      title: 'Submission Failed',
      description: apiErrorMessage(error, 'Upload failed. Please try again.'),
      color: 'error',
    });
    return;
  } finally {
    isUploadingReceipt.value = false;
  }

  const card = RequestedCardDetails.parse(toRequestedCard(formData));
  submitCardRequest(
    formData.type === 'existing_design'
      ? {
          type: 'existing_design',
          sourceCardId: formData.sourceCardId,
          card,
          receiptUrl,
        }
      : { type: 'new_design', card, receiptUrl },
    {
      onSuccess: () => {
        if (receiptPreviewUrl.value)
          URL.revokeObjectURL(receiptPreviewUrl.value);
        receiptPreviewUrl.value = null;
        receiptFile.value = null;
        resetForm();
        success.value = true;
        toast.add({
          title: 'Request Submitted',
          description: 'Your new card request is now pending review.',
          color: 'success',
        });
        emit('submitted');
      },
      onError: (error) => {
        toast.add({
          title: 'Submission Failed',
          description: apiErrorMessage(error),
          color: 'error',
        });
      },
    }
  );
}

function getIssueKey(path: PropertyKey[]) {
  const [field, index, nestedField] = path;
  if (
    field === 'socials' &&
    typeof index === 'number' &&
    typeof nestedField === 'string'
  ) {
    return `socials.${index}.${nestedField}`;
  }
  return typeof field === 'string' ? field : null;
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
    phoneCountryCode: formData.phoneCountryCode || 'MM',
    email: formData.email || '',
    website: formData.website || '',
    sourceCardId: formData.sourceCardId || '',
    socials: formData.socials || [],
    prefilledLinks: formData.prefilledLinks || {},
  };
}

function validate(formData: Partial<RequestCardFormState>): FormError[] {
  const normalized = normalizeFormState(formData);
  const errors: FormError[] = [];

  const result = RequestedCardDetails.safeParse(toRequestedCard(normalized));

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
    normalized.socials
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

  const normalizedWebsite = normalizeUrlWithHttps(normalized.website);
  if (
    normalized.website.trim() &&
    !isValidPublicWebUrl(normalizedWebsite) &&
    !errors.some((error) => error.name === 'website')
  ) {
    errors.push({
      name: 'website',
      message: 'Please enter a valid URL.',
    });
  }

  const normalizedSocials = normalizeLinkValuesWithHttps(
    resolveSocialLinksForSubmission(normalized.socials)
  );
  normalizedSocials.forEach((social, index) => {
    if (!String(social.value || '').trim()) return;
    if (isValidCardLinkValue(social.value, social.label)) return;
    if (errors.some((error) => error.name === `socials.${index}.value`)) return;

    errors.push({
      name: `socials.${index}.value`,
      message: 'Please enter a valid link.',
    });
  });

  return errors;
}

function onSubmit(event: FormSubmitEvent<RequestCardFormState>) {
  requestCard(event.data);
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
      <Icon
        name="i-material-symbols:verified"
        class="text-success-ink size-24"
      />
      <div
        class="text-success-ink uppercase text-xl font-semibold leading-none tracking-[2px] mt-8 mb-4"
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
        class="h-10 text-sm rounded-full font-semibold px-8 cursor-pointer"
        @click="emit('close')"
      />
    </div>
  </div>
  <UForm
    v-else
    id="card-request-form"
    :state="state"
    :validate="validate"
    @submit="onSubmit"
    @error="onFormError"
    class="space-y-8"
  >
    <!-- <div class="space-y-4">
      <h1 class="text-[20px] font-medium uppercase tracking-widest text-ink">
        NEW CARD REQUEST FORM
      </h1>
      <p class="text-sm leading-[21px] text-subtle">
        Whether you're creating a new identity or reusing an existing design,
        we'll take care of the rest.
      </p>
    </div> -->

    <UFormField
      label="What would you like to create?"
      name="type"
      class="[&_label]:mb-1 [&_label]:text-sm [&_label]:font-medium [&_label]:text-ink"
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
          item: 'border-line bg-surface px-4 py-3 -mb-px last:mb-0 rounded-none first:rounded-t-[4px] last:rounded-b-[4px]',
          label: 'text-sm text-ink',
          description: 'mt-2 text-sm text-subtle',
          container: 'items-start',
        }"
      />
    </UFormField>

    <UFormField
      v-if="state.type === 'existing_design'"
      label="Choose one of the designs"
      name="sourceCardId"
      class="[&_label]:mb-1 [&_label]:text-sm [&_label]:font-medium [&_label]:text-ink"
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
          item: 'border-line bg-surface px-4 py-3 -mb-px last:mb-0 rounded-none first:rounded-t-[4px] last:rounded-b-[4px]',
          container: 'items-start gap-2',
          label: 'text-sm text-ink',
          description: 'mt-2 text-sm text-subtle',
        }"
      >
        <template #description="{ item }">
          <div class="mt-2 space-y-2">
            <!-- <p class="text-sm text-subtle">Use this card back design</p> -->
            <UiSkeletonImage
              v-if="item.cardBackUrl"
              :src="resolveObjectStorageUrl(item.cardBackUrl)"
              :alt="`${item.firstName} card back`"
              width="448"
              class="w-full aspect-[1/0.57] rounded bg-[#ececef] dark:bg-[#1f1f1f]"
            />
            <div
              v-else
              class="flex h-30.25 w-50 items-center justify-center rounded-[4px] bg-line text-xs text-subtle"
            >
              No card back image
            </div>
          </div>
        </template>
      </URadioGroup>
    </UFormField>

    <p class="text-sm leading-5.25 text-ink">
      Please provide the details you'd like to appear on this card.
    </p>

    <div class="space-y-6">
      <UFormField
        label="Full Name"
        name="name"
        class="w-full [&_label]:mb-1 [&_label]:text-sm [&_label]:font-medium [&_label]:text-ink"
      >
        <UInput
          v-model="state.name"
          class="w-full"
          placeholder="John Doe"
          :ui="{
            base: 'h-[47px] rounded-[4px] border-line bg-raised text-sm text-ink placeholder:text-ink/50',
          }"
        />
      </UFormField>

      <UFormField
        label="Professional Title / Role"
        name="position"
        class="w-full [&_label]:mb-1 [&_label]:text-sm [&_label]:font-medium [&_label]:text-ink"
      >
        <UInput
          v-model="state.position"
          class="w-full"
          placeholder="Senior Designer"
          :ui="{
            base: 'h-[47px] rounded-[4px] border-line bg-raised text-sm text-ink placeholder:text-ink/50',
          }"
        />
      </UFormField>

      <UFormField
        label="Company / Brand Name"
        name="company"
        class="w-full [&_label]:mb-1 [&_label]:text-sm [&_label]:font-medium [&_label]:text-ink"
      >
        <UInput
          v-model="state.company"
          class="w-full"
          placeholder="Acme Inc."
          :ui="{
            base: 'h-[47px] rounded-[4px] border-line bg-raised text-sm text-ink placeholder:text-ink/50',
          }"
        />
      </UFormField>

      <UFormField
        label="Phone Number"
        name="phone"
        class="w-full [&_label]:mb-1 [&_label]:text-sm [&_label]:font-medium [&_label]:text-ink"
        @focusout="prefillContactLink('Phone')"
      >
        <UiPhoneField
          v-model="state.phone"
          v-model:country-code="state.phoneCountryCode"
          name="phone"
          placeholder="Phone number"
          :ui="{
            base: 'h-[47px] rounded-[4px] border-line bg-raised text-sm text-ink placeholder:text-ink/50',
          }"
        />
      </UFormField>

      <UFormField
        label="Email Address"
        name="email"
        class="w-full [&_label]:mb-1 [&_label]:text-sm [&_label]:font-medium [&_label]:text-ink"
        @focusout="prefillContactLink('Gmail')"
      >
        <UInput
          v-model="state.email"
          class="w-full"
          placeholder="john@example.com"
          :ui="{
            base: 'h-[47px] rounded-[4px] border-line bg-raised text-sm text-ink placeholder:text-ink/50',
          }"
        />
      </UFormField>

      <UFormField
        label="Personal Website / Portfolio"
        name="website"
        class="w-full [&_label]:mb-1 [&_label]:text-sm [&_label]:font-medium [&_label]:text-ink"
        @focusout="prefillContactLink('Website')"
      >
        <UInput
          v-model="state.website"
          class="w-full"
          placeholder="https://johndoe.com"
          :ui="{
            base: 'h-[47px] rounded-[4px] border-line bg-raised text-sm text-ink placeholder:text-ink/50',
          }"
        />
      </UFormField>
    </div>

    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-medium text-ink">
          Social / Professional Links
        </h3>
        <UButton
          type="button"
          icon="i-lucide-plus"
          size="sm"
          variant="soft"
          label="Add Link"
          class="rounded-full bg-raised text-ink hover:bg-line"
          @click="openCreateLinkSlideover"
        />
      </div>

      <div ref="socialsListEl" class="relative flex flex-col gap-3">
        <div
          v-for="(link, index) in state.socials"
          :key="`${index}-${link.label}-${link.value}`"
          class="sortable-link-row relative flex items-center gap-3 rounded-[6px] border border-line bg-raised p-3"
        >
          <button
            type="button"
            class="drag-handle inline-flex h-10 w-9 cursor-grab items-center justify-center rounded-[4px] text-subtle hover:bg-surface active:cursor-grabbing"
            aria-label="Drag to reorder link"
          >
            <UIcon name="i-lucide-grip-vertical" class="size-5" />
          </button>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium text-ink">
              {{ resolveSocialLabel(link) || 'Untitled Link' }}
            </p>
            <p class="mt-1 truncate text-sm text-subtle">
              {{ link.value || 'No URL added yet' }}
            </p>
          </div>
          <div class="flex items-center gap-1">
            <UButton
              type="button"
              size="sm"
              icon="i-lucide-pen-square"
              color="neutral"
              variant="ghost"
              class="text-subtle hover:bg-surface hover:text-ink"
              @click="openEditLinkSlideover(index)"
            />
            <UButton
              type="button"
              size="sm"
              icon="i-lucide-trash-2"
              color="error"
              variant="ghost"
              class="hover:bg-error/10"
              @click="requestRemoveLink(index)"
            />
          </div>
        </div>
      </div>
    </div>

    <div v-if="showPricingSummary">
      <div role="region" aria-label="Pricing breakdown">
        <div class="rounded-[4px] border-b border-line px-4 py-3">
          <div class="flex items-center justify-between text-sm text-ink">
            <span>Membership Period</span>
            <span class="font-bold">
              {{
                state.type === 'new_design'
                  ? billingDurationLabel(premiumPlanMeta?.billingCycle)
                  : billingDurationLabel(derivedPlan?.billingCycle)
              }}
            </span>
          </div>
        </div>
        <div class="rounded-[4px] px-4 py-0 border-b border-line">
          <div class="flex items-center justify-between py-3 text-sm text-ink">
            <span>Hosting Fee</span>
            <span class="font-bold">
              {{
                state.type === 'new_design'
                  ? 'Free of charge'
                  : requestQrAmountLabel
              }}
            </span>
          </div>
        </div>
        <div
          v-if="state.type === 'new_design'"
          class="rounded-[4px] px-4 py-0 -mt-2 sm:mt-0"
        >
          <div class="flex items-center justify-between py-4 text-sm text-ink">
            <span>Custom Design Fee</span>
            <span class="font-bold">
              <template v-if="premiumPlanMeta">
                {{
                  premiumPlanMeta.priceMinor === 0
                    ? 'Free of charge'
                    : formatMinorAmount(
                        premiumPlanMeta.priceMinor,
                        premiumPlanMeta.currency.toUpperCase()
                      )
                }}
              </template>
            </span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showPricingSummary" class="space-y-8">
      <p class="text-sm leading-5.25 text-muted">
        Please scan the QR code below to complete your payment. Make sure that
        account name is <span class="font-bold text-ink">Yan Aung Hein</span>.
      </p>

      <div class="space-y-3">
        <p class="text-sm font-medium text-ink">KBZ Pay QR Code</p>
        <div class="rounded-[6px] border border-line bg-raised p-4 text-center">
          <p class="text-sm text-ink/50">Scan to Pay</p>
          <div class="mx-auto my-3 size-40 overflow-hidden bg-[#d9d9d9]">
            <UiSkeletonImage
              src="/images/kpay.jpg"
              alt="KBZ Pay QR Code"
              width="160"
              class="h-full w-full object-contain"
            />
          </div>
          <p class="text-sm font-bold text-ink">
            {{ requestQrAmountLabel }}
          </p>
        </div>
      </div>

      <UFormField
        label="Upload Payment Receipt"
        name="receiptFile"
        class="[&_label]:mb-1 [&_label]:text-sm [&_label]:font-medium [&_label]:text-ink"
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
            base: 'rounded-[4px] border-line bg-raised',
            label: 'text-sm text-ink',
            description: 'text-xs text-subtle',
          }"
        />
      </UFormField>
    </div>

    <CardNeedHelp />
  </UForm>

  <USlideover
    v-model:open="isSocialSlideoverOpen"
    side="right"
    inset
    :title="socialEditorMode === 'create' ? 'ADD LINK' : 'EDIT LINK'"
    :ui="{
      header: 'border-b-2 border-raised px-6 py-6',
      title: 'text-sm font-medium tracking-[1.4px] text-ink uppercase',
      content: 'bg-surface',
    }"
  >
    <template #body>
      <div class="space-y-6">
        <UFormField
          label="Link Type"
          name="socialDraft.label"
          class="[&_label]:mb-1 [&_label]:text-sm [&_label]:font-medium [&_label]:text-ink"
        >
          <USelectMenu
            v-model="socialDraft.label"
            :items="linkTypeItems"
            :search-input="false"
            class="w-full"
            placeholder="Select Link Type"
            :ui="{
              base: 'h-[47px] rounded-[4px] border-line bg-raised text-sm text-ink',
            }"
          />
        </UFormField>

        <UFormField
          v-if="socialDraft.label === 'Custom'"
          label="Custom Label"
          name="socialDraft.customLabel"
          class="[&_label]:mb-1 [&_label]:text-sm [&_label]:font-medium [&_label]:text-ink"
        >
          <UInput
            v-model="socialDraft.customLabel"
            placeholder="Custom Label"
            class="w-full"
            :ui="{
              base: 'h-[47px] rounded-[4px] border-line bg-raised text-sm text-ink placeholder:text-ink/50',
            }"
          />
        </UFormField>

        <UFormField
          label="Link"
          name="socialDraft.value"
          class="[&_label]:mb-1 [&_label]:text-sm [&_label]:font-medium [&_label]:text-ink"
        >
          <UInput
            v-model="socialDraft.value"
            placeholder="www.example.com"
            class="w-full"
            :ui="{
              base: 'h-[47px] rounded-[4px] border-line bg-raised text-sm text-ink placeholder:text-ink/50',
            }"
          />
        </UFormField>
      </div>
    </template>

    <template #footer>
      <UButton
        type="button"
        label="Cancel"
        color="neutral"
        variant="ghost"
        class="h-10 cursor-pointer rounded-full px-5 text-sm font-medium text-subtle hover:bg-raised hover:text-ink"
        @click="closeSocialSlideover"
      />
      <UButton
        type="button"
        :label="socialEditorMode === 'create' ? 'Add Link' : 'Save Link'"
        leading-icon="i-lucide-check"
        color="neutral"
        class="h-10 cursor-pointer rounded-full bg-ink pr-6 pl-5 text-sm font-medium text-ink-inverse hover:bg-ink/90"
        @click="saveSocialDraft"
      />
    </template>
  </USlideover>

  <UModal
    v-model:open="isDeleteSocialConfirmOpen"
    title="Delete Link?"
    :ui="{
      content: 'bg-surface max-w-md',
      title: 'text-ink',
      body: 'pt-4',
      footer: 'justify-end gap-2',
    }"
  >
    <template #body>
      <p class="text-sm leading-relaxed text-soft">
        This action cannot be undone. The selected social link will be removed.
      </p>
    </template>
    <template #footer>
      <UButton
        type="button"
        label="Cancel"
        color="neutral"
        variant="ghost"
        class="h-10 text-sm rounded-full px-5"
        @click="closeDeleteSocialConfirm"
      />
      <UButton
        type="button"
        label="Delete"
        color="error"
        class="h-10 text-sm rounded-full px-6 font-medium"
        @click="confirmRemoveLink"
      />
    </template>
  </UModal>
</template>

<style scoped>
:deep(.sortable-ghost) {
  opacity: 0.35;
}

:deep(.sortable-chosen) {
  background: transparent;
}

:deep(.sortable-drag) {
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.28);
}
</style>
