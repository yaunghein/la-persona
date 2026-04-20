import { and, desc, eq } from 'drizzle-orm';
import { db } from '~~/server/db';
import {
  member,
  subscriptionPayment,
  subscriptionPaymentItem,
  subscriptionPlan,
} from '~~/server/db/schema';
import { requireOrganizationSession } from '~~/server/utils/organization-permissions';

export default defineEventHandler(async (event) => {
  const session = await requireOrganizationSession(event);

  const organizationId = session.session.activeOrganizationId;
  const userId = session.user.id;

  const membership = await db.query.member.findFirst({
    where: and(eq(member.organizationId, organizationId), eq(member.userId, userId)),
    columns: { id: true },
  });

  if (!membership) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
    });
  }

  const rows = await db
    .select({
      paymentId: subscriptionPayment.id,
      paymentStatus: subscriptionPayment.status,
      paymentCreatedAt: subscriptionPayment.createdAt,
      paymentUpdatedAt: subscriptionPayment.updatedAt,
      itemId: subscriptionPaymentItem.id,
      planCode: subscriptionPaymentItem.planCode,
      amountMinor: subscriptionPaymentItem.amountMinor,
      currency: subscriptionPaymentItem.currency,
      startAt: subscriptionPaymentItem.startAt,
      endAt: subscriptionPaymentItem.endAt,
      planName: subscriptionPlan.name,
    })
    .from(subscriptionPaymentItem)
    .innerJoin(
      subscriptionPayment,
      eq(subscriptionPayment.id, subscriptionPaymentItem.paymentId)
    )
    .leftJoin(
      subscriptionPlan,
      eq(subscriptionPlan.code, subscriptionPaymentItem.planCode)
    )
    .where(eq(subscriptionPayment.organizationId, organizationId))
    .orderBy(
      desc(subscriptionPaymentItem.endAt),
      desc(subscriptionPayment.createdAt)
    );

  return rows.map((row) => ({
    id: row.itemId,
    paymentId: row.paymentId,
    dueDate: row.endAt.toISOString(),
    description: row.planName || row.planCode,
    status: row.paymentStatus,
    amountMinor: row.amountMinor,
    currency: row.currency || 'MMK',
    startAt: row.startAt.toISOString(),
    endAt: row.endAt.toISOString(),
    createdAt: row.paymentCreatedAt.toISOString(),
    updatedAt: row.paymentUpdatedAt.toISOString(),
  }));
});
