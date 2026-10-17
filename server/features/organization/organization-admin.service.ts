import { nanoid } from 'nanoid';
import { env } from '~~/env';
import {
  countOrganizationCardsAndPayments,
  deleteOrganization,
  findOrganizationDetail,
  hasPersonalOrganization,
  insertOrganizationWithOwner,
  isOrganizationSlugTaken,
  listMemberEmails,
  listOrganizationsWithCounts,
  updateOrganizationIdentity,
  userExists,
} from '~~/server/features/organization/organization-admin.repository';
import {
  findCommunitySettingByOrganizationId,
  upsertCommunitySettingByOrganizationId,
} from '~~/server/features/organization/community-setting.repository';
import { updateCommunityCardsBrand } from '~~/server/features/organization/community.repository';
import { ensureCommunityCard } from '~~/server/features/organization/community.service';
import { sanitizeRichText } from '~~/server/lib/html-sanitizer';
import type { Collection } from '~~/shared/contracts/collection';
import {
  toCommunitySettings,
  type AdminOrganizationDetail,
  type AdminOrganizationSummary,
  type CreateOrganizationRequest,
  type UpdateOrganizationRequest,
} from '~~/shared/contracts/organization';
import {
  ORGANIZATION_TYPES,
  type OrganizationType,
} from '~~/shared/utils/constants';
import { slugify } from '~~/shared/utils/slugify';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function toSummary(
  row: Awaited<ReturnType<typeof listOrganizationsWithCounts>>[number]
): AdminOrganizationSummary {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    logo: row.logo,
    type: row.type as OrganizationType,
    createdAt: row.createdAt.toISOString(),
    memberCount: row.memberCount,
    cardCount: row.cardCount,
  };
}

export async function listOrganizations(): Promise<
  Collection<AdminOrganizationSummary>
> {
  return { items: (await listOrganizationsWithCounts()).map(toSummary) };
}

export async function createOrganization(request: CreateOrganizationRequest) {
  const isPersonal = request.type === ORGANIZATION_TYPES.PERSONAL;
  let slug = slugify(request.slug || request.name);
  if (!slug || !SLUG_PATTERN.test(slug)) {
    throw badRequest(
      'Slug must be lowercase letters, numbers, and hyphens only (e.g. acme-corp)',
      'invalid_slug'
    );
  }
  if (await isOrganizationSlugTaken(slug))
    slug = `${slug}-${nanoid(6).toLowerCase()}`;

  const ownerUserId = request.ownerUserId ?? null;
  if (ownerUserId) {
    if (!(await userExists(ownerUserId))) throw notFound('Owner user');
    if (isPersonal && (await hasPersonalOrganization(ownerUserId))) {
      throw conflict(
        'User already has a personal organization.',
        'personal_org_exists'
      );
    }
  }

  const created = await insertOrganizationWithOwner({
    name: isPersonal ? `${request.name}'s Space` : request.name,
    slug,
    type: request.type,
    ownerUserId,
  });
  // Every community member, including its first owner, holds a community card.
  if (ownerUserId && !isPersonal)
    await ensureCommunityCard(ownerUserId, created.id);

  return toSummary({
    ...created,
    memberCount: ownerUserId ? 1 : 0,
    cardCount: isPersonal ? 0 : ownerUserId ? 1 : 0,
  });
}

export async function describeOrganization(
  organizationId: string
): Promise<AdminOrganizationDetail> {
  const detail = await findOrganizationDetail(organizationId);
  if (!detail) throw notFound('Organization');
  const { organization } = detail;
  const isCommunity = organization.type === ORGANIZATION_TYPES.COMMUNITY;
  const setting = isCommunity
    ? await findCommunitySettingByOrganizationId(organizationId)
    : null;

  return {
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    logo: organization.logo,
    type: organization.type as OrganizationType,
    createdAt: organization.createdAt.toISOString(),
    members: detail.members,
    cards: detail.cards,
    community: isCommunity
      ? toCommunitySettings({
          ...setting,
          name: organization.name,
          logo: organization.logo,
        })
      : null,
  };
}

