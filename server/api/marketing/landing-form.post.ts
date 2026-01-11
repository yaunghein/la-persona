import { z } from 'zod';
import { env } from '~~/server/utils/env';

const CONSENT_TEXT =
  '	I would like to receive marketing communications on products, services and events offered by La Persona. I understand these communications may be personalized to me based on my interests, preferences and use of products and services, including invitations to provide customer experience feedback.';

const leadSchema = z.object({
  email: z.email(),
  firstname: z.string().min(1),
  lastname: z.string().min(1),
  phone: z.string().optional(),
  customer_groups: z.string().optional(),
  message: z.string().optional(),
});

export default defineEventHandler(async (event) => {
  const result = await readValidatedBody(event, leadSchema.safeParse);
  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid body parameters',
      data: result.error.issues,
    });
  }
  const url = `https://api.hsforms.com/submissions/v3/integration/submit/${env.HUBSPOT_PORTAL_ID}/${env.HUBSPOT_FORM_GUID_LEAD}`;
  const body = {
    submittedAt: new Date().getTime(),
    fields: [
      { objectTypeId: '0-1', name: 'email', value: result.data.email },
      {
        objectTypeId: '0-1',
        name: 'firstname',
        value: `${result.data.firstname} ${result.data.lastname}`,
      },
      { objectTypeId: '0-1', name: 'phone', value: result.data.phone },
      {
        objectTypeId: '0-1',
        name: 'customer_groups',
        value: result.data.customer_groups,
      },
      { objectTypeId: '0-1', name: 'message', value: result.data.message },
    ],
    legalConsentOptions: {
      consent: {
        consentToProcess: true,
        text: CONSENT_TEXT,
        communications: [
          {
            value: true,
            subscriptionTypeId: 123,
            text: CONSENT_TEXT,
          },
        ],
      },
    },
  };

  try {
    const response = await $fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });

    return {
      success: true,
      data: response,
    };
  } catch (error: any) {
    if (error?.data) {
      throw createError({
        statusCode: 502,
        statusMessage: 'HubSpot submission failed',
        data: error.data,
      });
    }

    if (error?.statusCode) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error',
    });
  }
});
