import { slugify } from '~~/shared/utils/slugify';

/** What `slugify` keeps, so a card image name cannot carry a path. */
const CARD_IMAGE_SLUG = /^[a-z0-9_@]+(?:-[a-z0-9_@]+)*$/;

export function cardImageSlug(name: string): string | null {
  const slug = slugify(name);
  return CARD_IMAGE_SLUG.test(slug) ? slug : null;
}

/** True when `key` is the wallpaper or card back uploaded for this name. */
export function isCardImageKeyFor(
  key: string,
  kind: 'wallpaper' | 'back',
  name: string
) {
  const slug = cardImageSlug(name);
  if (!slug) return false;
  return new RegExp(
    `^uploads/${kind}-${slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.(?:webp|jpg|png)$`
  ).test(key);
}
