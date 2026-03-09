export const SOCIAL_MEDIA_LINK_LABELS = [
  'Facebook',
  'Github',
  'Gmail',
  'Instagram',
  'Line',
  'LinkedIn',
  'Telegram',
  'Tiktok',
  'WhatsApp',
] as const;

export const OTHER_LINK_LABELS = [
  'Website',
  'Direct Message',
  'Portfolio',
  'Case Studies',
  'Booking',
] as const;

export const CARD_LINK_LABELS = [
  ...SOCIAL_MEDIA_LINK_LABELS,
  ...OTHER_LINK_LABELS,
] as const;

export const CARD_LINK_SELECT_ITEMS: string[][] = [
  [...SOCIAL_MEDIA_LINK_LABELS],
  [...OTHER_LINK_LABELS],
];

export type CardLinkLabel = (typeof CARD_LINK_LABELS)[number];

export const DEFAULT_CARD_LINK_LABEL: CardLinkLabel = 'Website';

export function createEmptyCardLink(
  label: CardLinkLabel = DEFAULT_CARD_LINK_LABEL
) {
  return { label, value: '' };
}
