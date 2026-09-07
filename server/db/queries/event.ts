import { and, desc, eq } from 'drizzle-orm';
import { db } from '../../db';
import { event } from '../schema';
import type { EventDTO, InsertEvent, SelectEvent } from '~~/shared/types/event';

export function toEventDTO(row: SelectEvent): EventDTO {
  return {
    ...row,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export const findEventsByOrganizationId = (organizationId: string) => {
  return db
    .select()
    .from(event)
    .where(eq(event.organizationId, organizationId))
    .orderBy(desc(event.startsAt));
};

export const findEventByIdAndOrganizationId = async (
  id: string,
  organizationId: string
) => {
  const [row] = await db
    .select()
    .from(event)
    .where(and(eq(event.id, id), eq(event.organizationId, organizationId)))
    .limit(1);

  return row;
};

export const insertEvent = async (values: InsertEvent) => {
  const [inserted] = await db.insert(event).values(values).returning();
  return inserted;
};

export const updateEventByIdAndOrganizationId = async (
  id: string,
  organizationId: string,
  values: Partial<InsertEvent>
) => {
  const [updated] = await db
    .update(event)
    .set(values)
    .where(and(eq(event.id, id), eq(event.organizationId, organizationId)))
    .returning();

  return updated;
};

export const deleteEventByIdAndOrganizationId = async (
  id: string,
  organizationId: string
) => {
  const [deleted] = await db
    .delete(event)
    .where(and(eq(event.id, id), eq(event.organizationId, organizationId)))
    .returning({ id: event.id });

  return deleted;
};
