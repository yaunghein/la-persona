import { env } from '~~/env';
import { publicCardUrl } from '~~/server/features/event/event-email-content';
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
    const firstName =
      params.contact.name.trim().split(/\s+/)[0] || 'LA PERSONA';
    await sendEmail({
      to,
      subject: `New Contact Exchange from ${firstName} 👋`,
      html,
    });
    return { ok: true, template: TEMPLATE, to };
  } catch (error) {
    return { ok: false, template: TEMPLATE, to, error: emailErrorLabel(error) };
  }
}

/** A public-form visitor without an account gets the card holder's details and a link to their card. */
export async function sendContactExchangeVisitorEmail(params: {
  to: string;
  recipientName: string;
  contact: ExchangedContact;
  cardSlug: string;
}): Promise<EmailSendResult> {
  const template = 'contact_exchange_visitor';
  const to = [params.to];
  try {
    const html = await renderEmailComponent('ContactExchangeVisitor', {
      ...params.contact,
      recipientName: params.recipientName,
      cardUrl: publicCardUrl(params.cardSlug),
    });
    await sendEmail({
      to,
      subject: `${params.contact.name}'s contact details`,
      html,
    });
    return { ok: true, template, to };
  } catch (error) {
    return { ok: false, template, to, error: emailErrorLabel(error) };
  }
}
