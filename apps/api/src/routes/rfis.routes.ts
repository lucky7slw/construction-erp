import type { FastifyPluginAsync } from 'fastify';
import type { PrismaClient } from '../generated/prisma';

type RFIsRoutesOptions = {
  prisma: PrismaClient;
};

export const rfisRoutes: FastifyPluginAsync<RFIsRoutesOptions> = async (
  fastify,
  options
) => {
  const { prisma } = options;

  // GET /api/v1/rfis - List RFIs for a project
  fastify.get<{
    Querystring: {
      projectId: string;
      status?: string;
      priority?: string;
    };
  }>('/', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['RFIs'],
      summary: 'List RFIs',
      querystring: {
        type: 'object',
        required: ['projectId'],
        properties: {
          projectId: { type: 'string' },
          status: { type: 'string' },
          priority: { type: 'string' },
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

    const where: any = {
      projectId: request.query.projectId,
    };

    if (request.query.status) {
      where.status = request.query.status;
    }

    if (request.query.priority) {
      where.priority = request.query.priority;
    }

    const rfis = await prisma.rFI.findMany({
      where,
      orderBy: {
        submittedDate: 'desc',
      },
    });

    return reply.send({ rfis });
  });

  // GET /api/v1/rfis/:id - Get single RFI
  fastify.get<{
    Params: {
      id: string;
    };
  }>('/:id', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['RFIs'],
      summary: 'Get RFI',
    },
  }, async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    const rfi = await prisma.rFI.findUnique({
      where: {
        id: request.params.id,
      },
    });

    if (!rfi) {
      return reply.code(404).send({ error: 'RFI not found' });
    }

    // Verify project access
    const project = await prisma.project.findFirst({
      where: {
        id: rfi.projectId,
        OR: [
          { createdById: request.user.id },
          { users: { some: { userId: request.user.id } } },
        ],
      },
    });

    if (!project) {
      return reply.code(404).send({ error: 'Project not found' });
    }

    return reply.send({ rfi });
  });

  // POST /api/v1/rfis - Create RFI
  fastify.post<{
    Body: {
      projectId: string;
      title: string;
      question: string;
      priority?: string;
      discipline?: string;
      drawingReference?: string;
      specReference?: string;
      dueDate?: string;
    };
  }>('/', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['RFIs'],
      summary: 'Create RFI',
      body: {
        type: 'object',
        required: ['projectId', 'title', 'question'],
        properties: {
          projectId: { type: 'string' },
          title: { type: 'string' },
          question: { type: 'string' },
          priority: { type: 'string' },
          discipline: { type: 'string' },
          drawingReference: { type: 'string' },
          specReference: { type: 'string' },
          dueDate: { type: 'string', format: 'date-time' },
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

    // Generate RFI number
    const count = await prisma.rFI.count({
      where: {
        projectId: request.body.projectId,
      },
    });
    const rfiNumber = `RFI-${String(count + 1).padStart(4, '0')}`;

    const rfi = await prisma.rFI.create({
      data: {
        rfiNumber,
        projectId: request.body.projectId,
        title: request.body.title,
        question: request.body.question,
        priority: request.body.priority as any,
        discipline: request.body.discipline,
        drawingReference: request.body.drawingReference,
        specReference: request.body.specReference,
        dueDate: request.body.dueDate ? new Date(request.body.dueDate) : null,
        submittedBy: request.user.id,
      },
    });

    return reply.code(201).send({ rfi });
  });

  // PATCH /api/v1/rfis/:id - Update RFI
  fastify.patch<{
    Params: {
      id: string;
    };
    Body: {
      title?: string;
      question?: string;
      status?: string;
      priority?: string;
      answer?: string;
      assignedTo?: string;
    };
  }>('/:id', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['RFIs'],
      summary: 'Update RFI',
    },
  }, async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    const existing = await prisma.rFI.findUnique({
      where: {
        id: request.params.id,
      },
    });

    if (!existing) {
      return reply.code(404).send({ error: 'RFI not found' });
    }

    // Verify project access
    const project = await prisma.project.findFirst({
      where: {
        id: existing.projectId,
        OR: [
          { createdById: request.user.id },
          { users: { some: { userId: request.user.id } } },
        ],
      },
    });

    if (!project) {
      return reply.code(404).send({ error: 'Project not found' });
    }

    const updateData: any = {};
    if (request.body.title !== undefined) updateData.title = request.body.title;
    if (request.body.question !== undefined) updateData.question = request.body.question;
    if (request.body.status !== undefined) updateData.status = request.body.status;
    if (request.body.priority !== undefined) updateData.priority = request.body.priority;
    if (request.body.assignedTo !== undefined) updateData.assignedTo = request.body.assignedTo;

    // If answering the RFI
    if (request.body.answer !== undefined) {
      updateData.answer = request.body.answer;
      updateData.answeredBy = request.user.id;
      updateData.answeredDate = new Date();
      if (existing.status === 'OPEN') {
        updateData.status = 'ANSWERED';
      }
    }

    const rfi = await prisma.rFI.update({
      where: {
        id: request.params.id,
      },
      data: updateData,
    });

    return reply.send({ rfi });
  });

  // DELETE /api/v1/rfis/:id - Delete RFI
  fastify.delete<{
    Params: {
      id: string;
    };
  }>('/:id', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['RFIs'],
      summary: 'Delete RFI',
    },
  }, async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    const existing = await prisma.rFI.findUnique({
      where: {
        id: request.params.id,
      },
    });

    if (!existing) {
      return reply.code(404).send({ error: 'RFI not found' });
    }

    // Verify project access
    const project = await prisma.project.findFirst({
      where: {
        id: existing.projectId,
        OR: [
          { createdById: request.user.id },
          { users: { some: { userId: request.user.id } } },
        ],
      },
    });

    if (!project) {
      return reply.code(404).send({ error: 'Project not found' });
    }

    await prisma.rFI.delete({
      where: {
        id: request.params.id,
      },
    });

    return reply.code(204).send();
  });
};
