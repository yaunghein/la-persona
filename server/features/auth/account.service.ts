import { nanoid } from 'nanoid';
import { env } from '~~/env';
import {
  deleteOrganizations,
  findPersonalOrganization,
  insertPersonalOrganization,
  listOwnedPersonalOrganizationIds,
} from '~~/server/features/auth/account.repository';
import { getPendingOnboardingInvitationByEmail } from '~~/server/features/onboarding/onboarding-invitation.service';
import { slugify } from '~~/shared/utils/slugify';

/**
 * New accounts get a personal workspace, unless an onboarding invitation is
 * waiting for them (accepting it provisions the workspace with the card).
 */
export async function provisionPersonalOrganization(user: {
  id: string;
  name: string;
  email: string;
}) {
  if (await findPersonalOrganization(user.id)) return;
  if (await getPendingOnboardingInvitationByEmail(user.email)) return;

  await insertPersonalOrganization({
    userId: user.id,
    name: `${user.name}'s Space`,
    slug: `${slugify(user.name)}-space-${nanoid()}`,
  });
}

/** Removes the user's personal workspaces (never the shared placeholder organization). */
export async function deletePersonalOrganizationsForUser(userId: string) {
  const ids = (await listOwnedPersonalOrganizationIds(userId)).filter(
    (id) => id !== env.PLACEHOLDER_ORGANIZATION_ID
  );
  await deleteOrganizations(ids);
  return ids;
}
