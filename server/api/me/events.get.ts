import { listRegisteredEvents } from '~~/server/features/event/registration.repository';
import type { Collection } from '~~/shared/contracts/collection';
import type { ContactEvent } from '~~/shared/contracts/contact';

/** Events the caller registered for (latest 100), to tag a contact with where they met. */
export default defineEventHandler(
  async (event): Promise<Collection<ContactEvent>> => {
    const principal = requirePrincipal(event);
    const rows = await listRegisteredEvents(principal.user.id);
    return {
      items: rows.map((row) => ({
        id: row.id,
        title: row.title,
        startsAt: row.startsAt.toISOString(),
      })),
    };
  }
);
