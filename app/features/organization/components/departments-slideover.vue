<script setup lang="ts">
type Department = { id: string; name: string };

const props = defineProps<{
  organizationSlug: string;
  departments: Department[];
}>();

const open = defineModel<boolean>('open', { default: false });

const emit = defineEmits<{ changed: [] }>();

const toast = useToast();
const newName = ref('');
const isCreating = ref(false);
const departmentToDelete = ref<Department | null>(null);
const isDeleting = ref(false);
const isDeleteOpen = computed({
  get: () => departmentToDelete.value !== null,
  set: (isOpen) => {
    if (!isOpen) departmentToDelete.value = null;
  },
});

function askToDelete(department: Department) {
  departmentToDelete.value = department;
}

async function addDepartment() {
  const name = newName.value.trim();
  if (!name || isCreating.value) return;
  isCreating.value = true;
  try {
    await $fetch(
      `/api/organizations/${props.organizationSlug}/departments` as string,
      { method: 'POST', body: { name } }
    );
    newName.value = '';
    emit('changed');
  } catch (error) {
    toast.add({
      title: 'Could not add department',
      description: apiErrorMessage(error),
      color: 'error',
    });
  } finally {
    isCreating.value = false;
  }
}

async function renameDepartment(department: Department, event: Event) {
  const input = event.target as HTMLInputElement;
  const name = input.value.trim();
  if (!name || name === department.name) {
    input.value = department.name;
    return;
  }
  try {
    await $fetch(
      `/api/organizations/${props.organizationSlug}/departments/${department.id}` as string,
      { method: 'PATCH', body: { name } }
    );
    emit('changed');
  } catch (error) {
    input.value = department.name;
    toast.add({
      title: 'Could not rename department',
      description: apiErrorMessage(error),
      color: 'error',
    });
  }
}

async function confirmDelete() {
  const department = departmentToDelete.value;
  if (!department) return;
  isDeleting.value = true;
  try {
    await $fetch(
      `/api/organizations/${props.organizationSlug}/departments/${department.id}` as string,
      { method: 'DELETE' }
    );
    departmentToDelete.value = null;
    emit('changed');
  } catch (error) {
    toast.add({
      title: 'Could not remove department',
      description: apiErrorMessage(error),
      color: 'error',
    });
  } finally {
    isDeleting.value = false;
  }
}

const inputBase =
  'h-10 rounded-[4px] border-line bg-raised text-sm text-ink placeholder:text-ink/50';
</script>

<template>
  <USlideover
    v-model:open="open"
    side="right"
    inset
    title="Departments"
    close-icon="i-material-symbols:close-small"
    :ui="{
      content: 'bg-surface',
      header: 'border-b-2 border-raised px-6 py-6',
      title: 'text-sm font-medium tracking-[1.4px] text-ink uppercase',
      body: 'px-6',
    }"
  >
    <template #title>
      Departments
      <span class="ml-2 text-subtle tabular-nums">{{
        departments.length
      }}</span>
    </template>

    <template #body>
      <p
        v-if="!departments.length"
        class="py-12 text-center text-sm text-subtle"
      >
        No departments yet. Add the first one&nbsp;below.
      </p>
      <ul v-else class="flex flex-col">
        <li
          v-for="department in departments"
          :key="department.id"
          class="flex items-center gap-2 border-b border-line py-2"
        >
          <UInput
            :model-value="department.name"
            variant="none"
            maxlength="80"
            :aria-label="`Name of ${department.name}`"
            class="min-w-0 flex-1"
            :ui="{
              base: 'h-9 rounded-[4px] px-2 text-sm font-medium text-ink hover:bg-raised focus:bg-raised',
            }"
            @change="renameDepartment(department, $event)"
            @keydown.enter="($event.target as HTMLInputElement).blur()"
          />
          <UTooltip :text="`Remove ${department.name}`">
            <UButton
              icon="i-lucide-trash-2"
              color="neutral"
              variant="ghost"
              class="text-muted"
              :aria-label="`Remove ${department.name}`"
              @click="askToDelete(department)"
            />
          </UTooltip>
        </li>
      </ul>
    </template>

    <template #footer>
      <form
        class="flex w-full items-center gap-2"
        @submit.prevent="addDepartment"
      >
        <UInput
          v-model="newName"
          placeholder="New department"
          maxlength="80"
          class="min-w-0 flex-1"
          :ui="{ base: inputBase }"
        />
        <UButton
          type="submit"
          label="Add"
          leading-icon="i-lucide-plus"
          color="neutral"
          :loading="isCreating"
          :disabled="!newName.trim()"
          class="h-10 cursor-pointer rounded-full bg-ink pr-5 pl-4 text-sm font-medium text-ink-inverse hover:bg-ink/90"
        />
      </form>
    </template>
  </USlideover>

  <UiConfirmDeleteModal
    v-model:open="isDeleteOpen"
    title="Remove department?"
    confirm-label="Remove"
    :pending="isDeleting"
    @confirm="confirmDelete"
  >
    <template v-if="departmentToDelete">
      {{ departmentToDelete.name }} is removed from every card that uses it.
      This can't be&nbsp;undone.
    </template>
  </UiConfirmDeleteModal>
</template>
