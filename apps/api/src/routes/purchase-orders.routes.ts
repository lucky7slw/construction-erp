import type { FastifyPluginAsync } from 'fastify';
import type { PrismaClient } from '../generated/prisma';

type PurchaseOrdersRoutesOptions = {
  prisma: PrismaClient;
};

export const purchaseOrdersRoutes: FastifyPluginAsync<PurchaseOrdersRoutesOptions> = async (
  fastify,
  options
) => {
  const { prisma } = options;

  // GET /api/v1/purchase-orders - List purchase orders for a project
  fastify.get<{
    Querystring: {
      projectId: string;
      status?: string;
    };
  }>('/', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['Purchase Orders'],
      summary: 'List purchase orders',
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

    const purchaseOrders = await prisma.purchaseOrder.findMany({
      where,
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
            contactPerson: true,
            email: true,
            phone: true,
          },
        },
        createdBy: {
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
        createdAt: 'desc',
      },
    });

    return reply.send({ purchaseOrders });
  });

  // GET /api/v1/purchase-orders/:id - Get single purchase order
  fastify.get<{
    Params: {
      id: string;
    };
  }>('/:id', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['Purchase Orders'],
      summary: 'Get purchase order',
    },
  }, async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    const purchaseOrder = await prisma.purchaseOrder.findUnique({
      where: {
        id: request.params.id,
      },
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
            contactPerson: true,
            email: true,
            phone: true,
          },
        },
        createdBy: {
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

    if (!purchaseOrder) {
      return reply.code(404).send({ error: 'Purchase order not found' });
    }

    // Verify project access
    const project = await prisma.project.findFirst({
      where: {
        id: purchaseOrder.projectId,
        OR: [
          { createdById: request.user.id },
          { users: { some: { userId: request.user.id } } },
        ],
      },
    });

    if (!project) {
      return reply.code(404).send({ error: 'Project not found' });
    }

    return reply.send({ purchaseOrder });
  });

  // POST /api/v1/purchase-orders - Create purchase order
  fastify.post<{
    Body: {
      projectId: string;
      supplierId: string;
      deliveryDate?: string;
      deliveryAddress?: string;
      notes?: string;
      lineItems: Array<{
        description: string;
        quantity: number;
        unit: string;
        unitPrice: number;
        total: number;
        taskId?: string;
      }>;
    };
  }>('/', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['Purchase Orders'],
      summary: 'Create purchase order',
      body: {
        type: 'object',
        required: ['projectId', 'supplierId', 'lineItems'],
        properties: {
          projectId: { type: 'string' },
          supplierId: { type: 'string' },
          deliveryDate: { type: 'string', format: 'date-time' },
          deliveryAddress: { type: 'string' },
          notes: { type: 'string' },
          lineItems: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                description: { type: 'string' },
                quantity: { type: 'number' },
                unit: { type: 'string' },
                unitPrice: { type: 'number' },
                total: { type: 'number' },
                taskId: { type: 'string' },
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

    // Verify supplier exists
    const supplier = await prisma.supplier.findUnique({
      where: {
        id: request.body.supplierId,
      },
    });

    if (!supplier) {
      return reply.code(404).send({ error: 'Supplier not found' });
    }

    // Calculate totals
    const subtotal = request.body.lineItems.reduce((sum, item) => sum + item.total, 0);
    const tax = subtotal * 0.1; // 10% tax - should be configurable
    const total = subtotal + tax;

    // Generate PO number
    const count = await prisma.purchaseOrder.count({
      where: {
        projectId: request.body.projectId,
      },
    });
    const poNumber = `PO-${String(count + 1).padStart(4, '0')}`;

    const purchaseOrder = await prisma.purchaseOrder.create({
      data: {
        poNumber,
        projectId: request.body.projectId,
        supplierId: request.body.supplierId,
        subtotal,
        tax,
        total,
        deliveryDate: request.body.deliveryDate ? new Date(request.body.deliveryDate) : null,
        deliveryAddress: request.body.deliveryAddress,
        notes: request.body.notes,
        createdById: request.user.id,
        lineItems: {
          create: request.body.lineItems.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitPrice,
            total: item.total,
            taskId: item.taskId,
          })),
        },
      },
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
            contactPerson: true,
            email: true,
            phone: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        lineItems: true,
      },
    });

    return reply.code(201).send({ purchaseOrder });
  });

  // PATCH /api/v1/purchase-orders/:id - Update purchase order
  fastify.patch<{
    Params: {
      id: string;
    };
    Body: {
      status?: string;
      notes?: string;
      deliveryDate?: string;
    };
  }>('/:id', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['Purchase Orders'],
      summary: 'Update purchase order',
    },
  }, async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    const existing = await prisma.purchaseOrder.findUnique({
      where: {
        id: request.params.id,
      },
    });

    if (!existing) {
      return reply.code(404).send({ error: 'Purchase order not found' });
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
    if (request.body.deliveryDate !== undefined) {
      updateData.deliveryDate = new Date(request.body.deliveryDate);
    }

    // If approving
    if (request.body.status === 'SENT' || request.body.status === 'ACKNOWLEDGED') {
      if (!existing.approvedBy) {
        updateData.approvedBy = request.user.id;
        updateData.approvedAt = new Date();
      }
    }

    const purchaseOrder = await prisma.purchaseOrder.update({
      where: {
        id: request.params.id,
      },
      data: updateData,
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
            contactPerson: true,
            email: true,
            phone: true,
          },
        },
        createdBy: {
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

    return reply.send({ purchaseOrder });
  });

  // DELETE /api/v1/purchase-orders/:id - Delete purchase order
  fastify.delete<{
    Params: {
      id: string;
    };
  }>('/:id', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['Purchase Orders'],
      summary: 'Delete purchase order',
    },
  }, async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    const existing = await prisma.purchaseOrder.findUnique({
      where: {
        id: request.params.id,
      },
    });

    if (!existing) {
      return reply.code(404).send({ error: 'Purchase order not found' });
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

    await prisma.purchaseOrder.delete({
      where: {
        id: request.params.id,
      },
    });

    return reply.code(204).send();
  });
};
