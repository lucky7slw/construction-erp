import { PrismaClient } from '../generated/prisma';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { Redis } from 'ioredis';
import {
  JwtPayload,
  TokenPair,
  DecodedRefreshToken,
  AuthUser,
  LoginRequest,
  RegisterRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  ChangePasswordRequest,
  AuthenticationError,
  AuthorizationError,
  Permission,
  RoleWithPermissions,
} from '../types/auth';
import * as crypto from 'crypto';

export class AuthService {
  private prisma: PrismaClient;
  private redis: Redis;
  private jwtSecret: string;
  private jwtRefreshSecret: string;
  private accessTokenExpiry: string;
  private refreshTokenExpiry: string;

  constructor(
    prisma: PrismaClient,
    redis: Redis,
    jwtSecret: string,
    jwtRefreshSecret: string
  ) {
    this.prisma = prisma;
    this.redis = redis;
    this.jwtSecret = jwtSecret;
    this.jwtRefreshSecret = jwtRefreshSecret;
    this.accessTokenExpiry = '24h'; // 24 hours
    this.refreshTokenExpiry = '7d'; // 7 days
  }

  async login(credentials: LoginRequest): Promise<{ user: AuthUser; tokens: TokenPair }> {
    const { email, password } = credentials;

    // Find user with roles and permissions
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        companies: {
          include: {
            company: true,
          },
        },
        userRoles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new AuthenticationError('Invalid email or password');
    }

    if (!user.isActive) {
      throw new AuthenticationError('Account is deactivated');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new AuthenticationError('Invalid email or password');
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Transform user data
    const authUser = this.transformUserToAuthUser(user);

    // Generate tokens
    const tokens = await this.generateTokens(authUser);

    return { user: authUser, tokens };
  }

  async register(data: RegisterRequest): Promise<{ user: AuthUser; tokens: TokenPair }> {
    const { email, password, firstName, lastName, phoneNumber, companyName } = data;

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      throw new AuthenticationError('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate email verification token
    const emailVerifyToken = crypto.randomBytes(32).toString('hex');

    // Create user and company in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create company
      const company = await tx.company.create({
        data: {
          name: companyName,
          email: email.toLowerCase(),
          isActive: true,
        },
      });

      // Create user
      const user = await tx.user.create({
        data: {
          email: email.toLowerCase(),
          password: hashedPassword,
          firstName,
          lastName,
          phoneNumber,
          emailVerifyToken,
          isActive: true,
          isEmailVerified: false,
        },
      });

      // Associate user with company as owner
      await tx.companyUser.create({
        data: {
          userId: user.id,
          companyId: company.id,
          isOwner: true,
        },
      });

      // Get admin role
      const adminRole = await tx.role.findUnique({
        where: { name: 'admin' },
      });

      if (adminRole) {
        // Assign admin role to user for this company
        await tx.userRole.create({
          data: {
            userId: user.id,
            roleId: adminRole.id,
            companyId: company.id,
          },
        });
      }

      return { user, company };
    });

    // Fetch complete user data with roles and permissions
    const completeUser = await this.prisma.user.findUnique({
      where: { id: result.user.id },
      include: {
        companies: {
          include: {
            company: true,
          },
        },
        userRoles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!completeUser) {
      throw new Error('Failed to create user');
    }

    // Transform user data
    const authUser = this.transformUserToAuthUser(completeUser);

    // Generate tokens
    const tokens = await this.generateTokens(authUser);

    // TODO: Send email verification email
    console.log(`Email verification token for ${email}: ${emailVerifyToken}`);

    return { user: authUser, tokens };
  }

  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, this.jwtRefreshSecret) as DecodedRefreshToken;

