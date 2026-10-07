import { defineComponent, h } from 'vue';
import ThakhinTableSortHeader from '~/components/thakhin/table-sort-header.vue';

export const THAKHIN_TABLE_UI = {
  base: 'min-w-full border-separate border-spacing-0',
  thead: 'bg-white/[0.03]',
  th: 'h-11 px-4 text-left align-middle text-xs font-medium text-white/45 first:pl-5 last:pr-3',
  td: 'border-t border-white/[0.06] px-4 py-3.5 align-middle text-sm text-white/80 first:pl-5 last:pr-3',
  tr: 'transition-colors hover:bg-white/[0.03] data-[selectable=true]:cursor-pointer',
  separator: 'hidden',
  empty: 'py-16 text-center text-sm text-white/40',
} as const;

type SortableColumn = {
  getIsSorted: () => false | 'asc' | 'desc';
  toggleSorting: (desc?: boolean) => void;
};

export function thakhinSortableHeader(label: string) {
  return defineComponent({
    name: 'ThakhinSortableHeader',
    props: {
      column: {
        type: Object,
        required: true,
      },
    },
    setup(props) {
      return () =>
        h(ThakhinTableSortHeader, {
          column: props.column as SortableColumn,
          label,
        });
    },
  });
}

export const THAKHIN_ACTIONS_COLUMN = {
  id: 'actions',
  header: '',
  enableSorting: false,
  enableGlobalFilter: false,
  meta: {
    class: {
      th: 'sticky right-0 z-10 w-14 border-l border-white/10 bg-[#161616]',
      td: 'sticky right-0 z-10 w-14 border-l border-white/10 bg-[#121212]',
    },
  },
} as const;
