export const SOCIAL_MEDIA_LINK_LABELS = [
  'Facebook',
  'Github',
  'Gmail',
  'Instagram',
  'Line',
  'LinkedIn',
  'Telegram',
  'Tiktok',
  'Viber',
  'WhatsApp',
] as const;

export const OTHER_LINK_LABELS = [
  'Website',
  'Phone',
  'Address',
  'Direct Message',
  'Download Resume',
  'Buy Me Coffee',
  'Portfolio',
  'Case Studies',
  'Make Appointment',
] as const;

export const CARD_LINK_LABELS = [
  ...SOCIAL_MEDIA_LINK_LABELS,
  ...OTHER_LINK_LABELS,
] as const;

export const CARD_LINK_SELECT_ITEMS: string[][] = [
  [...SOCIAL_MEDIA_LINK_LABELS],
  [...OTHER_LINK_LABELS],
];

export const CARD_LINK_IMAGES: Partial<Record<CardLinkLabel, string>> = {
  Facebook: '/images/card/facebook.png',
  Github: '/images/card/github.png',
  Gmail: '/images/card/gmail.png',
  Instagram: '/images/card/instagram.webp',
  Line: '/images/card/line.png',
  LinkedIn: '/images/card/linkedin.png',
  Telegram: '/images/card/telegram.png',
  Tiktok: '/images/card/tiktok.png',
  Viber: '/images/card/viber.png',
  WhatsApp: '/images/card/whatsapp.png',
  Address: '/images/card/map.png',
  'Make Appointment': '/images/card/calendar.png',
};

const CARD_LINK_ICON_NAMES: Partial<Record<CardLinkLabel, string>> = {
  Phone: 'i-lucide-phone',
};

export type CardLinkMenuItem = {
  label: string;
  avatar?: { src: string; alt: string };
  icon?: string;
};

export function toCardLinkMenuItems(groups: string[][]): CardLinkMenuItem[][] {
  return groups.map((group) =>
    group.map((label) => {
      const src = CARD_LINK_IMAGES[label as CardLinkLabel];
      if (src) return { label, avatar: { src, alt: label } };
      return {
        label,
        icon: CARD_LINK_ICON_NAMES[label as CardLinkLabel] ?? 'i-lucide-globe',
      };
    })
  );
}

export type CardLinkLabel = (typeof CARD_LINK_LABELS)[number];

export const DEFAULT_CARD_LINK_LABEL: CardLinkLabel = 'Website';

/** LinkedIn when the card does not have one yet; otherwise the first open type. */
export function defaultNewLinkLabel(
  available: readonly string[] = [],
  used: readonly string[] = []
) {
  const usedLabels = new Set(used);
  const open = (available.length ? available : ['LinkedIn']).filter(
    (label) => label !== 'Custom' && !usedLabels.has(label)
  );
  if (open.includes('LinkedIn')) return 'LinkedIn';
  return open[0] ?? 'Custom';
}

export function createEmptyCardLink(
  label: CardLinkLabel = DEFAULT_CARD_LINK_LABEL
) {
  return { label, value: '' };
}
