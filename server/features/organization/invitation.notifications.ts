import { env } from '~~/env';
import { sendEmail } from '~~/server/lib/mailer';
import {
  emailErrorLabel,
  type EmailSendResult,
} from '~~/server/utils/wide-event';
import { ROUTES } from '~~/shared/utils/routes';

export async function sendOrganizerInvitationEmail(params: {
  to: string;
  organizationName: string;
  invitationId: string;
}): Promise<EmailSendResult[]> {
  const to = [params.to];
  const template = 'community_organizer_invitation';

  try {
    const html = await renderEmailComponent('CommunityOrganizerInvitation', {
      organizationName: params.organizationName,
      inviteUrl: `${env.BASE_URL}${ROUTES.INVITE.COMMUNITY_ACCEPT(params.invitationId)}`,
    });
    await sendEmail({
      to,
      subject: `You're invited to organize ${params.organizationName} on LA PERSONA`,
      html,
    });
    return [{ ok: true, template, to }];
  } catch (error) {
    return [{ ok: false, template, to, error: emailErrorLabel(error) }];
  }
}
