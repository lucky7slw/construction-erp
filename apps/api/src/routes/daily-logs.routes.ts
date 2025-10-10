import type { FastifyPluginAsync } from 'fastify';
import type { PrismaClient } from '../generated/prisma';
import { DailyLogsService } from '../services/daily-logs/daily-logs.service.js';

type DailyLogsRoutesOptions = {
  prisma: PrismaClient;
};

export const dailyLogsRoutes: FastifyPluginAsync<DailyLogsRoutesOptions> = async (
  fastify,
  options
) => {
  const { prisma } = options;
  const dailyLogsService = new DailyLogsService(prisma);

  // GET /api/v1/daily-logs - List daily logs for a project
  fastify.get<{
    Querystring: {
      projectId: string;
      startDate?: string;
      endDate?: string;
    };
  }>('/', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['Daily Logs'],
      summary: 'List daily logs',
      querystring: {
        type: 'object',
        required: ['projectId'],
        properties: {
          projectId: { type: 'string' },
          startDate: { type: 'string', format: 'date' },
          endDate: { type: 'string', format: 'date' },
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

    const filters: any = {};
    if (request.query.startDate) {
      filters.startDate = new Date(request.query.startDate);
    }
    if (request.query.endDate) {
      filters.endDate = new Date(request.query.endDate);
    }

    const logs = await dailyLogsService.listDailyLogs(
      request.query.projectId,
      filters
    );

    return reply.send({ logs });
  });

  // GET /api/v1/daily-logs/:id - Get single daily log
  fastify.get<{
    Params: {
      id: string;
    };
  }>('/:id', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['Daily Logs'],
      summary: 'Get daily log',
    },
  }, async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    const log = await dailyLogsService.getDailyLog(request.params.id);

    // Verify project access
    const project = await prisma.project.findFirst({
      where: {
        id: log.projectId,
        OR: [
          { createdById: request.user.id },
          { users: { some: { userId: request.user.id } } },
        ],
      },
    });

    if (!project) {
      return reply.code(404).send({ error: 'Project not found' });
    }

    return reply.send({ log });
  });

  // POST /api/v1/daily-logs - Create daily log
  fastify.post<{
    Body: {
      projectId: string;
      date: string;
      weather?: {
        temp?: number;
        conditions?: string;
        rain?: boolean;
        wind?: string;
      };
      workCompleted?: string;
      notes?: string;
      photos?: string[];
    };
  }>('/', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['Daily Logs'],
      summary: 'Create daily log',
      body: {
        type: 'object',
        required: ['projectId', 'date'],
        properties: {
          projectId: { type: 'string' },
          date: { type: 'string', format: 'date' },
          weather: {
            type: 'object',
            properties: {
              temp: { type: 'number' },
              conditions: { type: 'string' },
              rain: { type: 'boolean' },
              wind: { type: 'string' },
            },
          },
          workCompleted: { type: 'string' },
          notes: { type: 'string' },
          photos: { type: 'array', items: { type: 'string' } },
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
        id: request.body.projectId,
        OR: [
          { createdById: request.user.id },
          { users: { some: { userId: request.user.id } } },
        ],
      },
    });

    if (!project) {
      return reply.code(404).send({ error: 'Project not found' });
    }

    const log = await dailyLogsService.createDailyLog(
      {
        ...request.body,
        date: new Date(request.body.date),
      },
      request.user.id
    );

    return reply.code(201).send({ log });
  });

  // PATCH /api/v1/daily-logs/:id - Update daily log
  fastify.patch<{
    Params: {
      id: string;
    };
    Body: {
      weather?: {
        temp?: number;
        conditions?: string;
        rain?: boolean;
        wind?: string;
      };
      workCompleted?: string;
      notes?: string;
      photos?: string[];
    };
  }>('/:id', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['Daily Logs'],
      summary: 'Update daily log',
    },
  }, async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    const existingLog = await dailyLogsService.getDailyLog(request.params.id);

    // Verify project access
    const project = await prisma.project.findFirst({
      where: {
        id: existingLog.projectId,
        OR: [
          { createdById: request.user.id },
          { users: { some: { userId: request.user.id } } },
        ],
      },
    });

    if (!project) {
      return reply.code(404).send({ error: 'Project not found' });
    }

    const log = await dailyLogsService.updateDailyLog(
      request.params.id,
      request.body
    );

    return reply.send({ log });
  });

  // DELETE /api/v1/daily-logs/:id - Delete daily log
  fastify.delete<{
    Params: {
      id: string;
    };
  }>('/:id', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['Daily Logs'],
      summary: 'Delete daily log',
    },
  }, async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    const existingLog = await dailyLogsService.getDailyLog(request.params.id);

    // Verify project access
    const project = await prisma.project.findFirst({
      where: {
        id: existingLog.projectId,
        OR: [
          { createdById: request.user.id },
          { users: { some: { userId: request.user.id } } },
        ],
      },
    });

    if (!project) {
      return reply.code(404).send({ error: 'Project not found' });
    }

    await dailyLogsService.deleteDailyLog(request.params.id);

    return reply.code(204).send();
  });

  // POST /api/v1/daily-logs/:id/crew - Add crew attendance
  fastify.post<{
    Params: {
      id: string;
    };
    Body: {
      workerId: string;
      workerName: string;
      hoursWorked: number;
      trade: string;
      notes?: string;
    };
  }>('/:id/crew', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['Daily Logs'],
      summary: 'Add crew attendance',
      body: {
        type: 'object',
        required: ['workerId', 'workerName', 'hoursWorked', 'trade'],
        properties: {
          workerId: { type: 'string' },
          workerName: { type: 'string' },
          hoursWorked: { type: 'number' },
          trade: { type: 'string' },
          notes: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    const log = await dailyLogsService.getDailyLog(request.params.id);

    // Verify project access
    const project = await prisma.project.findFirst({
      where: {
        id: log.projectId,
        OR: [
          { createdById: request.user.id },
          { users: { some: { userId: request.user.id } } },
        ],
      },
    });

    if (!project) {
      return reply.code(404).send({ error: 'Project not found' });
    }

    const crew = await dailyLogsService.addCrewAttendance({
      dailyLogId: request.params.id,
      ...request.body,
    });

    return reply.code(201).send({ crew });
  });

  // POST /api/v1/daily-logs/:id/deliveries - Add delivery
  fastify.post<{
    Params: {
      id: string;
    };
    Body: {
      supplier: string;
      material: string;
      quantity: string;
      poNumber?: string;
      receivedBy: string;
      notes?: string;
    };
  }>('/:id/deliveries', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['Daily Logs'],
      summary: 'Add delivery',
      body: {
        type: 'object',
        required: ['supplier', 'material', 'quantity', 'receivedBy'],
        properties: {
          supplier: { type: 'string' },
          material: { type: 'string' },
          quantity: { type: 'string' },
          poNumber: { type: 'string' },
          receivedBy: { type: 'string' },
          notes: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    const log = await dailyLogsService.getDailyLog(request.params.id);

    // Verify project access
    const project = await prisma.project.findFirst({
      where: {
        id: log.projectId,
        OR: [
          { createdById: request.user.id },
          { users: { some: { userId: request.user.id } } },
        ],
      },
    });

    if (!project) {
      return reply.code(404).send({ error: 'Project not found' });
    }

    const delivery = await dailyLogsService.addDelivery({
      dailyLogId: request.params.id,
      ...request.body,
    });

    return reply.code(201).send({ delivery });
  });

  // POST /api/v1/daily-logs/:id/equipment - Add equipment usage
  fastify.post<{
    Params: {
      id: string;
    };
    Body: {
      equipment: string;
      hours: number;
      operator?: string;
      notes?: string;
    };
  }>('/:id/equipment', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['Daily Logs'],
      summary: 'Add equipment usage',
      body: {
        type: 'object',
        required: ['equipment', 'hours'],
        properties: {
          equipment: { type: 'string' },
          hours: { type: 'number' },
          operator: { type: 'string' },
          notes: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    const log = await dailyLogsService.getDailyLog(request.params.id);

    // Verify project access
    const project = await prisma.project.findFirst({
      where: {
        id: log.projectId,
        OR: [
          { createdById: request.user.id },
          { users: { some: { userId: request.user.id } } },
        ],
      },
    });

    if (!project) {
      return reply.code(404).send({ error: 'Project not found' });
    }

    const equipment = await dailyLogsService.addEquipmentUsage({
      dailyLogId: request.params.id,
      ...request.body,
    });

    return reply.code(201).send({ equipment });
  });

  // POST /api/v1/daily-logs/:id/incidents - Add safety incident
  fastify.post<{
    Params: {
      id: string;
    };
    Body: {
      type: string;
      severity: string;
      description: string;
      personInvolved?: string;
      actionTaken: string;
      photos?: string[];
      reportedTo?: string;
      followUpRequired?: boolean;
    };
  }>('/:id/incidents', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['Daily Logs'],
      summary: 'Add safety incident',
      body: {
        type: 'object',
        required: ['type', 'severity', 'description', 'actionTaken'],
        properties: {
          type: { type: 'string' },
          severity: { type: 'string' },
          description: { type: 'string' },
          personInvolved: { type: 'string' },
          actionTaken: { type: 'string' },
          photos: { type: 'array', items: { type: 'string' } },
          reportedTo: { type: 'string' },
          followUpRequired: { type: 'boolean' },
        },
      },
    },
  }, async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    const log = await dailyLogsService.getDailyLog(request.params.id);

    // Verify project access
    const project = await prisma.project.findFirst({
      where: {
        id: log.projectId,
        OR: [
          { createdById: request.user.id },
          { users: { some: { userId: request.user.id } } },
        ],
      },
    });

    if (!project) {
      return reply.code(404).send({ error: 'Project not found' });
    }

    const incident = await dailyLogsService.addSafetyIncident({
      dailyLogId: request.params.id,
      type: request.body.type as any,
      severity: request.body.severity as any,
      description: request.body.description,
      personInvolved: request.body.personInvolved,
      actionTaken: request.body.actionTaken,
      photos: request.body.photos,
      reportedTo: request.body.reportedTo,
      followUpRequired: request.body.followUpRequired,
    });

    return reply.code(201).send({ incident });
  });
};
