import { z } from 'zod';
import { Resend } from 'resend';
import { env } from './env';

const resend = new Resend(env.RESEND_API_KEY);

export const sendEmail = async (params: {
  to: string[];
  subject: string;
  html: string;
}) => {
  return await resend.emails.send({
    from: 'La Persona <no-reply@contact.la-persona.com>',
    to: params.to,
    subject: params.subject,
    html: params.html,
  });
};

export const emailSchema = z.object({
  name: z.string().nonempty().min(1),
  to: z.array(z.email()).nonempty().min(1),
  subject: z.string().nonempty().min(1),
  // html: z.string().nonempty().min(1),
  template: z.enum(['Welcome']),
});

export type EmailSchema = z.infer<typeof emailSchema>;
