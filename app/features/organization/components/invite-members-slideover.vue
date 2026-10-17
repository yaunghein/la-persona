<script setup lang="ts">
import type { CommunityInviteRole } from '~~/shared/permissions/organization';


const props = defineProps<{
  organizationSlug: string;
}>();

const open = defineModel<boolean>('open', { default: false });

const toast = useToast();
const { data: joinLink } = useJoinLinkQuery(() => props.organizationSlug);
const { mutateAsync: rotateJoinLink, isPending: isRotating } =
  useRotateJoinLinkMutation(() => props.organizationSlug);
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
  '[&_label]:mb-3 [&_label]:text-sm [&_label]:font-medium [&_label]:text-white';

const inputUi = {
  base: 'h-[47px] rounded-[4px] border-[#2a2a2a] bg-[#232323] text-sm text-white placeholder:text-white/50',
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

async function regenerateInviteLink() {
  try {
    await rotateJoinLink();
    toast.add({
      title: 'New link created',
      description: 'The previous invite link no longer works.',
      color: 'success',
    });
  } catch (error) {
    toast.add({
      title: 'Could not create a new link',
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
      <div class="flex flex-col gap-8 py-2">
        <section class="flex flex-col gap-3">
          <div class="space-y-3">
            <h3 class="text-sm font-medium text-white">Invite with Link</h3>
            <p class="text-sm leading-5.25 text-[#8b8b8b]">
              Anyone with this link can join.
            </p>
          </div>
          <div
            class="flex h-11.75 items-center justify-between gap-3 rounded-[4px] border border-[#2a2a2a] bg-[#232323] px-4"
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
          <UButton
            label="Create new link"
            icon="i-lucide-refresh-cw"
            color="neutral"
            variant="link"
            size="sm"
            class="self-start px-0 text-[#8b8b8b] hover:text-white"
            :loading="isRotating"
            @click="regenerateInviteLink"
          />
        </section>

        <div class="h-px w-full bg-[#232323]" />

        <section class="flex flex-col gap-8">
          <div class="space-y-3">
            <h3 class="text-sm font-medium text-white">Invite by Email</h3>
            <p class="text-sm leading-5.25 text-[#8b8b8b]">
              Invite people to your community by sending an invite to their
              emails.
            </p>
          </div>

          <UFormField label="Email Invitation" :class="formFieldClass">
            <UInput
              v-model="emailInput"
              type="email"
              placeholder="example@company.com"
              class="w-full"
              size="xl"
              :ui="inputUi"
            />
          </UFormField>

          <UFormField
            label="Role"
            :description="
              roleInput === 'volunteer'
                ? 'Volunteers can view events, attendees, and run check-in, but cannot create or edit events.'
                : 'Members can browse events and register.'
            "
            :class="formFieldClass"
            :ui="{ description: 'mb-3 text-sm text-[#8b8b8b]' }"
          >
            <USelect
              v-model="roleInput"
              :items="roleOptions"
              class="w-full"
              size="xl"
              :ui="inputUi"
            />
          </UFormField>

          <div class="flex justify-end">
            <UButton
              label="Send Invitations"
              icon="i-lucide-send"
              color="neutral"
              :loading="isSending"
              :ui="{ leadingIcon: 'size-5' }"
              class="h-10 text-sm rounded-full bg-white px-6 font-medium text-dark hover:bg-white/90"
              @click="sendInvitations"
            />
          </div>
        </section>

        <div class="h-px w-full bg-[#232323]" />

        <section class="flex flex-col gap-8">
          <div class="space-y-3">
            <h3 class="text-sm font-medium text-white">Community QR Code</h3>
            <p class="text-sm leading-normal text-[#8b8b8b]">
              Perfect for networking events, conferences, and workshops. Display
              this QR code on presentation slides, registration desks, or
              printed materials.
            </p>
          </div>

          <div class="flex flex-col items-center gap-6">
            <div
              class="flex size-50 items-center justify-center rounded-xl border border-[#232323] bg-dark p-2"
            >
              <img
                v-if="qrDataUrl"
                :src="qrDataUrl"
                alt="Community invite QR code"
                class="size-46 rounded-[4px]"
              />
              <UIcon
                v-else
                name="i-lucide-qr-code"
                class="size-16 text-[#8b8b8b]"
              />
            </div>
            <UButton
              label="Download QR"
              color="neutral"
              class="h-10 text-sm rounded-full bg-[#232323] px-6 font-medium text-white hover:bg-[#2a2a2a]"
              @click="downloadQr"
            />
          </div>
        </section>
      </div>
    </template>
  </USlideover>
</template>
