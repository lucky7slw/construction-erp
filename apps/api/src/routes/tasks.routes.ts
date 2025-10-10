import type { FastifyPluginAsync } from 'fastify';
import type { PrismaClient } from '../generated/prisma';

type TasksRoutesOptions = {
  prisma: PrismaClient;
};

export const tasksRoutes: FastifyPluginAsync<TasksRoutesOptions> = async (
  fastify,
  options
) => {
  const { prisma } = options;

  // GET /api/v1/tasks - List all tasks (filterable by project)
  fastify.get<{
    Querystring: {
      projectId?: string;
      status?: string;
      assigneeId?: string;
    };
  }>('/', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['Tasks'],
      summary: 'List all tasks',
      description: 'Get all tasks with optional filtering',
      querystring: {
        type: 'object',
        properties: {
          projectId: { type: 'string' },
          status: { type: 'string', enum: ['TODO', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] },
          assigneeId: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            tasks: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  title: { type: 'string' },
                  description: { type: 'string', nullable: true },
                  status: { type: 'string' },
                  priority: { type: 'string' },
                  dueDate: { type: 'string', nullable: true },
                  completedAt: { type: 'string', nullable: true },
                  projectId: { type: 'string' },
                  assigneeId: { type: 'string', nullable: true },
                  estimatedHours: { type: 'number', nullable: true },
                  actualHours: { type: 'number' },
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

    const where: any = {};

    // Filter by project (user must have access)
    if (request.query.projectId) {
      where.projectId = request.query.projectId;
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
    } else {
      // Only show tasks from accessible projects
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
    }

    if (request.query.status) {
      where.status = request.query.status;
    }

    if (request.query.assigneeId) {
      where.assigneeId = request.query.assigneeId;
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: [
        { status: 'asc' },
        { priority: 'desc' },
        { dueDate: 'asc' },
      ],
    });

    return { tasks };
  });

  // GET /api/v1/tasks/:id - Get single task
  fastify.get<{
    Params: { id: string };
  }>('/:id', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['Tasks'],
      summary: 'Get task by ID',
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
            task: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                title: { type: 'string' },
                description: { type: 'string', nullable: true },
                status: { type: 'string' },
                priority: { type: 'string' },
                dueDate: { type: 'string', nullable: true },
                completedAt: { type: 'string', nullable: true },
                projectId: { type: 'string' },
                assigneeId: { type: 'string', nullable: true },
                estimatedHours: { type: 'number', nullable: true },
                actualHours: { type: 'number' },
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

    const task = await prisma.task.findFirst({
      where: {
        id: request.params.id,
        project: {
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
      },
      include: {
        project: true,
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        timeEntries: {
          orderBy: {
            date: 'desc',
          },
          take: 10,
        },
      },
    });

    if (!task) {
      return reply.code(404).send({ error: 'Task not found' });
    }

    return { task };
  });

  // POST /api/v1/tasks - Create new task
  fastify.post<{
    Body: {
      title: string;
      description?: string;
      status?: string;
      priority?: string;
      dueDate?: string;
      projectId: string;
      assigneeId?: string;
      estimatedHours?: number;
    };
  }>('/', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['Tasks'],
      summary: 'Create new task',
      body: {
        type: 'object',
        required: ['title', 'projectId'],
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          status: { type: 'string', enum: ['TODO', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] },
          priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] },
          dueDate: { type: 'string', format: 'date-time' },
          projectId: { type: 'string' },
          assigneeId: { type: 'string' },
          estimatedHours: { type: 'number' },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            task: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                title: { type: 'string' },
                status: { type: 'string' },
                priority: { type: 'string' },
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
                role: { in: ['manager', 'member'] },
              },
            },
          },
        ],
      },
    });

    if (!project) {
      return reply.code(403).send({ error: 'Access denied to this project' });
    }

    const task = await prisma.task.create({
      data: {
        title: request.body.title,
        description: request.body.description,
        status: (request.body.status as any) || 'TODO',
        priority: (request.body.priority as any) || 'MEDIUM',
        dueDate: request.body.dueDate ? new Date(request.body.dueDate) : undefined,
        projectId: request.body.projectId,
        assigneeId: request.body.assigneeId,
        estimatedHours: request.body.estimatedHours,
      },
      include: {
        project: true,
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Emit WebSocket event for real-time updates
    // wsService.broadcastToCompany(project.companyId, 'task:created', { task });

    return reply.code(201).send({ task });
  });

  // PATCH /api/v1/tasks/:id - Update task
  fastify.patch<{
    Params: { id: string };
    Body: {
      title?: string;
      description?: string;
      status?: string;
      priority?: string;
      dueDate?: string;
      assigneeId?: string;
      estimatedHours?: number;
      actualHours?: number;
    };
  }>('/:id', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['Tasks'],
      summary: 'Update task',
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
          title: { type: 'string' },
          description: { type: 'string' },
          status: { type: 'string', enum: ['TODO', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] },
          priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] },
          dueDate: { type: 'string', format: 'date-time' },
          assigneeId: { type: 'string' },
          estimatedHours: { type: 'number' },
          actualHours: { type: 'number' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            task: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                title: { type: 'string' },
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
    const existingTask = await prisma.task.findFirst({
      where: {
        id: request.params.id,
        project: {
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
      },
      include: {
        project: true,
      },
    });

    if (!existingTask) {
      return reply.code(404).send({ error: 'Task not found' });
    }

    const updateData: any = {};

    if (request.body.title) updateData.title = request.body.title;
    if (request.body.description !== undefined) updateData.description = request.body.description;
    if (request.body.status) updateData.status = request.body.status as any;
    if (request.body.priority) updateData.priority = request.body.priority as any;
    if (request.body.dueDate !== undefined) {
      updateData.dueDate = request.body.dueDate ? new Date(request.body.dueDate) : null;
    }
    if (request.body.assigneeId !== undefined) updateData.assigneeId = request.body.assigneeId;
    if (request.body.estimatedHours !== undefined) updateData.estimatedHours = request.body.estimatedHours;
    if (request.body.actualHours !== undefined) updateData.actualHours = request.body.actualHours;

    // Auto-set completedAt when status changes to COMPLETED
    if (request.body.status === 'COMPLETED' && existingTask.status !== 'COMPLETED') {
      updateData.completedAt = new Date();
    }

    const task = await prisma.task.update({
      where: { id: request.params.id },
      data: updateData,
      include: {
        project: true,
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Emit WebSocket event for real-time updates
    // wsService.broadcastToCompany(task.project.companyId, 'task:updated', { task });

    return { task };
  });

  // DELETE /api/v1/tasks/:id - Delete task
  fastify.delete<{
    Params: { id: string };
  }>('/:id', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['Tasks'],
      summary: 'Delete task',
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

    // Verify access (only project managers can delete tasks)
    const existingTask = await prisma.task.findFirst({
      where: {
        id: request.params.id,
        project: {
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
      },
      include: {
        project: true,
      },
    });

    if (!existingTask) {
      return reply.code(404).send({ error: 'Task not found or access denied' });
    }

    await prisma.task.delete({
      where: { id: request.params.id },
    });

    // Emit WebSocket event for real-time updates
    // wsService.broadcastToCompany(existingTask.project.companyId, 'task:deleted', { taskId: request.params.id });

    return { message: 'Task deleted successfully' };
  });
};