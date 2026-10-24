import { h } from 'vue';
import AdminTableSortHeader from '~/features/admin/components/table-sort-header.vue';

export const ADMIN_TABLE_UI = {
  base: 'min-w-full border-separate border-spacing-0',
  thead: 'bg-ink/[0.03]',
  th: 'h-11 px-4 text-left align-middle text-xs font-medium text-ink/45 first:pl-5 last:pr-3',
  td: 'border-t border-ink/[0.06] px-4 py-3.5 align-middle text-sm text-ink/80 first:pl-5 last:pr-3',
  tr: 'transition-colors hover:bg-ink/[0.03] data-[selectable=true]:cursor-pointer',
  separator: 'hidden',
  empty: 'py-16 text-center text-sm text-ink/40',
} as const;

type SortableColumn = {
  getIsSorted: () => false | 'asc' | 'desc';
  toggleSorting: (desc?: boolean) => void;
};

/** Column header that toggles sorting on click (TanStack column API). */
export function sortableHeader(label: string) {
  return ({ column }: { column: SortableColumn }) =>
    h(AdminTableSortHeader, { column, label });
}

export const ADMIN_ACTIONS_COLUMN = {
  id: 'actions',
  header: '',
  enableSorting: false,
  enableGlobalFilter: false,
  meta: {
    class: {
      th: 'sticky right-0 z-10 w-14 border-l border-ink/10 bg-[#e6e6e9] dark:bg-[#161616]',
      td: 'sticky right-0 z-10 w-14 border-l border-ink/10 bg-canvas',
    },
  },
} as const;
