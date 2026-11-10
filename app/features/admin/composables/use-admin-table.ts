import { getPaginationRowModel } from '@tanstack/vue-table';

type AdminTableSorting = { id: string; desc: boolean }[];

type AdminTableApi = {
  getFilteredRowModel: () => { rows: { length: number } };
  setPageIndex: (index: number) => void;
};

export function useAdminTable(
  fallbackTotal: MaybeRefOrGetter<number>,
  options?: {
    defaultSort?: AdminTableSorting;
    itemsPerPage?: number;
    /** Query key for the search box; a page with two tables needs two. */
    searchQueryKey?: string;
    /** Template `ref` name; a page with two tables needs two. */
    tableRef?: string;
  }
) {
  const table = useTemplateRef<{ tableApi: AdminTableApi }>(
    options?.tableRef ?? 'table'
  );
  const globalFilter = useQueryState(options?.searchQueryKey ?? 'q', '');
  const sorting = ref<AdminTableSorting>(
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
