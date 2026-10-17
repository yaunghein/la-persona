import { CARD_LINK_LABELS } from '~~/shared/constants/card-link-options';
import { internationalPhone } from '~~/shared/utils/phone';

export const CUSTOM_SOCIAL_LABEL = 'Custom';

export type SocialFormLink = {
  label: string;
  value: string;
  customLabel?: string;
};

export type SocialSubmitLink = {
  label: string;
  value: string;
};

export function createLinkTypeItemsWithCustom(items: string[][]): string[][] {
  return [[...(items[0] || [])], [...(items[1] || []), CUSTOM_SOCIAL_LABEL]];
}

export function normalizeSocialLinksForForm(
  links: Array<{ label?: string | null; value?: string | null }>
): SocialFormLink[] {
  const knownLinkLabels = new Set<string>(CARD_LINK_LABELS);

  return links.map((link) => {
    const label = String(link.label || '').trim();
    const value = String(link.value || '');

    if (!label || knownLinkLabels.has(label)) {
      return {
        label,
        value,
        customLabel: '',
      };
    }

    return {
      label: CUSTOM_SOCIAL_LABEL,
      value,
      customLabel: label,
    };
  });
}

export function resolveSocialLinksForSubmission(
  links: SocialFormLink[]
): SocialSubmitLink[] {
  return links.map((link) => {
    const resolvedLabel =
      link.label === CUSTOM_SOCIAL_LABEL ? link.customLabel : link.label;

    return {
      label: String(resolvedLabel || '').trim(),
      value: String(link.value || '').trim(),
    };
  });
}

export const CONTACT_LINK_LABELS = ['Gmail', 'Phone', 'Website'] as const;

export type ContactLinkLabel = (typeof CONTACT_LINK_LABELS)[number];

export type ContactLinkSource = {
  email?: string | null;
  phone?: string | null;
  phoneCountryCode?: string | null;
  website?: string | null;
};

export function contactLinkValue(
  label: ContactLinkLabel,
  source: ContactLinkSource
): string {
  if (label === 'Gmail') return String(source.email || '').trim();
  if (label === 'Phone') {
    return internationalPhone(
      String(source.phone || ''),
      source.phoneCountryCode
    );
  }
  return String(source.website || '').trim();
}

export function buildContactSocialLinks(
  source: ContactLinkSource
): SocialFormLink[] {
  return CONTACT_LINK_LABELS.map((label) => ({
    label,
    value: contactLinkValue(label, source),
    customLabel: '',
  })).filter((link) => link.value);
}

export function getCustomSocialLabelMissingIndexes(
  links: SocialFormLink[]
): number[] {
  return links.reduce<number[]>((acc, link, index) => {
    if (link.label !== CUSTOM_SOCIAL_LABEL) return acc;
    if (String(link.customLabel || '').trim().length > 0) return acc;
    acc.push(index);
    return acc;
  }, []);
}
