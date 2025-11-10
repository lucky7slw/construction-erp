import type { FastifyPluginAsync } from 'fastify';
import type { PrismaClient } from '../generated/prisma';
import type { AIService } from '../services/ai/ai.service';

type ProjectsRoutesOptions = {
  prisma: PrismaClient;
  aiService?: AIService;
};

export const projectsRoutes: FastifyPluginAsync<ProjectsRoutesOptions> = async (
  fastify,
  options
) => {
  const { prisma, aiService } = options;

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

  // POST /api/v1/projects/:id/analyze - Run AI analysis on project
  fastify.post<{
    Params: { id: string };
  }>('/:id/analyze', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['Projects'],
      summary: 'Run AI analysis on flip house project',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
        required: ['id'],
      },
    },
  }, async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    // Fetch project with access check
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
    });

    if (!project) {
      return reply.code(404).send({ error: 'Project not found or access denied' });
    }

    // Check if project has property data
    if (!project.squareFeet || !project.bedrooms || !project.bathrooms) {
      return reply.code(400).send({
        error: 'Project must have property details (square feet, bedrooms, bathrooms) to analyze'
      });
    }

    // Build property analysis request
    const propertyData = {
      address: [project.streetAddress, project.city, project.state, project.zipCode].filter(Boolean).join(', ') || 'Address not provided',
      squareFeet: project.squareFeet,
      bedrooms: project.bedrooms,
      bathrooms: Number(project.bathrooms),
      propertyType: project.propertyType || 'SINGLE_FAMILY',
      yearBuilt: project.yearBuilt || undefined,
      lotSize: project.lotSize ? Number(project.lotSize) : undefined,
      purchasePrice: project.purchasePrice ? Number(project.purchasePrice) : undefined,
      renovationBudget: project.renovationBudget ? Number(project.renovationBudget) : undefined,
    };

    // Call AI service analyze-property endpoint
    try {
      if (!aiService) {
        return reply.code(500).send({ error: 'AI service not available' });
      }

      const analysis = await aiService.analyzeProperty(propertyData);

      // Update project with analysis results
      const updatedProject = await prisma.project.update({
        where: { id: project.id },
        data: {
          aiAnalysisData: analysis,
          aiAnalysisDate: new Date(),
          estimatedARV: analysis.estimatedARV || undefined,
          estimatedRent: analysis.estimatedMonthlyRent || undefined,
        },
      });

      return {
        message: 'Property analysis completed successfully',
        analysis,
        project: updatedProject,
      };
    } catch (error) {
      console.error('AI analysis error:', error);
      return reply.code(500).send({
        error: 'Failed to analyze property',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });
};