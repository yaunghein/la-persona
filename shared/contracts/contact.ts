import { z } from 'zod';
import { PaginationQuery } from '~~/shared/contracts/collection';

const optionalText = z
  .string()
  .trim()
  .max(200)
  .optional()
  .transform((value) => value || null);

const optionalEmail = z
  .union([z.literal(''), z.email('Enter a valid email').max(254)])
  .optional()
  .transform((value) => value || null);

const phone = z.string().trim().min(1, 'Phone number is required').max(40);
const phoneCountryCode = z.string().trim().max(4).optional().nullable();

export const ContactRouteParams = z.object({
  contactId: z.string().trim().min(1),
});

export const LegacyCardRouteParams = z.object({
  legacyCardId: z.string().trim().min(1),
});

/** `?cardId=` / `?eventId=` narrow the list; `q` searches name, phone, email, company, role and note. */
export const ListContactsQuery = PaginationQuery.extend({
  cardId: z.string().trim().min(1).optional(),
  eventId: z.string().trim().min(1).optional(),
  q: z.string().trim().max(100).optional(),
});

export type ListContactsQuery = z.infer<typeof ListContactsQuery>;

/** Visitor fills the public card form. Only these fields are accepted. */
const FormContactExchange = z.object({
  mode: z.literal('form'),
  name: z.string().trim().min(1, 'Name is required').max(120),
  email: optionalEmail,
  phone,
  phoneCountryCode,
  company: optionalText,
  position: optionalText,
});

/**
 * Signed-in visitor swaps cards with the owner. `cardId` picks one of their
 * personal cards when they have several.
 */
const SeamlessContactExchange = z.object({
  mode: z.literal('seamless'),
  cardId: z.string().trim().min(1).max(64).optional(),
});

export const CreateContactExchangeRequest = z.discriminatedUnion('mode', [
  FormContactExchange,
  SeamlessContactExchange,
]);

export type CreateContactExchangeRequest = z.infer<
  typeof CreateContactExchangeRequest
>;

/** The pre-platform static cards (`/:legacyCardId`). */
export const CreateLegacyContactExchangeRequest = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  email: optionalEmail,
  phone,
  company: optionalText,
  position: optionalText,
});

export type CreateLegacyContactExchangeRequest = z.infer<
  typeof CreateLegacyContactExchangeRequest
>;

export const CreateManualContactRequest = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(80),
  lastName: z.string().trim().min(1, 'Last name is required').max(80),
  position: z
    .string()
    .trim()
    .min(1, 'Professional title / role is required')
    .max(200),
  company: optionalText,
  phone,
  phoneCountryCode,
  email: optionalEmail,
  note: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((value) => value || null),
  eventId: z.string().trim().min(1).max(64).optional(),
});

export type CreateManualContactRequest = z.infer<
  typeof CreateManualContactRequest
>;

/** Omitted leaves the field as is; `null` or an empty string clears it. */
function clearableText(max: number) {
  return z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((value) => (value === undefined ? undefined : value || null));
}

/**
 * Every contact takes a note and where you met. Contact details (name, role,
 * company, phone, email) are editable on manual contacts only; exchanged ones
 * keep what the other person shared.
 */
export const UpdateContactRequest = z.object({
  note: clearableText(500),
  eventId: z.string().trim().min(1).max(64).nullish(),
  name: z.string().trim().min(1, 'Name is required').max(120).optional(),
  position: clearableText(200),
  company: clearableText(200),
  phone: phone.optional(),
  phoneCountryCode,
  email: z
    .union([z.literal(''), z.email('Enter a valid email').max(254)])
    .nullish()
    .transform((value) => (value === undefined ? undefined : value || null)),
});

export type UpdateContactRequest = z.infer<typeof UpdateContactRequest>;

export const CONTACT_SOURCES = [
  'public_form',
  'seamless_exchange',
  'manual',
] as const;

export type ContactSource = (typeof CONTACT_SOURCES)[number];

export type ContactSummary = {
  id: string;
  name: string;
  phone: string;
  phoneCountryCode: string | null;
  email: string | null;
  company: string | null;
  position: string | null;
  source: ContactSource;
  createdAt: string;
  note: string | null;
  /** Where you met: set automatically from live check-ins, editable by the card holder. */
  event: ContactEvent | null;
  /** The card this contact was exchanged with (null for orphaned rows). */
  card: {
    id: string;
    slug: string;
    name: string;
    organizationSlug: string;
  } | null;
  /** Set when the contact is another La Persona member (seamless exchange). */
  personaCardSlug: string | null;
};

export type ContactEvent = {
  id: string;
  title: string;
  startsAt: string;
};

export type ContactExchangeResult =
  | { mode: 'form'; contactId: string }
  | {
      mode: 'seamless';
      ownerContactId: string;
      visitorContactId: string;
    };
