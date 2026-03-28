import { count, desc } from 'drizzle-orm';
import { db } from '~~/server/db';
import { card, member, organization } from '~~/server/db/schema';
import { requireAdminSession } from '~~/server/utils/admin-permissions';

export default defineEventHandler(async (event) => {
  await requireAdminSession(event);

  const [orgs, memberAgg, cardAgg] = await Promise.all([
    db.select().from(organization).orderBy(desc(organization.createdAt)),
    db
      .select({
        organizationId: member.organizationId,
        memberCount: count(member.id),
      })
      .from(member)
      .groupBy(member.organizationId),
    db
      .select({
        organizationId: card.organizationId,
        cardCount: count(card.id),
      })
      .from(card)
      .groupBy(card.organizationId),
  ]);

  const memberByOrg = new Map(
    memberAgg.map((row) => [row.organizationId, Number(row.memberCount)])
  );
  const cardByOrg = new Map(
    cardAgg.map((row) => [row.organizationId, Number(row.cardCount)])
  );

  return orgs.map((org) => ({
    id: org.id,
    name: org.name,
    slug: org.slug,
    logo: org.logo,
    metadata: org.metadata,
    isPersonal: org.isPersonal,
    createdAt: org.createdAt,
    memberCount: memberByOrg.get(org.id) ?? 0,
    cardCount: cardByOrg.get(org.id) ?? 0,
  }));
});
