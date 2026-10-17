import { ilike, or } from 'drizzle-orm';
import { db } from '~~/server/db';
import { card, organization, user } from '~~/server/db/schema';

const RESULTS_PER_KIND = 5;

function escapeLikePattern(value: string) {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

export async function searchBackOffice(term: string) {
  const pattern = `%${escapeLikePattern(term)}%`;
  const [users, organizations, cards] = await Promise.all([
    db
      .select({ id: user.id, name: user.name, email: user.email })
      .from(user)
      .where(or(ilike(user.name, pattern), ilike(user.email, pattern)))
      .limit(RESULTS_PER_KIND),
    db
      .select({
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
      })
      .from(organization)
      .where(
        or(ilike(organization.name, pattern), ilike(organization.slug, pattern))
      )
      .limit(RESULTS_PER_KIND),
    db
      .select({
        id: card.id,
        slug: card.slug,
        firstName: card.firstName,
        lastName: card.lastName,
      })
      .from(card)
      .where(
        or(
          ilike(card.slug, pattern),
          ilike(card.firstName, pattern),
          ilike(card.lastName, pattern),
          ilike(card.email, pattern)
        )
      )
      .limit(RESULTS_PER_KIND),
  ]);
  return { users, organizations, cards };
}
