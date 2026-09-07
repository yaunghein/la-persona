import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { communitySetting } from '../schema';
import type { InsertCommunitySetting } from '~~/shared/types/community-settings';

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
    'description' | 'guidelines' | 'whyJoin'
  >
) => {
  const existing = await findCommunitySettingByOrganizationId(organizationId);

  if (existing) {
    const [updated] = await db
      .update(communitySetting)
      .set({
        description: values.description,
        guidelines: values.guidelines,
        whyJoin: values.whyJoin,
      })
      .where(eq(communitySetting.organizationId, organizationId))
      .returning();

    return updated;
  }

  return insertCommunitySetting({
    organizationId,
    description: values.description,
    guidelines: values.guidelines,
    whyJoin: values.whyJoin,
  });
};

export const ensureCommunitySetting = async (organizationId: string) => {
  const existing = await findCommunitySettingByOrganizationId(organizationId);
  if (existing) return existing;

  return insertCommunitySetting({
    organizationId,
    description: '',
    guidelines: '',
    whyJoin: '',
  });
};
