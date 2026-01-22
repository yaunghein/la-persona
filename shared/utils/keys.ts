import type { InjectionKey, Ref } from 'vue';
import type { CurrentSection } from '~~/shared/utils/constants';

export type LandingContext = {
  SECTIONS: {
    MASTERPIECES: string;
    HOW_IT_WORKS: string;
    WHY_US: string;
    COMMISSION_US: string;
  };
  isHeaderVisible: Ref<boolean>;
  currentSection: Ref<CurrentSection>;
};

export const LandingContextKey = Symbol(
  'landing-context'
) as InjectionKey<LandingContext>;
