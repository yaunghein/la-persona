import { user, card, contactExchange } from '~~/server/db/schema';
import type { InferSelectModel } from 'drizzle-orm';
import type { InjectionKey, Ref } from 'vue';

export type User = InferSelectModel<typeof user>;

export type Card = InferSelectModel<typeof card>;
export type CardDTO = Omit<Card, 'createdAt' | 'updatedAt'> & {
  createdAt: string;
  updatedAt: string;
};

export type ContactExchange = InferSelectModel<typeof contactExchange>;
export type ContactExchangeDTO = Omit<
  ContactExchange,
  'createdAt' | 'updatedAt'
> & {
  createdAt: string;
  updatedAt: string;
};

export const SECTIONS = {
  MASTERPIECES: 'masterpieces',
  HOW_IT_WORKS: 'how-it-works',
  WHY_US: 'why-us',
  COMMISSION_US: 'commission-us',
  FOUNDERS_CLUB: 'founders-club',
};

export type currentSectionType =
  | (typeof SECTIONS)[keyof typeof SECTIONS]
  | null;

export interface LandingContext {
  SECTIONS: {
    MASTERPIECES: string;
    HOW_IT_WORKS: string;
    WHY_US: string;
    COMMISSION_US: string;
  };
  isHeaderVisible: Ref<boolean>;
  currentSection: Ref<currentSectionType>;
}

export const LandingContextKey: InjectionKey<LandingContext> =
  Symbol('landing-context');
