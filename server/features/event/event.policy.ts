import type { H3Event } from 'h3';
import { findEventById } from '~~/server/features/event/event.repository';
import type { OrganizationPermissionKey } from '~~/shared/permissions/organization';

/**
 * Events belong to a community. The caller must be a member with the given
 * permission; non-members see "not found".
 */
export async function authorizeEventAccess(
  event: H3Event,
  eventId: string,
  permission: OrganizationPermissionKey
) {
  const record = await findEventById(eventId);
  if (!record) throw notFound('Event');

  const access = await authorizeOrganizationAccessById(
    event,
    record.organizationId,
    permission
  );
  assertCommunityOrganization(access.organization);
  enrichLog(event, { event: { id: record.id, title: record.title } });
  return { record, ...access };
}
