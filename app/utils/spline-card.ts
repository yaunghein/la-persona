import { format } from 'date-fns';
import { internationalPhone } from '~~/shared/utils/phone';

export type SplineCardFields = {
  firstName?: string | null;
  lastName?: string | null;
  position?: string | null;
  phone?: string | null;
  phoneCountryCode?: string | null;
  email?: string | null;
  website?: string | null;
  planCode?: string | null;
  joinedAt?: string | Date | null;
};

export function splineVariablesForCard(card: SplineCardFields) {
  const fullname = [card.firstName, card.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();
  const planCode = card.planCode;
  const isFounderSubscription =
    planCode === 'founder' || planCode === 'founder-club';
  const phone = card.phone?.trim()
    ? internationalPhone(card.phone, card.phoneCountryCode)
    : '';

  if (isFounderSubscription) {
    return {
      firstname: card.firstName || '',
      lastname: card.lastName || '',
      position: card.position || '',
      phone,
      email: card.email || '',
      website: card.website || '',
    };
  }

  return {
    name: fullname,
    position: card.position || '',
    phone,
    email: card.email || '',
    website: card.website || '',
  };
}

export function formatJoinedMonth(value: string | Date | null | undefined) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return format(date, 'MMM yyyy');
}

export function splineVariablesForCommunityCard(card: SplineCardFields) {
  const name = [card.firstName, card.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();

  return {
    name,
    position: card.position || '',
    joined_month: formatJoinedMonth(card.joinedAt),
  };
}

export function applyCardToSpline(
  spline: { setVariables: (values: Record<string, string>) => void },
  card: SplineCardFields
) {
  spline.setVariables(splineVariablesForCard(card));
}

export function applyCommunityCardToSpline(
  spline: { setVariables: (values: Record<string, string>) => void },
  card: SplineCardFields
) {
  spline.setVariables(splineVariablesForCommunityCard(card));
}

// Spline ignores variables a scene does not define, so one payload serves both card types.
export function applyCombinedCardToSpline(
  spline: { setVariables: (values: Record<string, string>) => void },
  card: SplineCardFields
) {
  spline.setVariables({
    ...splineVariablesForCard(card),
    ...splineVariablesForCommunityCard(card),
  });
}
