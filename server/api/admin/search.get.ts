import { ilike, or } from 'drizzle-orm';
import { db } from '~~/server/db';
import { card, organization, user } from '~~/server/db/schema';
import { requireAdminSession } from '~~/server/utils/admin-permissions';
import { ROUTES } from '~~/shared/utils/routes';

export default defineEventHandler(async (event) => {
  await requireAdminSession(event);
  const query = getQuery(event);
  const term = String(query.q || '').trim();
  if (term.length < 2) {
    return { users: [], organizations: [], cards: [] };
  }

  const pattern = `%${term}%`;
  const [users, organizations, cards] = await Promise.all([
    db
      .select({ id: user.id, name: user.name, email: user.email })
      .from(user)
      .where(or(ilike(user.name, pattern), ilike(user.email, pattern)))
      .limit(5),
    db
      .select({
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
      })
      .from(organization)
      .where(or(ilike(organization.name, pattern), ilike(organization.slug, pattern)))
      .limit(5),
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
      .limit(5),
  ]);

  return {
    users: users.map((row) => ({
      id: row.id,
      label: row.name ? `${row.name} · ${row.email}` : row.email,
      href: `${ROUTES.THAKHIN.USERS}?focus=${row.id}`,
    })),
    organizations: organizations.map((row) => ({
      id: row.id,
      label: row.name,
      href: `${ROUTES.THAKHIN.ORGANIZATIONS}?focus=${row.id}`,
    })),
    cards: cards.map((row) => ({
      id: row.id,
      label: `${row.firstName} ${row.lastName || ''}`.trim() || row.slug,
      href: `${ROUTES.THAKHIN.CARDS}?focus=${row.id}`,
    })),
  };
});
