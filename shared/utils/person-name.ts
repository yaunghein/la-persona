/**
 * Splits a display name into first and last name for card fields. Missing
 * parts fall back to "My Card" so a card always has a printable name.
 */
export function splitPersonName(fullName: string | null | undefined) {
  const parts = (fullName?.trim() || '').split(/\s+/).filter(Boolean);
  if (!parts.length) return { firstName: 'My', lastName: 'Card' };
  return {
    firstName: parts[0]!,
    lastName: parts.length > 1 ? parts.slice(1).join(' ') : 'Card',
  };
}
