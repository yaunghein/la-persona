import { eq } from 'drizzle-orm';
import { db } from '~~/server/db';
import { organization } from '~~/server/db/schema';
import { upsertCommunitySettingByOrganizationId } from '~~/server/db/queries/community-setting';
import { handleApiError } from '~~/server/utils/errors';
import { requireOrganizationPermission } from '~~/server/utils/organization-permissions';
import { ORGANIZATION_PERMISSIONS } from '~~/shared/permissions/organization';
import {
  toCommunitySettingsDTO,
  updateCommunitySettingsBodySchema,
} from '~~/shared/types/community-settings';
import { ORGANIZATION_TYPES } from '~~/shared/utils/constants';

export default defineEventHandler(async (event) => {
  const session = await requireOrganizationPermission(
    event,
    ORGANIZATION_PERMISSIONS.ORGANIZATION_UPDATE
  );
  const body = await readValidatedBody(
    event,
    updateCommunitySettingsBodySchema.safeParse
  );

  if (!body.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validation failed',
      data: body.error.issues,
    });
  }

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
        statusMessage:
          'Community settings are only available for community organizations',
      });
    }

    const [updatedOrg] = await db
      .update(organization)
      .set({ name: body.data.name })
      .where(eq(organization.id, org.id))
      .returning({
        name: organization.name,
        logo: organization.logo,
      });

    if (!updatedOrg) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to update organization',
      });
    }

    const setting = await upsertCommunitySettingByOrganizationId(org.id, {
      description: body.data.description,
      guidelines: body.data.guidelines,
      whyJoin: body.data.whyJoin,
    });

    if (!setting) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to update community settings',
      });
    }

    return toCommunitySettingsDTO({
      name: updatedOrg.name,
      logo: updatedOrg.logo,
      coverUrl: setting.coverUrl,
      description: setting.description,
      guidelines: setting.guidelines,
      whyJoin: setting.whyJoin,
    });
  } catch (error) {
    handleApiError(error, {
      statusCode: 500,
      statusMessage: 'Failed to update community settings',
    });
  }
});
