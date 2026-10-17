import type { ContactSummary } from '~~/shared/contracts/contact';
import { vcfPhoneLines } from '~~/shared/utils/phone';

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
export function toContactVcard(contact: ContactSummary): string {
  const fullName = contact.name.trim();
  const { firstName, lastName } = splitFullName(fullName);
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN;CHARSET=UTF-8:${escapeVcardValue(fullName)}`,
    `N;CHARSET=UTF-8:${escapeVcardValue(lastName)};${escapeVcardValue(firstName)};;;`,
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
