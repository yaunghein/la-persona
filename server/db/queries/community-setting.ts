import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../../db';
import { communitySetting } from '../schema';
import type { InsertCommunitySetting } from '~~/shared/types/community-settings';
import { env } from '~~/server/utils/env';

function communityBrandDefaults() {
  return {
    splineUrl: env.DEFAULT_SPLINE_URL,
    wallpaperUrl: env.DEFAULT_WALLPAPER_URL,
    cardBackUrl: env.DEFAULT_CARD_BACK_URL,
  };
}

export const findCommunitySettingByOrganizationId = async (
  organizationId: string
) => {
  const [row] = await db
    .select()
    .from(communitySetting)
    .where(eq(communitySetting.organizationId, organizationId))
    .limit(1);

  return row;
};

export const findCommunitySettingByInviteToken = async (token: string) => {
  const [row] = await db
    .select()
    .from(communitySetting)
    .where(eq(communitySetting.inviteToken, token))
    .limit(1);

  return row;
};

export const insertCommunitySetting = async (
  values: InsertCommunitySetting
) => {
  const [inserted] = await db
    .insert(communitySetting)
    .values(values)
    .returning();

  return inserted;
};

export const upsertCommunitySettingByOrganizationId = async (
  organizationId: string,
  values: Pick<
    InsertCommunitySetting,
    'description' | 'guidelines' | 'whyJoin' | 'coverUrl'
  >
) => {
  const existing = await findCommunitySettingByOrganizationId(organizationId);
  const defaults = communityBrandDefaults();

  if (existing) {
    const [updated] = await db
      .update(communitySetting)
      .set({
        description: values.description,
        guidelines: values.guidelines,
        whyJoin: values.whyJoin,
        coverUrl: values.coverUrl,
      })
      .where(eq(communitySetting.organizationId, organizationId))
      .returning();

    return updated;
  }

  return insertCommunitySetting({
    organizationId,
    inviteToken: nanoid(),
    description: values.description,
    guidelines: values.guidelines,
    whyJoin: values.whyJoin,
    coverUrl: values.coverUrl,
    ...defaults,
  });
};

export const ensureCommunitySetting = async (organizationId: string) => {
  const existing = await findCommunitySettingByOrganizationId(organizationId);
  const defaults = communityBrandDefaults();

  if (existing) {
    const needsToken = !existing.inviteToken;
    const needsBrand =
      !existing.splineUrl?.trim() ||
      !existing.wallpaperUrl?.trim() ||
      !existing.cardBackUrl?.trim();

    if (!needsToken && !needsBrand) return existing;

    const [updated] = await db
      .update(communitySetting)
      .set({
        inviteToken: existing.inviteToken || nanoid(),
        splineUrl: existing.splineUrl?.trim() || defaults.splineUrl,
        wallpaperUrl: existing.wallpaperUrl?.trim() || defaults.wallpaperUrl,
        cardBackUrl: existing.cardBackUrl?.trim() || defaults.cardBackUrl,
      })
      .where(eq(communitySetting.organizationId, organizationId))
      .returning();

    return updated ?? existing;
  }

  return insertCommunitySetting({
    organizationId,
    inviteToken: nanoid(),
    description: '',
    guidelines: '',
    whyJoin: '',
    ...defaults,
  });
};
