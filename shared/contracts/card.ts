import { z } from 'zod';
import { AdminPaginationQuery } from '~~/shared/contracts/collection';
import type { SubscriptionStatus } from '~~/shared/utils/subscription';
import type { OrganizationType } from '~~/shared/utils/constants';
import { isObjectStorageUrl } from '~~/shared/utils/object-storage';

export const CardRouteParams = z.object({
  cardSlug: z.string().trim().min(1),
});

export const CARD_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Web links on a card. Script-capable schemes (`javascript:`, `data:`…) are rejected. */
export const CardLinkUrl = z
  .url({
    protocol: /^(https?|mailto|tel)$/,
    message: 'Enter a valid link (https, email or phone).',
  })
  .max(2048);

export const WebsiteUrl = z
  .union([
    z.literal(''),
    z.url({ protocol: /^https?$/, message: 'Enter a valid website link.' }).max(2048),
  ])
  .transform((value) => value || null);

export const CardSocialLink = z.object({
  label: z.string().trim().min(1, 'Label is required').max(60),
  value: CardLinkUrl,
});

export type CardSocialLink = z.infer<typeof CardSocialLink>;

/** An uploaded object key (`organizations/…/x.webp`) or a URL in our own bucket. */
export const StoredImageReference = z
  .string()
  .trim()
  .max(1024)
  .refine(
    (value) =>
      value === '' ||
      isObjectStorageUrl(value) ||
      /^[\w-]+(\/[\w.-]+)+$/.test(value),
    'Upload the image again.'
  )
  .transform((value) => value || null);

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((value) => value || null);

/**
 * Fields a card holder may change. Ownership, organization and design assets
 * (Spline scene, wallpaper, card back) are managed by La Persona and cannot be
 * set through this request.
 */
export const UpdateCardRequest = z
  .object({
    firstName: z.string().trim().min(1, 'First name is required').max(80),
    lastName: optionalText(80),
    position: z.string().trim().min(1, 'Position is required').max(200),
    company: optionalText(200),
    phone: optionalText(40),
    phoneCountryCode: optionalText(4),
    email: z
      .union([z.literal(''), z.email('Enter a valid email').max(254)])
      .nullish()
      .transform((value) => value || null),
    website: WebsiteUrl.nullish(),
    avatarUrl: StoredImageReference.nullish(),
    socials: z.array(CardSocialLink).max(30),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .min(1, 'Please enter a card URL slug.')
      .max(80)
      .regex(
        CARD_SLUG_PATTERN,
        'Card URL slugs can only include lowercase letters, numbers, and hyphens.'
      ),
  })
  .partial();

export type UpdateCardRequest = z.infer<typeof UpdateCardRequest>;

export type CardSubscriptionSummary = {
  status: SubscriptionStatus;
  planCode: string | null;
  planName: string | null;
  isTrial: boolean;
};

/** A card as its holder and organization managers see it. */
export type CardDetail = {
  id: string;
  slug: string;
  firstName: string;
  lastName: string | null;
  position: string;
  company: string | null;
  phone: string | null;
  phoneCountryCode: string | null;
  email: string | null;
  website: string | null;
  avatarUrl: string | null;
  socials: CardSocialLink[];
  splineUrl: string | null;
  wallpaperUrl: string | null;
  cardBackUrl: string | null;
  organizationId: string;
  userId: string | null;
  createdAt: string;
  updatedAt: string;
  organization: {
    name: string;
    slug: string;
    type: OrganizationType;
  };
  subscription: CardSubscriptionSummary | null;
};

/** What anyone with the card link sees: no internal ids, no ownership data. */
export type PublicCard = Pick<
  CardDetail,
  | 'slug'
  | 'firstName'
  | 'lastName'
  | 'position'
  | 'company'
  | 'phone'
  | 'phoneCountryCode'
  | 'email'
  | 'website'
  | 'avatarUrl'
  | 'socials'
  | 'splineUrl'
  | 'wallpaperUrl'
  | 'cardBackUrl'
