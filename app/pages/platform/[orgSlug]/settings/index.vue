<script setup lang="ts">
import { useQueryClient } from '@tanstack/vue-query';
import { UpdateCommunitySettingsRequest } from '~~/shared/contracts/organization';
import type { CommunitySettingsFormValues } from '~~/shared/contracts/organization';
import { organizationQueryKeys } from '~/features/organization/composables/use-user-organizations';

definePageMeta({
  layout: 'platform',
});

const toast = useToast();
const { normalizeUrlWithHttps } = useUrlNormalization();
const { organizationSlug } = useOrganizationSlug();
const { data: userOrgs } = useUserOrganizations();
const isCompany = computed(
  () =>
    userOrgs.value?.find((org) => org.slug === organizationSlug.value)?.type ===
    'company'
);
const queryClient = useQueryClient();
const companyForm = reactive({
  name: '',
  website: '',
  logoUrl: '',
  coverImageUrl: '',
});
const isSavingCompany = ref(false);
const selectedLogoFile = ref<File | null>(null);
const localLogoPreviewUrl = ref<string | null>(null);
const selectedCoverFile = ref<File | null>(null);
const localCoverPreviewUrl = ref<string | null>(null);
const companyOrg = computed(() =>
  userOrgs.value?.find((org) => org.slug === organizationSlug.value)
);
watch(
  companyOrg,
  (org) => {
    if (org?.type === 'company') companyForm.name = org.name;
  },
  { immediate: true }
);
const isDepartmentsOpen = ref(false);
const { data: companySettings, refresh: refreshCompanySettings } = useFetch<{
  name: string;
  website: string;
  logoUrl: string | null;
  coverImageUrl: string | null;
  departments: { id: string; name: string }[];
}>(
  () =>
    `/api/organizations/${organizationSlug.value}/company-settings` as string,
  { immediate: false, watch: false }
);
watch(
  isCompany,
  (value) => {
    if (value) refreshCompanySettings();
  },
  { immediate: true }
);
watch(companySettings, (settings) => {
  if (!settings) return;
  companyForm.name = settings.name;
  companyForm.website = settings.website ?? '';
  companyForm.logoUrl = settings.logoUrl ?? '';
  companyForm.coverImageUrl = settings.coverImageUrl ?? '';
});

const displayLogo = computed(
  () =>
    localLogoPreviewUrl.value ||
    communityLogoSrc(companyForm.logoUrl, companyForm.name)
);
const displayCover = computed(() =>
  localCoverPreviewUrl.value
    ? localCoverPreviewUrl.value
    : communityCoverSrc(companyForm.coverImageUrl)
);

function triggerFilePicker(inputId: string) {
  const input = document.getElementById(inputId) as HTMLInputElement | null;
  input?.click();
}

function takeImageFile(event: Event, label: string) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return null;
  if (!file.type.startsWith('image/')) {
    toast.add({
      title: 'Choose an image',
      description: `${label} uploads accept JPG, PNG, or WebP.`,
      color: 'warning',
    });
    input.value = '';
    return null;
  }
  return file;
}

function onCoverFileChange(event: Event) {
  const file = takeImageFile(event, 'Cover');
  if (!file) return;
  if (localCoverPreviewUrl.value)
    URL.revokeObjectURL(localCoverPreviewUrl.value);
  selectedCoverFile.value = file;
  localCoverPreviewUrl.value = URL.createObjectURL(file);
}

function onLogoFileChange(event: Event) {
  const file = takeImageFile(event, 'Logo');
  if (!file) return;
  if (localLogoPreviewUrl.value) URL.revokeObjectURL(localLogoPreviewUrl.value);
  selectedLogoFile.value = file;
  localLogoPreviewUrl.value = URL.createObjectURL(file);
}

function clearFileSelection(
  previewUrl: Ref<string | null>,
  selectedFile: Ref<File | null>,
  inputId: string
) {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
  selectedFile.value = null;
  previewUrl.value = null;
  const input = document.getElementById(inputId) as HTMLInputElement | null;
  if (input) input.value = '';
}

onUnmounted(() => {
  if (localLogoPreviewUrl.value) URL.revokeObjectURL(localLogoPreviewUrl.value);
  if (localCoverPreviewUrl.value)
    URL.revokeObjectURL(localCoverPreviewUrl.value);
});

function openDepartments() {
  isDepartmentsOpen.value = true;
}

function reloadDepartments() {
  refreshCompanySettings();
}

const departmentSummary = computed(() => {
  const count = companySettings.value?.departments.length ?? 0;
  if (!count) return 'None yet';
  return count === 1 ? '1 department' : `${count} departments`;
});

