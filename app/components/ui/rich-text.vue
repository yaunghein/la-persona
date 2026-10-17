<script setup lang="ts">
const props = defineProps<{
  content: string;
}>();

const isHtml = computed(() => /<[a-z][^>]*>/i.test(props.content));
</script>

<template>
  <div v-if="isHtml" class="community-rich-text-view" v-html="content" />
  <p v-else class="whitespace-pre-line">{{ content }}</p>
</template>

<style scoped>
.community-rich-text-view :deep(p) {
  margin: 0;
}

.community-rich-text-view :deep(p + p) {
  margin-top: 0.75rem;
}

.community-rich-text-view :deep(ul) {
  list-style-type: disc;
  list-style-position: outside;
  margin: 0;
  padding-inline-start: 1.25rem;
}

.community-rich-text-view :deep(ol) {
  list-style-type: decimal;
  list-style-position: outside;
  margin: 0;
  padding-inline-start: 1.25rem;
}

.community-rich-text-view :deep(li) {
  margin: 0;
  line-height: 1.5;
}

.community-rich-text-view :deep(strong) {
  color: #ffffff;
}

.community-rich-text-view :deep(a) {
  text-decoration: underline;
}
</style>
