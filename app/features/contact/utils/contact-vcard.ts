import type { ContactSummary } from '~~/shared/contracts/contact';
import { imageProxyUrl } from '~/features/media/composables/use-image-upload';
import { vcfPhoneLines } from '~~/shared/utils/phone';
import { resolveObjectStorageUrl } from '~~/shared/utils/object-storage';

type VcardPhoto = { base64: string; imageType: 'JPEG' | 'PNG' };

function resolveAvatarUrl(avatarUrl: string | null | undefined) {
  const raw = avatarUrl?.trim();
  if (!raw) return null;
  if (
    raw.startsWith('http://') ||
    raw.startsWith('https://') ||
    raw.startsWith('/') ||
    raw.startsWith('data:')
  ) {
    return raw;
  }
  return resolveObjectStorageUrl(raw);
}

function photoKind(bytes: Uint8Array): VcardPhoto['imageType'] | null {
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return 'JPEG';
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return 'PNG';
  }
  return null;
}

function toBase64(bytes: Uint8Array) {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export async function contactAvatarPhoto(
  avatarUrl: string | null | undefined
): Promise<VcardPhoto | null> {
  const url = resolveAvatarUrl(avatarUrl);
  if (!url) return null;

  for (const candidate of [imageProxyUrl(url), url]) {
    try {
      const response = await fetch(candidate, { cache: 'no-store' });
      if (!response.ok) continue;
      const bytes = new Uint8Array(await response.arrayBuffer());
      const imageType = photoKind(bytes);
      if (!imageType) continue;
      return { base64: toBase64(bytes), imageType };
    } catch {
      continue;
    }
  }
  return null;
}

function escapeVcardValue(value: string) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\;');
}

function splitFullName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { firstName: parts[0] || '', lastName: '' };
  return {
    firstName: parts.slice(0, -1).join(' '),
    lastName: parts[parts.length - 1] || '',
  };
}

/** vCard 3.0 for saving a contact to the phone's address book. */
export function toContactVcard(
  contact: ContactSummary,
  photo?: VcardPhoto | null
): string {
  const fullName = contact.name.trim();
  const { firstName, lastName } = splitFullName(fullName);
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN;CHARSET=UTF-8:${escapeVcardValue(fullName)}`,
    `N;CHARSET=UTF-8:${escapeVcardValue(lastName)};${escapeVcardValue(firstName)};;;`,
    photo ? `PHOTO;ENCODING=b;TYPE=${photo.imageType}:${photo.base64}` : '',
    ...vcfPhoneLines(contact.phone, contact.phoneCountryCode).map(
      (value) => `TEL;TYPE=CELL:${escapeVcardValue(value)}`
    ),
    contact.email
      ? `EMAIL;CHARSET=UTF-8;TYPE=INTERNET:${escapeVcardValue(contact.email)}`
      : '',
    contact.position
      ? `TITLE;CHARSET=UTF-8:${escapeVcardValue(contact.position)}`
      : '',
    contact.company
      ? `ORG;CHARSET=UTF-8:${escapeVcardValue(contact.company)}`
      : '',
    `REV:${new Date().toISOString()}`,
    'END:VCARD',
  ].filter(Boolean);
  return `${lines.join('\r\n')}\r\n`;
}

export function contactVcardFileName(contact: Pick<ContactSummary, 'name'>) {
  const slug = contact.name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return `${slug || 'contact'}.vcf`;
}