> & {
  /** Whether the card holder has a La Persona account (enables Seamless Exchange). */
  isClaimed: boolean;
  joinedAt: string;
  /** Plan drives branding (e.g. the "Powered by LA PERSONA" badge on free plans). */
  plan: {
    code: string | null;
    isTrial: boolean;
    status: SubscriptionStatus;
  } | null;
};

/** Contact details printed on a requested card. */
export const RequestedCardDetails = z.object({
  name: z.string().trim().min(1, 'Name is required').max(160),
  position: optionalText(200),
  company: optionalText(200),
  phone: optionalText(40),
  phoneCountryCode: optionalText(4),
  email: z
    .union([z.literal(''), z.email('Enter a valid email').max(254)])
    .nullish()
    .transform((value) => value || null),
  website: WebsiteUrl.nullish(),
  socials: z.array(CardSocialLink).max(30).default([]),
});

export type RequestedCardDetails = z.infer<typeof RequestedCardDetails>;

const receiptUrl = StoredImageReference.pipe(
  z.string({ message: 'Please upload a payment receipt.' })
);

/**
 * Buy a new card. `new_design` gets a custom design on the premium plan;
 * `existing_design` reuses one of the organization's card designs and plan.
 */
export const CreateCardRequestRequest = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('new_design'),
    card: RequestedCardDetails,
    receiptUrl,
  }),
  z.object({
    type: z.literal('existing_design'),
    sourceCardId: z.string().trim().min(1, 'Please choose an existing card design.'),
    card: RequestedCardDetails,
    receiptUrl,
  }),
]);

export type CreateCardRequestRequest = z.infer<typeof CreateCardRequestRequest>;

export type CardRequestReceipt = {
  requestId: string;
  paymentId: string;
  cardSlug: string;
  planCode: string;
};

export const CardRequestRouteParams = z.object({
  cardRequestId: z.string().trim().min(1),
});

export const CARD_REQUEST_STATUSES = ['pending', 'approved', 'declined'] as const;

export const ListCardRequestsQuery = AdminPaginationQuery.extend({
  status: z.enum(CARD_REQUEST_STATUSES).optional(),
});

export type ListCardRequestsQuery = z.infer<typeof ListCardRequestsQuery>;

/** Thakhin decides a pending card request (and its linked payment). */
export const ReviewCardRequestRequest = z.object({
  status: z.enum(['approved', 'declined']),
});

export type ReviewCardRequestRequest = z.infer<typeof ReviewCardRequestRequest>;

export type CardRequestForReview = {
  id: string;
  type: 'new_design' | 'existing_design';
  status: string;
  paymentReceiptUrl: string;
  cardData: {
    name?: string;
    position?: string;
    company?: string;
    phone?: string;
    phoneCountryCode?: string;
    email?: string;
    website?: string;
    socials?: CardSocialLink[];
    sourceCardId?: string;
  };
  requesterName: string | null;
  requesterEmail: string | null;
  createdAt: string;
  updatedAt: string;
  paymentId: string | null;
  paymentStatus: string | null;
};

export const CardUpdateRequestRouteParams = z.object({
  cardUpdateRequestId: z.string().trim().min(1),
});

export const ListCardUpdateRequestsQuery = AdminPaginationQuery.extend({
  status: z.enum(CARD_REQUEST_STATUSES).optional(),
});

export type ListCardUpdateRequestsQuery = z.infer<typeof ListCardUpdateRequestsQuery>;

export type CardUpdateRequestForReview = {
  id: string;
  status: string;
  note: string | null;
  createdAt: string;
  requested: {
    firstName: string | null;
    lastName: string | null;
    position: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
  };
  card: {
    id: string;
    slug: string;
    firstName: string;
    lastName: string | null;
    position: string;
    phone: string | null;
    email: string | null;
    website: string | null;
  };
  requesterName: string;
  requesterEmail: string;
};
