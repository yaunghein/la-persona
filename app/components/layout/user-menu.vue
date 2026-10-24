<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui';

defineProps<{
  collapsed?: boolean;
}>();

const colorMode = useColorMode();

const session = await authClient.useSession(useFetch);

const user = ref({
  name: session.data.value?.user.name,
  email: session.data.value?.user.email,
  avatar: {
    src: session.data.value?.user.image as string,
    alt: session.data.value?.user.name as string,
  },
});

const themeOptions = [
  { label: 'Light', icon: 'i-lucide-sun', preference: 'light' },
  { label: 'Dark', icon: 'i-lucide-moon', preference: 'dark' },
  { label: 'System', icon: 'i-lucide-monitor', preference: 'system' },
] as const;

const items = computed<DropdownMenuItem[][]>(() => [
  [
    {
      type: 'label',
      label: user.value.name || '',
      avatar: user.value.avatar,
    },
  ],
  [
    {
      label: 'Theme',
      icon: 'i-lucide-sun-moon',
      children: themeOptions.map((option) => ({
        label: option.label,
        icon: option.icon,
        type: 'checkbox' as const,
        checked: colorMode.preference === option.preference,
        onSelect(e: Event) {
          e.preventDefault();
          colorMode.preference = option.preference;
        },
      })),
    },
  ],
  [
    {
      label: 'Log out',
      icon: 'i-lucide-log-out',
      color: 'error',
      onSelect: signOut,
    },
  ],
]);
</script>

<template>
  <UDropdownMenu
    :items="items"
    :content="{ align: 'center', collisionPadding: 12 }"
    :ui="{
      content: collapsed ? 'w-48' : 'w-(--reka-dropdown-menu-trigger-width)',
    }"
  >
    <UButton
      size="xl"
      color="neutral"
      variant="ghost"
      block
      :square="collapsed"
      class="data-[state=open]:bg-elevated"
      :ui="{
        trailingIcon: 'text-dimmed',
      }"
    >
      <template v-if="collapsed">
        <UAvatar
          :src="user.avatar.src"
          :alt="user.avatar.alt"
          size="md"
          class="mx-auto"
        />
      </template>
      <template v-else>
        <div class="flex w-full items-center justify-between gap-3">
          <div class="flex min-w-0 items-center gap-3">
            <UAvatar
              :src="user.avatar.src"
              :alt="user.avatar.alt"
              size="md"
              class="shrink-0"
            />
            <div class="min-w-0 text-left">
              <p class="truncate text-sm font-medium text-ink">
                {{ user.name }}
              </p>
              <p class="truncate text-xs text-muted">
                {{ user.email }}
              </p>
            </div>
          </div>
          <UIcon
            name="i-lucide-chevrons-up-down"
            class="shrink-0 text-dimmed size-4"
          />
        </div>
      </template>
    </UButton>
  </UDropdownMenu>
</template>
