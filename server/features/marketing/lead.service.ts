import { env } from '~~/env';
import type { CreateLeadRequest } from '~~/shared/contracts/marketing';

const CONSENT_TEXT =
  'I would like to receive marketing communications on products, services and events offered by La Persona. I understand these communications may be personalized to me based on my interests, preferences and use of products and services, including invitations to provide customer experience feedback.';

/** Forwards a landing-page lead to HubSpot. Upstream details are logged, never echoed. */
export async function forwardLeadToHubspot(lead: CreateLeadRequest) {
  const url = `https://api.hsforms.com/submissions/v3/integration/submit/${env.HUBSPOT_PORTAL_ID}/${env.HUBSPOT_FORM_GUID_LEAD}`;
  const field = (name: string, value: string | undefined) => ({
    objectTypeId: '0-1',
    name,
    value,
  });
  try {
    await $fetch(url, {
      method: 'POST',
      body: {
        submittedAt: Date.now(),
        fields: [
          field('email', lead.email),
          field('firstname', `${lead.firstname} ${lead.lastname}`),
          field('phone', lead.phone),
          field('customer_groups', lead.customer_groups),
          field('message', lead.message),
        ],
        legalConsentOptions: {
          consent: {
            consentToProcess: true,
            text: CONSENT_TEXT,
            communications: [
              { value: true, subscriptionTypeId: 123, text: CONSENT_TEXT },
            ],
          },
        },
      },
    });
  } catch {
    throw upstreamFailed(
      'We could not save your details. Please try again.',
      'lead_submission_failed'
    );
  }
}
