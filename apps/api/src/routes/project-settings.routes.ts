import type { FastifyPluginAsync } from 'fastify';
import type { PrismaClient } from '../generated/prisma';

type ProjectSettingsRoutesOptions = {
  prisma: PrismaClient;
};

export const projectSettingsRoutes: FastifyPluginAsync<ProjectSettingsRoutesOptions> = async (
  fastify,
  options
) => {
  const { prisma } = options;

  // Helper function to verify project access
  const verifyProjectAccess = async (projectId: string, userId: string) => {
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { createdById: userId },
          {
            users: {
              some: {
                userId: userId,
              },
            },
          },
        ],
      },
    });

    if (!project) {
      throw new Error('Project not found or access denied');
    }

    return project;
  };

  // GET /api/v1/projects/:projectId/settings - Get project settings
  fastify.get<{
    Params: { projectId: string };
  }>('/:projectId/settings', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['Project Settings'],
      summary: 'Get project settings',
      params: {
        type: 'object',
        properties: {
          projectId: { type: 'string' },
        },
        required: ['projectId'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            settings: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                projectId: { type: 'string' },
                defaultMarkupPercent: { type: 'number', nullable: true },
                defaultTaxRate: { type: 'number', nullable: true },
                billableHourlyRate: { type: 'number', nullable: true },
                currency: { type: 'string' },
                workingHoursPerDay: { type: 'number' },
                workingDaysPerWeek: { type: 'number' },
                weekStartDay: { type: 'string' },
                timezone: { type: 'string' },
                budgetAlertEnabled: { type: 'boolean' },
                budgetAlertThreshold: { type: 'number' },
                emailNotifications: { type: 'boolean' },
                defaultTaskPriority: { type: 'string' },
                autoAssignTasks: { type: 'boolean' },
                requireTaskApproval: { type: 'boolean' },
                requireDocumentApproval: { type: 'boolean' },
                maxFileUploadSizeMB: { type: 'number' },
                allowedFileTypes: { type: 'array', nullable: true },
                quickBooksSync: { type: 'boolean' },
                googleCalendarSync: { type: 'boolean' },
                dateFormat: { type: 'string' },
                numberFormat: { type: 'string' },
                showCostToClient: { type: 'boolean' },
                createdAt: { type: 'string' },
                updatedAt: { type: 'string' },
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

    try {
      // Verify project access
      await verifyProjectAccess(request.params.projectId, request.user.id);

      // Get or create settings
      let settings = await prisma.projectSettings.findUnique({
        where: {
          projectId: request.params.projectId,
        },
      });

      // If settings don't exist, create with defaults
      if (!settings) {
        settings = await prisma.projectSettings.create({
          data: {
            projectId: request.params.projectId,
          },
        });
      }

      return { settings };
    } catch (error) {
      if (error instanceof Error && error.message === 'Project not found or access denied') {
        return reply.code(404).send({ error: error.message });
      }
      throw error;
    }
  });

  // PUT /api/v1/projects/:projectId/settings - Update project settings
  fastify.put<{
    Params: { projectId: string };
    Body: {
      defaultMarkupPercent?: number;
      defaultTaxRate?: number;
      billableHourlyRate?: number;
      currency?: string;
      workingHoursPerDay?: number;
      workingDaysPerWeek?: number;
      weekStartDay?: string;
      timezone?: string;
      budgetAlertEnabled?: boolean;
      budgetAlertThreshold?: number;
      emailNotifications?: boolean;
      defaultTaskPriority?: string;
      autoAssignTasks?: boolean;
      requireTaskApproval?: boolean;
      requireDocumentApproval?: boolean;
      maxFileUploadSizeMB?: number;
      allowedFileTypes?: string[];
      quickBooksSync?: boolean;
      googleCalendarSync?: boolean;
      dateFormat?: string;
      numberFormat?: string;
      showCostToClient?: boolean;
    };
  }>('/:projectId/settings', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['Project Settings'],
      summary: 'Update project settings',
      params: {
        type: 'object',
        properties: {
          projectId: { type: 'string' },
        },
        required: ['projectId'],
      },
      body: {
        type: 'object',
        properties: {
          defaultMarkupPercent: { type: 'number' },
          defaultTaxRate: { type: 'number' },
          billableHourlyRate: { type: 'number' },
          currency: { type: 'string' },
          workingHoursPerDay: { type: 'number' },
          workingDaysPerWeek: { type: 'number' },
          weekStartDay: { type: 'string' },
          timezone: { type: 'string' },
          budgetAlertEnabled: { type: 'boolean' },
          budgetAlertThreshold: { type: 'number' },
          emailNotifications: { type: 'boolean' },
          defaultTaskPriority: { type: 'string' },
          autoAssignTasks: { type: 'boolean' },
          requireTaskApproval: { type: 'boolean' },
          requireDocumentApproval: { type: 'boolean' },
          maxFileUploadSizeMB: { type: 'number' },
          allowedFileTypes: { type: 'array', items: { type: 'string' } },
          quickBooksSync: { type: 'boolean' },
          googleCalendarSync: { type: 'boolean' },
          dateFormat: { type: 'string' },
          numberFormat: { type: 'string' },
          showCostToClient: { type: 'boolean' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            settings: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                projectId: { type: 'string' },
                defaultMarkupPercent: { type: 'number', nullable: true },
                defaultTaxRate: { type: 'number', nullable: true },
                billableHourlyRate: { type: 'number', nullable: true },
                currency: { type: 'string' },
                workingHoursPerDay: { type: 'number' },
                workingDaysPerWeek: { type: 'number' },
                weekStartDay: { type: 'string' },
                timezone: { type: 'string' },
                budgetAlertEnabled: { type: 'boolean' },
                budgetAlertThreshold: { type: 'number' },
                emailNotifications: { type: 'boolean' },
                defaultTaskPriority: { type: 'string' },
                autoAssignTasks: { type: 'boolean' },
                requireTaskApproval: { type: 'boolean' },
                requireDocumentApproval: { type: 'boolean' },
                maxFileUploadSizeMB: { type: 'number' },
                allowedFileTypes: { type: 'array', nullable: true },
                quickBooksSync: { type: 'boolean' },
                googleCalendarSync: { type: 'boolean' },
                dateFormat: { type: 'string' },
                numberFormat: { type: 'string' },
                showCostToClient: { type: 'boolean' },
                createdAt: { type: 'string' },
                updatedAt: { type: 'string' },
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

    try {
      // Verify project access
      await verifyProjectAccess(request.params.projectId, request.user.id);

      // Upsert settings
      const settings = await prisma.projectSettings.upsert({
        where: {
          projectId: request.params.projectId,
        },
        create: {
          projectId: request.params.projectId,
          ...request.body,
        },
        update: request.body,
      });

      return { settings };
    } catch (error) {
      if (error instanceof Error && error.message === 'Project not found or access denied') {
        return reply.code(404).send({ error: error.message });
      }
      throw error;
    }
  });

  // POST /api/v1/projects/:projectId/settings/reset - Reset to defaults
  fastify.post<{
    Params: { projectId: string };
  }>('/:projectId/settings/reset', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['Project Settings'],
      summary: 'Reset project settings to defaults',
      params: {
        type: 'object',
        properties: {
          projectId: { type: 'string' },
        },
        required: ['projectId'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            settings: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                projectId: { type: 'string' },
                defaultMarkupPercent: { type: 'number', nullable: true },
                defaultTaxRate: { type: 'number', nullable: true },
                billableHourlyRate: { type: 'number', nullable: true },
                currency: { type: 'string' },
                workingHoursPerDay: { type: 'number' },
                workingDaysPerWeek: { type: 'number' },
                weekStartDay: { type: 'string' },
                timezone: { type: 'string' },
                budgetAlertEnabled: { type: 'boolean' },
                budgetAlertThreshold: { type: 'number' },
                emailNotifications: { type: 'boolean' },
                defaultTaskPriority: { type: 'string' },
                autoAssignTasks: { type: 'boolean' },
                requireTaskApproval: { type: 'boolean' },
                requireDocumentApproval: { type: 'boolean' },
                maxFileUploadSizeMB: { type: 'number' },
                allowedFileTypes: { type: 'array', nullable: true },
                quickBooksSync: { type: 'boolean' },
                googleCalendarSync: { type: 'boolean' },
                dateFormat: { type: 'string' },
                numberFormat: { type: 'string' },
                showCostToClient: { type: 'boolean' },
                createdAt: { type: 'string' },
                updatedAt: { type: 'string' },
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

    try {
      // Verify project access
      await verifyProjectAccess(request.params.projectId, request.user.id);

      // Delete existing settings and create new with defaults
      await prisma.projectSettings.deleteMany({
        where: {
          projectId: request.params.projectId,
        },
      });

      const settings = await prisma.projectSettings.create({
        data: {
          projectId: request.params.projectId,
        },
      });

      return { settings };
    } catch (error) {
      if (error instanceof Error && error.message === 'Project not found or access denied') {
        return reply.code(404).send({ error: error.message });
      }
      throw error;
    }
  });
};
