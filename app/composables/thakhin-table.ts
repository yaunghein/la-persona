import { getPaginationRowModel } from '@tanstack/vue-table';

type ThakhinSorting = { id: string; desc: boolean }[];

type ThakhinTableApi = {
  getFilteredRowModel: () => { rows: { length: number } };
  setPageIndex: (index: number) => void;
};

export function useThakhinTable(
  fallbackTotal: MaybeRefOrGetter<number>,
  options?: {
    defaultSort?: ThakhinSorting;
    itemsPerPage?: number;
  }
) {
  const table = useTemplateRef<{ tableApi: ThakhinTableApi }>('table');
  const globalFilter = ref('');
  const sorting = ref<ThakhinSorting>(
    options?.defaultSort ?? [{ id: 'createdAt', desc: true }]
  );
  const pagination = ref({
    pageIndex: 0,
    pageSize: options?.itemsPerPage ?? 10,
  });
  const paginationOptions = {
    getPaginationRowModel: getPaginationRowModel(),
  };

  const paginationTotal = computed(
    () =>
      table.value?.tableApi?.getFilteredRowModel().rows.length ??
      toValue(fallbackTotal)
  );

  function resetPage() {
    pagination.value = { ...pagination.value, pageIndex: 0 };
  }

  function onPageChange(page: number) {
    pagination.value = { ...pagination.value, pageIndex: page - 1 };
  }

  watch(globalFilter, resetPage);

  return {
    table,
    globalFilter,
    sorting,
    pagination,
    paginationOptions,
    paginationTotal,
    resetPage,
    onPageChange,
  };
}
