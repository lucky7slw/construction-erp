import type { FastifyPluginAsync } from 'fastify';
import type { PrismaClient } from '../generated/prisma';

type ProjectsRoutesOptions = {
  prisma: PrismaClient;
};

export const projectsRoutes: FastifyPluginAsync<ProjectsRoutesOptions> = async (
  fastify,
  options
) => {
  const { prisma } = options;

  // GET /api/v1/projects - List all projects
  fastify.get('/', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['Projects'],
      summary: 'List all projects',
      description: 'Get all projects accessible to the authenticated user',
      response: {
        200: {
          type: 'object',
          properties: {
            projects: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  description: { type: 'string', nullable: true },
                  status: { type: 'string' },
                  startDate: { type: 'string', nullable: true },
                  endDate: { type: 'string', nullable: true },
                  budget: { type: 'number', nullable: true },
                  actualCost: { type: 'number' },
                  companyId: { type: 'string' },
                  customerId: { type: 'string', nullable: true },
                  createdAt: { type: 'string' },
                  updatedAt: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    const projects = await prisma.project.findMany({
      where: {
        OR: [
          { createdById: request.user.id },
          {
            users: {
              some: {
                userId: request.user.id,
              },
            },
          },
        ],
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return { projects };
  });

  // GET /api/v1/projects/:id - Get single project
  fastify.get<{
    Params: { id: string };
  }>('/:id', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['Projects'],
      summary: 'Get project by ID',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
        required: ['id'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            project: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                description: { type: 'string', nullable: true },
                status: { type: 'string' },
                startDate: { type: 'string', nullable: true },
                endDate: { type: 'string', nullable: true },
                budget: { type: 'number', nullable: true },
                actualCost: { type: 'number' },
                companyId: { type: 'string' },
                customerId: { type: 'string', nullable: true },
                createdAt: { type: 'string' },
                updatedAt: { type: 'string' },
              },
            },
          },
        },
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    const project = await prisma.project.findFirst({
      where: {
        id: request.params.id,
        OR: [
          { createdById: request.user.id },
          {
            users: {
              some: {
                userId: request.user.id,
              },
            },
          },
        ],
      },
      include: {
        company: true,
        customer: true,
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        tasks: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!project) {
      return reply.code(404).send({ error: 'Project not found' });
    }

    return { project };
  });

  // POST /api/v1/projects - Create new project
  fastify.post<{
    Body: {
      name: string;
      description?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
      budget?: number;
      companyId: string;
      customerId?: string;
    };
  }>('/', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['Projects'],
      summary: 'Create new project',
      body: {
        type: 'object',
        required: ['name', 'companyId'],
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          status: { type: 'string', enum: ['DRAFT', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'] },
          startDate: { type: 'string', format: 'date-time' },
          endDate: { type: 'string', format: 'date-time' },
          budget: { type: 'number' },
          companyId: { type: 'string' },
          customerId: { type: 'string' },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            project: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                status: { type: 'string' },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    const project = await prisma.project.create({
      data: {
        name: request.body.name,
        description: request.body.description,
        status: (request.body.status as any) || 'DRAFT',
        startDate: request.body.startDate ? new Date(request.body.startDate) : undefined,
        endDate: request.body.endDate ? new Date(request.body.endDate) : undefined,
        budget: request.body.budget,
        companyId: request.body.companyId,
        customerId: request.body.customerId,
        createdById: request.user.id,
      },
      include: {
        company: true,
        customer: true,
      },
    });

    // Emit WebSocket event for real-time updates
    // wsService.broadcastToCompany(project.companyId, 'project:created', { project });

    return reply.code(201).send({ project });
  });

  // PATCH /api/v1/projects/:id - Update project
  fastify.patch<{
    Params: { id: string };
    Body: {
      name?: string;
      description?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
      budget?: number;
    };
  }>('/:id', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['Projects'],
      summary: 'Update project',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
        required: ['id'],
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          status: { type: 'string', enum: ['DRAFT', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'] },
          startDate: { type: 'string', format: 'date-time' },
          endDate: { type: 'string', format: 'date-time' },
          budget: { type: 'number' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            project: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                status: { type: 'string' },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    // Verify access
    const existingProject = await prisma.project.findFirst({
      where: {
        id: request.params.id,
        OR: [
          { createdById: request.user.id },
          {
            users: {
              some: {
                userId: request.user.id,
                role: { in: ['manager', 'member'] },
              },
            },
          },
        ],
      },
    });

    if (!existingProject) {
      return reply.code(404).send({ error: 'Project not found' });
    }

    const project = await prisma.project.update({
      where: { id: request.params.id },
      data: {
        ...(request.body.name && { name: request.body.name }),
        ...(request.body.description !== undefined && { description: request.body.description }),
        ...(request.body.status && { status: request.body.status as any }),
        ...(request.body.startDate && { startDate: new Date(request.body.startDate) }),
        ...(request.body.endDate && { endDate: new Date(request.body.endDate) }),
        ...(request.body.budget !== undefined && { budget: request.body.budget }),
      },
      include: {
        company: true,
        customer: true,
      },
    });

    // Emit WebSocket event for real-time updates
    // wsService.broadcastToCompany(project.companyId, 'project:updated', { project });

    return { project };
  });

  // DELETE /api/v1/projects/:id - Delete project
  fastify.delete<{
    Params: { id: string };
  }>('/:id', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['Projects'],
      summary: 'Delete project',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
        required: ['id'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    // Only project creator can delete
    const existingProject = await prisma.project.findFirst({
      where: {
        id: request.params.id,
        createdById: request.user.id,
      },
    });

    if (!existingProject) {
      return reply.code(404).send({ error: 'Project not found or access denied' });
    }

    await prisma.project.delete({
      where: { id: request.params.id },
    });

    // Emit WebSocket event for real-time updates
    // wsService.broadcastToCompany(existingProject.companyId, 'project:deleted', { projectId: request.params.id });

    return { message: 'Project deleted successfully' };
  });
};