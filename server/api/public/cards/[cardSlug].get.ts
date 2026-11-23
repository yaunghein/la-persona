import { findCardWithContextBySlug } from '~~/server/features/card/card.repository';
import { toPublicCard } from '~~/server/features/card/card.mapper';
import {
  companyCardActivity,
  findRetiredCompanyLink,
} from '~~/server/features/organization/company.service';
import { CardRouteParams } from '~~/shared/contracts/card';
import { ORGANIZATION_TYPES } from '~~/shared/utils/constants';

export default defineEventHandler(async (event) => {
  const { cardSlug } = await parseRouteParams(event, CardRouteParams);
  const card = await findCardWithContextBySlug(cardSlug);
  if (!card) {
    const retired = await findRetiredCompanyLink(cardSlug);
    if (retired) {
      return { availability: 'retired' as const, companyName: retired.companyName };
    }
    throw notFound('Card');
  }
  if (
    card.organization.type === ORGANIZATION_TYPES.COMPANY &&
    (await companyCardActivity(card.card.id)) === 'paused'
  ) {
    return {
      availability: 'paused' as const,
      companyName: card.organization.name,
    };
  }
  if (card.card.visibility === 'members' && !event.context.principal)
    throw unauthorized('Sign in to view this card.');
  return toPublicCard(card);
});
