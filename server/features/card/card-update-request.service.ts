import {
  decideCardUpdateRequest,
  findCardUpdateRequest,
  listCardUpdateRequestsForReview,
} from '~~/server/features/card/card-update-request.repository';
import type {
  CardUpdateRequestForReview,
  ListCardUpdateRequestsQuery,
} from '~~/shared/contracts/card';
import type { Page } from '~~/shared/contracts/collection';

const REQUESTABLE_FIELDS = [
  'firstName',
  'lastName',
  'position',
  'phone',
  'email',
  'website',
] as const;

export async function listCardUpdateRequests(
  query: ListCardUpdateRequestsQuery
): Promise<Page<CardUpdateRequestForReview>> {
  const { rows, total } = await listCardUpdateRequestsForReview(query);
  return {
    items: rows.map(({ request, card, requesterName, requesterEmail }) => ({
      id: request.id,
      status: request.status,
      note: request.note,
      createdAt: request.createdAt.toISOString(),
      requested: {
        firstName: request.firstName,
        lastName: request.lastName,
        position: request.position,
        phone: request.phone,
        email: request.email,
        website: request.website,
      },
      card,
      requesterName,
      requesterEmail,
    })),
    total,
    limit: query.limit,
    offset: query.offset,
  };
}

/** Approving copies every non-empty requested field onto the card. */
export async function reviewCardUpdateRequest(
  requestId: string,
  status: 'approved' | 'declined'
) {
  const found = await findCardUpdateRequest(requestId);
  if (!found) throw notFound('Update request');
  const { request } = found;
  if (request.status !== 'pending') {
    throw conflict(
      `Only pending update requests can be ${status}.`,
      'card_update_request_decided'
    );
  }

  const cardChanges: Record<string, string> = {};
  for (const field of REQUESTABLE_FIELDS) {
    const value = request[field];
    if (value) cardChanges[field] = value;
  }

  const decided = await decideCardUpdateRequest({
    requestId,
    cardId: request.cardId,
    status,
    cardChanges,
  });
  if (!decided) {
    throw conflict(
      `Only pending update requests can be ${status}.`,
      'card_update_request_decided'
    );
  }

  return {
    cardId: request.cardId,
    fields: status === 'approved' ? Object.keys(cardChanges) : [],
    requesterEmail: found.requesterEmail,
  };
}