async function saveCompany() {
  const loaded = companySettings.value;
  isSavingCompany.value = true;
  try {
    if (selectedLogoFile.value) {
      companyForm.logoUrl = await uploadImage(
        selectedLogoFile.value,
        { organizationSlug: organizationSlug.value },
        { maxSizeMB: 0.8, maxWidthOrHeight: 1200 }
      );
      clearFileSelection(
        localLogoPreviewUrl,
        selectedLogoFile,
        'company-logo-input'
      );
    }
    if (selectedCoverFile.value) {
      companyForm.coverImageUrl = await uploadImage(
        selectedCoverFile.value,
        { organizationSlug: organizationSlug.value },
        { maxSizeMB: 1.5, maxWidthOrHeight: 2400 }
      );
      clearFileSelection(
        localCoverPreviewUrl,
        selectedCoverFile,
        'company-cover-input'
      );
    }
    await $fetch(
      `/api/organizations/${organizationSlug.value}/company-settings` as string,
      {
        method: 'PATCH',
        body: {
          name: companyForm.name,
          website: normalizeUrlWithHttps(companyForm.website),
          ...(companyForm.logoUrl !== (loaded?.logoUrl ?? '') && {
            logoUrl: companyForm.logoUrl,
          }),
          ...(companyForm.coverImageUrl !== (loaded?.coverImageUrl ?? '') && {
            coverImageUrl: companyForm.coverImageUrl,
          }),
        },
      }
    );
    await Promise.all([
      refreshCompanySettings(),
      queryClient.invalidateQueries({ queryKey: organizationQueryKeys.mine() }),
    ]);
    toast.add({ title: 'Company saved', color: 'success' });
  } catch (error) {
    toast.add({
      title: 'Could not save',
      description: apiErrorMessage(error),
      color: 'error',
    });
  } finally {
    isSavingCompany.value = false;
  }
}

const emptyForm = (): CommunitySettingsFormValues => ({
  name: '',
  description: '',
  guidelines: '',
  whyJoin: '',
  coverImageUrl: '',
  logoUrl: '',
  splineUrl: '',
  wallpaperUrl: '',
  cardBackUrl: '',
  organizerMemberId: '',
  foundedYear: new Date().getFullYear(),
});

const {
  state: form,
  hydrate,
  clear: clearDraft,
} = useFormDraft<CommunitySettingsFormValues>(
  () => `org:${organizationSlug.value}:settings`,
  emptyForm
);

function updateForm(value: CommunitySettingsFormValues) {
  Object.assign(form, value);
}

const { data, isLoading, isError, error, refetch } = useCommunityQuery(
  organizationSlug,
  { enabled: computed(() => !isCompany.value) }
);

watch(
  data,
  (value) => {
    if (!value) return;
    hydrate({ ...value });
  },
  { immediate: true }
);

const { data: members } = useCommunityMembersQuery(organizationSlug, {
  enabled: computed(() => !isCompany.value),
});
const organizers = computed(() =>
  (members.value ?? [])
    .filter(
      (member) =>
        member.kind === 'member' &&
        member.memberRole === 'admin' &&
        member.cardSlug
    )
    .map((member) => ({
      id: member.id,
      name: member.name,
      title: member.role,
      avatarUrl: member.avatarUrl ?? null,
    }))
);

const { mutate: updateSettings, isPending: isSaving } =
  useUpdateCommunitySettingsMutation(organizationSlug);

/** Unchanged images are left out, so a legacy stored value never blocks a save. */
function saveSettings(values: CommunitySettingsFormValues) {
  const loaded = data.value;
  updateSettings(
    UpdateCommunitySettingsRequest.parse({
      name: values.name,
      description: values.description,
      guidelines: values.guidelines,
      whyJoin: values.whyJoin,
      organizerMemberId: values.organizerMemberId || null,
      foundedYear: values.foundedYear,
      ...(values.logoUrl !== loaded?.logoUrl && { logoUrl: values.logoUrl }),
      ...(values.coverImageUrl !== loaded?.coverImageUrl && {
        coverImageUrl: values.coverImageUrl,
      }),
    }),
    {
      onSuccess: (saved) => {
        clearDraft();
        hydrate({ ...saved });
        toast.add({
          title: 'Settings updated',
          description: 'Community settings were saved.',
          color: 'success',
        });
      },
      onError: (error) => {
        toast.add({
          title: 'Could not save',
          description: apiErrorMessage(
            error,
            'Community settings could not be saved.'
          ),
          color: 'error',
        });
      },
    }
  );
}

function onSubmit() {
  if (!form.name.trim()) {
    toast.add({
      title: 'Name required',
      description: 'Organization name cannot be empty.',
      color: 'warning',
    });
    return;
  }

  saveSettings({ ...form });
}

function retry() {
  refetch();
}
</script>

