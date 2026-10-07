import { count, eq } from 'drizzle-orm';
import { db } from '~~/server/db';
import {
  card,
  member,
  organization,
  subscriptionPayment,
  user,
} from '~~/server/db/schema';
import { requireAdminSession } from '~~/server/utils/admin-permissions';
import { env } from '~~/server/utils/env';
import { enrichLog } from '~~/server/utils/wide-event';

export default defineEventHandler(async (event) => {
  await requireAdminSession(event);
  const organizationId = getRouterParam(event, 'id');
  if (!organizationId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Organization id is required',
    });
  }

  if (organizationId === env.PLACEHOLDER_ORGANIZATION_ID) {
    throw createError({
      statusCode: 400,
      statusMessage: 'The placeholder organization cannot be deleted',
    });
  }

  const existing = await db.query.organization.findFirst({
    where: eq(organization.id, organizationId),
    columns: { id: true, name: true, slug: true },
  });
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Organization not found' });
  }

  const [cardRows, paymentRows, members] = await Promise.all([
    db
      .select({ value: count() })
      .from(card)
      .where(eq(card.organizationId, organizationId)),
    db
      .select({ value: count() })
      .from(subscriptionPayment)
      .where(eq(subscriptionPayment.organizationId, organizationId)),
    db
      .select({ email: user.email })
      .from(member)
      .innerJoin(user, eq(user.id, member.userId))
      .where(eq(member.organizationId, organizationId)),
  ]);

  const cardCount = Number(cardRows[0]?.value ?? 0);
  const paymentCount = Number(paymentRows[0]?.value ?? 0);
  if (cardCount > 0) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Remove this organization\'s cards before deleting it',
    });
  }
  if (paymentCount > 0) {
    throw createError({
      statusCode: 409,
      statusMessage: 'This organization has payment records and cannot be deleted',
    });
  }

  await db.delete(organization).where(eq(organization.id, organizationId));

  enrichLog(event, {
    organization: {
      id: existing.id,
      name: existing.name,
      slug: existing.slug,
      member_emails: members.map((row) => row.email),
    },
  });

  return { id: existing.id, name: existing.name };
});
