import {
  exportContactsCsv,
  listContactPage,
  workspaceContactScope,
} from '~~/server/features/contact/contact.service';
import { ListContactsQuery } from '~~/shared/contracts/contact';

/**
 * Contacts across every card the caller holds (personal and community).
 * JSON page by default; `Accept: text/csv` downloads every matching contact.
 */
export default defineEventHandler(async (event) => {
  const principal = requirePrincipal(event);
  const query = await parseRequestQuery(event, ListContactsQuery);
  const scope = await workspaceContactScope(principal.user.id);

  if (prefersCsv(event)) {
    const csv = await exportContactsCsv(scope, query, { includeOrigin: true });
    return respondCsv(event, 'contacts.csv', csv);
  }
  return listContactPage(scope, query);
});
