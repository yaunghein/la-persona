import { createEvent } from '~~/server/features/event/event.service';
import { authorizeCommunityAccess } from '~~/server/features/organization/organization.policy';
import { CreateEventRequest } from '~~/shared/contracts/event';
import { OrganizationRouteParams } from '~~/shared/contracts/organization';

export default defineEventHandler(async (event) => {
  const { orgSlug } = await parseRouteParams(event, OrganizationRouteParams);
  const { organization, principal } = await authorizeCommunityAccess(
    event,
    orgSlug,
    'event:create'
  );
  const request = await parseRequestBody(event, CreateEventRequest);

  const created = await createEvent(
    organization.id,
    principal.user.id,
    request
  );
  enrichLog(event, { event: { id: created.id, title: created.title } });
  return respondCreated(event, `/api/events/${created.id}`, created);
});
