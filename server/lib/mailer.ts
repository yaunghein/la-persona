import { Resend } from 'resend';
import { env } from '~~/env';

const resend = new Resend(env.RESEND_API_KEY);
const FROM = 'La Persona <welcome@contact.la-persona.com>';
// Resend batch limit; batch sends can't carry attachments.
const BATCH_SIZE = 100;

function toError(error: { message?: string; name?: string }) {
  const failure = new Error(error.message || 'Failed to send email');
  failure.name = error.name || 'ResendError';
  return failure;
}

export const sendEmail = async (params: {
  to: string[];
  subject: string;
  html: string;
  attachments?: { filename: string; content: Buffer }[];
}) => {
  const response = await resend.emails.send({
    from: FROM,
    to: params.to,
    subject: params.subject,
    html: params.html,
    attachments: params.attachments,
  });

  if (response.error) throw toError(response.error);

  return response;
};

/**
 * One separate email per recipient, sent in chunks of 100. Resolves with each
 * chunk's recipients and error so callers can report partial failures.
 */
export const sendBatchEmails = async (
  emails: { to: string; subject: string; html: string }[]
) => {
  const chunks: { to: string[]; error?: Error }[] = [];
  for (let start = 0; start < emails.length; start += BATCH_SIZE) {
    const chunk = emails.slice(start, start + BATCH_SIZE);
    const to = chunk.map((email) => email.to);
    try {
      const response = await resend.batch.send(
        chunk.map((email) => ({
          from: FROM,
          to: [email.to],
          subject: email.subject,
          html: email.html,
        }))
      );
      chunks.push(
        response.error ? { to, error: toError(response.error) } : { to }
      );
    } catch (error) {
      chunks.push({ to, error: error instanceof Error ? error : toError({}) });
    }
  }
  return chunks;
};
