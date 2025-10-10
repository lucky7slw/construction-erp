import type { FastifyPluginAsync } from 'fastify';
import type { PrismaClient } from '../generated/prisma';

type SubmittalsRoutesOptions = {
  prisma: PrismaClient;
};

export const submittalsRoutes: FastifyPluginAsync<SubmittalsRoutesOptions> = async (
  fastify,
  options
) => {
  const { prisma } = options;

  // GET /api/v1/submittals - List submittals for a project
  fastify.get<{
    Querystring: {
      projectId: string;
      status?: string;
      type?: string;
    };
  }>('/', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['Submittals'],
      summary: 'List submittals',
      querystring: {
        type: 'object',
        required: ['projectId'],
        properties: {
          projectId: { type: 'string' },
          status: { type: 'string' },
          type: { type: 'string' },
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

    if (request.query.type) {
      where.type = request.query.type;
    }

    const submittals = await prisma.submittal.findMany({
      where,
      orderBy: {
        submittedDate: 'desc',
      },
    });

    return reply.send({ submittals });
  });

  // GET /api/v1/submittals/:id - Get single submittal
  fastify.get<{
    Params: {
      id: string;
    };
  }>('/:id', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['Submittals'],
      summary: 'Get submittal',
    },
  }, async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    const submittal = await prisma.submittal.findUnique({
      where: {
        id: request.params.id,
      },
    });

    if (!submittal) {
      return reply.code(404).send({ error: 'Submittal not found' });
    }

    // Verify project access
    const project = await prisma.project.findFirst({
      where: {
        id: submittal.projectId,
        OR: [
          { createdById: request.user.id },
          { users: { some: { userId: request.user.id } } },
        ],
      },
    });

    if (!project) {
      return reply.code(404).send({ error: 'Project not found' });
    }

    return reply.send({ submittal });
  });

  // POST /api/v1/submittals - Create submittal
  fastify.post<{
    Body: {
      projectId: string;
      title: string;
      type: string;
      description?: string;
      specSection?: string;
      drawingReference?: string;
      dueDate?: string;
      manufacturer?: string;
      model?: string;
    };
  }>('/', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['Submittals'],
      summary: 'Create submittal',
      body: {
        type: 'object',
        required: ['projectId', 'title', 'type'],
        properties: {
          projectId: { type: 'string' },
          title: { type: 'string' },
          type: { type: 'string' },
          description: { type: 'string' },
          specSection: { type: 'string' },
          drawingReference: { type: 'string' },
          dueDate: { type: 'string', format: 'date-time' },
          manufacturer: { type: 'string' },
          model: { type: 'string' },
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

    // Generate submittal number
    const count = await prisma.submittal.count({
      where: {
        projectId: request.body.projectId,
      },
    });
    const submittalNumber = `SUB-${String(count + 1).padStart(4, '0')}`;

    const submittal = await prisma.submittal.create({
      data: {
        submittalNumber,
        projectId: request.body.projectId,
        title: request.body.title,
        type: request.body.type as any,
        description: request.body.description,
        specSection: request.body.specSection,
        drawingReference: request.body.drawingReference,
        dueDate: request.body.dueDate ? new Date(request.body.dueDate) : null,
        manufacturer: request.body.manufacturer,
        model: request.body.model,
        submittedBy: request.user.id,
      },
    });

    return reply.code(201).send({ submittal });
  });

  // PATCH /api/v1/submittals/:id - Update submittal
  fastify.patch<{
    Params: {
      id: string;
    };
    Body: {
      title?: string;
      description?: string;
      status?: string;
      comments?: string;
      reviewedBy?: string;
    };
  }>('/:id', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['Submittals'],
      summary: 'Update submittal',
    },
  }, async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    const existing = await prisma.submittal.findUnique({
      where: {
        id: request.params.id,
      },
    });

    if (!existing) {
      return reply.code(404).send({ error: 'Submittal not found' });
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
    if (request.body.description !== undefined) updateData.description = request.body.description;
    if (request.body.status !== undefined) updateData.status = request.body.status;
    if (request.body.comments !== undefined) updateData.comments = request.body.comments;

    // If reviewing the submittal
    if (request.body.status && ['APPROVED', 'APPROVED_WITH_COMMENTS', 'REJECTED', 'RESUBMIT_REQUIRED'].includes(request.body.status)) {
      updateData.reviewedBy = request.user.id;
      updateData.reviewedDate = new Date();
    }

    const submittal = await prisma.submittal.update({
      where: {
        id: request.params.id,
      },
      data: updateData,
    });

    return reply.send({ submittal });
  });

  // DELETE /api/v1/submittals/:id - Delete submittal
  fastify.delete<{
    Params: {
      id: string;
    };
  }>('/:id', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['Submittals'],
      summary: 'Delete submittal',
    },
  }, async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    const existing = await prisma.submittal.findUnique({
      where: {
        id: request.params.id,
      },
    });

    if (!existing) {
      return reply.code(404).send({ error: 'Submittal not found' });
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

    await prisma.submittal.delete({
      where: {
        id: request.params.id,
      },
    });

    return reply.code(204).send();
  });
};
