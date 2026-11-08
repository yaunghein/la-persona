import type { Label } from '~~/shared/contracts/label';

export type LabelGroup<T> = {
  key: string;
  /** `null` is the group of items without any label. */
  label: Label | null;
  items: T[];
};

export type LabelGroupRow<T> =
  | { key: string; group: LabelGroup<T>; item?: never }
  | { key: string; item: T; group?: never };

/** Someone with two labels appears in both groups, so group sizes can add up to more than the total. */
export function groupByLabel<T extends { labels: Label[] }>(
  items: T[],
  labels: Label[]
): LabelGroup<T>[] {
  const groups: LabelGroup<T>[] = labels.map((label) => ({
    key: label.id,
    label,
    items: items.filter((item) =>
      item.labels.some((itemLabel) => itemLabel.id === label.id)
    ),
  }));
  groups.push({
    key: 'none',
    label: null,
    items: items.filter((item) => !item.labels.length),
  });
  return groups.filter((group) => group.items.length);
}

/** Flattens groups into table rows: a header row per group, then its items unless collapsed. */
export function labelGroupRows<T extends { id: string }>(
  groups: LabelGroup<T>[],
  collapsedKeys: string[]
): LabelGroupRow<T>[] {
  return groups.flatMap((group) => [
    { key: group.key, group },
    ...(collapsedKeys.includes(group.key)
      ? []
      : group.items.map((item) => ({ key: `${group.key}:${item.id}`, item }))),
  ]);
}
