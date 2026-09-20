<script setup lang="ts">
import { SOCIAL_MEDIA_LINK_LABELS } from '~~/shared/constants/card-link-options';
import { useUrlNormalization } from '~~/app/composables/url-normalization';

const props = defineProps<{
  firstName?: string | null;
  lastName?: string | null;
  position?: string | null;
  phone?: string | null;
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
      email: string;
      socials: { label: string; value: string }[];
    },
  ];
  cancel: [];
}>();

const toast = useToast();
const { normalizeCardLinkValue, isValidCardLinkValue } = useUrlNormalization();

const firstSocial = computed(() => {
  const links = props.socials || [];
  return (
    links.find((link) =>
      (SOCIAL_MEDIA_LINK_LABELS as readonly string[]).includes(link.label)
    ) || links[0]
  );
});

const form = reactive({
  firstName: props.firstName || '',
  lastName: props.lastName || '',
  position: props.position || '',
  phone: props.phone || '',
  email: props.email || '',
  social: firstSocial.value?.label || '',
  socialUrl: firstSocial.value?.value || '',
});

watch(
  () => props,
  (value) => {
    form.firstName = value.firstName || '';
    form.lastName = value.lastName || '';
    form.position = value.position || '';
    form.phone = value.phone || '';
    form.email = value.email || '';
    const social =
      (value.socials || []).find((link) =>
        (SOCIAL_MEDIA_LINK_LABELS as readonly string[]).includes(link.label)
      ) || value.socials?.[0];
    form.social = social?.label || '';
    form.socialUrl = social?.value || '';
  },
  { deep: true }
);

const socialItems = SOCIAL_MEDIA_LINK_LABELS.map((label) => ({
  label,
  value: label,
}));

const formFieldClass =
  '[&_label]:mb-3 [&_label]:text-sm [&_label]:font-medium [&_label]:text-white';

const inputUi = {
  base: 'h-[47px] rounded-[4px] border-[#2a2a2a] bg-[#232323] text-sm text-white placeholder:text-white/50',
};

const selectUi = {
  base: 'h-[47px] w-full rounded-[4px] border border-[#2a2a2a] bg-[#232323] px-4 text-sm text-white',
  content: 'border border-[#2a2a2a] bg-[#171717]',
  item: 'text-white data-[highlighted]:bg-[#232323]',
  value: 'text-white',
  placeholder: 'text-white',
  trailingIcon: 'text-[#8b8b8b]',
};

function onSubmit() {
  if (props.submitting) return;
  const firstName = form.firstName.trim();
  const position = form.position.trim();
  const phone = form.phone.trim();
  const email = form.email.trim();
  const social = form.social.trim();
  const socialUrl = normalizeCardLinkValue(form.socialUrl, social);

  if (!firstName || !position || !phone || !email || !social || !socialUrl) {
    toast.add({
      title: 'Missing details',
      description: 'Please fill in every required field.',
      color: 'error',
    });
    return;
  }

  if (!email.includes('@') || !isValidCardLinkValue(socialUrl, social)) {
    toast.add({
      title: 'Check your details',
      description: 'Enter a valid email and social link.',
      color: 'error',
    });
    return;
  }

  emit('submit', {
    firstName,
    lastName: form.lastName.trim(),
    position,
    phone,
    email,
    socials: [{ label: social, value: socialUrl }],
  });
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col">
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
              v-model="form.firstName"
              placeholder="John"
              class="w-full"
              :ui="inputUi"
            />
          </UFormField>

          <UFormField label="Last Name" name="lastName" :class="formFieldClass">
            <UInput
              v-model="form.lastName"
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
              v-model="form.position"
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
            <UInput
              v-model="form.phone"
              placeholder="+66 1234 5678"
              class="w-full"
              :ui="inputUi"
            />
          </UFormField>

          <UFormField
            label="Email Address (Required)"
            name="email"
            :class="formFieldClass"
          >
            <UInput
              v-model="form.email"
              type="email"
              placeholder="john@example.com"
              class="w-full"
              :ui="inputUi"
            />
          </UFormField>

          <div class="flex flex-col gap-6">
            <div class="flex flex-col gap-3">
              <p class="text-sm font-medium text-white">
                Social / Professional Links (Required)
              </p>
              <p class="text-sm leading-normal text-[#8b8b8b]">
                Please include one social media profile so other members can
                connect with you.
              </p>
            </div>
            <USelect
              v-model="form.social"
              :items="socialItems"
              placeholder="Select one"
              color="neutral"
              class="w-full"
              :ui="selectUi"
            />
            <UInput
              v-model="form.socialUrl"
              placeholder="https://"
              class="w-full"
              :ui="inputUi"
            />
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
      secondary-label="Cancel"
      @primary="onSubmit"
      @secondary="emit('cancel')"
    />
  </div>
</template>