const COMMUNITY_FIELDS = [
  'description',
  'guidelines',
  'whyJoin',
  'logoUrl',
  'coverImageUrl',
  'splineUrl',
  'wallpaperUrl',
  'cardBackUrl',
  'emailQrBackgroundUrl',
  'emailContactExchangeUrl',
  'emailAfterEventUrl',
] as const;

export async function updateOrganization(
  organizationId: string,
  changes: UpdateOrganizationRequest
) {
  const detail = await findOrganizationDetail(organizationId);
  if (!detail) throw notFound('Organization');
  const existing = detail.organization;

  if (
    changes.slug !== existing.slug &&
    (await isOrganizationSlugTaken(changes.slug, organizationId))
  ) {
    throw conflict(
      'That slug is already used by another organization.',
      'slug_taken'
    );
  }

  const changedCommunityFields = COMMUNITY_FIELDS.filter(
    (field) => changes[field] !== undefined
  );
  const writesCommunity =
    existing.type === ORGANIZATION_TYPES.COMMUNITY &&
    changedCommunityFields.length > 0;

  const updated = await updateOrganizationIdentity(organizationId, {
    name: changes.name,
    slug: changes.slug,
    ...(writesCommunity && changes.logoUrl !== undefined
      ? { logo: changes.logoUrl }
      : {}),
  });
  if (!updated) throw notFound('Organization');

  let cardsUpdated = 0;
  if (writesCommunity) {
    const brand = (value: string | null | undefined) =>
      value === undefined ? undefined : (value ?? '');
    const setting = await upsertCommunitySettingByOrganizationId(
      organizationId,
      {
        description: sanitizeRichText(changes.description ?? '') ?? '',
        guidelines: sanitizeRichText(changes.guidelines ?? '') ?? '',
        whyJoin: sanitizeRichText(changes.whyJoin ?? '') ?? '',
        coverUrl: changes.coverImageUrl ?? null,
        splineUrl: brand(changes.splineUrl),
        wallpaperUrl: brand(changes.wallpaperUrl),
        cardBackUrl: brand(changes.cardBackUrl),
        emailQrBackgroundUrl: brand(changes.emailQrBackgroundUrl),
        emailContactExchangeUrl: brand(changes.emailContactExchangeUrl),
        emailAfterEventUrl: brand(changes.emailAfterEventUrl),
      }
    );

    if (changes.applyToMemberCards && setting) {
      cardsUpdated = detail.cards.length;
      if (cardsUpdated) {
        await updateCommunityCardsBrand(organizationId, {
          splineUrl: setting.splineUrl,
          wallpaperUrl: setting.wallpaperUrl,
          cardBackUrl: setting.cardBackUrl,
        });
      }
    }
  }

  return {
    id: updated.id,
    slug: updated.slug,
    cardsUpdated,
    changedCommunityFields: writesCommunity ? changedCommunityFields : [],
  };
}

/** Organizations with cards or payment history are kept for the record. */
export async function removeOrganization(organizationId: string) {
  if (organizationId === env.PLACEHOLDER_ORGANIZATION_ID) {
    throw conflict(
      'The placeholder organization cannot be deleted.',
      'placeholder_org'
    );
  }
  const detail = await findOrganizationDetail(organizationId);
  if (!detail) throw notFound('Organization');

  const { cardCount, paymentCount } =
    await countOrganizationCardsAndPayments(organizationId);
  if (cardCount > 0) {
    throw conflict(
      "Remove this organization's cards before deleting it.",
      'org_has_cards'
    );
  }
  if (paymentCount > 0) {
    throw conflict(
      'This organization has payment records and cannot be deleted.',
      'org_has_payments'
    );
  }

  const memberEmails = await listMemberEmails(organizationId);
  await deleteOrganization(organizationId);
  return { organization: detail.organization, memberEmails };
}
