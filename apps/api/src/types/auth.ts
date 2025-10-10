import { z } from 'zod';

// Authentication request schemas
export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phoneNumber: z.string().optional(),
  companyName: z.string().min(1, 'Company name is required'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email format'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
});

// Type inference from schemas
export type LoginRequest = z.infer<typeof loginSchema>;
export type RegisterRequest = z.infer<typeof registerSchema>;
export type RefreshTokenRequest = z.infer<typeof refreshTokenSchema>;
export type ForgotPasswordRequest = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordRequest = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordRequest = z.infer<typeof changePasswordSchema>;
export type VerifyEmailRequest = z.infer<typeof verifyEmailSchema>;

// JWT payload structure
export interface JwtPayload {
  userId: string;
  id: string; // Alias for userId for convenience in route handlers
  email: string;
  companyId?: string;
  roles: Array<{
    id: string;
    name: string;
    companyId?: string;
    permissions: Array<{
      resource: string;
      action: string;
    }>;
  }>;
  iat?: number;
  exp?: number;
}

// Authentication response types
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  isEmailVerified: boolean;
  lastLoginAt?: Date;
  companies: Array<{
    id: string;
    name: string;
    isOwner: boolean;
  }>;
  roles: Array<{
    id: string;
    name: string;
    companyId?: string;
    permissions: Array<{
      resource: string;
      action: string;
    }>;
  }>;
}

export interface LoginResponse {
  user: AuthUser;
  tokens: AuthTokens;
}

export interface RegisterResponse {
  user: AuthUser;
  tokens: AuthTokens;
  message: string;
}

// Error types
export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Permission checking types
export interface Permission {
  resource: string;
  action: string;
}

export interface RoleWithPermissions {
  id: string;
  name: string;
  companyId?: string;
  permissions: Permission[];
}

// Token types
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface DecodedRefreshToken {
  userId: string;
  tokenId: string;
  iat?: number;
  exp?: number;
}