<script setup lang="ts">
import type { EditorToolbarItem } from '@nuxt/ui';

const model = defineModel<string>({ default: '' });

defineProps<{
  placeholder?: string;
}>();

const toolbarItems: EditorToolbarItem[][] = [
  [
    {
      kind: 'mark',
      mark: 'bold',
      icon: 'i-lucide-bold',
      tooltip: { text: 'Bold' },
    },
    {
      kind: 'mark',
      mark: 'italic',
      icon: 'i-lucide-italic',
      tooltip: { text: 'Italic' },
    },
  ],
  [
    {
      kind: 'bulletList',
      icon: 'i-lucide-list',
      tooltip: { text: 'Bullet list' },
    },
    {
      kind: 'orderedList',
      icon: 'i-lucide-list-ordered',
      tooltip: { text: 'Numbered list' },
    },
  ],
  [
    {
      kind: 'link',
      icon: 'i-lucide-link',
      tooltip: { text: 'Link' },
    },
  ],
];
</script>

<template>
  <div class="community-rich-text">
    <UEditor
      v-slot="{ editor }"
      v-model="model"
      content-type="html"
      :placeholder="placeholder || 'Start writing...'"
      class="flex min-h-40 w-full flex-col overflow-hidden rounded-[4px] border border-[#2a2a2a] bg-[#232323]"
      :ui="{
        content: 'relative min-h-32 w-full flex-1 !h-auto',
        base: 'tiptap min-h-32 cursor-text px-4 py-3 text-sm leading-normal text-white *:my-0 [&_p]:my-0 [&_p]:leading-normal [&_li]:my-0',
      }"
    >
      <UEditorToolbar
        :editor="editor"
        :items="toolbarItems"
        class="shrink-0 border-b border-[#2a2a2a] px-2 py-1"
      />
    </UEditor>
  </div>
</template>

<style scoped>
.community-rich-text :deep(ul) {
  list-style-type: disc;
  list-style-position: outside;
  margin: 0.25rem 0 0;
  padding-inline-start: 1.25rem;
}

.community-rich-text :deep(ol) {
  list-style-type: decimal;
  list-style-position: outside;
  margin: 0.25rem 0 0;
  padding-inline-start: 1.25rem;
}

.community-rich-text :deep(li) {
  margin: 0 !important;
  padding-block: 0 !important;
  line-height: 1.375 !important;
}

.community-rich-text :deep(li p) {
  margin: 0 !important;
  padding-block: 0 !important;
  line-height: 1.375 !important;
}

.community-rich-text :deep(:is(ul, ol) > li::marker) {
  color: #ffffff;
}
</style>
