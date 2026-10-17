import { env } from '~~/env';
import { submitCardRequest } from '~~/server/features/card/card-request.service';
import { CreateCardRequestRequest } from '~~/shared/contracts/card';
import { OrganizationRouteParams } from '~~/shared/contracts/organization';

export default defineEventHandler(async (event) => {
  const { orgSlug } = await parseRouteParams(event, OrganizationRouteParams);
  const { organization, principal } = await authorizeOrganizationAccess(
    event,
    orgSlug,
    'cardRequest:create'
  );
  const request = await parseRequestBody(event, CreateCardRequestRequest);

  const { receipt, emails } = await submitCardRequest({
    organizationId: organization.id,
    requester: {
      userId: principal.user.id,
      email: principal.user.email,
      name: principal.user.name,
    },
    request,
  });

  enrichLog(event, {
    card_request: {
      id: receipt.requestId,
      type: request.type,
      plan_code: receipt.planCode,
      payment_id: receipt.paymentId,
      card_slug: receipt.cardSlug,
      requester_email: principal.user.email,
    },
    email: { attempted: true, to: [principal.user.email, ...env.ADMIN_EMAILS] },
  });
  trackEmailSends(event, emails);

  return respondCreated(event, `/api/cards/${receipt.cardSlug}`, receipt);
});
