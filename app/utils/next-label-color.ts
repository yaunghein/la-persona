import {
  LABEL_BRAND_COLORS,
  LABEL_EXTRA_COLORS,
} from '~~/shared/constants/label';

/** The first palette color no label uses yet, so new labels start out distinct. */
export function nextLabelColor(labels: { color: string }[]): string {
  const used = new Set(labels.map((label) => label.color));
  return (
    [...LABEL_BRAND_COLORS, ...LABEL_EXTRA_COLORS].find(
      (color) => !used.has(color)
    ) ?? LABEL_BRAND_COLORS[0]
  );
}
