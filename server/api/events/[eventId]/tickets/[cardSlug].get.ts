import { authorizeEventAccess } from '~~/server/features/event/event.policy';
import { lookUpTicket } from '~~/server/features/event/event.service';
import { TicketRouteParams } from '~~/shared/contracts/event';

/** Looks up a scanned card before check-in. */
export default defineEventHandler(async (event) => {
  const { eventId, cardSlug } = await parseRouteParams(
    event,
    TicketRouteParams
  );
  const { record } = await authorizeEventAccess(event, eventId, 'checkIn:read');
  const result = await lookUpTicket(record, cardSlug);
  enrichLog(event, {
    registration: {
      event_id: eventId,
      result: result.status,
      card_slug: cardSlug,
    },
  });
  return result;
});
