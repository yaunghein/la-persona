import { listAttendeeLabels } from '~~/server/features/event/attendee-label.repository';
import { authorizeCommunityAccess } from '~~/server/features/organization/organization.policy';
import type { Collection } from '~~/shared/contracts/collection';
import type { AttendeeLabelSummary } from '~~/shared/contracts/event';
import { OrganizationRouteParams } from '~~/shared/contracts/organization';

/** The community's attendee labels, oldest first, with how many registrations carry each. */
export default defineEventHandler(
  async (event): Promise<Collection<AttendeeLabelSummary>> => {
    const { orgSlug } = await parseRouteParams(event, OrganizationRouteParams);
    const { organization } = await authorizeCommunityAccess(
      event,
      orgSlug,
      'attendeeLabel:read'
    );
    return { items: await listAttendeeLabels(organization.id) };
  }
);
