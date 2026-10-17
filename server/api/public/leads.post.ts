import { forwardLeadToHubspot } from '~~/server/features/marketing/lead.service';
import { CreateLeadRequest } from '~~/shared/contracts/marketing';

/** Landing page lead capture, forwarded to HubSpot. */
export default defineEventHandler(async (event) => {
  const lead = await parseRequestBody(event, CreateLeadRequest);
  enrichLog(event, { lead: { email: lead.email } });
  await forwardLeadToHubspot(lead);
  return respondAccepted(event, { status: 'received' });
});
