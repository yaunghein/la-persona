import { z } from 'zod';

export const CARD_INTERACTION_TYPES = [
  'view',
  'social_click',
  'link_click',
  'save_action',
] as const;

export type CardInteractionType = (typeof CARD_INTERACTION_TYPES)[number];

/** Recorded anonymously from the public card; owner and organization come from the card. */
export const RecordCardInteractionRequest = z.object({
  type: z.enum(CARD_INTERACTION_TYPES),
  metadata: z
    .object({
      platform: z.string().trim().max(60).optional(),
      label: z.string().trim().max(120).optional(),
      action: z.string().trim().max(60).optional(),
      url: z.string().trim().max(2048).optional(),
      path: z.string().trim().max(512).optional(),
    })
    .strict()
    .optional(),
});

export type RecordCardInteractionRequest = z.infer<typeof RecordCardInteractionRequest>;
