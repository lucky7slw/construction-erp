import type { FastifyPluginAsync } from 'fastify';
import type { PrismaClient } from '../generated/prisma';

type ChangeOrdersRoutesOptions = {
  prisma: PrismaClient;
};

export const changeOrdersRoutes: FastifyPluginAsync<ChangeOrdersRoutesOptions> = async (
  fastify,
  options
) => {
  const { prisma } = options;

  // GET /api/v1/change-orders - List change orders for a project
  fastify.get<{
    Querystring: {
      projectId: string;
      status?: string;
    };
  }>('/', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['Change Orders'],
      summary: 'List change orders',
      querystring: {
        type: 'object',
        required: ['projectId'],
        properties: {
          projectId: { type: 'string' },
          status: { type: 'string' },
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

    const changeOrders = await prisma.changeOrder.findMany({
      where,
      include: {
        requester: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        approver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        lineItems: true,
      },
      orderBy: {
        requestedAt: 'desc',
      },
    });

    return reply.send({ changeOrders });
  });

  // GET /api/v1/change-orders/:id - Get single change order
  fastify.get<{
    Params: {
      id: string;
    };
  }>('/:id', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['Change Orders'],
      summary: 'Get change order',
    },
  }, async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    const changeOrder = await prisma.changeOrder.findUnique({
      where: {
        id: request.params.id,
      },
      include: {
        requester: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        approver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        lineItems: true,
      },
    });

    if (!changeOrder) {
      return reply.code(404).send({ error: 'Change order not found' });
    }

    // Verify project access
    const project = await prisma.project.findFirst({
      where: {
        id: changeOrder.projectId,
        OR: [
          { createdById: request.user.id },
          { users: { some: { userId: request.user.id } } },
        ],
      },
    });

    if (!project) {
      return reply.code(404).send({ error: 'Project not found' });
    }

    return reply.send({ changeOrder });
  });

  // POST /api/v1/change-orders - Create change order
  fastify.post<{
    Body: {
      projectId: string;
      title: string;
      description: string;
      reason: string;
      costImpact: number;
      timeImpact: number;
      lineItems?: Array<{
        description: string;
        quantity: number;
        unit: string;
        unitCost: number;
        total: number;
      }>;
    };
  }>('/', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['Change Orders'],
      summary: 'Create change order',
      body: {
        type: 'object',
        required: ['projectId', 'title', 'description', 'reason', 'costImpact', 'timeImpact'],
        properties: {
          projectId: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          reason: { type: 'string' },
          costImpact: { type: 'number' },
          timeImpact: { type: 'number' },
          lineItems: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                description: { type: 'string' },
                quantity: { type: 'number' },
                unit: { type: 'string' },
                unitCost: { type: 'number' },
                total: { type: 'number' },
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

    // Generate CO number
    const count = await prisma.changeOrder.count({
      where: {
        projectId: request.body.projectId,
      },
    });
    const coNumber = `CO-${String(count + 1).padStart(4, '0')}`;

    const changeOrder = await prisma.changeOrder.create({
      data: {
        coNumber,
        projectId: request.body.projectId,
        title: request.body.title,
        description: request.body.description,
        reason: request.body.reason,
        costImpact: request.body.costImpact,
        timeImpact: request.body.timeImpact,
        requestedBy: request.user.id,
        requestedAt: new Date(),
        lineItems: {
          create: request.body.lineItems?.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unitCost: item.unitCost,
            total: item.total,
          })) || [],
        },
      },
      include: {
        requester: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        lineItems: true,
      },
    });

    return reply.code(201).send({ changeOrder });
  });

  // PATCH /api/v1/change-orders/:id - Update change order
  fastify.patch<{
    Params: {
      id: string;
    };
    Body: {
      status?: string;
      notes?: string;
      approvedBy?: string;
    };
  }>('/:id', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['Change Orders'],
      summary: 'Update change order',
    },
  }, async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    const existing = await prisma.changeOrder.findUnique({
      where: {
        id: request.params.id,
      },
    });

    if (!existing) {
      return reply.code(404).send({ error: 'Change order not found' });
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
    if (request.body.status !== undefined) updateData.status = request.body.status;
    if (request.body.notes !== undefined) updateData.notes = request.body.notes;

    // If approving
    if (request.body.status === 'APPROVED') {
      updateData.approvedBy = request.user.id;
      updateData.approvedAt = new Date();
    }

    const changeOrder = await prisma.changeOrder.update({
      where: {
        id: request.params.id,
      },
      data: updateData,
      include: {
        requester: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        approver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        lineItems: true,
      },
    });

    return reply.send({ changeOrder });
  });

  // DELETE /api/v1/change-orders/:id - Delete change order
  fastify.delete<{
    Params: {
      id: string;
    };
  }>('/:id', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['Change Orders'],
      summary: 'Delete change order',
    },
  }, async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    const existing = await prisma.changeOrder.findUnique({
      where: {
        id: request.params.id,
      },
    });

    if (!existing) {
      return reply.code(404).send({ error: 'Change order not found' });
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

    await prisma.changeOrder.delete({
      where: {
        id: request.params.id,
      },
    });

    return reply.code(204).send();
  });
};
