import { and, asc, count, eq, inArray, ne, sql } from 'drizzle-orm';
import { db } from '~~/server/db';
import { attendeeLabel, registrationLabel } from '~~/server/db/schema';
import type { Label } from '~~/shared/contracts/label';

export async function listAttendeeLabels(organizationId: string) {
  return db
    .select({
      id: attendeeLabel.id,
      name: attendeeLabel.name,
      color: attendeeLabel.color,
      carriesOver: attendeeLabel.carriesOver,
      usageCount: count(registrationLabel.registrationId),
    })
    .from(attendeeLabel)
    .leftJoin(
      registrationLabel,
      eq(registrationLabel.labelId, attendeeLabel.id)
    )
    .where(eq(attendeeLabel.organizationId, organizationId))
    .groupBy(attendeeLabel.id)
    .orderBy(asc(attendeeLabel.createdAt));
}

export async function countAttendeeLabels(organizationId: string) {
  const [row] = await db
    .select({ value: count() })
    .from(attendeeLabel)
    .where(eq(attendeeLabel.organizationId, organizationId));
  return row?.value ?? 0;
}

export async function existsAttendeeLabelName(
  organizationId: string,
  name: string,
  exceptLabelId?: string
) {
  const [row] = await db
    .select({ id: attendeeLabel.id })
    .from(attendeeLabel)
    .where(
      and(
        eq(attendeeLabel.organizationId, organizationId),
        sql`lower(${attendeeLabel.name}) = lower(${name})`,
        exceptLabelId ? ne(attendeeLabel.id, exceptLabelId) : undefined
      )
    )
    .limit(1);
  return !!row;
}

export async function findAttendeeLabel(labelId: string) {
  const [row] = await db
    .select()
    .from(attendeeLabel)
    .where(eq(attendeeLabel.id, labelId))
    .limit(1);
  return row ?? null;
}

export async function countOrganizationAttendeeLabels(
  organizationId: string,
  labelIds: string[]
) {
  if (!labelIds.length) return 0;
  const [row] = await db
    .select({ value: count() })
    .from(attendeeLabel)
    .where(
      and(
        eq(attendeeLabel.organizationId, organizationId),
        inArray(attendeeLabel.id, labelIds)
      )
    );
  return row?.value ?? 0;
}

export async function insertAttendeeLabel(
  values: Pick<
    typeof attendeeLabel.$inferInsert,
    'organizationId' | 'name' | 'color' | 'carriesOver'
  >
) {
  const [inserted] = await db.insert(attendeeLabel).values(values).returning();
  if (!inserted) throw new Error('Attendee label insert returned no row.');
  return inserted;
}

export async function updateAttendeeLabel(
  labelId: string,
  values: Partial<
    Pick<typeof attendeeLabel.$inferInsert, 'name' | 'color' | 'carriesOver'>
  >
) {
  const [updated] = await db
    .update(attendeeLabel)
    .set(values)
    .where(eq(attendeeLabel.id, labelId))
    .returning();
  if (!updated) throw notFound('Label');
  return updated;
}

export async function deleteAttendeeLabel(labelId: string) {
  await db.delete(attendeeLabel).where(eq(attendeeLabel.id, labelId));
}

export async function listLabelsByRegistrationIds(registrationIds: string[]) {
  const labelsByRegistration = new Map<string, Label[]>();
  if (!registrationIds.length) return labelsByRegistration;

  const rows = await db
    .select({
      registrationId: registrationLabel.registrationId,
      id: attendeeLabel.id,
      name: attendeeLabel.name,
      color: attendeeLabel.color,
    })
    .from(registrationLabel)
    .innerJoin(attendeeLabel, eq(attendeeLabel.id, registrationLabel.labelId))
    .where(inArray(registrationLabel.registrationId, registrationIds))
    .orderBy(asc(attendeeLabel.createdAt));

  for (const { registrationId, ...label } of rows) {
    labelsByRegistration.set(registrationId, [
      ...(labelsByRegistration.get(registrationId) ?? []),
      label,
    ]);
  }
  return labelsByRegistration;
}

export async function replaceRegistrationLabels(
  registrationId: string,
  labelIds: string[]
) {
  await db.transaction(async (tx) => {
    await tx
      .delete(registrationLabel)
      .where(eq(registrationLabel.registrationId, registrationId));
    if (labelIds.length) {
      await tx
        .insert(registrationLabel)
        .values(labelIds.map((labelId) => ({ registrationId, labelId })));
    }
  });
}
