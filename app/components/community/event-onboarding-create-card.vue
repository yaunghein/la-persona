<script setup lang="ts">
import type { FormError, FormSubmitEvent } from '@nuxt/ui';
import {
  CARD_LINK_SELECT_ITEMS,
  createEmptyCardLink,
} from '~~/shared/constants/card-link-options';
import { DEFAULT_PHONE_COUNTRY_CODE } from '~~/shared/utils/phone';
import {
  createLinkTypeItemsWithCustom,
  normalizeSocialLinksForForm,
  resolveSocialLinksForSubmission,
  type SocialFormLink,
} from '~~/shared/utils/social-links';

const props = defineProps<{
  firstName?: string | null;
  lastName?: string | null;
  position?: string | null;
  phone?: string | null;
  phoneCountryCode?: string | null;
  email?: string | null;
  socials?: { label: string; value: string }[] | null;
  submitting?: boolean;
}>();

const emit = defineEmits<{
  submit: [
    payload: {
      firstName: string;
      lastName: string;
      position: string;
      phone: string;
      phoneCountryCode: string;
      email: string;
      socials: { label: string; value: string }[];
    },
  ];
  cancel: [];
}>();

const toast = useToast();
const { normalizeLinkValuesWithHttps, isValidCardLinkValue } =
  useUrlNormalization();

const state = reactive({
  firstName: props.firstName || '',
  lastName: props.lastName || '',
  position: props.position || '',
  phone: props.phone || '',
  phoneCountryCode: props.phoneCountryCode || DEFAULT_PHONE_COUNTRY_CODE,
  email: props.email || '',
  socials: normalizeSocialLinksForForm(props.socials || []) as SocialFormLink[],
});

const isSocialSlideoverOpen = ref(false);
const isDeleteSocialConfirmOpen = ref(false);
const socialEditorMode = ref<'create' | 'edit'>('create');
const editingSocialIndex = ref<number | null>(null);
const pendingDeleteSocialIndex = ref<number | null>(null);
const socialDraft = reactive<SocialFormLink>({
  ...createEmptyCardLink(),
  customLabel: '',
});
const socialDraftErrors = reactive({
  label: '',
  customLabel: '',
  value: '',
});

const linkTypeItems = computed(() =>
  createLinkTypeItemsWithCustom(CARD_LINK_SELECT_ITEMS)
);

const formFieldClass =
  '[&_label]:mb-3 [&_label]:text-sm [&_label]:font-medium [&_label]:text-white';

const inputUi = {
  base: 'h-[47px] rounded-[4px] border-[#2a2a2a] bg-[#232323] text-sm text-white placeholder:text-white/50',
};

function resolveSocialLabel(link: SocialFormLink) {
  return link.label === 'Custom' ? link.customLabel || 'Custom' : link.label;
}

function validate(formData: Partial<typeof state>): FormError[] {
  const errors: FormError[] = [];

  if (!String(formData.firstName || '').trim()) {
    errors.push({ name: 'firstName', message: 'First name is required.' });
  }
  if (!String(formData.position || '').trim()) {
    errors.push({
      name: 'position',
      message: 'Professional title is required.',
    });
  }
  if (!String(formData.phone || '').trim()) {
    errors.push({ name: 'phone', message: 'Phone number is required.' });
  }

  const email = String(formData.email || '').trim();
  if (!email) {
    errors.push({ name: 'email', message: 'Email address is required.' });
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push({
      name: 'email',
      message: 'Enter a valid email address.',
    });
  }

  if (!state.socials.length) {
    errors.push({
      name: 'socials',
      message: 'Add at least one social link.',
    });
  } else {
    state.socials.forEach((link, index) => {
      const label = resolveSocialLabel(link) || 'Social link';
      if (link.label === 'Custom' && !String(link.customLabel || '').trim()) {
        errors.push({
          name: `socials.${index}.customLabel`,
          message: `${label} needs a custom label.`,
        });
      }
      if (!isValidCardLinkValue(link.value, link.label)) {
        errors.push({
          name: `socials.${index}.value`,
          message: `${label} needs a valid link.`,
        });
      }
    });
  }

  return errors;
}

function onFormError(event: { errors?: FormError[] }) {
  const messages = (event.errors || [])
    .map((error) => error.message)
    .filter((message): message is string => Boolean(message));
  toast.add({
    title: 'Missing details',
    description:
      [...new Set(messages)].join(' ') ||
      'Check the fields marked on the form.',
    color: 'error',
  });
}

function onValidSubmit(_event: FormSubmitEvent<typeof state>) {
  if (props.submitting) return;

  const socials = normalizeLinkValuesWithHttps(
    resolveSocialLinksForSubmission(state.socials)
  );

  emit('submit', {
    firstName: state.firstName.trim(),
    lastName: state.lastName.trim(),
    position: state.position.trim(),
    phone: state.phone.trim(),
    phoneCountryCode: state.phoneCountryCode,
    email: state.email.trim(),
    socials,
  });
}

