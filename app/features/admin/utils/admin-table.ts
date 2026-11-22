import { h } from 'vue';
import AdminTableSortHeader from '~/features/admin/components/table-sort-header.vue';

export const ADMIN_TABLE_UI = {
  th: 'px-4 py-4 border-b border-raised text-left align-middle text-sm font-medium uppercase tracking-widest text-ink',
  td: 'px-4 py-4 border-b border-raised align-middle text-sm font-medium text-muted',
  tr: 'bg-transparent data-[selectable=true]:cursor-pointer',
  empty: 'py-16 text-center text-sm text-muted',
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
      th: 'sticky right-0 z-10 w-14 border-l border-raised bg-surface',
      td: 'sticky right-0 z-10 w-14 border-l border-raised bg-surface',
    },
  },
} as const;
