import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from '../services/auth.service';
import { JwtPayload, AuthenticationError, AuthorizationError } from '../types/auth';

declare module 'fastify' {
  interface FastifyRequest {
    user?: JwtPayload;
  }
}

export interface AuthMiddlewareOptions {
  authService: AuthService;
}

export function createAuthMiddleware(options: AuthMiddlewareOptions) {
  const { authService } = options;

  return {
    // Middleware to authenticate user (requires valid JWT)
    authenticate: async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const authHeader = request.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          throw new AuthenticationError('Missing or invalid authorization header');
        }

        const token = authHeader.substring(7);
        const payload = await authService.validateAccessToken(token);

        request.user = {
          ...payload,
          id: payload.userId, // Add id alias for convenience in route handlers
        };
      } catch (error) {
        if (error instanceof AuthenticationError) {
          return reply.status(401).send({
            error: 'Unauthorized',
            message: error.message,
            statusCode: 401,
          });
        }

        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Authentication validation failed',
          statusCode: 500,
        });
      }
    },

    // Middleware to check if user is authenticated (optional authentication)
    optionalAuth: async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const authHeader = request.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer ')) {
          const token = authHeader.substring(7);
          const payload = await authService.validateAccessToken(token);
          request.user = {
            ...payload,
            id: payload.userId, // Add id alias for convenience in route handlers
          };
        }
      } catch (error) {
        // For optional auth, we don't throw errors, just continue without user
        request.user = undefined;
      }
    },

    // Middleware to check specific permissions
    requirePermission: (resource: string, action: string) => {
      return async (request: FastifyRequest, reply: FastifyReply) => {
        if (!request.user) {
          return reply.status(401).send({
            error: 'Unauthorized',
            message: 'Authentication required',
            statusCode: 401,
          });
        }

        try {
          // Check if user has the required permission
          const hasPermission = await authService.hasPermission(
            request.user.userId,
            resource,
            action,
            request.user.companyId
          );

          if (!hasPermission) {
            throw new AuthorizationError(`Insufficient permissions: ${resource}:${action}`);
          }
        } catch (error) {
          if (error instanceof AuthorizationError) {
            return reply.status(403).send({
              error: 'Forbidden',
              message: error.message,
              statusCode: 403,
            });
          }

          return reply.status(500).send({
            error: 'Internal Server Error',
            message: 'Permission check failed',
            statusCode: 500,
          });
        }
      };
    },

    // Middleware to check role-based access
    requireRole: (roleName: string) => {
      return async (request: FastifyRequest, reply: FastifyReply) => {
        if (!request.user) {
          return reply.status(401).send({
            error: 'Unauthorized',
            message: 'Authentication required',
            statusCode: 401,
          });
        }

        const hasRole = request.user.roles.some(role => role.name === roleName);

        if (!hasRole) {
          return reply.status(403).send({
            error: 'Forbidden',
            message: `Role '${roleName}' is required`,
            statusCode: 403,
          });
        }
      };
    },

    // Middleware to check if user is super admin
    requireSuperAdmin: async (request: FastifyRequest, reply: FastifyReply) => {
      if (!request.user) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Authentication required',
          statusCode: 401,
        });
      }

      const isSuperAdmin = request.user.roles.some(role => role.name === 'super_admin');

      if (!isSuperAdmin) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Super admin access required',
          statusCode: 403,
        });
      }
    },

    // Middleware to check if user owns or administers a company
    requireCompanyAccess: (companyId?: string) => {
      return async (request: FastifyRequest, reply: FastifyReply) => {
        if (!request.user) {
          return reply.status(401).send({
            error: 'Unauthorized',
            message: 'Authentication required',
            statusCode: 401,
          });
        }

        // Get company ID from parameter, body, or user context
        const targetCompanyId = companyId ||
          (request.params as any)?.companyId ||
          (request.body as any)?.companyId ||
          request.user.companyId;

        if (!targetCompanyId) {
          return reply.status(400).send({
            error: 'Bad Request',
            message: 'Company ID is required',
            statusCode: 400,
          });
        }

        // Check if user is super admin (has access to all companies)
        const isSuperAdmin = request.user.roles.some(role => role.name === 'super_admin');
        if (isSuperAdmin) {
          return;
        }

        // Check if user has roles for this company
        const hasCompanyAccess = request.user.roles.some(role =>
          role.companyId === targetCompanyId
        );

        if (!hasCompanyAccess) {
          return reply.status(403).send({
            error: 'Forbidden',
            message: 'Access denied for this company',
            statusCode: 403,
          });
        }
      };
    },

    // Rate limiting for auth endpoints
    authRateLimit: {
      max: 10, // requests
      timeWindow: '15 minutes',
      keyGenerator: (request: FastifyRequest) => {
        return request.ip;
      },
      errorResponseBuilder: (request: FastifyRequest, context: any) => {
        return {
          error: 'Too Many Requests',
          message: 'Too many authentication attempts. Please try again later.',
          statusCode: 429,
          retryAfter: Math.round(context.ttl / 1000),
        };
      },
    },

    // Stricter rate limiting for password-related endpoints
    passwordRateLimit: {
      max: 5, // requests
      timeWindow: '1 hour',
      keyGenerator: (request: FastifyRequest) => {
        return request.ip;
      },
      errorResponseBuilder: (request: FastifyRequest, context: any) => {
        return {
          error: 'Too Many Requests',
          message: 'Too many password attempts. Please try again later.',
          statusCode: 429,
          retryAfter: Math.round(context.ttl / 1000),
        };
      },
    },
  };
}

// Helper function to extract token from request
export function extractTokenFromRequest(request: FastifyRequest): string | null {
  const authHeader = request.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return null;
}

// Helper function to check if user has any of the specified roles
export function hasAnyRole(user: JwtPayload, roleNames: string[]): boolean {
  return user.roles.some(role => roleNames.includes(role.name));
}

// Helper function to check if user has any of the specified permissions
export function hasAnyPermission(user: JwtPayload, permissions: Array<{ resource: string; action: string }>): boolean {
  return user.roles.some(role =>
    role.permissions.some(permission =>
      permissions.some(p =>
        p.resource === permission.resource && p.action === permission.action
      )
    )
  );
}

// Helper function to get user's company IDs
export function getUserCompanyIds(user: JwtPayload): string[] {
  return user.roles
    .map(role => role.companyId)
    .filter((id): id is string => id !== undefined);
}

// Helper function to check if user can access a specific company
export function canAccessCompany(user: JwtPayload, companyId: string): boolean {
  // Super admin can access all companies
  if (user.roles.some(role => role.name === 'super_admin')) {
    return true;
  }

  // Check if user has any role for this company
  return user.roles.some(role => role.companyId === companyId);
}