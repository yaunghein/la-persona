import { sendEmail } from '~~/server/utils/email';
import { env } from '~~/env';
import {
  emailErrorLabel,
  type EmailSendResult,
} from '~~/server/utils/wide-event';
import { ROUTES } from '~~/shared/utils/routes';

const TEMPLATE = 'contact_exchange';

export type ContactExchangeEmailContact = {
  name: string;
  email: string;
  phone: string;
  company: string;
  position: string;
};

export const contactsUrl = () => `${env.BASE_URL}${ROUTES.PLATFORM.CONTACTS}`;

export function contactExchangeSubject(name: string) {
  const firstName = name.trim().split(/\s+/)[0] || 'LA PERSONA';
  return `New Contact Exchange from ${firstName} 👋`;
}

export async function sendContactExchangeEmail(params: {
  to: string;
  contact: ContactExchangeEmailContact;
}): Promise<EmailSendResult> {
  const to = [params.to];
  try {
    const html = await renderEmailComponent('ContactExchange', {
      ...params.contact,
      contactsUrl: contactsUrl(),
    });
    await sendEmail({
      to,
      subject: contactExchangeSubject(params.contact.name),
      html,
    });
    return { ok: true, template: TEMPLATE, to };
  } catch (error) {
    return { ok: false, template: TEMPLATE, to, error: emailErrorLabel(error) };
  }
}
