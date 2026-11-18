export function cardNeedsSetup(card: {
  socials?: unknown[] | null;
  website?: string | null;
}) {
  return (!card.socials || card.socials.length === 0) && card.website == null;
}
