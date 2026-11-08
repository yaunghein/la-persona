import { createAttendeeLabel } from '~~/server/features/event/attendee-label.service';
import { authorizeCommunityAccess } from '~~/server/features/organization/organization.policy';
import { CreateAttendeeLabelRequest } from '~~/shared/contracts/event';
import { OrganizationRouteParams } from '~~/shared/contracts/organization';

export default defineEventHandler(async (event) => {
  const { orgSlug } = await parseRouteParams(event, OrganizationRouteParams);
  const { organization } = await authorizeCommunityAccess(
    event,
    orgSlug,
    'attendeeLabel:create'
  );
  const request = await parseRequestBody(event, CreateAttendeeLabelRequest);

  const created = await createAttendeeLabel(organization.id, request);
  enrichLog(event, { label: { id: created.id } });
  return respondCreated(event, `/api/attendee-labels/${created.id}`, created);
});
