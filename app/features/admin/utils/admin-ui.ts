export const ADMIN_PAGE_CLASS = 'flex flex-col gap-5 sm:gap-8';

export const ADMIN_PRIMARY_BUTTON_CLASS =
  'h-10 cursor-pointer rounded-full border-2 border-raised bg-ink px-5 text-sm font-medium text-ink-inverse hover:bg-ink/90';

export const ADMIN_SLIDEOVER_BUTTON_CLASS =
  'h-10 cursor-pointer rounded-full bg-ink pr-6 pl-5 text-sm font-medium text-ink-inverse hover:bg-ink/90';

export const ADMIN_GHOST_BUTTON_CLASS =
  'h-10 cursor-pointer rounded-full px-5 text-sm font-medium text-subtle hover:bg-raised hover:text-ink';

export const ADMIN_DANGER_BUTTON_CLASS =
  'h-10 cursor-pointer rounded-full px-5 text-sm font-medium';

export const ADMIN_SLIDEOVER_UI = {
  content: 'bg-surface',
  header: 'border-b-2 border-raised px-6 py-6',
  title: 'text-sm font-medium tracking-[1.4px] text-ink uppercase',
  description: 'text-sm text-subtle',
  body: 'px-6',
} as const;

export const ADMIN_SEARCH_UI = {
  base: 'h-10 rounded-full border-0 bg-raised px-5 text-sm font-medium text-ink ring-0 placeholder:text-subtle focus-visible:ring-0',
  leading: 'ps-4',
  leadingIcon: 'size-4 text-ink',
  trailing: 'pe-4',
  trailingIcon: 'size-4 text-ink',
} as const;

export const ADMIN_FILTER_UI = {
  base: 'h-10 w-full rounded-full border-0 bg-raised ps-5 pe-10 text-sm font-medium text-ink ring-0 hover:bg-line focus-visible:ring-1 focus-visible:ring-line-strong',
  trailing: 'pe-4',
  trailingIcon: 'size-4 text-ink',
  placeholder: 'text-ink',
  value: 'truncate text-ink',
  content: 'min-w-56 rounded-lg bg-surface ring-1 ring-line',
  item: 'gap-2 px-2.5 py-2 text-sm',
} as const;

export type AdminPillTone =
  | 'ink'
  | 'gold'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'neutral';

const REVIEW_STATUS_PILLS: Record<
  string,
  { label: string; tone: AdminPillTone }
> = {
  pending: { label: 'Pending', tone: 'warning' },
  submitted: { label: 'Submitted', tone: 'warning' },
  approved: { label: 'Approved', tone: 'success' },
  accepted: { label: 'Accepted', tone: 'success' },
  rejected: { label: 'Rejected', tone: 'error' },
  declined: { label: 'Declined', tone: 'error' },
  expired: { label: 'Expired', tone: 'error' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
};

export function reviewStatusPill(status: string) {
  return REVIEW_STATUS_PILLS[status] ?? { label: status, tone: 'neutral' };
}

const PLAN_TONES: Record<string, AdminPillTone> = {
  standard: 'ink',
  premium: 'gold',
  'founder-club': 'gold',
  'friend-family': 'info',
};

export function planTone(planCode: string): AdminPillTone {
  return PLAN_TONES[planCode] ?? 'neutral';
}

export const ADMIN_TABS_UI = {
  root: 'w-full sm:w-fit',
  list: 'bg-surface w-full sm:w-fit rounded-lg p-1',
  indicator: 'bg-raised',
  trigger:
    'data-[state=active]:text-ink data-[state=inactive]:text-subtle rounded-md px-4 py-2.5 grow-0 whitespace-nowrap text-center sm:text-left',
} as const;
