import type { MaybeRefOrGetter } from 'vue';

const SITE_NAME = 'LA PERSONA';
const DEFAULT_IMAGE = { path: '/og.png', width: 1050, height: 600 };

type PageSeoOptions = {
  title: MaybeRefOrGetter<string>;
  description?: MaybeRefOrGetter<string | null | undefined>;
  /** Absolute URL or site-relative path. Falls back to /og.png. */
  image?: MaybeRefOrGetter<string | null | undefined>;
  imageAlt?: MaybeRefOrGetter<string | null | undefined>;
  type?: 'website' | 'profile' | 'article';
  noindex?: boolean;
};

const HTML_ENTITIES: Record<string, string> = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
};

/** Plain text (rich-text HTML stripped) trimmed to `max` characters on a word boundary, for meta descriptions. */
export function truncateSeoText(value: string, max = 160) {
  const text = value
    .replace(/<[^>]*>/g, ' ')
    .replace(
      /&(?:nbsp|amp|lt|gt|quot|#39);/g,
      (entity) => HTML_ENTITIES[entity] ?? entity
    )
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

export function useSiteOrigin() {
  const baseUrl = String(useRuntimeConfig().public.baseUrl || '');
  return (baseUrl || useRequestURL().origin).replace(/\/$/, '');
}

export function usePageSeo(options: PageSeoOptions) {
  const route = useRoute();
  const origin = useSiteOrigin();

  const absoluteUrl = (value: string) =>
    /^https?:\/\//i.test(value)
      ? value
      : `${origin}${value.startsWith('/') ? '' : '/'}${value}`;

  const customImage = computed(() =>
    String(toValue(options.image) || '').trim()
  );
  const image = computed(() =>
    absoluteUrl(customImage.value || DEFAULT_IMAGE.path)
  );
  const isDefaultImage = computed(() => !customImage.value);
  const url = computed(() => `${origin}${route.path}`);
  const title = computed(() => toValue(options.title));
  const description = computed(
    () => toValue(options.description)?.trim() || undefined
  );
  const imageAlt = computed(() => toValue(options.imageAlt) || title.value);

  useSeoMeta({
    title,
    ogTitle: title,
    twitterTitle: title,
    description,
    ogDescription: description,
    twitterDescription: description,
    ogImage: image,
    twitterImage: image,
    ogImageAlt: imageAlt,
    twitterImageAlt: imageAlt,
    ogImageWidth: () =>
      isDefaultImage.value ? DEFAULT_IMAGE.width : undefined,
    ogImageHeight: () =>
      isDefaultImage.value ? DEFAULT_IMAGE.height : undefined,
    ogUrl: url,
    ogSiteName: SITE_NAME,
    ogType: options.type ?? 'website',
    twitterCard: 'summary_large_image',
    robots: options.noindex ? 'noindex, nofollow' : undefined,
  });

  useHead({
    link: [{ rel: 'canonical', href: url }],
  });
}
