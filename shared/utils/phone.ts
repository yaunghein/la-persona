import {
  countries,
  getCountryFromCountryCode,
} from 'country-codes-flags-phone-codes';

export const DEFAULT_PHONE_COUNTRY_CODE = 'MM';

export function normalizePhoneCountryCode(
  countryCode: string | null | undefined
) {
  const code = countryCode?.trim().toUpperCase();
  if (code && getCountryFromCountryCode(code)) return code;
  return DEFAULT_PHONE_COUNTRY_CODE;
}

export function dialCodeForCountry(countryCode: string | null | undefined) {
  return (
    getCountryFromCountryCode(normalizePhoneCountryCode(countryCode))
      ?.dialCode || '+95'
  );
}

export function resolvedPhoneFields(
  phone: string | null | undefined,
  countryCode: string | null | undefined
) {
  const trimmed = phone?.trim() || '';
  if (!trimmed) {
    return { phone: null, phoneCountryCode: null };
  }

  return {
    phone: trimmed,
    phoneCountryCode: normalizePhoneCountryCode(countryCode),
  };
}

export function internationalPhone(
  phone: string,
  countryCode?: string | null
) {
  const trimmed = phone.trim();
  if (!trimmed || trimmed.startsWith('+')) return trimmed;

  const digits = trimmed.replace(/[\s()-]/g, '');
  const national = digits.startsWith('0') ? digits.slice(1) : digits;
  return `${dialCodeForCountry(countryCode)}${national}`;
}

export function vcfPhoneLines(
  phone: string | null | undefined,
  countryCode?: string | null
) {
  const local = phone?.trim() || '';
  if (!local) return [];
  if (local.startsWith('+')) return [local];

  const international = internationalPhone(local, countryCode);
  if (!international || international === local) return [local];
  return [international, local];
}
