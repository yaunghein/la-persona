export const SECTIONS = {
  MASTERPIECES: 'masterpieces',
  HOW_IT_WORKS: 'how-it-works',
  WHY_US: 'why-us',
  COMMISSION_US: 'commission-us',
  FOUNDERS_CLUB: 'founders-club',
} as const;
export type CurrentSection = (typeof SECTIONS)[keyof typeof SECTIONS] | null;

export const LANDING_NAV_LINKS = [
  { label: 'The Masterpieces', id: SECTIONS.MASTERPIECES },
  { label: 'How It Works', id: SECTIONS.HOW_IT_WORKS },
  { label: 'Why Us?', id: SECTIONS.WHY_US },
  { label: 'Founders Club', id: SECTIONS.FOUNDERS_CLUB },
  { label: 'Commision Us', id: SECTIONS.COMMISSION_US },
] as const;
export type LandingNavLink = (typeof LANDING_NAV_LINKS)[number];

export const CARD_TYPES = {
  FOUNDERS_CLUB: 'founders_club',
  STANDARD: 'standard',
} as const;
export type CardType = (typeof CARD_TYPES)[keyof typeof CARD_TYPES] | null;
