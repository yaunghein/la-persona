import {
  countContactLabels,
  existsContactLabelName,
  insertContactLabel,
  updateContactLabel,
} from '~~/server/features/contact/contact-label.repository';
import { MAX_LABELS_PER_OWNER } from '~~/shared/constants/label';
import type {
  CreateLabelRequest,
  Label,
  LabelSummary,
  UpdateLabelRequest,
} from '~~/shared/contracts/label';

async function assertLabelNameFree(
  userId: string,
  name: string,
  exceptLabelId?: string
) {
  if (await existsContactLabelName(userId, name, exceptLabelId)) {
    throw conflict('You already have a label with this name.', 'label_exists');
  }
}

export async function createContactLabel(
  userId: string,
  input: CreateLabelRequest
): Promise<LabelSummary> {
  if ((await countContactLabels(userId)) >= MAX_LABELS_PER_OWNER) {
    throw conflict(
      `You can have up to ${MAX_LABELS_PER_OWNER} labels.`,
      'label_limit_reached'
    );
  }
  await assertLabelNameFree(userId, input.name);
  const label = await insertContactLabel({ userId, ...input });
  return { id: label.id, name: label.name, color: label.color, usageCount: 0 };
}

export async function editContactLabel(
  label: { id: string; userId: string },
  input: UpdateLabelRequest
): Promise<Label> {
  if (input.name) await assertLabelNameFree(label.userId, input.name, label.id);
  const updated = await updateContactLabel(label.id, input);
  return { id: updated.id, name: updated.name, color: updated.color };
}
