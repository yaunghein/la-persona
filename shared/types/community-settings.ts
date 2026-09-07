import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { z } from 'zod';
import { communitySetting } from '~~/server/db/schema';

export type SelectCommunitySetting = InferSelectModel<typeof communitySetting>;
export type InsertCommunitySetting = InferInsertModel<typeof communitySetting>;

export type CommunitySettingsFormValues = {
  name: string;
  description: string;
  guidelines: string;
  whyJoin: string;
  coverImageUrl: string;
  logoUrl: string;
};

export type CommunitySettingsDTO = CommunitySettingsFormValues;

export const updateCommunitySettingsBodySchema = z.object({
  name: z.string().trim().min(1, 'Organization name cannot be empty.'),
  description: z.string(),
  guidelines: z.string(),
  whyJoin: z.string(),
});

export type UpdateCommunitySettingsBody = z.output<
  typeof updateCommunitySettingsBodySchema
>;

export function toCommunitySettingsDTO(params: {
  name: string;
  logo?: string | null;
  coverUrl?: string | null;
  description?: string | null;
  guidelines?: string | null;
  whyJoin?: string | null;
}): CommunitySettingsDTO {
  return {
    name: params.name,
    logoUrl: params.logo?.trim() || '',
    coverImageUrl: params.coverUrl?.trim() || '',
    description: params.description ?? '',
    guidelines: params.guidelines ?? '',
    whyJoin: params.whyJoin ?? '',
  };
}
