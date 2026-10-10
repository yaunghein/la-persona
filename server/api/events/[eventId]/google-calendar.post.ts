import { findEventByIdAndOrganizationId } from '~~/server/db/queries/event';
import { findRegistrationByEventAndUser } from '~~/server/db/queries/event-registration';
import {
  GoogleCalendarApiError,
  GoogleCalendarConsentRequiredError,
  getGoogleCalendarAccessToken,
  upsertGoogleCalendarEvent,
} from '~~/server/services/google-calendar';
import { handleApiError } from '~~/server/utils/errors';
import {
  requireCommunityOrganization,
  requireOrganizationPermission,
} from '~~/server/utils/organization-permissions';
import { enrichLog } from '~~/server/utils/wide-event';
import { ORGANIZATION_PERMISSIONS } from '~~/shared/permissions/organization';
import type { AddToGoogleCalendarResult } from '~~/shared/types/event';

export default defineEventHandler(
  async (event): Promise<AddToGoogleCalendarResult | undefined> => {
    if (!useRuntimeConfig(event).public.googleCalendarEnabled) {
      throw createError({ statusCode: 404, statusMessage: 'Not found' });
    }

    const { session, org } = await requireCommunityOrganization(event);
    await requireOrganizationPermission(
      event,
      ORGANIZATION_PERMISSIONS.EVENT_READ
    );
    const eventId = getRouterParam(event, 'eventId');

    if (!eventId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Event id is required',
      });
    }

    try {
      const row = await findEventByIdAndOrganizationId(eventId, org.id);
      if (!row) {
        throw createError({
          statusCode: 404,
          statusMessage: 'Event not found',
        });
      }
      enrichLog(event, { event: { id: eventId, title: row.title } });

      const registration = await findRegistrationByEventAndUser(
        eventId,
        session.user.id
      );
      const logContext = {
        event_id: eventId,
        registration_id: registration?.id,
      };

      if (
        !registration ||
        (registration.status !== 'registered' &&
          registration.status !== 'checked_in')
      ) {
        enrichLog(event, {
          google_calendar: { ...logContext, result: 'not_registered' },
        });
        throw createError({
          statusCode: 403,
          statusMessage: 'Only confirmed registrations can be added',
        });
      }

      const accessToken = await getGoogleCalendarAccessToken(
        event,
        session.user.id
      );
      if (!accessToken) {
        enrichLog(event, {
          google_calendar: { ...logContext, result: 'consent_required' },
        });
        return { status: 'consent_required' };
      }

      try {
        const { result, htmlLink } = await upsertGoogleCalendarEvent(
          accessToken,
          session.user.id,
          row
        );
        enrichLog(event, { google_calendar: { ...logContext, result } });
        return { status: result, htmlLink: htmlLink ?? null };
      } catch (error) {
        if (error instanceof GoogleCalendarConsentRequiredError) {
          enrichLog(event, {
            google_calendar: { ...logContext, result: 'consent_required' },
          });
          return { status: 'consent_required' };
        }
        enrichLog(event, {
          google_calendar: {
            ...logContext,
            result: 'google_error',
            ...(error instanceof GoogleCalendarApiError && {
              google_status: error.status,
              google_reason: error.reason,
            }),
          },
        });
        throw error;
      }
    } catch (error) {
      handleApiError(error, {
        statusCode: 502,
        statusMessage: 'Could not add event to Google Calendar',
      });
    }
  }
);
