import { eq } from 'drizzle-orm';
import { db } from '~~/server/db';
import { organization } from '~~/server/db/schema';
import { ensureCommunitySetting } from '~~/server/db/queries/community-setting';
import { handleApiError } from '~~/server/utils/errors';
import { requireOrganizationPermission } from '~~/server/utils/organization-permissions';
import { toCommunitySettingsDTO } from '~~/shared/types/community-settings';
import { ORGANIZATION_PERMISSIONS } from '~~/shared/permissions/organization';
import { ORGANIZATION_TYPES } from '~~/shared/utils/constants';

export default defineEventHandler(async (event) => {
  const session = await requireOrganizationPermission(
    event,
    ORGANIZATION_PERMISSIONS.ORGANIZATION_READ
  );

  try {
    const org = await db.query.organization.findFirst({
      where: eq(organization.id, session.session.activeOrganizationId),
      columns: {
        id: true,
        name: true,
        logo: true,
        type: true,
      },
    });

    if (!org) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Organization not found',
      });
    }

    if (org.type !== ORGANIZATION_TYPES.COMMUNITY) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Community settings are only available for community organizations',
      });
    }

    const setting = await ensureCommunitySetting(org.id);

    if (!setting) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to load community settings',
      });
    }

    return toCommunitySettingsDTO({
      name: org.name,
      logo: org.logo,
      coverUrl: setting.coverUrl,
      description: setting.description,
      guidelines: setting.guidelines,
      whyJoin: setting.whyJoin,
      splineUrl: setting.splineUrl,
      wallpaperUrl: setting.wallpaperUrl,
      cardBackUrl: setting.cardBackUrl,
    });
  } catch (error) {
    handleApiError(error, {
      statusCode: 500,
      statusMessage: 'Failed to load community settings',
    });
  }
});
