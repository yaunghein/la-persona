import { findCardsBySlug } from '~~/server/db/queries/card';

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug') as string;
  const card = await findCardsBySlug(slug);
  if (!card) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Card not found.',
    });
  }
  return card;
});
