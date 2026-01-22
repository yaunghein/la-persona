import {
  user,
  session,
  organization,
  member,
  invitation,
} from '~~/server/db/schema';
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

export type SelectOrganization = InferSelectModel<typeof organization>;
export type InsertOrganization = InferInsertModel<typeof organization>;
export type UpdateOrganization = Partial<InsertOrganization>;
export type OrganizatioDTO = Omit<SelectUser, 'createdAt'> & {
  createdAt: string;
};

export const organizationSelectSchema = createSelectSchema(organization);
export const organizationInsertSchema = createInsertSchema(organization);
export const organizationUpdateSchema = createUpdateSchema(organization);

export type SelectMember = InferSelectModel<typeof member>;
export type InsertMember = InferInsertModel<typeof member>;
export type UpdateMember = Partial<InsertMember>;
export type MemberDTO = Omit<SelectUser, 'createdAt'> & {
  createdAt: string;
};

export const memberSelectSchema = createSelectSchema(member);
export const memberInsertSchema = createInsertSchema(member);
export const memberUpdateSchema = createUpdateSchema(member);

export type SelectInvitation = InferSelectModel<typeof invitation>;
export type InsertInvitation = InferInsertModel<typeof invitation>;
export type UpdateInvitation = Partial<InsertInvitation>;
export type InvitationDTO = Omit<SelectUser, 'createdAt'> & {
  createdAt: string;
};

export const invitationSelectSchema = createSelectSchema(invitation);
export const invitationInsertSchema = createInsertSchema(invitation);
export const invitationUpdateSchema = createUpdateSchema(invitation);
