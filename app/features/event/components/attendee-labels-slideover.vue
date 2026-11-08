<script setup lang="ts">
const props = defineProps<{ organizationSlug: string }>();

const open = defineModel<boolean>('open', { default: false });

const { data: labels, isLoading } = useAttendeeLabelsQuery(
  () => props.organizationSlug
);
const { mutateAsync: createLabel } = useCreateAttendeeLabelMutation(
  () => props.organizationSlug
);
const { mutateAsync: updateLabel } = useUpdateAttendeeLabelMutation();
const { mutateAsync: deleteLabel } = useDeleteAttendeeLabelMutation();
</script>

<template>
  <UiLabelsSlideover
    v-model:open="open"
    :labels="labels ?? []"
    :loading="isLoading"
    show-carry-over
    noun="attendee"
    :create-label="createLabel"
    :update-label="(labelId, input) => updateLabel({ labelId, input })"
    :delete-label="deleteLabel"
  />
</template>
