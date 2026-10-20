import type { H3Event } from 'h3';
import { findCardWithContextBySlug } from '~~/server/features/card/card.repository';
import {
  findMembership,
  findOrganizerCardSlug,
  findUserCardInOrganization,
} from '~~/server/features/organization/community.repository';
import { joinCommunity } from '~~/server/features/organization/community.service';
import { sendEventBroadcastEmail } from '~~/server/features/event/broadcast.notifications';
import { sendEventCheckInEmail } from '~~/server/features/event/check-in.notifications';
import { qrTicketImageUrl } from '~~/server/features/event/event-email-content';
import { findCommunitySettingByOrganizationId } from '~~/server/features/organization/community-setting.repository';
import {
  deleteEventByIdAndOrganizationId,
  findEventsByOrganizationId,
  findPublicEventById,
  insertEvent,
  toEventDTO,
  updateEventByIdAndOrganizationId,
} from '~~/server/features/event/event.repository';
import {
  GoogleCalendarApiError,
  GoogleCalendarConsentRequiredError,
  getGoogleCalendarAccessToken,
  upsertGoogleCalendarEvent,
} from '~~/server/features/event/google-calendar.service';
import {
  buildEventOverview,
  confirmRegistrationWithinCapacity,
  countCountedRegistrations,
  countRegistrationsByEventIds,
  deleteEventRegistration,
  findRegistrationByEventAndUser,
  findViewerRegistrations,
  insertRegistrationWithinCapacity,
  listEventAttendees,
  toViewerStatus,
  updateEventRegistrationStatus,
} from '~~/server/features/event/registration.repository';
import { sendEventRegistrationEmails } from '~~/server/features/event/registration.notifications';
import { sanitizeRichText } from '~~/server/lib/html-sanitizer';
import type {
  AddToGoogleCalendarResult,
  CreateEventRequest,
  EventBroadcastKind,
  EventCollection,
  EventDetailDTO,
  EventMembershipResult,
  PublicEventDTO,
  PublicEventViewer,
  SelectEvent,
  TicketLookup,
  UpdateEventRequest,
} from '~~/shared/contracts/event';
import {
  checkInPhase,
  eventPhase,
  eventStatus,
  registrationBlockMessage,
  registrationBlockReason,
} from '~~/shared/utils/event-datetime';
import { isCommunityCardComplete } from '~~/shared/utils/event-flow';
import type { TimezoneOffset } from '~~/shared/utils/datetime';

type Organization = { id: string; slug: string; name: string };

function toEventValues(request: UpdateEventRequest) {
  return {
    title: request.title,
    description: sanitizeRichText(request.description),
    location: request.location,
    mapUrl: request.mapUrl || null,
    startsAt: new Date(request.startsAt),
    endsAt: new Date(request.endsAt),
    capacity: request.capacity,
    coverUrl: request.coverUrl,
    photoUrls: request.photoUrls,
    registrationMode: request.registrationMode,
    approvalMode: request.approvalMode,
  };
}

export async function listOrganizationEvents(
  organizationId: string,
  viewerUserId: string
): Promise<EventCollection> {
  const rows = await findEventsByOrganizationId(organizationId);
  const eventIds = rows.map((row) => row.id);
  const [counts, viewerStatuses, organizerCardSlug] = await Promise.all([
    countRegistrationsByEventIds(eventIds),
    findViewerRegistrations(eventIds, viewerUserId),
    findOrganizerCardSlug(organizationId),
  ]);
  return {
    items: rows.map((row) => ({
      ...toEventDTO(row),
      registeredCount: counts.get(row.id) ?? 0,
      viewerRegistrationStatus: toViewerStatus(viewerStatuses.get(row.id)),
    })),
    organizerCardSlug,
  };
}

export async function describeEvent(
  record: SelectEvent,
  viewerUserId: string,
  timezoneOffset?: TimezoneOffset
): Promise<EventDetailDTO> {
  const [registeredCount, viewer, overview] = await Promise.all([
    countCountedRegistrations(record.id),
    findRegistrationByEventAndUser(record.id, viewerUserId),
    buildEventOverview(
      record.id,
      record.organizationId,
      record.createdAt,
      timezoneOffset
    ),
  ]);
  return {
    ...toEventDTO(record),
    registeredCount,
    viewerRegistrationStatus: toViewerStatus(viewer?.status),
    overview,
  };
}

