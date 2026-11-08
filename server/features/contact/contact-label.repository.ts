import { and, asc, count, eq, inArray, ne, sql } from 'drizzle-orm';
import { db } from '~~/server/db';
import { contactLabel, contactLabelAssignment } from '~~/server/db/schema';
import type { Label } from '~~/shared/contracts/label';

export async function listContactLabels(userId: string) {
  return db
    .select({
      id: contactLabel.id,
      name: contactLabel.name,
      color: contactLabel.color,
      usageCount: count(contactLabelAssignment.contactId),
    })
    .from(contactLabel)
    .leftJoin(
      contactLabelAssignment,
      eq(contactLabelAssignment.labelId, contactLabel.id)
    )
    .where(eq(contactLabel.userId, userId))
    .groupBy(contactLabel.id)
    .orderBy(asc(contactLabel.createdAt));
}

export async function countContactLabels(userId: string) {
  const [row] = await db
    .select({ value: count() })
    .from(contactLabel)
    .where(eq(contactLabel.userId, userId));
  return row?.value ?? 0;
}

export async function existsContactLabelName(
  userId: string,
  name: string,
  exceptLabelId?: string
) {
  const [row] = await db
    .select({ id: contactLabel.id })
    .from(contactLabel)
    .where(
      and(
        eq(contactLabel.userId, userId),
        sql`lower(${contactLabel.name}) = lower(${name})`,
        exceptLabelId ? ne(contactLabel.id, exceptLabelId) : undefined
      )
    )
    .limit(1);
  return !!row;
}

export async function findContactLabel(labelId: string) {
  const [row] = await db
    .select()
    .from(contactLabel)
    .where(eq(contactLabel.id, labelId))
    .limit(1);
  return row ?? null;
}

export async function countUsersContactLabels(
  userId: string,
  labelIds: string[]
) {
  if (!labelIds.length) return 0;
  const [row] = await db
    .select({ value: count() })
    .from(contactLabel)
    .where(
      and(eq(contactLabel.userId, userId), inArray(contactLabel.id, labelIds))
    );
  return row?.value ?? 0;
}

export async function insertContactLabel(
  values: Pick<typeof contactLabel.$inferInsert, 'userId' | 'name' | 'color'>
) {
  const [inserted] = await db.insert(contactLabel).values(values).returning();
  if (!inserted) throw new Error('Contact label insert returned no row.');
  return inserted;
}

export async function updateContactLabel(
  labelId: string,
  values: Partial<Pick<typeof contactLabel.$inferInsert, 'name' | 'color'>>
) {
  const [updated] = await db
    .update(contactLabel)
    .set(values)
    .where(eq(contactLabel.id, labelId))
    .returning();
  if (!updated) throw notFound('Label');
  return updated;
}

export async function deleteContactLabel(labelId: string) {
  await db.delete(contactLabel).where(eq(contactLabel.id, labelId));
}

/** One user's labels on each contact; other users' labels never come back. */
export async function listContactLabelsByContactIds(
  contactIds: string[],
  userId: string
) {
  const labelsByContact = new Map<string, Label[]>();
  if (!contactIds.length) return labelsByContact;

  const rows = await db
    .select({
      contactId: contactLabelAssignment.contactId,
      id: contactLabel.id,
      name: contactLabel.name,
      color: contactLabel.color,
    })
    .from(contactLabelAssignment)
    .innerJoin(
      contactLabel,
      eq(contactLabel.id, contactLabelAssignment.labelId)
    )
    .where(
      and(
        inArray(contactLabelAssignment.contactId, contactIds),
        eq(contactLabel.userId, userId)
      )
    )
    .orderBy(asc(contactLabel.createdAt));

  for (const { contactId, ...label } of rows) {
    labelsByContact.set(contactId, [
      ...(labelsByContact.get(contactId) ?? []),
      label,
    ]);
  }
  return labelsByContact;
}

/** Replaces only this user's labels on the contact. */
export async function replaceContactLabels(
  contactId: string,
  userId: string,
  labelIds: string[]
) {
  await db.transaction(async (tx) => {
    await tx
      .delete(contactLabelAssignment)
      .where(
        and(
          eq(contactLabelAssignment.contactId, contactId),
          inArray(
            contactLabelAssignment.labelId,
            tx
              .select({ id: contactLabel.id })
              .from(contactLabel)
              .where(eq(contactLabel.userId, userId))
          )
        )
      );
    if (labelIds.length) {
      await tx
        .insert(contactLabelAssignment)
        .values(labelIds.map((labelId) => ({ contactId, labelId })));
    }
  });
}
