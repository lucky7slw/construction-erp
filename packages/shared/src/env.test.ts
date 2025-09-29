import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import {
  validateDevelopmentEnv,
  validateTestEnv,
  validateProductionEnv,
  validateEnvironment,
  loadEnvironment,
  isDevelopment,
  isTest,
  isProduction,
  type TestEnv,
} from './env';

describe('Environment validation', () => {
  const baseValidEnv = {
    NODE_ENV: 'development',
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
    REDIS_URL: 'redis://localhost:6379',
    API_PORT: '3001',
    WEB_PORT: '3000',
    JWT_SECRET: 'a-very-long-secret-key-for-jwt-tokens-minimum-32-chars',
    ENCRYPTION_KEY: '12345678901234567890123456789012',
    API_BASE_URL: 'http://localhost:3001',
    WEB_BASE_URL: 'http://localhost:3000',
    CORS_ORIGIN: 'http://localhost:3000',
    SMTP_HOST: 'localhost',
    SMTP_PORT: '1025',
    EMAIL_FROM: 'test@example.com',
  };

  describe('validateDevelopmentEnv', () => {
    it('should validate a complete development environment', () => {
      const result = validateDevelopmentEnv(baseValidEnv);

      expect(result.NODE_ENV).toBe('development');
      expect(result.API_PORT).toBe(3001);
      expect(result.WEB_PORT).toBe(3000);
      expect(result.LOG_LEVEL).toBe('info'); // default value
    });

    it('should apply default values for optional fields', () => {
      const result = validateDevelopmentEnv(baseValidEnv);

      expect(result.STORAGE_TYPE).toBe('local');
      expect(result.LOG_LEVEL).toBe('info');
    });

    it('should reject environment with missing required fields', () => {
      const invalidEnv = { ...baseValidEnv };
      // Use Omit type to exclude property instead of delete
      const { DATABASE_URL: _, ...envWithoutDb } = invalidEnv;

      expect(() => validateDevelopmentEnv(envWithoutDb)).toThrow();
    });

    it('should reject environment with invalid DATABASE_URL', () => {
      const invalidEnv = {
        ...baseValidEnv,
        DATABASE_URL: 'not-a-valid-url',
      };

      expect(() => validateDevelopmentEnv(invalidEnv)).toThrow('DATABASE_URL must be a valid PostgreSQL connection string');
    });

    it('should reject environment with short JWT_SECRET', () => {
      const invalidEnv = {
        ...baseValidEnv,
        JWT_SECRET: 'too-short',
      };

      expect(() => validateDevelopmentEnv(invalidEnv)).toThrow('JWT_SECRET must be at least 32 characters');
    });

    it('should reject environment with wrong ENCRYPTION_KEY length', () => {
      const invalidEnv = {
        ...baseValidEnv,
        ENCRYPTION_KEY: 'wrong-length',
      };

      expect(() => validateDevelopmentEnv(invalidEnv)).toThrow('ENCRYPTION_KEY must be exactly 32 characters');
    });

    it('should reject environment with invalid email format', () => {
      const invalidEnv = {
        ...baseValidEnv,
        EMAIL_FROM: 'not-an-email',
      };

      expect(() => validateDevelopmentEnv(invalidEnv)).toThrow('EMAIL_FROM must be a valid email address');
    });

    it('should coerce string ports to numbers', () => {
      const envWithStringPorts = {
        ...baseValidEnv,
        API_PORT: '3001',
        WEB_PORT: '3000',
        SMTP_PORT: '1025',
      };

      const result = validateDevelopmentEnv(envWithStringPorts);

      expect(result.API_PORT).toBe(3001);
      expect(result.WEB_PORT).toBe(3000);
      expect(result.SMTP_PORT).toBe(1025);
    });

    it('should reject invalid port numbers', () => {
      const invalidEnv = {
        ...baseValidEnv,
        API_PORT: '0', // Below minimum
      };

      expect(() => validateDevelopmentEnv(invalidEnv)).toThrow();
    });
  });

  describe('validateTestEnv', () => {
    it('should validate test environment with optional fields', () => {
      const { JWT_SECRET: _, ENCRYPTION_KEY: __, ...testEnvBase } = baseValidEnv;
      const testEnv = {
        ...testEnvBase,
        NODE_ENV: 'test' as const,
      };

      const result = validateTestEnv(testEnv);

      expect(result.NODE_ENV).toBe('test');
      expect(result.JWT_SECRET).toBeUndefined();
      expect(result.ENCRYPTION_KEY).toBeUndefined();
    });
  });

  describe('validateProductionEnv', () => {
    it('should validate production environment with all required fields', () => {
      const productionEnv = {
        ...baseValidEnv,
        NODE_ENV: 'production',
        SENTRY_DSN: 'https://example@sentry.io/123456',
      };

      const result = validateProductionEnv(productionEnv);

      expect(result.NODE_ENV).toBe('production');
      expect(result.SENTRY_DSN).toBe('https://example@sentry.io/123456');
      expect(result.RATE_LIMIT_WINDOW_MS).toBe(900000); // default
      expect(result.RATE_LIMIT_MAX_REQUESTS).toBe(100); // default
    });

    it('should require all security fields in production', () => {
      const { JWT_SECRET: _, ...prodEnvWithoutSecret } = baseValidEnv;
      const productionEnv = {
        ...prodEnvWithoutSecret,
        NODE_ENV: 'production' as const,
      };

      expect(() => validateProductionEnv(productionEnv)).toThrow();
    });
  });

  describe('validateEnvironment', () => {
    it('should route to correct validator based on NODE_ENV', () => {
      const { JWT_SECRET: _, ENCRYPTION_KEY: __, ...testEnvBase } = baseValidEnv;
      const testEnv = { ...testEnvBase, NODE_ENV: 'test' as const };

      const result = validateEnvironment(testEnv);

      expect(result.NODE_ENV).toBe('test');
      // Type assertion is safe here as we know it's a test environment
      const testResult = result as TestEnv;
      expect(testResult.JWT_SECRET).toBeUndefined();
    });

    it('should throw error for unknown NODE_ENV', () => {
      const invalidEnv = { ...baseValidEnv, NODE_ENV: 'invalid' };

      expect(() => validateEnvironment(invalidEnv)).toThrow('Unknown NODE_ENV: invalid');
    });
  });

  describe('loadEnvironment', () => {
    let originalEnv: NodeJS.ProcessEnv;

    beforeEach(() => {
      originalEnv = process.env;
    });

    it('should load environment from process.env', () => {
      process.env = { ...originalEnv, ...baseValidEnv };

      const result = loadEnvironment();

      expect(result.NODE_ENV).toBe('development');
      expect(result.API_PORT).toBe(3001);
    });

    it('should throw formatted error for validation failures', () => {
      process.env = {
        ...originalEnv,
        NODE_ENV: 'development',
        DATABASE_URL: 'invalid-url',
      };

      expect(() => loadEnvironment()).toThrow('Environment validation failed:');
    });

    afterEach(() => {
      process.env = originalEnv;
    });
  });

  describe('Type guards', () => {
    it('should correctly identify development environment', () => {
      const devEnv = validateDevelopmentEnv(baseValidEnv);

      expect(isDevelopment(devEnv)).toBe(true);
      expect(isTest(devEnv)).toBe(false);
      expect(isProduction(devEnv)).toBe(false);
    });

    it('should correctly identify test environment', () => {
      const { JWT_SECRET: _, ENCRYPTION_KEY: __, ...testEnvBase } = baseValidEnv;
      const testEnvData = { ...testEnvBase, NODE_ENV: 'test' as const };
      const testEnv = validateTestEnv(testEnvData);

      expect(isDevelopment(testEnv)).toBe(false);
      expect(isTest(testEnv)).toBe(true);
      expect(isProduction(testEnv)).toBe(false);
    });

    it('should correctly identify production environment', () => {
      const prodEnvData = { ...baseValidEnv, NODE_ENV: 'production' };
      const prodEnv = validateProductionEnv(prodEnvData);

      expect(isDevelopment(prodEnv)).toBe(false);
      expect(isTest(prodEnv)).toBe(false);
      expect(isProduction(prodEnv)).toBe(true);
    });

    it('should identify staging as production environment', () => {
      const stagingEnvData = { ...baseValidEnv, NODE_ENV: 'staging' };
      const stagingEnv = validateProductionEnv(stagingEnvData);

      expect(isProduction(stagingEnv)).toBe(true);
    });
  });
});