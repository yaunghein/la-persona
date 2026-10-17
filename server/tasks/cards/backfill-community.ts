import { and, eq, isNull } from 'drizzle-orm';
import { db } from '~~/server/db';
import { card, member, organization } from '~~/server/db/schema';
import { ensureCommunityCard } from '~~/server/features/organization/community.service';
import { ORGANIZATION_TYPES } from '~~/shared/utils/constants';

/**
 * One-off: community cards used to be created lazily while listing cards or
 * members; they are now created on join. Gives every existing community
 * member without a card their community card.
 *
 *   npx nuxi task run cards:backfill-community
 */
export default defineTask({
  meta: {
    name: 'cards:backfill-community',
    description: 'Create missing community cards for existing members',
  },
  async run() {
    const missing = await db
      .select({ userId: member.userId, organizationId: member.organizationId })
      .from(member)
      .innerJoin(organization, eq(organization.id, member.organizationId))
      .leftJoin(
        card,
        and(
          eq(card.userId, member.userId),
          eq(card.organizationId, member.organizationId)
        )
      )
      .where(
        and(
          eq(organization.type, ORGANIZATION_TYPES.COMMUNITY),
          isNull(card.id)
        )
      );

    for (const row of missing) {
      await ensureCommunityCard(row.userId, row.organizationId);
    }
    return { result: { created: missing.length } };
  },
});
