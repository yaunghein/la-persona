import { findCardWithContextBySlug } from '~~/server/features/card/card.repository';
import { toPublicCard } from '~~/server/features/card/card.mapper';
import { cardActivity } from '~~/server/features/card/card.service';
import {
  isCurrentLinkVacated,
  findRetiredCompanyLink,
} from '~~/server/features/organization/company.service';
import {
  CardRouteParams,
  type PublicCard,
  type UnavailablePublicCard,
} from '~~/shared/contracts/card';
import {
  ORGANIZATION_TYPES,
  type OrganizationType,
} from '~~/shared/utils/constants';

export default defineEventHandler(
  async (event): Promise<PublicCard | UnavailablePublicCard> => {
    const { cardSlug } = await parseRouteParams(event, CardRouteParams);
    const card = await findCardWithContextBySlug(cardSlug);
    if (!card) {
      const retired = await findRetiredCompanyLink(cardSlug);
      if (retired) {
        return {
          availability: 'retired',
          organizationType: ORGANIZATION_TYPES.COMPANY,
          companyName: retired.companyName,
          renewPath: null,
        };
      }
      throw notFound('Card');
    }
    if (card.card.visibility === 'members' && !event.context.principal)
      throw unauthorized('Sign in to view this card.');

    const activity = cardActivity(card);
    if (activity === 'ok') return toPublicCard(card);

    const isCompany = card.organization.type === ORGANIZATION_TYPES.COMPANY;
    // A vacant card that had a holder still carries their link: they have left.
    const hasLeft =
      activity === 'vacant' && (await isCurrentLinkVacated(card.card.id));
    const isOwner =
      !isCompany &&
      !!card.card.userId &&
      event.context.principal?.user.id === card.card.userId;
    return {
      availability: hasLeft ? 'retired' : 'paused',
      organizationType: card.organization.type as OrganizationType,
      companyName: isCompany ? card.organization.name : null,
      renewPath: isOwner
        ? `/platform/${card.organization.slug}/cards/${card.card.slug}?payment=renewal`
        : null,
    };
  }
);
