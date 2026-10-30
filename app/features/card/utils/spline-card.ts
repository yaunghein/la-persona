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

/** Render `https://www.example.com/` as `www.example.com`. */
function displayWebsite(website: string | null | undefined) {
  return (website || '')
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/$/, '');
}

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
      website: displayWebsite(card.website),
    };
  }

  return {
    name: fullname,
    position: card.position || '',
    phone,
    email: card.email || '',
    website: displayWebsite(card.website),
  };
}

export function formatJoinedMonth(value: string | Date | null | undefined) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return format(date, 'MMM yyyy');
}

export function splineVariablesForCommunityCard(card: SplineCardFields) {
  const name = [card.firstName, card.lastName].filter(Boolean).join(' ').trim();

  return {
    name,
    position: card.position || '',
    joined_month: formatJoinedMonth(card.joinedAt),
  };
}

/** Spline variables must be strings; drop the ones a card does not have. */
function definedVariables(values: Record<string, string | undefined>) {
  return Object.fromEntries(
    Object.entries(values).filter(
      (entry): entry is [string, string] => entry[1] !== undefined
    )
  );
}

// Spline ignores variables a scene does not define, so one payload serves both card types.
export function applyCombinedCardToSpline(
  spline: { setVariables: (values: Record<string, string>) => void },
  card: SplineCardFields
) {
  spline.setVariables(
    definedVariables({
      ...splineVariablesForCard(card),
      ...splineVariablesForCommunityCard(card),
    })
  );
}
