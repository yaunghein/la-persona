import { user, session } from '~~/server/db/schema';
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import {
  createSelectSchema,
  createInsertSchema,
  createUpdateSchema,
} from 'drizzle-zod';

export type SelectUser = InferSelectModel<typeof user>;
export type InsertUser = InferInsertModel<typeof user>;
export type UpdateUser = Partial<InsertUser>;
export type UserDTO = Omit<SelectUser, 'createdAt' | 'updatedAt'> & {
  createdAt: string;
  updatedAt: string;
};

export const userSelectSchema = createSelectSchema(user);
export const userInsertSchema = createInsertSchema(user);
export const userUpdateSchema = createUpdateSchema(user);

export type Session = InferSelectModel<typeof session>;
export type SessionDTO = Omit<
  Session,
  'expiresAt' | 'createdAt' | 'updatedAt'
> & {
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
};
