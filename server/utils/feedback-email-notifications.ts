import {
  FEEDBACK_KIND_LABELS,
  type FeedbackKind,
} from '~~/shared/types/feedback';
import { sendEmail } from '~~/server/utils/email';
import { getAdminNotificationEmails } from '~~/server/utils/env';
import {
  emailErrorLabel,
  type EmailSendResult,
} from '~~/server/utils/wide-event';

export async function notifyFeedbackSubmissionEmail(params: {
  kind: FeedbackKind;
  message: string;
  submitterName: string;
  submitterEmail: string;
  organizationName: string;
}): Promise<EmailSendResult[]> {
  const recipients = getAdminNotificationEmails();
  if (!recipients.length) return [];

  const kindLabel = FEEDBACK_KIND_LABELS[params.kind];
  const submitterName = params.submitterName.trim() || params.submitterEmail;
  const template = 'feedback_team';

  try {
    const html = await renderEmailComponent('FeedbackSubmissionReceivedTeam', {
      kindLabel,
      message: params.message,
      submitterName,
      submitterEmail: params.submitterEmail,
      organizationName: params.organizationName,
    });

    await sendEmail({
      to: recipients,
      subject: `[LA PERSONA] ${kindLabel} — ${submitterName}`,
      html,
    });
    return [{ ok: true, template, to: recipients }];
  } catch (error) {
    return [
      {
        ok: false,
        template,
        to: recipients,
        error: emailErrorLabel(error),
      },
    ];
  }
}
