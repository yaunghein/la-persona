import { sendEmail } from '~~/server/utils/email';
import { getAdminNotificationEmails } from '~~/server/utils/env';

function logEmailFailure(context: string, error: unknown) {
  console.error(`[subscription-email] ${context}`, error);
}

export async function notifySubscriptionSubmissionEmails(params: {
  payerEmail: string;
  payerName: string;
  submissionTitle: string;
  userBodyText: string;
  teamDetailLines: string[];
  /** When set, team email shows a CTA (e.g. Thakhin requests list). */
  teamRequestsDashboardUrl?: string;
}) {
  const {
    payerEmail,
    payerName,
    submissionTitle,
    userBodyText,
    teamDetailLines,
    teamRequestsDashboardUrl,
  } = params;

  if (!payerEmail?.trim()) {
    return;
  }

  const teamRecipients = getAdminNotificationEmails();

  try {
    const userHtml = await renderEmailComponent(
      'SubscriptionSubmissionReceivedUser',
      {
        recipientName: payerName || payerEmail,
        bodyText: userBodyText,
      }
    );
    await sendEmail({
      to: [payerEmail.trim()],
      subject: `LA PERSONA — We received your ${submissionTitle}`,
      html: userHtml,
    });
  } catch (e) {
    logEmailFailure('user submission acknowledgment', e);
  }

  if (teamRecipients.length > 0) {
    try {
      const teamHtml = await renderEmailComponent(
        'SubscriptionSubmissionReceivedTeam',
        {
          payerName: payerName || 'Unknown',
          payerEmail: payerEmail.trim(),
          submissionTitle,
          detailLines: teamDetailLines,
          requestsDashboardUrl: teamRequestsDashboardUrl,
        }
      );
      await sendEmail({
        to: teamRecipients,
        subject: `[LA PERSONA] ${submissionTitle} — ${payerName || payerEmail}`,
        html: teamHtml,
      });
    } catch (e) {
      logEmailFailure('team submission notification', e);
    }
  }
}

export async function notifySubscriptionPaymentApprovedEmail(params: {
  payerEmail: string;
  payerName: string;
  bodyText: string;
}) {
  const { payerEmail, payerName, bodyText } = params;
  if (!payerEmail?.trim()) return;

  try {
    const html = await renderEmailComponent('SubscriptionPaymentApprovedUser', {
      recipientName: payerName || payerEmail,
      bodyText,
    });
    await sendEmail({
      to: [payerEmail.trim()],
      subject: 'LA PERSONA — Your payment was approved',
      html,
    });
  } catch (e) {
    logEmailFailure('payment approved user email', e);
  }
}

export async function notifySubscriptionPaymentRejectedEmail(params: {
  payerEmail: string;
  payerName: string;
  bodyText: string;
}) {
  const { payerEmail, payerName, bodyText } = params;
  if (!payerEmail?.trim()) return;

  try {
    const html = await renderEmailComponent('SubscriptionPaymentRejectedUser', {
      recipientName: payerName || payerEmail,
      bodyText,
    });
    await sendEmail({
      to: [payerEmail.trim()],
      subject: 'LA PERSONA — Update on your payment',
      html,
    });
  } catch (e) {
    logEmailFailure('payment rejected user email', e);
  }
}
