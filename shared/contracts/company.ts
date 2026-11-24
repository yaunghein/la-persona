import { z } from 'zod';
import { StoredImageReference, WebsiteUrl } from '~~/shared/contracts/card';
import { OrganizationRouteParams } from '~~/shared/contracts/organization';

const personName = z.string().trim().min(1).max(80);
const email = z.email().trim().toLowerCase();

export const CompanyCardDraft = z
  .object({
    firstName: personName,
    lastName: z.string().trim().max(80).optional(),
    email,
    position: z.string().trim().min(1).max(120),
    role: z.enum(['admin', 'member']),
    freeMonth: z.boolean(),
    paid: z.boolean(),
  })
  .refine((card) => card.freeMonth || card.paid, {
    message: 'Each card needs a free month, a paid term, or both.',
  });

export const CreateCompanyCardsRequest = z.object({
  termYears: z.number().int().min(1).max(5).default(1),
  amountMinor: z.number().int().min(0).optional(),
  paymentReference: z.string().trim().max(120).optional(),
  note: z.string().trim().max(500).optional(),
  cards: z.array(CompanyCardDraft).min(1).max(50),
});

export type CreateCompanyCardsRequest = z.infer<
  typeof CreateCompanyCardsRequest
>;

/** Extends each card by `termYears`, or every card to the same `endAt`; never both. */
export const RecordCompanyPaymentRequest = z
  .object({
    // Each card's period end as the admin saw it; a retry or a second tab no longer matches.
    cards: z
      .array(
        z.object({
          id: z.string().trim().min(1),
          periodEnd: z.iso.datetime().nullable(),
        })
      )
      .min(1)
      .max(50),
    termYears: z.number().int().min(1).max(5).optional(),
    amountMinor: z.number().int().min(0),
    endAt: z.string().trim().min(1).optional(),
    paymentReference: z.string().trim().max(120).optional(),
    note: z.string().trim().max(500).optional(),
  })
  .refine((request) => !request.termYears !== !request.endAt, {
    message: 'Choose a term in years or an end date.',
    path: ['termYears'],
  });

export type RecordCompanyPaymentRequest = z.infer<
  typeof RecordCompanyPaymentRequest
>;

export const AssignCompanyCardRequest = z.object({
  firstName: personName,
  lastName: z.string().trim().max(80).optional(),
  email,
  position: z.string().trim().min(1).max(120),
  departmentId: z.string().trim().min(1).nullable().optional(),
});

export type AssignCompanyCardRequest = z.infer<typeof AssignCompanyCardRequest>;

export const DepartmentRouteParams = OrganizationRouteParams.extend({
  departmentId: z.string().trim().min(1),
});

export const DepartmentNameRequest = z.object({
  name: z.string().trim().min(1).max(80),
});

export const UpdateCompanySettingsRequest = z.object({
  name: z.string().trim().min(1).max(120),
  website: WebsiteUrl.optional(),
  logoUrl: StoredImageReference.optional(),
  coverImageUrl: StoredImageReference.optional(),
});

export type UpdateCompanySettingsRequest = z.infer<
  typeof UpdateCompanySettingsRequest
>;