<template>
  <div v-if="isCompany" class="flex flex-col gap-8">
    <h1
      class="text-xl font-normal leading-tight tracking-widest uppercase text-ink sm:text-2xl"
    >
      Company settings
    </h1>
    <form
      class="flex w-full flex-col gap-8 rounded-lg bg-surface p-6 pb-8 sm:p-8"
      @submit.prevent="saveCompany"
    >
      <div class="flex flex-col gap-3">
        <p class="text-sm font-medium text-ink">Cover Image</p>
        <div
          class="relative aspect-[1/0.25] w-full overflow-hidden rounded-lg border border-raised bg-canvas"
        >
          <img
            v-if="localCoverPreviewUrl"
            :src="localCoverPreviewUrl"
            alt=""
            class="size-full object-cover"
          />
          <UiSkeletonImage
            v-else-if="displayCover"
            :src="displayCover"
            alt=""
            width="1024"
            class="size-full object-cover"
          />
          <div class="absolute inset-0 flex items-center justify-center">
            <input
              id="company-cover-input"
              type="file"
              class="hidden"
              accept="image/*"
              @change="onCoverFileChange"
            />
            <UButton
              type="button"
              label="Upload Photo"
              leading-icon="i-lucide-upload"
              color="neutral"
              size="sm"
              class="h-8 cursor-pointer rounded-full bg-raised/90 pr-4 pl-3 text-xs font-medium text-ink hover:bg-line"
              @click="triggerFilePicker('company-cover-input')"
            />
          </div>
        </div>
      </div>

      <div class="flex flex-col gap-3">
        <p class="text-sm font-medium text-ink">Company Logo</p>
        <div class="flex flex-wrap items-center gap-4">
          <div
            class="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-raised sm:size-24"
          >
            <img
              v-if="localLogoPreviewUrl"
              :src="localLogoPreviewUrl"
              :alt="companyForm.name || 'Company logo'"
              class="size-full object-cover"
            />
            <UiSkeletonImage
              v-else
              :src="displayLogo"
              :alt="companyForm.name || 'Company logo'"
              width="96"
              height="96"
              class="size-full object-cover"
            />
          </div>
          <input
            id="company-logo-input"
            type="file"
            class="hidden"
            accept="image/*"
            @change="onLogoFileChange"
          />
          <UButton
            type="button"
            label="Upload Photo"
            leading-icon="i-lucide-upload"
            color="neutral"
            size="sm"
            class="h-8 cursor-pointer rounded-full bg-raised pr-4 pl-3 text-xs font-medium text-ink hover:bg-line"
            @click="triggerFilePicker('company-logo-input')"
          />
        </div>
      </div>

      <div class="grid gap-6 sm:grid-cols-2">
        <UFormField
          label="Company Name"
          class="[&_label]:mb-1 [&_label]:text-sm [&_label]:font-medium [&_label]:text-ink"
          required
        >
          <UInput
            v-model="companyForm.name"
            class="w-full"
            :ui="{
              base: 'h-[47px] rounded-[4px] border-line bg-raised text-sm text-ink placeholder:text-ink/50',
            }"
          />
        </UFormField>
        <UFormField
          label="Website"
          class="[&_label]:mb-1 [&_label]:text-sm [&_label]:font-medium [&_label]:text-ink"
        >
          <UInput
            v-model="companyForm.website"
            class="w-full"
            placeholder="https://"
            :ui="{
              base: 'h-[47px] rounded-[4px] border-line bg-raised text-sm text-ink placeholder:text-ink/50',
            }"
          />
        </UFormField>
      </div>

      <div
        class="flex items-center justify-between gap-4 border-t border-raised pt-6"
      >
        <div class="min-w-0">
          <p class="text-sm font-medium text-ink">Departments</p>
          <p class="text-sm text-subtle">{{ departmentSummary }}</p>
        </div>
        <UButton
          type="button"
          label="Manage"
          color="neutral"
          class="h-10 shrink-0 cursor-pointer rounded-full bg-raised px-5 text-sm font-medium text-ink hover:bg-line"
          @click="openDepartments"
        />
      </div>

      <div class="flex justify-end">
        <UButton
          type="submit"
          label="Update Changes"
          leading-icon="i-lucide-check"
          color="neutral"
          :loading="isSavingCompany"
          class="h-10 cursor-pointer rounded-full bg-ink pr-6 pl-5 text-sm font-medium text-ink-inverse hover:bg-ink/90"
        />
      </div>
    </form>

    <OrganizationDepartmentsSlideover
      v-model:open="isDepartmentsOpen"
      :organization-slug="organizationSlug"
      :departments="companySettings?.departments ?? []"
      @changed="reloadDepartments"
    />
  </div>
  <div v-else-if="isLoading" class="flex flex-col gap-8">
    <USkeleton class="h-8 w-64 rounded-md" />
    <USkeleton class="min-h-96 w-full rounded-lg" />
  </div>
  <div v-else-if="isError" class="flex flex-col items-start gap-4">
    <p class="text-sm text-subtle">
      {{ apiErrorMessage(error, 'Could not load community settings.') }}
    </p>
    <UButton
      label="Try again"
      color="neutral"
      class="h-10 rounded-full bg-ink px-5 text-sm font-medium text-ink-inverse hover:bg-ink/90"
      @click="retry"
    />
  </div>
  <OrganizationSettingsForm
    v-else
    :model-value="form"
    :organizers="organizers"
    @update:model-value="updateForm"
    :saving="isSaving"
    @submit="onSubmit"
  />
</template>
