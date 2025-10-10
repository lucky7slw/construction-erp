import type { FastifyPluginAsync } from 'fastify';
import type { PrismaClient } from '../generated/prisma';
import { Decimal } from '@prisma/client/runtime/library';

type TimeEntriesRoutesOptions = {
  prisma: PrismaClient;
};

export const timeEntriesRoutes: FastifyPluginAsync<TimeEntriesRoutesOptions> = async (
  fastify,
  options
) => {
  const { prisma } = options;

  // GET /api/v1/time-entries - List all time entries
  fastify.get<{
    Querystring: {
      projectId?: string;
      taskId?: string;
      userId?: string;
      startDate?: string;
      endDate?: string;
    };
  }>('/', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['Time Entries'],
      summary: 'List all time entries',
      description: 'Get all time entries with optional filtering',
      querystring: {
        type: 'object',
        properties: {
          projectId: { type: 'string' },
          taskId: { type: 'string' },
          userId: { type: 'string' },
          startDate: { type: 'string', format: 'date' },
          endDate: { type: 'string', format: 'date' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            timeEntries: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  description: { type: 'string', nullable: true },
                  hours: { type: 'number' },
                  date: { type: 'string' },
                  billable: { type: 'boolean' },
                  hourlyRate: { type: 'number', nullable: true },
                  userId: { type: 'string' },
                  projectId: { type: 'string' },
                  taskId: { type: 'string', nullable: true },
                  createdAt: { type: 'string' },
                  updatedAt: { type: 'string' },
                },
              },
            },
            summary: {
              type: 'object',
              properties: {
                totalHours: { type: 'number' },
                billableHours: { type: 'number' },
                nonBillableHours: { type: 'number' },
                totalValue: { type: 'number' },
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

    const where: any = {};

    // Filter by project
    if (request.query.projectId) {
      where.projectId = request.query.projectId;
    }

    // Filter by task
    if (request.query.taskId) {
      where.taskId = request.query.taskId;
    }

    // Filter by user (default to current user if not specified)
    if (request.query.userId) {
      where.userId = request.query.userId;
    } else {
      where.userId = request.user.id;
    }

    // Filter by date range
    if (request.query.startDate || request.query.endDate) {
      where.date = {};
      if (request.query.startDate) {
        where.date.gte = new Date(request.query.startDate);
      }
      if (request.query.endDate) {
        where.date.lte = new Date(request.query.endDate);
      }
    }

    // Only show time entries from accessible projects
    where.project = {
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
    };

    const timeEntries = await prisma.timeEntry.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        task: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
    });

    // Calculate summary
    const totalHours = timeEntries.reduce((sum, entry) => sum + Number(entry.hours), 0);
    const billableHours = timeEntries
      .filter((entry) => entry.billable)
      .reduce((sum, entry) => sum + Number(entry.hours), 0);
    const nonBillableHours = totalHours - billableHours;
    const totalValue = timeEntries
      .filter((entry) => entry.billable && entry.hourlyRate)
      .reduce((sum, entry) => sum + Number(entry.hours) * Number(entry.hourlyRate || 0), 0);

    return {
      timeEntries,
      summary: {
        totalHours,
        billableHours,
        nonBillableHours,
        totalValue,
      },
    };
  });

  // POST /api/v1/time-entries - Create new time entry
  fastify.post<{
    Body: {
      description?: string;
      hours: number;
      date: string;
      billable?: boolean;
      hourlyRate?: number;
      projectId: string;
      taskId?: string;
    };
  }>('/', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['Time Entries'],
      summary: 'Create new time entry',
      body: {
        type: 'object',
        required: ['hours', 'date', 'projectId'],
        properties: {
          description: { type: 'string' },
          hours: { type: 'number', minimum: 0.01 },
          date: { type: 'string', format: 'date' },
          billable: { type: 'boolean' },
          hourlyRate: { type: 'number', minimum: 0 },
          projectId: { type: 'string' },
          taskId: { type: 'string' },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            timeEntry: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                hours: { type: 'number' },
                date: { type: 'string' },
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

    // Verify user has access to project
    const project = await prisma.project.findFirst({
      where: {
        id: request.body.projectId,
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
      return reply.code(403).send({ error: 'Access denied to this project' });
    }

    // If taskId provided, verify task belongs to project
    if (request.body.taskId) {
      const task = await prisma.task.findFirst({
        where: {
          id: request.body.taskId,
          projectId: request.body.projectId,
        },
      });

      if (!task) {
        return reply.code(400).send({ error: 'Task does not belong to this project' });
      }
    }

    const timeEntry = await prisma.timeEntry.create({
      data: {
        description: request.body.description,
        hours: new Decimal(request.body.hours),
        date: new Date(request.body.date),
        billable: request.body.billable ?? true,
        hourlyRate: request.body.hourlyRate ? new Decimal(request.body.hourlyRate) : undefined,
        userId: request.user.id,
        projectId: request.body.projectId,
        taskId: request.body.taskId,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        project: true,
        task: true,
      },
    });

    // Update project actual hours
    await prisma.project.update({
      where: { id: request.body.projectId },
      data: {
        actualHours: {
          increment: new Decimal(request.body.hours),
        },
      },
    });

    // Update task actual hours if task specified
    if (request.body.taskId) {
      await prisma.task.update({
        where: { id: request.body.taskId },
        data: {
          actualHours: {
            increment: new Decimal(request.body.hours),
          },
        },
      });
    }

    // Emit WebSocket event for real-time updates
    // wsService.broadcastToCompany(project.companyId, 'timeEntry:created', { timeEntry });

    return reply.code(201).send({ timeEntry });
  });

  // PATCH /api/v1/time-entries/:id - Update time entry
  fastify.patch<{
    Params: { id: string };
    Body: {
      description?: string;
      hours?: number;
      date?: string;
      billable?: boolean;
      hourlyRate?: number;
    };
  }>('/:id', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['Time Entries'],
      summary: 'Update time entry',
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
          description: { type: 'string' },
          hours: { type: 'number', minimum: 0.01 },
          date: { type: 'string', format: 'date' },
          billable: { type: 'boolean' },
          hourlyRate: { type: 'number', minimum: 0 },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            timeEntry: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                hours: { type: 'number' },
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

    // Get existing time entry
    const existingEntry = await prisma.timeEntry.findFirst({
      where: {
        id: request.params.id,
        userId: request.user.id,
      },
      include: {
        project: true,
      },
    });

    if (!existingEntry) {
      return reply.code(404).send({ error: 'Time entry not found' });
    }

    const updateData: any = {};
    if (request.body.description !== undefined) updateData.description = request.body.description;
    if (request.body.date) updateData.date = new Date(request.body.date);
    if (request.body.billable !== undefined) updateData.billable = request.body.billable;
    if (request.body.hourlyRate !== undefined) {
      updateData.hourlyRate = request.body.hourlyRate ? new Decimal(request.body.hourlyRate) : null;
    }

    // Handle hours update (need to adjust project/task totals)
    if (request.body.hours !== undefined) {
      const hoursDiff = request.body.hours - Number(existingEntry.hours);
      updateData.hours = new Decimal(request.body.hours);

      // Update project actual hours
      await prisma.project.update({
        where: { id: existingEntry.projectId },
        data: {
          actualHours: {
            increment: new Decimal(hoursDiff),
          },
        },
      });

      // Update task actual hours if applicable
      if (existingEntry.taskId) {
        await prisma.task.update({
          where: { id: existingEntry.taskId },
          data: {
            actualHours: {
              increment: new Decimal(hoursDiff),
            },
          },
        });
      }
    }

    const timeEntry = await prisma.timeEntry.update({
      where: { id: request.params.id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        project: true,
        task: true,
      },
    });

    // Emit WebSocket event for real-time updates
    // wsService.broadcastToCompany(existingEntry.project.companyId, 'timeEntry:updated', { timeEntry });

    return { timeEntry };
  });

  // DELETE /api/v1/time-entries/:id - Delete time entry
  fastify.delete<{
    Params: { id: string };
  }>('/:id', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['Time Entries'],
      summary: 'Delete time entry',
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

    // Get existing time entry
    const existingEntry = await prisma.timeEntry.findFirst({
      where: {
        id: request.params.id,
        userId: request.user.id,
      },
      include: {
        project: true,
      },
    });

    if (!existingEntry) {
      return reply.code(404).send({ error: 'Time entry not found' });
    }

    // Update project actual hours
    await prisma.project.update({
      where: { id: existingEntry.projectId },
      data: {
        actualHours: {
          decrement: existingEntry.hours,
        },
      },
    });

    // Update task actual hours if applicable
    if (existingEntry.taskId) {
      await prisma.task.update({
        where: { id: existingEntry.taskId },
        data: {
          actualHours: {
            decrement: existingEntry.hours,
          },
        },
      });
    }

    await prisma.timeEntry.delete({
      where: { id: request.params.id },
    });

    // Emit WebSocket event for real-time updates
    // wsService.broadcastToCompany(existingEntry.project.companyId, 'timeEntry:deleted', { timeEntryId: request.params.id });

    return { message: 'Time entry deleted successfully' };
  });
};