import {
  CONTACT_LINK_LABELS,
  contactLinkValue,
  type ContactLinkLabel,
  type ContactLinkSource,
  type SocialFormLink,
} from '~~/shared/utils/social-links';

export type PrefilledContactLinks = Partial<Record<ContactLinkLabel, string>>;

type ContactLinkPrefillState = ContactLinkSource & {
  socials: SocialFormLink[];
  prefilledLinks: PrefilledContactLinks;
};

/**
 * Adds a contact field as a social link once. The user can still remove or
 * edit it, and only a link we added follows later changes to the field.
 */
export function useContactLinkPrefill(state: ContactLinkPrefillState) {
  const { isValidCardLinkValue } = useUrlNormalization();

  function insertIndex(label: ContactLinkLabel) {
    const order = CONTACT_LINK_LABELS.indexOf(label);
    let index = 0;
    state.socials.forEach((link, i) => {
      const linkOrder = CONTACT_LINK_LABELS.indexOf(
        link.label as ContactLinkLabel
      );
      if (linkOrder !== -1 && linkOrder < order) index = i + 1;
    });
    return index;
  }

  function prefill(label: ContactLinkLabel) {
    const value = contactLinkValue(label, state);
    if (!value || !isValidCardLinkValue(value, label)) return;

    const previous = state.prefilledLinks[label];
    const existing = state.socials.find((link) => link.label === label);

    if (!existing) {
      if (previous !== undefined) return;
      state.socials.splice(insertIndex(label), 0, {
        label,
        value,
        customLabel: '',
      });
    } else if (existing.value === previous) {
      existing.value = value;
    } else {
      return;
    }

    state.prefilledLinks[label] = value;
  }

  return { prefill };
}
