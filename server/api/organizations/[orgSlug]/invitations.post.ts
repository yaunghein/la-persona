import { authorizeCommunityAccess } from '~~/server/features/organization/organization.policy';
import { sendInvitation } from '~~/server/features/organization/invitation.service';
import {
  CreateInvitationRequest,
  OrganizationRouteParams,
} from '~~/shared/contracts/organization';

export default defineEventHandler(async (event) => {
  const { orgSlug } = await parseRouteParams(event, OrganizationRouteParams);
  const { organization } = await authorizeCommunityAccess(
    event,
    orgSlug,
    'invitation:create'
  );
  const request = await parseRequestBody(event, CreateInvitationRequest);

  const invitation = await sendInvitation(event, organization.id, request);
  enrichLog(event, {
    invitation: { id: invitation.id, email: request.email, role: request.role },
  });
  return respondCreated(event, `/api/invitations/${invitation.id}`, {
    id: invitation.id,
    email: invitation.email,
    role: invitation.role,
    status: invitation.status,
  });
});
