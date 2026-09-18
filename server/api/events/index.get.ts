import {
  findEventsByOrganizationId,
  toEventDTO,
} from '~~/server/db/queries/event';
import {
  countRegistrationsByEventIds,
  findViewerRegistrations,
  toViewerStatus,
} from '~~/server/db/queries/event-registration';
import { handleApiError } from '~~/server/utils/errors';
import { requireOrganizationPermission } from '~~/server/utils/organization-permissions';
import { ORGANIZATION_PERMISSIONS } from '~~/shared/permissions/organization';
import type { EventListItemDTO } from '~~/shared/types/event';

export default defineEventHandler(async (event) => {
  const session = await requireOrganizationPermission(
    event,
    ORGANIZATION_PERMISSIONS.EVENT_READ
  );

  try {
    const rows = await findEventsByOrganizationId(
      session.session.activeOrganizationId
    );
    const eventIds = rows.map((row) => row.id);
    const [counts, viewerMap] = await Promise.all([
      countRegistrationsByEventIds(eventIds),
      findViewerRegistrations(eventIds, session.user.id),
    ]);

    const events: EventListItemDTO[] = rows.map((row) => ({
      ...toEventDTO(row),
      registeredCount: counts.get(row.id) ?? 0,
      viewerRegistrationStatus: toViewerStatus(viewerMap.get(row.id)),
    }));

    return { events };
  } catch (error) {
    handleApiError(error, {
      statusCode: 500,
      statusMessage: 'Failed to load events',
    });
  }
});
