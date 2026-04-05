export type ThakhinCardPlanAssetDefaults = {
  splineUrl: string;
  wallpaperS3Key: string;
  cardBackS3Key: string;
};

type ThakhinCardPlanAssetDefaultsKeys =
  | 'founders'
  | 'friends-family'
  | 'standard';

export const THAKHIN_CARD_PLAN_ASSET_DEFAULTS: Record<
  ThakhinCardPlanAssetDefaultsKeys,
  ThakhinCardPlanAssetDefaults
> = {
  founders: {
    splineUrl: 'https://prod.spline.design/RLMffXoyzfSZ0XE3/scene.splinecode',
    wallpaperS3Key: 'uploads/wallpaper-founders.webp',
    cardBackS3Key: 'uploads/back-founders.webp',
  },
  'friends-family': {
    splineUrl: 'https://prod.spline.design/AUU-ZUF6pr29W4pN/scene.splinecode',
    wallpaperS3Key: 'uploads/wallpaper-friends-family.webp',
    cardBackS3Key: 'uploads/back-friends-family.webp',
  },
  standard: {
    splineUrl: 'https://prod.spline.design/vcl6OiI2eMVd1UlQ/scene.splinecode',
    wallpaperS3Key: 'uploads/wallpaper-standard.webp',
    cardBackS3Key: 'uploads/back-standard.webp',
  },
};

export function getThakhinCardPlanAssetDefaults(
  planCode: string
): ThakhinCardPlanAssetDefaults {
  const map = THAKHIN_CARD_PLAN_ASSET_DEFAULTS;
  const key = planCode as keyof typeof map;
  return map[key] ?? map.standard;
}
