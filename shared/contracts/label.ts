import { z } from 'zod';
import {
  LABEL_NAME_MAX_LENGTH,
  MAX_LABELS_PER_OWNER,
} from '~~/shared/constants/label';

export const LabelRouteParams = z.object({
  labelId: z.string().trim().min(1),
});

/** Any 6-digit hex, so custom colors need no palette entry. Stored lowercase. */
export const LabelColor = z
  .string()
  .trim()
  .regex(/^#[0-9a-f]{6}$/i, 'Enter a 6-digit hex color like #c8a97e')
  .transform((value) => value.toLowerCase());

const LabelName = z
  .string()
  .trim()
  .min(1, 'Name is required')
  .max(LABEL_NAME_MAX_LENGTH);

export const CreateLabelRequest = z.object({
  name: LabelName,
  color: LabelColor,
});

export type CreateLabelRequest = z.infer<typeof CreateLabelRequest>;

export const UpdateLabelRequest = CreateLabelRequest.partial().refine(
  hasAnyField,
  'Nothing to update'
);

/** Drizzle rejects an update with nothing to set. */
export function hasAnyField(value: object) {
  return Object.values(value).some((field) => field !== undefined);
}

export type UpdateLabelRequest = z.infer<typeof UpdateLabelRequest>;

/** Replaces the whole set; duplicates are dropped. */
export const LabelIds = z
  .array(z.string().trim().min(1).max(64))
  .max(MAX_LABELS_PER_OWNER)
  .transform((ids) => [...new Set(ids)]);

/** A label as attached to a contact or an attendee. */
export type Label = {
  id: string;
  name: string;
  color: string;
};

/** A label in its owner's list, with how many contacts or attendees carry it. */
export type LabelSummary = Label & { usageCount: number };