export async function createEvent(
  organizationId: string,
  creatorUserId: string,
  request: CreateEventRequest
) {
  const inserted = await insertEvent({
    organizationId,
    userId: creatorUserId,
    ...toEventValues(request),
    timeZone: request.timeZone,
  });
  if (!inserted) throw new Error('Event insert returned no row.');
  return toEventDTO(inserted);
}

export async function updateEvent(
  record: SelectEvent,
  request: UpdateEventRequest
) {
  const updated = await updateEventByIdAndOrganizationId(
    record.id,
    record.organizationId,
    toEventValues(request)
  );
  if (!updated) throw notFound('Event');
  return toEventDTO(updated);
}

export async function deleteEvent(record: SelectEvent) {
  await deleteEventByIdAndOrganizationId(record.id, record.organizationId);
}

export async function listAttendees(record: SelectEvent) {
  return { items: await listEventAttendees(record.id, record.organizationId) };
}

function assertRegistrationOpen(record: SelectEvent, registeredCount: number) {
  const block = registrationBlockReason({
    startsAt: record.startsAt,
    endsAt: record.endsAt,
    registrationMode: record.registrationMode,
    capacity: record.capacity,
    registeredCount,
  });
  if (!block) return;
  const message = registrationBlockMessage(block);
  throw block === 'full'
    ? conflict(message, 'event_full')
    : forbidden(message, `registration_${block}`);
}

/**
 * The caller registers for an event (idempotent). Manual-approval events
 * hold the registration as pending; open events register immediately.
 */
export async function registerForEvent(
  h3Event: H3Event,
  params: { record: SelectEvent; organization: Organization; userId: string }
) {
  const { record, organization, userId } = params;
  assertRegistrationOpen(record, await countCountedRegistrations(record.id));

  const existing = await findRegistrationByEventAndUser(record.id, userId);
  if (existing) return { registration: existing, created: false };

  const status = record.approvalMode === 'manual' ? 'pending' : 'registered';
  const inserted = await insertRegistrationWithinCapacity({
    eventId: record.id,
    userId,
    status,
  });
  if (inserted === 'full')
    throw conflict(registrationBlockMessage('full'), 'event_full');
  if (inserted === 'not_found' || !inserted) throw notFound('Event');

  await sendEventRegistrationEmails(h3Event, {
    userId,
    organization,
    event: { id: record.id, title: record.title },
    status,
    notifyOwner: true,
  });
  return { registration: inserted, created: true };
}

export async function cancelOwnRegistration(
  record: SelectEvent,
  userId: string
) {
  const existing = await findRegistrationByEventAndUser(record.id, userId);
  if (!existing) return null;
  if (existing.status === 'checked_in') {
    throw conflict(
      'Checked-in attendees cannot unregister.',
      'already_checked_in'
    );
  }
  await deleteEventRegistration(record.id, userId);
  return existing;
}

/** An organizer confirms a pending registration if a seat is still free. */
export async function approveRegistration(
  h3Event: H3Event,
  params: {
    record: SelectEvent;
    organization: Organization;
    registration: { id: string; userId: string; status: string };
  }
) {
  const { record, organization, registration } = params;
  if (eventStatus(record.endsAt) === 'past') {
    throw conflict('This event has ended.', 'event_ended');
  }
  if (registration.status !== 'pending') return { status: registration.status };

  const updated = await confirmRegistrationWithinCapacity(
    registration.id,
    record.id
  );
  if (updated === 'full')
    throw conflict('This event is at capacity.', 'event_full');
  if (updated === 'not_found') throw notFound('Event');

  if (updated) {
    await sendEventRegistrationEmails(h3Event, {
      userId: registration.userId,
      organization,
      event: { id: record.id, title: record.title },
      status: 'registered',
      notifyOwner: false,
    });
  }
  return { status: 'registered' };
}

