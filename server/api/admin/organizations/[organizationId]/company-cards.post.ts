import { createCompanyCards } from '~~/server/features/organization/company.service';
import { AdminOrganizationRouteParams } from '~~/shared/contracts/organization';
import { CreateCompanyCardsRequest } from '~~/shared/contracts/company';

export default defineEventHandler(async (event) => {
  const principal = authorizePlatformAccess(event, 'card:create');
  const { organizationId } = await parseRouteParams(
    event,
    AdminOrganizationRouteParams
  );
  const request = await parseRequestBody(event, CreateCompanyCardsRequest);
  const created = await createCompanyCards({
    organizationId,
    inviterId: principal.user.id,
    request,
  });
  enrichLog(event, {
    organization_id: organizationId,
    card: { ids: created.cards.map((item) => item.id) },
    email: {
      attempted: true,
      to: created.cards.map((item) => item.email),
    },
  });
  trackEmailSends(event, Promise.resolve(created.emails));
  return respondCreated(event, `/api/admin/organizations/${organizationId}`, {
    items: created.cards,
    unsentEmails: created.emails
      .filter((email) => !email.ok)
      .flatMap((email) => email.to),
  });
});