      // Check if refresh token exists in database
      const storedToken = await this.prisma.refreshToken.findUnique({
        where: { token: refreshToken },
        include: {
          user: {
            include: {
              companies: {
                include: {
                  company: true,
                },
              },
              userRoles: {
                include: {
                  role: {
                    include: {
                      permissions: {
                        include: {
                          permission: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!storedToken) {
        throw new AuthenticationError('Invalid refresh token');
      }

      if (storedToken.expiresAt < new Date()) {
        // Clean up expired token
        await this.prisma.refreshToken.delete({
          where: { token: refreshToken },
        });
        throw new AuthenticationError('Refresh token expired');
      }

      // Transform user data
      const authUser = this.transformUserToAuthUser(storedToken.user);

      // Generate new tokens
      const newTokens = await this.generateTokens(authUser);

      // Remove old refresh token
      await this.prisma.refreshToken.delete({
        where: { token: refreshToken },
      });

      return newTokens;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new AuthenticationError('Invalid refresh token');
      }
      throw error;
    }
  }

  async logout(refreshToken: string): Promise<void> {
    try {
      // Remove refresh token from database
      await this.prisma.refreshToken.delete({
        where: { token: refreshToken },
      });
    } catch (error) {
      // Token might not exist, ignore error
    }
  }

  async logoutAll(userId: string): Promise<void> {
    // Remove all refresh tokens for user
    await this.prisma.refreshToken.deleteMany({
      where: { userId },
    });
  }

  async forgotPassword(data: ForgotPasswordRequest): Promise<void> {
    const { email } = data;

    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      // Don't reveal if email exists
      return;
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 3600000); // 1 hour

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpires: resetExpires,
      },
    });

    // TODO: Send password reset email
    console.log(`Password reset token for ${email}: ${resetToken}`);
  }

  async resetPassword(data: ResetPasswordRequest): Promise<void> {
    const { token, password } = data;

    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpires: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      throw new AuthenticationError('Invalid or expired reset token');
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    // Logout all sessions
    await this.logoutAll(user.id);
  }

  async changePassword(userId: string, data: ChangePasswordRequest): Promise<void> {
    const { currentPassword, newPassword } = data;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AuthenticationError('User not found');
    }

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new AuthenticationError('Current password is incorrect');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    // Logout all other sessions
    await this.logoutAll(userId);
  }

  async verifyEmail(token: string): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { emailVerifyToken: token },
    });

    if (!user) {
      throw new AuthenticationError('Invalid verification token');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        emailVerifyToken: null,
      },
    });
  }

  async validateAccessToken(token: string): Promise<JwtPayload> {
    try {
      // Check if token is blacklisted
      const isBlacklisted = await this.redis.get(`blacklist:${token}`);
      if (isBlacklisted) {
        throw new AuthenticationError('Token is blacklisted');
      }

      const decoded = jwt.verify(token, this.jwtSecret) as JwtPayload;
      return decoded;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new AuthenticationError('Invalid access token');
      }
      throw error;
    }
  }

  async blacklistToken(token: string): Promise<void> {
    try {
      const decoded = jwt.decode(token) as JwtPayload;
      if (decoded && decoded.exp) {
        const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);
        if (expiresIn > 0) {
          await this.redis.setex(`blacklist:${token}`, expiresIn, '1');
        }
      }
    } catch (error) {
      // Ignore errors when blacklisting
    }
  }

  async hasPermission(userId: string, resource: string, action: string, companyId?: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          where: companyId ? { companyId } : {},
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      return false;
    }

    // Check if user has the specific permission
    for (const userRole of user.userRoles) {
      for (const rolePermission of userRole.role.permissions) {
        const permission = rolePermission.permission;
        if (permission.resource === resource && permission.action === action) {
          return true;
        }
        // Check for wildcard permissions
        if (permission.resource === resource && permission.action === 'manage') {
          return true;
        }
      }
    }

    return false;
  }

  private async generateTokens(user: AuthUser): Promise<TokenPair> {
    // Create JWT payload
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      companyId: user.companies[0]?.id,
      roles: user.roles,
    };

    // Generate access token
    const accessToken = jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.accessTokenExpiry,
    });

    // Generate refresh token
    const refreshTokenPayload = {
      userId: user.id,
    };

    const refreshToken = jwt.sign(refreshTokenPayload, this.jwtRefreshSecret, {
      expiresIn: this.refreshTokenExpiry,
    });

    // Store refresh token in database
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }

  private transformUserToAuthUser(user: any): AuthUser {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber,
      isEmailVerified: user.isEmailVerified,
      lastLoginAt: user.lastLoginAt,
      companies: user.companies.map((cu: any) => ({
        id: cu.company.id,
        name: cu.company.name,
        isOwner: cu.isOwner,
      })),
      roles: user.userRoles.map((ur: any) => ({
        id: ur.role.id,
        name: ur.role.name,
        companyId: ur.companyId || undefined,
        permissions: ur.role.permissions.map((rp: any) => ({
          resource: rp.permission.resource,
          action: rp.permission.action,
        })),
      })),
    };
  }
}