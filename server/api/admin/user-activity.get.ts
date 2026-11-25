import { listPeopleActivity } from '~~/server/features/admin/user-activity.repository';
import { toCsv } from '~~/server/lib/csv';
import { AdminActivityQuery } from '~~/shared/contracts/admin';

/** Connections and event attendance per person. `Accept: text/csv` downloads it. */
export default defineEventHandler(async (event) => {
  authorizePlatformAccess(event, 'insight:read');
  const filter = await parseRequestQuery(event, AdminActivityQuery);
  const items = await listPeopleActivity(filter);
  enrichLog(event, {
    activity: {
      range: filter.range,
      organization_id: filter.organizationId,
      event_id: filter.eventId,
      source: filter.source,
      rows: items.length,
    },
  });
  if (!prefersCsv(event)) return { items };

  const csv = toCsv([
    [
      'Name',
      'Email',
      'Connections',
      'Connections at events',
      'Events registered',
      'Events attended',
      'Last connection',
    ],
    ...items.map((item) => [
      item.name,
      item.email,
      item.connections,
      item.eventConnections,
      item.eventsRegistered,
      item.eventsAttended,
      item.lastConnectionAt ?? '',
    ]),
  ]);
  return respondCsv(event, 'people-activity.csv', csv);
});