function assertCheckInOpen(record: SelectEvent) {
  const phase = checkInPhase(record.startsAt, record.endsAt, record.timeZone);
  if (phase === 'live') return;
  throw conflict(
    phase === 'before'
      ? 'Check-in opens on the event day.'
      : 'This event has ended.',
    phase === 'before' ? 'check_in_not_open' : 'event_ended'
  );
}

/** The attendee behind a scanned card, only if they hold a confirmed registration. */
async function findTicket(record: SelectEvent, cardSlug: string) {
  const card = await findCardWithContextBySlug(cardSlug);
  if (
    !card ||
    card.card.organizationId !== record.organizationId ||
    !card.card.userId
  ) {
    return null;
  }
  const registration = await findRegistrationByEventAndUser(
    record.id,
    card.card.userId
  );
  return { card, registration };
}

export async function lookUpTicket(
  record: SelectEvent,
  cardSlug: string
): Promise<TicketLookup> {
  assertCheckInOpen(record);
  const ticket = await findTicket(record, cardSlug);
  if (!ticket) return { status: 'not_found' };
  const { card, registration } = ticket;
  if (!registration || registration.status === 'pending') {
    return { status: 'not_found', slug: card.card.slug };
  }

  const holder = card.card;
  const attendee = {
    id: registration.id,
    name: [holder.firstName, holder.lastName].filter(Boolean).join(' ').trim(),
    role: holder.position || 'Member',
    company: holder.company || '',
    splineUrl: holder.splineUrl,
    slug: holder.slug,
    firstName: holder.firstName,
    lastName: holder.lastName,
    position: holder.position,
    phone: holder.phone,
    phoneCountryCode: holder.phoneCountryCode,
    email: holder.email,
    website: holder.website,
    planCode: card.subscription?.planCode ?? null,
    joinedAt: holder.createdAt.toISOString(),
    checkedInAt: registration.checkedInAt?.toISOString() ?? null,
  };
  return {
    status: registration.status === 'checked_in' ? 'already' : 'ready',
    attendee,
  };
}

/** Checks in a confirmed attendee (repeat scans are a no-op). */
export async function checkInAttendee(
  h3Event: H3Event,
  params: { record: SelectEvent; organization: Organization; cardSlug: string }
) {
  const { record, organization, cardSlug } = params;
  assertCheckInOpen(record);
  const ticket = await findTicket(record, cardSlug);
  if (!ticket?.registration || ticket.registration.status === 'pending') {
    throw notFound('Attendee');
  }
  const { card, registration } = ticket;
  if (registration.status === 'checked_in')
    return { registration, created: false };

  const checkedInAt = new Date();
  const updated = await updateEventRegistrationStatus(
    registration.id,
    'checked_in',
    { checkedInAt }
  );
  if (updated) {
    await sendEventCheckInEmail(h3Event, {
      userId: card.card.userId!,
      cardSlug: card.card.slug,
      cardFirstName: card.card.firstName,
      event: { id: record.id, title: record.title },
      organization: { id: organization.id, slug: organization.slug },
      checkedInAt,
    });
  }
  return { registration: updated ?? registration, created: true };
}

export async function broadcastToAttendees(
  h3Event: H3Event,
  params: {
    record: SelectEvent;
    organization: Organization;
    kind: EventBroadcastKind;
  }
) {
  const { record, organization, kind } = params;
  const phase = eventPhase(record.startsAt, record.endsAt);
  if (kind === 'reminder' && phase === 'past') {
    throw conflict('This event has ended.', 'event_ended');
  }
  if (kind === 'after_event' && phase === 'before') {
    throw conflict('This event has not started yet.', 'event_not_started');
  }
  return sendEventBroadcastEmail(h3Event, {
    kind,
    event: { id: record.id, title: record.title },
    organization: { id: organization.id, slug: organization.slug },
  });
}

