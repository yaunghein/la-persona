import { defineComponent, h } from 'vue';
import ThakhinTableSortHeader from '~/components/thakhin/table-sort-header.vue';

export const THAKHIN_TABLE_UI = {
  th: 'px-4 py-4 border-b border-[#232323] text-xs font-semibold tracking-wide uppercase text-white',
  td: 'px-4 py-4 border-b border-[#232323] text-sm text-[#8b8b8b]',
  tr: 'bg-transparent',
  empty: 'py-16 text-center text-sm text-muted',
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
} as const;