function resetSocialDraft() {
  socialDraft.label = createEmptyCardLink().label;
  socialDraft.value = '';
  socialDraft.customLabel = '';
  socialDraftErrors.label = '';
  socialDraftErrors.customLabel = '';
  socialDraftErrors.value = '';
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
  socialDraftErrors.label = '';
  socialDraftErrors.customLabel = '';
  socialDraftErrors.value = '';
  isSocialSlideoverOpen.value = true;
}

function closeSocialSlideover() {
  isSocialSlideoverOpen.value = false;
  editingSocialIndex.value = null;
  resetSocialDraft();
}

function saveSocialDraft() {
  socialDraftErrors.label = '';
  socialDraftErrors.customLabel = '';
  socialDraftErrors.value = '';
  const messages: string[] = [];

  if (!String(socialDraft.label || '').trim()) {
    socialDraftErrors.label = 'Choose a link type.';
    messages.push('Link type: choose a link type.');
  }
  if (
    socialDraft.label === 'Custom' &&
    !String(socialDraft.customLabel || '').trim()
  ) {
    socialDraftErrors.customLabel = 'Custom label is required.';
    messages.push('Custom label is required.');
  }
  if (!String(socialDraft.value || '').trim()) {
    socialDraftErrors.value = 'Enter a link.';
    messages.push('Link is required.');
  } else if (!isValidCardLinkValue(socialDraft.value, socialDraft.label)) {
    socialDraftErrors.value = 'Enter a valid link.';
    messages.push('Enter a valid link.');
  }

  if (messages.length) {
    toast.add({
      title: 'Check this link',
      description: messages.join(' '),
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
  () => socialDraft.label,
  (label) => {
    if (label !== 'Custom') socialDraft.customLabel = '';
  }
);
</script>

<template>
  <UForm
    :state="state"
    :validate="validate"
    :validate-on="[]"
    class="flex h-full min-h-0 flex-col"
    @submit="onValidSubmit"
    @error="onFormError"
  >
    <div
      class="hide-scrollbar min-h-0 flex-1 overflow-y-auto p-6 sm:p-8 lg:px-16 lg:py-10"
    >
      <div class="mx-auto flex w-full max-w-120 flex-col gap-8 sm:max-w-140">
        <div class="flex flex-col gap-6">
          <h1
            class="text-[1.75rem] font-medium leading-tight tracking-[0.175rem] uppercase text-white"
          >
            Create your Persona card
          </h1>
          <p class="text-sm leading-normal text-[#8b8b8b]">
            Don't worry about getting everything perfect. You can edit your
            information anytime.
          </p>
        </div>

        <div class="flex flex-col gap-6">
          <UFormField
            label="First Name (Required)"
            name="firstName"
            :class="formFieldClass"
          >
            <UInput
              v-model="state.firstName"
              placeholder="John"
              class="w-full"
              :ui="inputUi"
            />
          </UFormField>

          <UFormField label="Last Name" name="lastName" :class="formFieldClass">
            <UInput
              v-model="state.lastName"
              placeholder="Doe"
              class="w-full"
              :ui="inputUi"
            />
          </UFormField>

          <UFormField
            label="Professional Title / Role (Required)"
            name="position"
            :class="formFieldClass"
          >
            <UInput
              v-model="state.position"
              placeholder="Senior Designer"
              class="w-full"
              :ui="inputUi"
            />
          </UFormField>

          <UFormField
            label="Phone Number (Required)"
            name="phone"
            :class="formFieldClass"
          >
            <FormPhoneField
              v-model="state.phone"
              v-model:country-code="state.phoneCountryCode"
              name="phone"
              :ui="{ base: inputUi.base }"
            />
          </UFormField>

          <UFormField
            label="Email Address (Required)"
            name="email"
            :class="formFieldClass"
          >
            <UInput
              v-model="state.email"
              type="email"
              placeholder="john@example.com"
              class="w-full"
              :ui="inputUi"
            />
          </UFormField>

          <div class="flex flex-col gap-4">
            <div class="flex items-center justify-between gap-3">
              <div class="flex flex-col gap-3">
                <p class="text-sm font-medium text-white">
                  Social / Professional Links (Required)
                </p>
                <p class="text-sm leading-normal text-[#8b8b8b]">
                  Add one profile so other members can connect with you.
                </p>
              </div>
              <UButton
                type="button"
                label="Add Link"
                icon="i-lucide-plus"
                variant="soft"
                size="sm"
                class="shrink-0 rounded-full bg-[#232323] px-3 text-xs text-white hover:bg-[#2a2a2a]"
                @click="openCreateLinkSlideover"
              />
            </div>

            <UFormField name="socials">
              <div class="flex flex-col gap-3">
                <div
                  v-for="(link, index) in state.socials"
                  :key="`${index}-${link.label}-${link.value}`"
                  class="flex items-center gap-3 rounded-[6px] border border-[#2a2a2a] bg-[#232323] p-3"
                >
                  <div class="min-w-0 flex-1">
                    <p class="truncate text-sm font-medium text-white">
                      {{ resolveSocialLabel(link) || 'Untitled Link' }}
                    </p>
                    <p class="truncate text-sm text-[#8b8b8b]">
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
                      class="text-[#8b8b8b] hover:bg-[#171717] hover:text-white"
                      :aria-label="`Edit ${resolveSocialLabel(link)}`"
                      @click="openEditLinkSlideover(index)"
                    />
                    <UButton
                      type="button"
                      size="sm"
                      icon="i-lucide-trash-2"
                      color="error"
                      variant="ghost"
                      class="text-[#8b8b8b] hover:bg-[#171717]"
                      :aria-label="`Remove ${resolveSocialLabel(link)}`"
                      @click="requestRemoveLink(index)"
                    />
                  </div>
                </div>
              </div>
            </UFormField>
          </div>
        </div>

        <p class="text-sm leading-normal text-[#8b8b8b]">
          By creating a La Persona account, you agree to our
          <NuxtLink
            href="/privacy-policy"
            class="text-white underline underline-offset-2"
          >
            E-sign Consent
          </NuxtLink>
          and
          <NuxtLink
            href="/privacy-policy"
            class="text-white underline underline-offset-2"
          >
            User Agreement
          </NuxtLink>
          .
        </p>
      </div>
    </div>

    <CommunityEventOnboardingFooter
      :primary-label="submitting ? 'Saving...' : 'Get Community Card'"
      primary-type="submit"
      secondary-label="Cancel"
      :show-powered-by="false"
      @secondary="emit('cancel')"
    />
  </UForm>

  <USlideover
    v-model:open="isSocialSlideoverOpen"
    side="right"
    inset
    :title="
      socialEditorMode === 'create' ? 'ADD SOCIAL LINK' : 'EDIT SOCIAL LINK'
    "
    :ui="{
      content: 'bg-[#171717] overflow-hidden',
      header: 'border-b-2 border-[#232323] px-6 py-6',
      title: 'text-sm font-medium tracking-[1.4px] text-white uppercase',
      body: 'bg-[#171717] px-6 py-6',
    }"
  >
    <template #body>
      <form class="space-y-6" @submit.prevent="saveSocialDraft">
        <UFormField
          label="Link Type"
          name="socialDraft.label"
          :error="socialDraftErrors.label || false"
          class="[&_label]:mb-1 [&_label]:text-sm [&_label]:font-medium [&_label]:text-white"
        >
          <USelectMenu
            v-model="socialDraft.label"
            :items="linkTypeItems"
            :search-input="false"
            class="w-full"
            placeholder="Select Link Type"
            :ui="{
              base: 'h-[47px] rounded-[4px] border-[#2a2a2a] bg-[#232323] text-sm text-white',
            }"
          />
        </UFormField>

        <UFormField
          v-if="socialDraft.label === 'Custom'"
          label="Custom Label"
          name="socialDraft.customLabel"
          :error="socialDraftErrors.customLabel || false"
          class="[&_label]:mb-1 [&_label]:text-sm [&_label]:font-medium [&_label]:text-white"
        >
          <UInput
            v-model="socialDraft.customLabel"
            placeholder="Custom Label"
            class="w-full"
            :ui="{
              base: 'h-12 border-[#2a2a2a] bg-[#232323] text-sm text-white placeholder:text-white/50',
            }"
          />
        </UFormField>

        <UFormField
          label="Link"
          name="socialDraft.value"
          :error="socialDraftErrors.value || false"
          class="[&_label]:mb-1 [&_label]:text-sm [&_label]:font-medium [&_label]:text-white"
        >
          <UInput
            v-model="socialDraft.value"
            placeholder="www.example.com"
            class="w-full"
            :ui="{
              base: 'h-12 border-[#2a2a2a] bg-[#232323] text-sm text-white placeholder:text-white/50',
            }"
          />
        </UFormField>

        <div class="flex justify-end gap-3 pt-2">
          <UButton
            type="button"
            size="xl"
            label="Cancel"
            color="neutral"
            variant="ghost"
            class="rounded-full px-4 text-[#8b8b8b] hover:bg-[#232323] hover:text-white"
            @click="closeSocialSlideover"
          />
          <UButton
            type="submit"
            :label="socialEditorMode === 'create' ? 'Add Link' : 'Save Link'"
            icon="i-lucide-check"
            class="h-10 rounded-full bg-[#232323] px-5 text-white hover:bg-[#2a2a2a]"
          />
        </div>
      </form>
    </template>
  </USlideover>

  <UModal
    v-model:open="isDeleteSocialConfirmOpen"
    title="Delete Link?"
    :ui="{
      content: 'bg-[#171717] max-w-md',
      title: 'text-white',
      body: 'pt-4',
      footer: 'justify-end gap-2',
    }"
  >
    <template #body>
      <p class="text-sm leading-relaxed text-[#bcbcbc]">
        This removes the selected social link from your community card.
      </p>
    </template>
    <template #footer>
      <UButton
        type="button"
        label="Cancel"
        color="neutral"
        variant="ghost"
        class="rounded-full px-5"
        @click="closeDeleteSocialConfirm"
      />
      <UButton
        type="button"
        label="Delete"
        color="error"
        class="rounded-full px-6 font-medium"
        @click="confirmRemoveLink"
      />
    </template>
  </UModal>
</template>
