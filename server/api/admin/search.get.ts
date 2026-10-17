import { searchBackOffice } from '~~/server/features/admin/search.repository';
import {
  BackOfficeSearchQuery,
  type BackOfficeSearchResult,
} from '~~/shared/contracts/admin';
import { ROUTES } from '~~/shared/utils/routes';

export default defineEventHandler(
  async (event): Promise<BackOfficeSearchResult> => {
    authorizePlatformAccess(event, 'insight:read');
    const { q } = await parseRequestQuery(event, BackOfficeSearchQuery);
    if (q.length < 2) return { users: [], organizations: [], cards: [] };

    const { users, organizations, cards } = await searchBackOffice(q);
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
  }
);
