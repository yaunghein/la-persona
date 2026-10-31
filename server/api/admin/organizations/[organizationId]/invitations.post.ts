import { inviteOrganizer } from '~~/server/features/organization/organization-admin.service';
import {
  AdminOrganizationRouteParams,
  CreateOrganizerInvitationRequest,
} from '~~/shared/contracts/organization';

export default defineEventHandler(async (event) => {
  const principal = authorizePlatformAccess(event, 'organization:update');
  const { organizationId } = await parseRouteParams(
    event,
    AdminOrganizationRouteParams
  );
  const { email } = await parseRequestBody(
    event,
    CreateOrganizerInvitationRequest
  );
  const { organization, invitation, emails } = await inviteOrganizer(
    organizationId,
    email,
    principal.user.id
  );
  enrichLog(event, {
    organization_id: organization.id,
    invitation: {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
    },
    email: { attempted: true, to: [invitation.email] },
  });
  trackEmailSends(event, emails);
  return respondCreated(event, `/api/invitations/${invitation.id}`, {
    id: invitation.id,
    email: invitation.email,
    role: invitation.role,
    status: invitation.status,
  });
});
