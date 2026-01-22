// TODO: delete later: this is an attampt before knowing better-auth's organization plugin
// import { auth } from '~~/server/auth';
// import { db } from '~~/server/db';
// import { invitation } from '~~/server/db/schema';

export default defineEventHandler(async (event) => {
  // const { cardId, minutes } = await readBody(event);
  // console.log({ cardId, minutes });
  // const session = await auth.api.getSession({ headers: event.headers });
  // if (!session)
  //   throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
  // const expiresAt = new Date();
  // expiresAt.setMinutes(expiresAt.getMinutes() + (minutes || 30));
  // console.log(expiresAt);
  // try {
  //   const [inserted] = await db
  //     .insert(invitation)
  //     .values({
  //       cardId,
  //       expiresAt,
  //     })
  //     .returning();
  //   return {
  //     success: true,
  //     invitationId: inserted.id,
  //     // Change this to your production URL as needed
  //     url: `/platform/invite/${inserted.id}`,
  //   };
  // } catch (error: any) {
  //   throw createError({
  //     statusCode: 500,
  //     statusMessage: 'Failed to generate invitation',
  //   });
  // }
});
