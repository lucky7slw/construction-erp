import type { FastifyPluginAsync } from 'fastify';
import type { PrismaClient } from '../generated/prisma';

type TeamRoutesOptions = {
  prisma: PrismaClient;
};

export const teamRoutes: FastifyPluginAsync<TeamRoutesOptions> = async (
  fastify,
  options
) => {
  const { prisma } = options;

  // GET /api/v1/team - List team members for a project
  fastify.get<{
    Querystring: {
      projectId: string;
    };
  }>('/', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['Team'],
      summary: 'List project team members',
      querystring: {
        type: 'object',
        required: ['projectId'],
        properties: {
          projectId: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    // Verify project access
    const project = await prisma.project.findFirst({
      where: {
        id: request.query.projectId,
        OR: [
          { createdById: request.user.id },
          { users: { some: { userId: request.user.id } } },
        ],
      },
    });

    if (!project) {
      return reply.code(404).send({ error: 'Project not found' });
    }

    const members = await prisma.projectUser.findMany({
      where: {
        projectId: request.query.projectId,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: {
        joinedAt: 'asc',
      },
    });

    return reply.send({ members });
  });

  // POST /api/v1/team - Add team member to project
  fastify.post<{
    Body: {
      projectId: string;
      userId: string;
      role?: string;
    };
  }>('/', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['Team'],
      summary: 'Add team member to project',
      body: {
        type: 'object',
        required: ['projectId', 'userId'],
        properties: {
          projectId: { type: 'string' },
          userId: { type: 'string' },
          role: { type: 'string', enum: ['manager', 'member', 'viewer'] },
        },
      },
    },
  }, async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    // Verify project access (must be owner or manager)
    const project = await prisma.project.findFirst({
      where: {
        id: request.body.projectId,
        OR: [
          { createdById: request.user.id },
          {
            users: {
              some: {
                userId: request.user.id,
                role: 'manager',
              },
            },
          },
        ],
      },
    });

    if (!project) {
      return reply.code(404).send({ error: 'Project not found or insufficient permissions' });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: {
        id: request.body.userId,
      },
    });

    if (!user) {
      return reply.code(404).send({ error: 'User not found' });
    }

    // Check if already a member
    const existing = await prisma.projectUser.findUnique({
      where: {
        userId_projectId: {
          userId: request.body.userId,
          projectId: request.body.projectId,
        },
      },
    });

    if (existing) {
      return reply.code(409).send({ error: 'User is already a team member' });
    }

    const member = await prisma.projectUser.create({
      data: {
        projectId: request.body.projectId,
        userId: request.body.userId,
        role: request.body.role || 'member',
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return reply.code(201).send({ member });
  });

  // PATCH /api/v1/team/:id - Update team member role
  fastify.patch<{
    Params: {
      id: string;
    };
    Body: {
      role: string;
    };
  }>('/:id', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['Team'],
      summary: 'Update team member role',
      body: {
        type: 'object',
        required: ['role'],
        properties: {
          role: { type: 'string', enum: ['manager', 'member', 'viewer'] },
        },
      },
    },
  }, async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    const existing = await prisma.projectUser.findUnique({
      where: {
        id: request.params.id,
      },
    });

    if (!existing) {
      return reply.code(404).send({ error: 'Team member not found' });
    }

    // Verify project access (must be owner or manager)
    const project = await prisma.project.findFirst({
      where: {
        id: existing.projectId,
        OR: [
          { createdById: request.user.id },
          {
            users: {
              some: {
                userId: request.user.id,
                role: 'manager',
              },
            },
          },
        ],
      },
    });

    if (!project) {
      return reply.code(404).send({ error: 'Project not found or insufficient permissions' });
    }

    const member = await prisma.projectUser.update({
      where: {
        id: request.params.id,
      },
      data: {
        role: request.body.role,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return reply.send({ member });
  });

  // DELETE /api/v1/team/:id - Remove team member from project
  fastify.delete<{
    Params: {
      id: string;
    };
  }>('/:id', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['Team'],
      summary: 'Remove team member from project',
    },
  }, async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    const existing = await prisma.projectUser.findUnique({
      where: {
        id: request.params.id,
      },
    });

    if (!existing) {
      return reply.code(404).send({ error: 'Team member not found' });
    }

    // Verify project access (must be owner or manager)
    const project = await prisma.project.findFirst({
      where: {
        id: existing.projectId,
        OR: [
          { createdById: request.user.id },
          {
            users: {
              some: {
                userId: request.user.id,
                role: 'manager',
              },
            },
          },
        ],
      },
    });

    if (!project) {
      return reply.code(404).send({ error: 'Project not found or insufficient permissions' });
    }

    // Don't allow removing the project owner
    if (existing.userId === project.createdById) {
      return reply.code(400).send({ error: 'Cannot remove project owner' });
    }

    await prisma.projectUser.delete({
      where: {
        id: request.params.id,
      },
    });

    return reply.code(204).send();
  });
};
