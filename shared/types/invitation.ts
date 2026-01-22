import { invitation } from '~~/server/db/schema';
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import {
  createSelectSchema,
  createInsertSchema,
  createUpdateSchema,
} from 'drizzle-zod';

export type SelectInvitation = InferSelectModel<typeof invitation>;
export type InsertInvitation = InferInsertModel<typeof invitation>;
export type UpdateInvitation = Partial<InsertInvitation>;
export type InvitationDTO = Omit<
  SelectInvitation,
  'expiresAt' | 'createdAt'
> & {
  expiresAt: string;
  createdAt: string;
};

export const invitationSelectSchema = createSelectSchema(invitation);
export const invitationInsertSchema = createInsertSchema(invitation);
export const invitationUpdateSchema = createUpdateSchema(invitation);
