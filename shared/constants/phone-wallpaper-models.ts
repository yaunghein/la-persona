export type PhoneWallpaperModel = {
  label: string;
  value: string;
  width: number;
  height: number;
};

export const phoneWallpaperModels: PhoneWallpaperModel[] = [
  { label: 'iPhone 17', value: 'iphone-17', width: 1206, height: 2622 },
  { label: 'iPhone 17 Pro', value: 'iphone-17-pro', width: 1206, height: 2622 },
  {
    label: 'iPhone 17 Pro Max',
    value: 'iphone-17-pro-max',
    width: 1320,
    height: 2868,
  },
  { label: 'iPhone Air', value: 'iphone-air', width: 1260, height: 2736 },
  { label: 'iPhone 16', value: 'iphone-16', width: 1179, height: 2556 },
  { label: 'iPhone 16 Pro', value: 'iphone-16-pro', width: 1206, height: 2622 },
  {
    label: 'iPhone 16 Pro Max',
    value: 'iphone-16-pro-max',
    width: 1320,
    height: 2868,
  },
  { label: 'iPhone 16 Plus', value: 'iphone-16-plus', width: 1290, height: 2796 },
  { label: 'iPhone 15 Pro', value: 'iphone-15-pro', width: 1179, height: 2556 },
  { label: 'iPhone 15', value: 'iphone-15', width: 1179, height: 2556 },
  {
    label: 'iPhone 15 Pro Max',
    value: 'iphone-15-pro-max',
    width: 1290,
    height: 2796,
  },
  { label: 'iPhone 15 Plus', value: 'iphone-15-plus', width: 1290, height: 2796 },
  { label: 'iPhone 14 Plus', value: 'iphone-14-plus', width: 1284, height: 2778 },
  {
    label: 'iPhone 14 Pro Max',
    value: 'iphone-14-pro-max',
    width: 1290,
    height: 2796,
  },
  { label: 'iPhone 14 Pro', value: 'iphone-14-pro', width: 1179, height: 2556 },
  { label: 'iPhone 14', value: 'iphone-14', width: 1170, height: 2532 },
  {
    label: 'Android Compact',
    value: 'android-compact',
    width: 1236,
    height: 2751,
  },
  {
    label: 'Android Medium',
    value: 'android-medium',
    width: 2100,
    height: 2520,
  },
  {
    label: 'iPhone 13 Pro Max',
    value: 'iphone-13-pro-max',
    width: 1284,
    height: 2778,
  },
  { label: 'iPhone 13 Pro', value: 'iphone-13-pro', width: 1170, height: 2532 },
  { label: 'iPhone 13', value: 'iphone-13', width: 1170, height: 2532 },
  { label: 'iPhone X', value: 'iphone-x', width: 1125, height: 2436 },
  { label: 'iPhone 13 mini', value: 'iphone-13-mini', width: 1125, height: 2436 },
  {
    label: 'iPhone 11 Pro Max',
    value: 'iphone-11-pro-max',
    width: 1242,
    height: 2688,
  },
  { label: 'iPhone 11 Pro', value: 'iphone-11-pro', width: 1125, height: 2436 },
  { label: 'iPhone 11', value: 'iphone-11', width: 1242, height: 2688 },
  { label: 'iPhone SE', value: 'iphone-se', width: 960, height: 1704 },
  { label: 'iPhone 8 Plus', value: 'iphone-8-plus', width: 1242, height: 2208 },
  { label: 'iPhone 8', value: 'iphone-8', width: 1125, height: 2001 },
  { label: 'Android Small', value: 'android-small', width: 1080, height: 1920 },
  { label: 'Android Large', value: 'android-large', width: 1080, height: 2400 },
  {
    label: 'Google Pixel 2',
    value: 'google-pixel-2',
    width: 1233,
    height: 2193,
  },
  {
    label: 'Google Pixel 2 XL',
    value: 'google-pixel-2-xl',
    width: 1233,
    height: 2469,
  },
];

export function closestPhoneWallpaperModel(width: number, height: number) {
  const targetWidth = Math.min(width, height);
  const targetHeight = Math.max(width, height);
  let best = phoneWallpaperModels[0]!;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const model of phoneWallpaperModels) {
    const score =
      Math.abs(model.width - targetWidth) + Math.abs(model.height - targetHeight);
    if (score < bestScore) {
      best = model;
      bestScore = score;
    }
  }

  return best;
}
