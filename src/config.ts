import { z } from "zod";

const configSchema = z.object({
  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().int(),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().min(1),
  DB_DATABASE: z.string().min(1),
  DB_SCHEMA: z
    .string()
    .trim()
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/)
    .optional(),
  REDIS_HOST: z.string().min(1),
  REDIS_PORT: z.coerce.number().int().optional(),
  REDIS_PASSWORD: z.string().min(1).optional(),
  REDIS_DATABASE: z.coerce.number().int().optional(),
  JWT_PRIVATE_KEY: z.string().min(1).optional(),
  JWT_PUBLIC_KEY: z.string().min(1).optional(),
  ALLOWED_DOMAIN: z.string().min(1),
  CHAIN_ID: z.coerce.number().int().optional(),
  RPC_URL: z.string().min(1).optional(),
  JWT_SECRET: z.string().min(1),
});

export type Config = z.infer<typeof configSchema>;

try {
  process.loadEnvFile("./.env");
} catch {
  // Ignore missing .env files so production environments can provide env vars directly.
}

export const config: Config = configSchema.parse(process.env);
