import { findCardsById } from '~~/server/db/queries/card';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') as string;
  const card = await findCardsById(id);
  if (!card) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Card not found.',
    });
  }
  return card;
});
