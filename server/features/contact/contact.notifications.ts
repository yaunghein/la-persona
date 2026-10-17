import { env } from '~~/env';
import { sendEmail } from '~~/server/lib/mailer';
import {
  emailErrorLabel,
  type EmailSendResult,
} from '~~/server/utils/wide-event';
import { ROUTES } from '~~/shared/utils/routes';

const TEMPLATE = 'contact_exchange';

/** The person whose details the recipient is receiving. */
export type ExchangedContact = {
  name: string;
  email: string;
  phone: string;
  company: string;
  position: string;
};

function contactExchangeSubject(name: string) {
  const firstName = name.trim().split(/\s+/)[0] || 'LA PERSONA';
  return `New Contact Exchange from ${firstName} 👋`;
}

/**
 * One recipient per message. Subject and body come from a fixed template, so
 * public callers can never choose the content or fan out to many addresses.
 */
export async function sendContactExchangeEmail(params: {
  to: string;
  contact: ExchangedContact;
}): Promise<EmailSendResult> {
  const to = [params.to];
  try {
    const html = await renderEmailComponent('ContactExchange', {
      ...params.contact,
      contactsUrl: `${env.BASE_URL}${ROUTES.PLATFORM.CONTACTS}`,
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
