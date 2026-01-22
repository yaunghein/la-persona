import { Resend } from 'resend';
import { env } from '~~/server/utils/env';

const resend = new Resend(env.RESEND_API_KEY);

export const sendEmail = async (params: {
  to: string[];
  subject: string;
  html: string;
}) => {
  return await resend.emails.send({
    from: 'La Persona <welcome@contact.la-persona.com>',
    to: params.to,
    subject: params.subject,
    html: params.html,
  });
};
