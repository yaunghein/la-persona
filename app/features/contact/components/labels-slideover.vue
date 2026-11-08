<script setup lang="ts">
const open = defineModel<boolean>('open', { default: false });

const { data: labels, isLoading } = useContactLabelsQuery();
const { mutateAsync: createLabel } = useCreateContactLabelMutation();
const { mutateAsync: updateLabel } = useUpdateContactLabelMutation();
const { mutateAsync: deleteLabel } = useDeleteContactLabelMutation();
</script>

<template>
  <UiLabelsSlideover
    v-model:open="open"
    :labels="labels ?? []"
    :loading="isLoading"
    noun="contact"
    :create-label="createLabel"
    :update-label="(labelId, input) => updateLabel({ labelId, input })"
    :delete-label="deleteLabel"
  />
</template>
