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
    /** Query keys for the search box and page; a page with two tables needs two. */
    searchQueryKey?: string;
    pageQueryKey?: string;
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
  const page = useQueryPage(options?.pageQueryKey ?? 'page');
  const pageSize = options?.itemsPerPage ?? 10;
  const pagination = computed({
    get: () => ({ pageIndex: page.value - 1, pageSize }),
    set: (value: { pageIndex: number }) => {
      page.value = value.pageIndex + 1;
    },
  });
  const paginationOptions = {
    getPaginationRowModel: getPaginationRowModel(),
    // TanStack jumps to page 1 whenever the rows change, e.g. after a delete refetch.
    autoResetPageIndex: false,
  };

  const paginationTotal = computed(
    () =>
      table.value?.tableApi?.getFilteredRowModel().rows.length ??
      toValue(fallbackTotal)
  );

  function resetPage() {
    page.value = 1;
  }

  function onPageChange(value: number) {
    page.value = value;
  }

  watch(globalFilter, resetPage);

  // Deleting the last row of the last page would leave an empty page. A total
  // of 0 is skipped so a URL page survives the first load.
  watch(paginationTotal, (total) => {
    const lastPage = Math.max(1, Math.ceil(total / pageSize));
    if (total > 0 && page.value > lastPage) page.value = lastPage;
  });

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
