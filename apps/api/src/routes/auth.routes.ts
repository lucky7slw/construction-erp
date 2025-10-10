import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from '../services/auth.service';
import { createAuthMiddleware, extractTokenFromRequest } from '../middleware/auth.middleware';
import {
  loginSchema,
  registerSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  verifyEmailSchema,
  LoginRequest,
  RegisterRequest,
  RefreshTokenRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  ChangePasswordRequest,
  VerifyEmailRequest,
  AuthenticationError,
  ValidationError,
} from '../types/auth';

interface AuthRoutesOptions {
  authService: AuthService;
}

export async function authRoutes(fastify: FastifyInstance, options: AuthRoutesOptions) {
  const { authService } = options;
  const authMiddleware = createAuthMiddleware({ authService });

  // Register rate limiting
  await fastify.register(import('@fastify/rate-limit'), {
    global: false,
  });

  // Login endpoint
  fastify.post<{ Body: LoginRequest }>('/login', {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                email: { type: 'string' },
                firstName: { type: 'string' },
                lastName: { type: 'string' },
                phoneNumber: { type: 'string', nullable: true },
                isEmailVerified: { type: 'boolean' },
                lastLoginAt: { type: 'string', nullable: true },
                companies: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' },
                      isOwner: { type: 'boolean' },
                    },
                  },
                },
                roles: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' },
                      companyId: { type: 'string', nullable: true },
                      permissions: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            resource: { type: 'string' },
                            action: { type: 'string' },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            tokens: {
              type: 'object',
              properties: {
                accessToken: { type: 'string' },
                refreshToken: { type: 'string' },
              },
            },
          },
        },
        400: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
            statusCode: { type: 'number' },
          },
        },
        401: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
            statusCode: { type: 'number' },
          },
        },
      },
      tags: ['Authentication'],
      summary: 'User login',
      description: 'Authenticate user with email and password',
    },
    config: {
      rateLimit: authMiddleware.authRateLimit,
    },
  }, async (request, reply) => {
    try {
      const result = await authService.login(request.body);

      // Set refresh token as httpOnly cookie
      reply.setCookie('refreshToken', result.tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/api/v1/auth',
      });

      return {
        user: result.user,
        tokens: {
          accessToken: result.tokens.accessToken,
          refreshToken: result.tokens.refreshToken,
        },
      };
    } catch (error) {
      if (error instanceof AuthenticationError) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: error.message,
          statusCode: 401,
        });
      }

      request.log.error(error, 'Login error');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Login failed',
        statusCode: 500,
      });
    }
  });

  // Register endpoint
  fastify.post<{ Body: RegisterRequest }>('/register', {
    schema: {
      response: {
        201: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                email: { type: 'string' },
                firstName: { type: 'string' },
                lastName: { type: 'string' },
                phoneNumber: { type: 'string', nullable: true },
                isEmailVerified: { type: 'boolean' },
                companies: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' },
                      isOwner: { type: 'boolean' },
                    },
                  },
                },
                roles: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' },
                      companyId: { type: 'string', nullable: true },
                      permissions: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            resource: { type: 'string' },
                            action: { type: 'string' },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            tokens: {
              type: 'object',
              properties: {
                accessToken: { type: 'string' },
                refreshToken: { type: 'string' },
              },
            },
            message: { type: 'string' },
          },
        },
      },
      tags: ['Authentication'],
      summary: 'User registration',
      description: 'Register a new user and create a company',
    },
    config: {
      rateLimit: authMiddleware.authRateLimit,
    },
  }, async (request, reply) => {
    try {
      const result = await authService.register(request.body);

      // Set refresh token as httpOnly cookie
      reply.setCookie('refreshToken', result.tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/api/v1/auth',
      });

      return reply.status(201).send({
        user: result.user,
        tokens: {
          accessToken: result.tokens.accessToken,
          refreshToken: result.tokens.refreshToken,
        },
        message: 'Registration successful. Please verify your email address.',
      });
    } catch (error) {
      if (error instanceof AuthenticationError) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: error.message,
          statusCode: 400,
        });
      }

      request.log.error(error, 'Registration error');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Registration failed',
        statusCode: 500,
      });
    }
  });

  // Refresh token endpoint
  fastify.post<{ Body: RefreshTokenRequest }>('/refresh', {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            accessToken: { type: 'string' },
            refreshToken: { type: 'string' },
          },
        },
      },
      tags: ['Authentication'],
      summary: 'Refresh access token',
      description: 'Get new access and refresh tokens using a valid refresh token',
    },
  }, async (request, reply) => {
    try {
      // Try to get refresh token from body or cookie
      const refreshToken = request.body.refreshToken || request.cookies.refreshToken;

      if (!refreshToken) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Refresh token is required',
          statusCode: 400,
        });
      }

      const tokens = await authService.refreshTokens(refreshToken);

      // Set new refresh token as httpOnly cookie
      reply.setCookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/api/v1/auth',
      });

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };
    } catch (error) {
      if (error instanceof AuthenticationError) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: error.message,
          statusCode: 401,
        });
      }

      request.log.error(error, 'Token refresh error');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Token refresh failed',
        statusCode: 500,
      });
    }
  });

  // Logout endpoint
  fastify.post('/logout', {
    schema: {
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
          },
        },
      },
      tags: ['Authentication'],
      summary: 'User logout',
      description: 'Logout user and invalidate refresh token',
    },
    preHandler: [authMiddleware.authenticate],
  }, async (request, reply) => {
    try {
      // Get refresh token from cookie or body
      const refreshToken = request.cookies.refreshToken || (request.body as any)?.refreshToken;

      if (refreshToken) {
        await authService.logout(refreshToken);
      }

      // Blacklist access token
      const accessToken = extractTokenFromRequest(request);
      if (accessToken) {
        await authService.blacklistToken(accessToken);
      }

      // Clear refresh token cookie
      reply.clearCookie('refreshToken', { path: '/api/v1/auth' });

      return { message: 'Logout successful' };
    } catch (error) {
      request.log.error(error, 'Logout error');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Logout failed',
        statusCode: 500,
      });
    }
  });

  // Logout all sessions endpoint
  fastify.post('/logout-all', {
    schema: {
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
          },
        },
      },
      tags: ['Authentication'],
      summary: 'Logout all sessions',
      description: 'Logout user from all devices and invalidate all refresh tokens',
    },
    preHandler: [authMiddleware.authenticate],
  }, async (request, reply) => {
    try {
      if (!request.user) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Authentication required',
          statusCode: 401,
        });
      }

      await authService.logoutAll(request.user.userId);

      // Blacklist current access token
      const accessToken = extractTokenFromRequest(request);
      if (accessToken) {
        await authService.blacklistToken(accessToken);
      }

      // Clear refresh token cookie
      reply.clearCookie('refreshToken', { path: '/api/v1/auth' });

      return { message: 'Logged out from all devices' };
    } catch (error) {
      request.log.error(error, 'Logout all error');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Logout all failed',
        statusCode: 500,
      });
    }
  });

  // Forgot password endpoint
  fastify.post<{ Body: ForgotPasswordRequest }>('/forgot-password', {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
          },
        },
      },
      tags: ['Authentication'],
      summary: 'Request password reset',
      description: 'Send password reset email to user',
    },
    config: {
      rateLimit: authMiddleware.passwordRateLimit,
    },
  }, async (request, reply) => {
    try {
      await authService.forgotPassword(request.body);

      return {
        message: 'If the email exists in our system, a password reset link has been sent.',
      };
    } catch (error) {
      request.log.error(error, 'Forgot password error');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Password reset request failed',
        statusCode: 500,
      });
    }
  });

  // Reset password endpoint
  fastify.post<{ Body: ResetPasswordRequest }>('/reset-password', {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
          },
        },
      },
      tags: ['Authentication'],
      summary: 'Reset password',
      description: 'Reset user password using reset token',
    },
    config: {
      rateLimit: authMiddleware.passwordRateLimit,
    },
  }, async (request, reply) => {
    try {
      await authService.resetPassword(request.body);

      return { message: 'Password has been reset successfully' };
    } catch (error) {
      if (error instanceof AuthenticationError) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: error.message,
          statusCode: 400,
        });
      }

      request.log.error(error, 'Reset password error');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Password reset failed',
        statusCode: 500,
      });
    }
  });

  // Change password endpoint
  fastify.post<{ Body: ChangePasswordRequest }>('/change-password', {
    schema: {
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
          },
        },
      },
      tags: ['Authentication'],
      summary: 'Change password',
      description: 'Change user password (requires authentication)',
    },
    preHandler: [authMiddleware.authenticate],
    config: {
      rateLimit: authMiddleware.passwordRateLimit,
    },
  }, async (request, reply) => {
    try {
      if (!request.user) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Authentication required',
          statusCode: 401,
        });
      }

      await authService.changePassword(request.user.userId, request.body);

      return { message: 'Password changed successfully' };
    } catch (error) {
      if (error instanceof AuthenticationError) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: error.message,
          statusCode: 400,
        });
      }

      request.log.error(error, 'Change password error');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Password change failed',
        statusCode: 500,
      });
    }
  });

  // Verify email endpoint
  fastify.post<{ Body: VerifyEmailRequest }>('/verify-email', {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
          },
        },
      },
      tags: ['Authentication'],
      summary: 'Verify email address',
      description: 'Verify user email using verification token',
    },
  }, async (request, reply) => {
    try {
      await authService.verifyEmail(request.body.token);

      return { message: 'Email verified successfully' };
    } catch (error) {
      if (error instanceof AuthenticationError) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: error.message,
          statusCode: 400,
        });
      }

      request.log.error(error, 'Email verification error');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Email verification failed',
        statusCode: 500,
      });
    }
  });

  // Get current user profile endpoint
  fastify.get('/me', {
    schema: {
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                email: { type: 'string' },
                firstName: { type: 'string' },
                lastName: { type: 'string' },
                phoneNumber: { type: 'string', nullable: true },
                isEmailVerified: { type: 'boolean' },
                lastLoginAt: { type: 'string', nullable: true },
                companies: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' },
                      isOwner: { type: 'boolean' },
                    },
                  },
                },
                roles: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' },
                      companyId: { type: 'string', nullable: true },
                      permissions: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            resource: { type: 'string' },
                            action: { type: 'string' },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      tags: ['Authentication'],
      summary: 'Get current user',
      description: 'Get authenticated user profile information',
    },
    preHandler: [authMiddleware.authenticate],
  }, async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Authentication required',
        statusCode: 401,
      });
    }

    return { user: request.user };
  });

  // Update current user profile endpoint
  fastify.patch('/me', {
    schema: {
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          phoneNumber: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                email: { type: 'string' },
                firstName: { type: 'string' },
                lastName: { type: 'string' },
                phoneNumber: { type: 'string', nullable: true },
                isEmailVerified: { type: 'boolean' },
              },
            },
          },
        },
      },
      tags: ['Authentication'],
      summary: 'Update current user profile',
      description: 'Update authenticated user profile information',
    },
    preHandler: [authMiddleware.authenticate],
  }, async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Authentication required',
        statusCode: 401,
      });
    }

    const { firstName, lastName, phoneNumber } = request.body as {
      firstName?: string;
      lastName?: string;
      phoneNumber?: string;
    };

    try {
      const updatedUser = await fastify.prisma.user.update({
        where: { id: request.user.id },
        data: {
          ...(firstName && { firstName }),
          ...(lastName && { lastName }),
          ...(phoneNumber !== undefined && { phoneNumber }),
        },
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
                  rolePermissions: {
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

      // Format the response to match the user structure
      const formattedUser = {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        phoneNumber: updatedUser.phoneNumber,
        isEmailVerified: updatedUser.isEmailVerified,
        lastLoginAt: updatedUser.lastLoginAt?.toISOString() || null,
        companies: updatedUser.companies.map(cu => ({
          id: cu.company.id,
          companyId: cu.companyId,
          name: cu.company.name,
          isOwner: cu.isOwner,
        })),
        roles: updatedUser.userRoles.map(ur => ({
          id: ur.role.id,
          name: ur.role.name,
          companyId: ur.companyId,
          permissions: ur.role.rolePermissions.map(rp => ({
            resource: rp.permission.resource,
            action: rp.permission.action,
          })),
        })),
      };

      return { user: formattedUser };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to update user profile',
        statusCode: 500,
      });
    }
  });
}