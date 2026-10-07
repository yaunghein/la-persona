import { Resend } from 'resend';
import { env } from '~~/server/utils/env';

const resend = new Resend(env.RESEND_API_KEY);

export const sendEmail = async (params: {
  to: string[];
  subject: string;
  html: string;
}) => {
  const response = await resend.emails.send({
    from: 'La Persona <welcome@contact.la-persona.com>',
    to: params.to,
    subject: params.subject,
    html: params.html,
  });

  if (response.error) {
    const failure = new Error(response.error.message || 'Failed to send email');
    failure.name = response.error.name || 'ResendError';
    throw failure;
  }

  return response;
};
