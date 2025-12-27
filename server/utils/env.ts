import 'dotenv/config';
import { z } from 'zod';

const EnvSchema = z.object({
  DATABASE_URL: z.string(),
  BETTER_AUTH_SECRET: z.string(),
  BASE_URL: z.string(),
});

export type EnvSchema = z.infer<typeof EnvSchema>;

export const useEnv = () => {
  return EnvSchema.parse(process.env);
};
