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

export function websiteLabelForSpline(website: string | null | undefined): string {
  if (!website?.trim()) return '';
  const raw = website.trim();
  try {
    const url = new URL(raw.includes('://') ? raw : `https://${raw}`);
    const host = url.hostname.toUpperCase();
    const path =
      url.pathname && url.pathname !== '/'
        ? url.pathname.replace(/\/$/, '').toUpperCase()
        : '';
    return path ? `${host}${path}` : host;
  } catch {
    return raw
      .replace(/^https?:\/\//i, '')
      .replace(/\/$/, '')
      .toUpperCase();
  }
}

export function splineVariablesForCard(card: SplineCardFields) {
  const firstName = card.firstName?.toUpperCase() || '';
  const lastName = card.lastName?.toUpperCase() || '';
  const fullname = [card.firstName, card.lastName]
    .filter(Boolean)
    .join(' ')
    .trim()
    .toUpperCase();
  const planCode = card.planCode;
  const isFounderSubscription =
    planCode === 'founder' || planCode === 'founder-club';
  const phone = card.phone?.trim()
    ? internationalPhone(card.phone, card.phoneCountryCode)
    : '';

  if (isFounderSubscription) {
    return {
      firstname: firstName,
      lastname: lastName,
      position: card.position?.toUpperCase() || '',
      phone,
      email: card.email?.toUpperCase() || '',
      website: websiteLabelForSpline(card.website),
    };
  }

  return {
    name: fullname,
    position: card.position?.toUpperCase() || '',
    phone,
    email: card.email?.toUpperCase() || '',
    website: websiteLabelForSpline(card.website),
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
    .trim()
    .toUpperCase();

  return {
    name,
    position: card.position?.toUpperCase() || '',
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
