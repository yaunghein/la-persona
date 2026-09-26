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

export function applyCardToSpline(
  spline: { setVariables: (values: Record<string, string>) => void },
  card: SplineCardFields
) {
  spline.setVariables(splineVariablesForCard(card));
}
