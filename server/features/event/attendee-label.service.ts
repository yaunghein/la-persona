import {
  countAttendeeLabels,
  countOrganizationAttendeeLabels,
  existsAttendeeLabelName,
  insertAttendeeLabel,
  listLabelsByRegistrationIds,
  replaceRegistrationLabels,
  updateAttendeeLabel,
} from '~~/server/features/event/attendee-label.repository';
import { MAX_LABELS_PER_OWNER } from '~~/shared/constants/label';
import type {
  AttendeeLabelSummary,
  UpdateAttendeeLabelRequest,
} from '~~/shared/contracts/event';
import type { CreateLabelRequest, Label } from '~~/shared/contracts/label';

async function assertLabelNameFree(
  organizationId: string,
  name: string,
  exceptLabelId?: string
) {
  if (await existsAttendeeLabelName(organizationId, name, exceptLabelId)) {
    throw conflict(
      'This community already has a label with this name.',
      'label_exists'
    );
  }
}

export async function createAttendeeLabel(
  organizationId: string,
  input: CreateLabelRequest & { carriesOver: boolean }
): Promise<AttendeeLabelSummary> {
  if ((await countAttendeeLabels(organizationId)) >= MAX_LABELS_PER_OWNER) {
    throw conflict(
      `A community can have up to ${MAX_LABELS_PER_OWNER} labels.`,
      'label_limit_reached'
    );
  }
  await assertLabelNameFree(organizationId, input.name);
  const label = await insertAttendeeLabel({ organizationId, ...input });
  return {
    id: label.id,
    name: label.name,
    color: label.color,
    carriesOver: label.carriesOver,
    usageCount: 0,
  };
}

export async function editAttendeeLabel(
  label: { id: string; organizationId: string },
  input: UpdateAttendeeLabelRequest
) {
  if (input.name) {
    await assertLabelNameFree(label.organizationId, input.name, label.id);
  }
  const updated = await updateAttendeeLabel(label.id, input);
  return {
    id: updated.id,
    name: updated.name,
    color: updated.color,
    carriesOver: updated.carriesOver,
  };
}

/** Sets a registration's labels; every label must belong to the event's community. */
export async function setRegistrationLabels(
  registrationId: string,
  organizationId: string,
  labelIds: string[]
): Promise<Label[]> {
  const owned = await countOrganizationAttendeeLabels(organizationId, labelIds);
  if (owned !== labelIds.length) {
    throw badRequest(
      "Choose labels from this community's list.",
      'label_not_found'
    );
  }
  await replaceRegistrationLabels(registrationId, labelIds);
  const labels = await listLabelsByRegistrationIds([registrationId]);
  return labels.get(registrationId) ?? [];
}
