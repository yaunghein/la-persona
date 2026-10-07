import { sendEmail } from '~~/server/utils/email';
import { getAdminNotificationEmails } from '~~/server/utils/env';
import {
  emailErrorLabel,
  type EmailSendResult,
} from '~~/server/utils/wide-event';

function success(template: string, to: string[]): EmailSendResult {
  return { ok: true, template, to };
}

function failure(
  template: string,
  to: string[],
  error: unknown
): EmailSendResult {
  return { ok: false, template, to, error: emailErrorLabel(error) };
}

export async function notifySubscriptionSubmissionEmails(params: {
  payerEmail: string;
  payerName: string;
  submissionTitle: string;
  userBodyText: string;
  teamDetailLines: string[];
  /** When set, team email shows a CTA (e.g. Thakhin requests list). */
  teamRequestsDashboardUrl?: string;
}): Promise<EmailSendResult[]> {
  const {
    payerEmail,
    payerName,
    submissionTitle,
    userBodyText,
    teamDetailLines,
    teamRequestsDashboardUrl,
  } = params;

  if (!payerEmail?.trim()) return [];

  const results: EmailSendResult[] = [];
  const payer = payerEmail.trim();
  const userTemplate = 'submission_received_user';

  try {
    const userHtml = await renderEmailComponent(
      'SubscriptionSubmissionReceivedUser',
      {
        recipientName: payerName || payer,
        bodyText: userBodyText,
      }
    );
    await sendEmail({
      to: [payer],
      subject: `LA PERSONA — We received your ${submissionTitle}`,
      html: userHtml,
    });
    results.push(success(userTemplate, [payer]));
  } catch (error) {
    results.push(failure(userTemplate, [payer], error));
  }

  const teamRecipients = getAdminNotificationEmails();
  if (teamRecipients.length > 0) {
    const teamTemplate = 'submission_received_team';
    try {
      const teamHtml = await renderEmailComponent(
        'SubscriptionSubmissionReceivedTeam',
        {
          payerName: payerName || 'Unknown',
          payerEmail: payer,
          submissionTitle,
          detailLines: teamDetailLines,
          requestsDashboardUrl: teamRequestsDashboardUrl,
        }
      );
      await sendEmail({
        to: teamRecipients,
        subject: `[LA PERSONA] ${submissionTitle} — ${payerName || payer}`,
        html: teamHtml,
      });
      results.push(success(teamTemplate, teamRecipients));
    } catch (error) {
      results.push(failure(teamTemplate, teamRecipients, error));
    }
  }

  return results;
}

export async function notifySubscriptionPaymentApprovedEmail(params: {
  payerEmail: string;
  payerName: string;
  bodyText: string;
}): Promise<EmailSendResult[]> {
  const { payerEmail, payerName, bodyText } = params;
  if (!payerEmail?.trim()) return [];

  const to = [payerEmail.trim()];
  const template = 'payment_approved';
  try {
    const html = await renderEmailComponent('SubscriptionPaymentApprovedUser', {
      recipientName: payerName || to[0],
      bodyText,
    });
    await sendEmail({
      to,
      subject: 'LA PERSONA — Your payment was approved',
      html,
    });
    return [success(template, to)];
  } catch (error) {
    return [failure(template, to, error)];
  }
}

export async function notifySubscriptionPaymentRejectedEmail(params: {
  payerEmail: string;
  payerName: string;
  bodyText: string;
}): Promise<EmailSendResult[]> {
  const { payerEmail, payerName, bodyText } = params;
  if (!payerEmail?.trim()) return [];

  const to = [payerEmail.trim()];
  const template = 'payment_rejected';
  try {
    const html = await renderEmailComponent('SubscriptionPaymentRejectedUser', {
      recipientName: payerName || to[0],
      bodyText,
    });
    await sendEmail({
      to,
      subject: 'LA PERSONA — Update on your payment',
      html,
    });
    return [success(template, to)];
  } catch (error) {
    return [failure(template, to, error)];
  }
}
