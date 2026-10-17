const COMMUNITY_LOGO_PLACEHOLDER = '/images/community-placeholder.jpg';
const COMMUNITY_COVER_PLACEHOLDER = '/images/community-cover-placeholder.jpg';

function hashString(value: string) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function communityAvatarFallbackUrl(seed: string) {
  const value = seed.trim() || 'community';
  const hash = hashString(value);
  const hueA = Math.round((((hash % 100000) * 0.61803398875) % 1) * 360);
  const hueB = (hueA + 55) % 360;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hueA} 78% 52%)"/><stop offset="1" stop-color="hsl(${hueB} 72% 42%)"/></linearGradient></defs><rect width="80" height="80" fill="url(#g)"/></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function communityLogoSrc(url: string | null | undefined, name: string) {
  const value = String(url || '').trim();
  if (!value || value === COMMUNITY_LOGO_PLACEHOLDER) {
    return communityAvatarFallbackUrl(name);
  }
  return value;
}

export function communityCoverSrc(url: string | null | undefined) {
  const value = String(url || '').trim();
  if (!value || value === COMMUNITY_COVER_PLACEHOLDER) return null;
  return value;
}

export const INVITATION_COVER_FALLBACK = '/images/reveal-image.webp';
export const INVITATION_LOGO_FALLBACK = '/images/favicon.png';

export function invitationCoverSrc(url: string | null | undefined) {
  return communityCoverSrc(url) || INVITATION_COVER_FALLBACK;
}

export function invitationLogoSrc(url: string | null | undefined) {
  const value = String(url || '').trim();
  if (!value || value === COMMUNITY_LOGO_PLACEHOLDER) {
    return INVITATION_LOGO_FALLBACK;
  }
  return value;
}

export function communityInviteMeta(params: {
  memberCount: number;
  eventCount: number;
  foundedYear: number;
}) {
  const memberLabel = params.memberCount === 1 ? 'Member' : 'Members';
  return [
    `${params.memberCount.toLocaleString()} ${memberLabel}`,
    `${params.eventCount.toLocaleString()} Event Hosted`,
    `Founded in ${params.foundedYear}`,
  ];
}
