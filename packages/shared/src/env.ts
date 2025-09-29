import { z } from 'zod';

// Base environment schema
const baseEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

// Database environment schema
const databaseEnvSchema = z.object({
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid PostgreSQL connection string'),
  REDIS_URL: z.string().url('REDIS_URL must be a valid Redis connection string'),
});

// Application environment schema
const appEnvSchema = z.object({
  API_PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  WEB_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  ENCRYPTION_KEY: z.string().length(32, 'ENCRYPTION_KEY must be exactly 32 characters'),
  API_BASE_URL: z.string().url('API_BASE_URL must be a valid URL'),
  WEB_BASE_URL: z.string().url('WEB_BASE_URL must be a valid URL'),
  CORS_ORIGIN: z.string().min(1, 'CORS_ORIGIN is required'),
});

// Email environment schema
const emailEnvSchema = z.object({
  SMTP_HOST: z.string().min(1, 'SMTP_HOST is required'),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  EMAIL_FROM: z.string().email('EMAIL_FROM must be a valid email address'),
});

// Storage environment schema
const storageEnvSchema = z.object({
  STORAGE_TYPE: z.enum(['local', 's3']).default('local'),
  STORAGE_PATH: z.string().optional(),
  S3_ENDPOINT: z.string().url().optional(),
  S3_REGION: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_BUCKET: z.string().optional(),
});

// Production-specific environment schema
const productionOnlyEnvSchema = z.object({
  SENTRY_DSN: z.string().url().optional(),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(100),
});

// Combined environment schemas
export const developmentEnvSchema = baseEnvSchema
  .merge(databaseEnvSchema)
  .merge(appEnvSchema)
  .merge(emailEnvSchema)
  .merge(storageEnvSchema);

export const testEnvSchema = baseEnvSchema
  .merge(databaseEnvSchema)
  .merge(appEnvSchema.partial({
    JWT_SECRET: true,
    ENCRYPTION_KEY: true,
  }))
  .merge(emailEnvSchema.partial())
  .merge(storageEnvSchema);

export const productionEnvSchema = baseEnvSchema
  .merge(databaseEnvSchema)
  .merge(appEnvSchema)
  .merge(emailEnvSchema)
  .merge(storageEnvSchema)
  .merge(productionOnlyEnvSchema);

// Environment types
export type DevelopmentEnv = z.infer<typeof developmentEnvSchema>;
export type TestEnv = z.infer<typeof testEnvSchema>;
export type ProductionEnv = z.infer<typeof productionEnvSchema>;
export type Environment = DevelopmentEnv | TestEnv | ProductionEnv;

// Environment validation functions
export const validateDevelopmentEnv = (env: Record<string, unknown>): DevelopmentEnv => {
  return developmentEnvSchema.parse(env);
};

export const validateTestEnv = (env: Record<string, unknown>): TestEnv => {
  return testEnvSchema.parse(env);
};

export const validateProductionEnv = (env: Record<string, unknown>): ProductionEnv => {
  return productionEnvSchema.parse(env);
};

export const validateEnvironment = (env: Record<string, unknown>): Environment => {
  const nodeEnv = env.NODE_ENV as string;

  switch (nodeEnv) {
    case 'development':
      return validateDevelopmentEnv(env);
    case 'test':
      return validateTestEnv(env);
    case 'production':
    case 'staging':
      return validateProductionEnv(env);
    default:
      throw new Error(`Unknown NODE_ENV: ${nodeEnv}`);
  }
};

// Environment loading utility
export const loadEnvironment = (): Environment => {
  try {
    return validateEnvironment(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formattedErrors = error.errors.map(
        (err) => `${err.path.join('.')}: ${err.message}`
      ).join('\n');

      throw new Error(`Environment validation failed:\n${formattedErrors}`);
    }
    throw error;
  }
};

// Type guards
export const isDevelopment = (env: Environment): env is DevelopmentEnv => {
  return env.NODE_ENV === 'development';
};

export const isTest = (env: Environment): env is TestEnv => {
  return env.NODE_ENV === 'test';
};

export const isProduction = (env: Environment): env is ProductionEnv => {
  return env.NODE_ENV === 'production' || env.NODE_ENV === 'staging';
};