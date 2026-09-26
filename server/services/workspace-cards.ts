import { and, eq } from 'drizzle-orm';
import { db } from '~~/server/db';
import { member, organization } from '~~/server/db/schema';
import { findWorkspaceCardsForUser } from '~~/server/db/queries/workspace-cards';
import { ensureCommunityCard } from '~~/server/services/community';
import { ORGANIZATION_TYPES } from '~~/shared/utils/constants';

export async function loadWorkspaceCards(userId: string) {
  const communities = await db
    .select({ organizationId: member.organizationId })
    .from(member)
    .innerJoin(organization, eq(organization.id, member.organizationId))
    .where(
      and(
        eq(member.userId, userId),
        eq(organization.type, ORGANIZATION_TYPES.COMMUNITY)
      )
    );

  await Promise.all(
    communities.map((item) =>
      ensureCommunityCard(userId, item.organizationId).catch(() => null)
    )
  );

  return findWorkspaceCardsForUser(userId);
}

export function workspaceCardLabel(item: {
  firstName: string;
  lastName: string | null;
  organizationType?: string | null;
  organizationName?: string | null;
}) {
  const name = `${item.firstName} ${item.lastName || ''}`.trim() || 'Card';
  if (
    item.organizationType === ORGANIZATION_TYPES.COMMUNITY &&
    item.organizationName
  ) {
    return `${name} · ${item.organizationName}`;
  }
  return name;
}
