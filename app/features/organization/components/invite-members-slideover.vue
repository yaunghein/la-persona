<script setup lang="ts">
import type { CommunityInviteRole } from '~~/shared/permissions/organization';

const props = defineProps<{
  organizationSlug: string;
}>();

const open = defineModel<boolean>('open', { default: false });

const toast = useToast();
const { data: joinLink } = useJoinLinkQuery(() => props.organizationSlug);
const { mutateAsync: inviteMember, isPending: isSending } =
  useInviteMemberMutation(() => props.organizationSlug);

const inviteLink = computed(() => joinLink.value?.url ?? '');
const emailInput = ref('');
const roleInput = ref<CommunityInviteRole>('member');
const roleOptions: { label: string; value: CommunityInviteRole }[] = [
  { label: 'Member', value: 'member' },
  { label: 'Volunteer', value: 'volunteer' },
];
const qrDataUrl = ref('');

const formFieldClass =
  '[&_label]:mb-1.5 [&_label]:text-sm [&_label]:font-medium [&_label]:text-white';

const inputUi = {
  base: 'h-11 rounded-[4px] border-[#2a2a2a] bg-[#232323] text-sm text-white placeholder:text-white/50',
};

watch(
  inviteLink,
  async (link) => {
    if (!link || !import.meta.client) return;
    try {
      const qrModule = await import('qrcode');
      const qrFactory = (qrModule as any).default || qrModule;
      qrDataUrl.value = await qrFactory.toDataURL(link, {
        width: 200,
        margin: 1,
        color: {
          dark: '#ffffff',
          light: '#121212',
        },
      });
    } catch {
      qrDataUrl.value = '';
    }
  },
  { immediate: true }
);

async function copyInviteLink() {
  try {
    await navigator.clipboard.writeText(inviteLink.value);
    toast.add({
      title: 'Link copied',
      color: 'success',
    });
  } catch {
    toast.add({
      title: 'Copy failed',
      description: 'Could not copy invite link.',
      color: 'error',
    });
  }
}

async function sendInvitations() {
  const email = emailInput.value.trim();
  if (!email) {
    toast.add({
      title: 'Email required',
      description: 'Enter an email address to send an invitation.',
      color: 'warning',
    });
    return;
  }

  try {
    await inviteMember({ email, role: roleInput.value });
    toast.add({
      title: 'Invitation sent',
      description: `Invite sent to ${email}.`,
      color: 'success',
    });
    emailInput.value = '';
    roleInput.value = 'member';
  } catch (error) {
    toast.add({
      title: 'Could not send invite',
      description: apiErrorMessage(error, 'Try again.'),
      color: 'error',
    });
  }
}

function downloadQr() {
  if (!qrDataUrl.value) {
    toast.add({
      title: 'QR unavailable',
      description: 'Could not generate QR code.',
      color: 'error',
    });
    return;
  }

  const anchor = document.createElement('a');
  anchor.href = qrDataUrl.value;
  anchor.download = 'community-invite-qr.png';
  anchor.click();
}
</script>

<template>
  <USlideover
    v-model:open="open"
    side="right"
    inset
    title="INVITE MEMBERS"
    :ui="{
      header: 'border-b-2 border-[#232323] px-6 py-6',
      title: 'text-sm font-medium tracking-[1.4px] text-white uppercase',
      body: 'px-6',
    }"
  >
    <template #body>
      <div class="flex flex-col gap-6">
        <section class="flex flex-col gap-3">
          <div class="space-y-1">
            <h3 class="text-sm font-medium text-white">Invite with Link</h3>
            <p class="text-sm text-[#8b8b8b]">
              Anyone with this link can join.
            </p>
          </div>
          <div
            class="flex h-11 items-center justify-between gap-3 rounded-[4px] border border-[#2a2a2a] bg-[#232323] pr-1 pl-4"
          >
            <p class="truncate text-sm text-white">{{ inviteLink }}</p>
            <UButton
              icon="i-lucide-copy"
              color="neutral"
              variant="ghost"
              class="shrink-0 text-white hover:bg-[#2a2a2a]"
              aria-label="Copy invite link"
              @click="copyInviteLink"
            />
          </div>
        </section>

        <div class="h-px w-full bg-[#232323]" />

        <section class="flex flex-col gap-4">
          <div class="space-y-1">
            <h3 class="text-sm font-medium text-white">Invite by Email</h3>
            <p class="text-sm text-[#8b8b8b]">Send an invite to their email.</p>
          </div>

          <UFormField label="Email" :class="formFieldClass">
            <UInput
              v-model="emailInput"
              type="email"
              placeholder="example@company.com"
              class="w-full"
              :ui="inputUi"
            />
          </UFormField>

          <UFormField
            label="Role"
            :help="
              roleInput === 'volunteer'
                ? 'Volunteers can view events, attendees, and run check-in, but cannot create or edit events.'
                : 'Members can browse events and register.'
            "
            :class="formFieldClass"
            :ui="{ help: 'mt-1.5 text-xs text-[#8b8b8b]' }"
          >
            <USelect
              v-model="roleInput"
              :items="roleOptions"
              class="w-full"
              :ui="inputUi"
            />
          </UFormField>

          <div class="flex justify-end">
            <UButton
              label="Send Invitation"
              leading-icon="i-lucide-send"
              color="neutral"
              :loading="isSending"
              class="h-10 cursor-pointer rounded-full bg-white pr-6 pl-5 text-sm font-medium text-dark hover:bg-white/90"
              @click="sendInvitations"
            />
          </div>
        </section>

        <div class="h-px w-full bg-[#232323]" />

        <section class="flex flex-col gap-4">
          <div class="space-y-1">
            <h3 class="text-sm font-medium text-white">Community QR Code</h3>
            <p class="text-sm text-[#8b8b8b]">
              Show it on slides, registration desks, or printed materials.
            </p>
          </div>

          <div class="flex flex-col items-center gap-4">
            <div
              class="flex size-44 items-center justify-center rounded-xl border border-[#232323] bg-dark p-2"
            >
              <img
                v-if="qrDataUrl"
                :src="qrDataUrl"
                alt="Community invite QR code"
                class="size-40 rounded-[4px]"
              />
              <UIcon
                v-else
                name="i-lucide-qr-code"
                class="size-14 text-[#8b8b8b]"
              />
            </div>
            <UButton
              label="Download QR"
              leading-icon="i-lucide-download"
              color="neutral"
              class="h-10 cursor-pointer rounded-full bg-[#232323] pr-6 pl-5 text-sm font-medium text-white hover:bg-[#2a2a2a]"
              @click="downloadQr"
            />
          </div>
        </section>
      </div>
    </template>
  </USlideover>
</template>