/** Adds the event to the caller's Google Calendar (confirmed attendees only). */
export async function addEventToGoogleCalendar(
  h3Event: H3Event,
  params: {
    record: SelectEvent;
    organization: Organization;
    userId: string;
  }
): Promise<AddToGoogleCalendarResult> {
  const { record, organization, userId } = params;
  const registration = await findRegistrationByEventAndUser(record.id, userId);
  const logContext = { event_id: record.id, registration_id: registration?.id };

  if (
    !registration ||
    (registration.status !== 'registered' &&
      registration.status !== 'checked_in')
  ) {
    enrichLog(h3Event, {
      google_calendar: { ...logContext, result: 'not_registered' },
    });
    throw forbidden(
      'Only confirmed registrations can be added.',
      'not_registered'
    );
  }

  const accessToken = await getGoogleCalendarAccessToken(h3Event, userId);
  if (!accessToken) {
    enrichLog(h3Event, {
      google_calendar: { ...logContext, result: 'consent_required' },
    });
    return { status: 'consent_required' };
  }

  const [card, setting] = await Promise.all([
    findUserCardInOrganization(userId, organization.id),
    findCommunitySettingByOrganizationId(organization.id),
  ]);

  try {
    const { result, htmlLink } = await upsertGoogleCalendarEvent(
      accessToken,
      userId,
      record,
      {
        organizationName: organization.name,
        qrTicketUrl: card
          ? qrTicketImageUrl(card.slug, setting?.updatedAt.getTime() ?? 0)
          : null,
      }
    );
    enrichLog(h3Event, { google_calendar: { ...logContext, result } });
    return { status: result, htmlLink: htmlLink ?? null };
  } catch (error) {
    if (error instanceof GoogleCalendarConsentRequiredError) {
      enrichLog(h3Event, {
        google_calendar: { ...logContext, result: 'consent_required' },
      });
      return { status: 'consent_required' };
    }
    enrichLog(h3Event, {
      google_calendar: {
        ...logContext,
        result: 'google_error',
        ...(error instanceof GoogleCalendarApiError && {
          google_status: error.status,
          google_reason: error.reason,
        }),
      },
    });
    throw upstreamFailed(
      'Could not add event to Google Calendar.',
      'google_calendar_failed'
    );
  }
}

async function viewerOfEvent(
  userId: string,
  organizationId: string,
  eventId: string
): Promise<PublicEventViewer> {
  const membership = await findMembership(userId, organizationId);
  if (!membership) {
    return {
      isMember: false,
      cardSlug: null,
      cardComplete: false,
      viewerRegistrationStatus: 'none',
    };
  }
  const [card, registration] = await Promise.all([
    findUserCardInOrganization(userId, organizationId),
    findRegistrationByEventAndUser(eventId, userId),
  ]);
  return {
    isMember: true,
    cardSlug: card?.slug || null,
    cardComplete: card ? isCommunityCardComplete(card) : false,
    viewerRegistrationStatus: toViewerStatus(registration?.status),
  };
}

export async function describePublicEvent(
  eventId: string,
  viewerUserId: string | null
): Promise<PublicEventDTO> {
  const row = await findPublicEventById(eventId);
  if (!row) throw notFound('Event');
  const [viewer, organizerCardSlug, registeredCount] = await Promise.all([
    viewerUserId
      ? viewerOfEvent(viewerUserId, row.event.organizationId, eventId)
      : null,
    findOrganizerCardSlug(row.event.organizationId),
    countCountedRegistrations(eventId),
  ]);
  return {
    ...toEventDTO(row.event),
    organizer: {
      name: row.organizationName,
      logoUrl: row.organizationLogo,
      slug: row.organizationSlug,
      cardSlug: organizerCardSlug,
    },
    registeredCount,
    viewer,
  };
}

/** Visitors of a public event join its community (while registration is open). */
export async function joinEventCommunity(
  eventId: string,
  userId: string
): Promise<EventMembershipResult & { organizationId: string }> {
  const row = await findPublicEventById(eventId);
  if (!row) throw notFound('Event');
  assertRegistrationOpen(row.event, await countCountedRegistrations(eventId));

  const organizationId = row.event.organizationId;
  const alreadyMember = !!(await findMembership(userId, organizationId));
  await joinCommunity(userId, organizationId);
  const card = await findUserCardInOrganization(userId, organizationId);
  return {
    organizationId,
    organizationSlug: row.organizationSlug,
    eventId,
    cardSlug: card?.slug ?? null,
    alreadyMember,
    cardComplete: card ? isCommunityCardComplete(card) : false,
  };
}
