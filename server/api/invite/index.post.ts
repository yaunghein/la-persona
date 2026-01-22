// TODO: delete later: this is an attampt before knowing better-auth's organization plugin
// import { eq } from 'drizzle-orm';
// import { auth } from '~~/server/auth';
// import { db } from '~~/server/db';
// import { invitation, card } from '~~/server/db/schema';

export default defineEventHandler(async (event) => {
  // TODO: delete later
  // await new Promise((r) => setTimeout(r, 5000));
  // const { id } = await readBody(event);
  // const session = await auth.api.getSession({
  //   headers: event.headers,
  // });
  // if (!session) {
  //   throw createError({
  //     statusCode: 401,
  //     statusMessage: 'Unauthorized.',
  //   });
  // }
  // try {
  //   return await db.transaction(async (tx) => {
  //     const invite = await tx.query.invitation.findFirst({
  //       where: (invitation, { eq, and, gt }) =>
  //         and(eq(invitation.id, id), gt(invitation.expiresAt, new Date())),
  //     });
  //     if (!invite) {
  //       throw createError({
  //         statusCode: 404,
  //         statusMessage: 'Invitation invalid or expired',
  //       });
  //     }
  //     const targetCard = await tx.query.card.findFirst({
  //       where: (card, { eq }) => eq(card.id, invite.cardId),
  //     });
  //     if (targetCard?.userId) {
  //       throw createError({
  //         statusCode: 400,
  //         statusMessage: 'This card is already linked to a user',
  //       });
  //     }
  //     const [updated] = await tx
  //       .update(card)
  //       .set({ userId: session.user.id })
  //       .where(eq(card.id, invite.cardId))
  //       .returning();
  //     await tx.delete(invitation).where(eq(invitation.id, id));
  //     return {
  //       success: true,
  //       card: updated,
  //     };
  //   });
  // } catch (error: any) {
  //   handleApiError(error, {
  //     statusCode: 500,
  //     statusMessage: 'Failed to link card with user',
  //   });
  // }
});
