import type { FastifyPluginAsync } from 'fastify';
import type { PrismaClient } from '../generated/prisma';
import { Decimal } from '@prisma/client/runtime/library';

type InvoicesRoutesOptions = {
  prisma: PrismaClient;
};

export const invoicesRoutes: FastifyPluginAsync<InvoicesRoutesOptions> = async (
  fastify,
  options
) => {
  const { prisma } = options;

  // GET /api/v1/invoices - List invoices
  fastify.get<{
    Querystring: {
      companyId?: string;
      projectId?: string;
      customerId?: string;
      status?: string;
    };
  }>('/', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['Invoices'],
      summary: 'List invoices',
      querystring: {
        type: 'object',
        properties: {
          companyId: { type: 'string' },
          projectId: { type: 'string' },
          customerId: { type: 'string' },
          status: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    const where: any = {};

    if (request.query.companyId) {
      where.companyId = request.query.companyId;
    }

    if (request.query.projectId) {
      where.projectId = request.query.projectId;
    }

    if (request.query.customerId) {
      where.customerId = request.query.customerId;
    }

    if (request.query.status) {
      where.status = request.query.status;
    }

    const invoices = await prisma.invoice.findMany({
      where,
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
            email: true,
            phone: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        items: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return reply.send({ invoices });
  });

  // GET /api/v1/invoices/:id - Get single invoice
  fastify.get<{
    Params: {
      id: string;
    };
  }>('/:id', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['Invoices'],
      summary: 'Get invoice',
    },
  }, async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    const invoice = await prisma.invoice.findUnique({
      where: {
        id: request.params.id,
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            legalName: true,
            address: true,
            phone: true,
            email: true,
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            address: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        items: true,
        payments: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!invoice) {
      return reply.code(404).send({ error: 'Invoice not found' });
    }

    return reply.send({ invoice });
  });

  // POST /api/v1/invoices - Create invoice
  fastify.post<{
    Body: {
      companyId: string;
      customerId: string;
      projectId?: string;
      quoteId?: string;
      title: string;
      description?: string;
      taxRate?: number;
      dueDate: string;
      notes?: string;
      items: Array<{
        description: string;
        quantity: number;
        unitPrice: number;
        total: number;
      }>;
    };
  }>('/', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['Invoices'],
      summary: 'Create invoice',
      body: {
        type: 'object',
        required: ['companyId', 'customerId', 'title', 'dueDate', 'items'],
        properties: {
          companyId: { type: 'string' },
          customerId: { type: 'string' },
          projectId: { type: 'string' },
          quoteId: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          taxRate: { type: 'number' },
          dueDate: { type: 'string', format: 'date-time' },
          notes: { type: 'string' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              required: ['description', 'quantity', 'unitPrice', 'total'],
              properties: {
                description: { type: 'string' },
                quantity: { type: 'number' },
                unitPrice: { type: 'number' },
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

    // Verify company access
    const companyAccess = await prisma.companyUser.findFirst({
      where: {
        companyId: request.body.companyId,
        userId: request.user.id,
      },
    });

    if (!companyAccess) {
      return reply.code(403).send({ error: 'Access denied to this company' });
    }

    // If project specified, verify project access
    if (request.body.projectId) {
      const project = await prisma.project.findFirst({
        where: {
          id: request.body.projectId,
          companyId: request.body.companyId,
        },
      });

      if (!project) {
        return reply.code(404).send({ error: 'Project not found' });
      }
    }

    // Calculate totals
    const subtotal = request.body.items.reduce((sum, item) => sum + item.total, 0);
    const taxRate = request.body.taxRate || 0;
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount;

    // Generate invoice number
    const count = await prisma.invoice.count({
      where: {
        companyId: request.body.companyId,
      },
    });
    const invoiceNumber = `INV-${String(count + 1).padStart(5, '0')}`;

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        companyId: request.body.companyId,
        customerId: request.body.customerId,
        projectId: request.body.projectId,
        quoteId: request.body.quoteId,
        title: request.body.title,
        description: request.body.description,
        subtotal: new Decimal(subtotal),
        taxRate: new Decimal(taxRate),
        taxAmount: new Decimal(taxAmount),
        total: new Decimal(total),
        dueDate: new Date(request.body.dueDate),
        notes: request.body.notes,
        createdById: request.user.id,
        items: {
          create: request.body.items.map((item) => ({
            description: item.description,
            quantity: new Decimal(item.quantity),
            unitPrice: new Decimal(item.unitPrice),
            total: new Decimal(item.total),
          })),
        },
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
            email: true,
            phone: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        items: true,
      },
    });

    return reply.code(201).send({ invoice });
  });

  // PATCH /api/v1/invoices/:id - Update invoice
  fastify.patch<{
    Params: {
      id: string;
    };
    Body: {
      title?: string;
      description?: string;
      status?: string;
      dueDate?: string;
      notes?: string;
    };
  }>('/:id', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['Invoices'],
      summary: 'Update invoice',
    },
  }, async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    const existing = await prisma.invoice.findUnique({
      where: {
        id: request.params.id,
      },
    });

    if (!existing) {
      return reply.code(404).send({ error: 'Invoice not found' });
    }

    // Verify company access
    const companyAccess = await prisma.companyUser.findFirst({
      where: {
        companyId: existing.companyId,
        userId: request.user.id,
      },
    });

    if (!companyAccess) {
      return reply.code(403).send({ error: 'Access denied' });
    }

    const updateData: any = {};
    if (request.body.title !== undefined) updateData.title = request.body.title;
    if (request.body.description !== undefined) updateData.description = request.body.description;
    if (request.body.status !== undefined) updateData.status = request.body.status;
    if (request.body.dueDate !== undefined) updateData.dueDate = new Date(request.body.dueDate);
    if (request.body.notes !== undefined) updateData.notes = request.body.notes;

    const invoice = await prisma.invoice.update({
      where: {
        id: request.params.id,
      },
      data: updateData,
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
            email: true,
            phone: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        items: true,
      },
    });

    return reply.send({ invoice });
  });

  // POST /api/v1/invoices/:id/send - Send invoice to customer
  fastify.post<{
    Params: {
      id: string;
    };
  }>('/:id/send', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['Invoices'],
      summary: 'Send invoice',
    },
  }, async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    const existing = await prisma.invoice.findUnique({
      where: {
        id: request.params.id,
      },
    });

    if (!existing) {
      return reply.code(404).send({ error: 'Invoice not found' });
    }

    // Verify company access
    const companyAccess = await prisma.companyUser.findFirst({
      where: {
        companyId: existing.companyId,
        userId: request.user.id,
      },
    });

    if (!companyAccess) {
      return reply.code(403).send({ error: 'Access denied' });
    }

    const invoice = await prisma.invoice.update({
      where: {
        id: request.params.id,
      },
      data: {
        status: 'SENT',
        sentAt: new Date(),
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
            email: true,
            phone: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        items: true,
      },
    });

    // TODO: Send email to customer with invoice PDF

    return reply.send({ invoice });
  });

  // POST /api/v1/invoices/:id/pay - Record payment
  fastify.post<{
    Params: {
      id: string;
    };
    Body: {
      amount: number;
      paymentMethod?: string;
      reference?: string;
      notes?: string;
    };
  }>('/:id/pay', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['Invoices'],
      summary: 'Record payment',
      body: {
        type: 'object',
        required: ['amount'],
        properties: {
          amount: { type: 'number' },
          paymentMethod: { type: 'string' },
          reference: { type: 'string' },
          notes: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    const existing = await prisma.invoice.findUnique({
      where: {
        id: request.params.id,
      },
    });

    if (!existing) {
      return reply.code(404).send({ error: 'Invoice not found' });
    }

    // Verify company access
    const companyAccess = await prisma.companyUser.findFirst({
      where: {
        companyId: existing.companyId,
        userId: request.user.id,
      },
    });

    if (!companyAccess) {
      return reply.code(403).send({ error: 'Access denied' });
    }

    // Create payment record
    await prisma.payment.create({
      data: {
        invoiceId: request.params.id,
        amount: new Decimal(request.body.amount),
        paymentMethod: request.body.paymentMethod || 'BANK_TRANSFER',
        reference: request.body.reference,
        notes: request.body.notes,
        receivedBy: request.user.id,
      },
    });

    // Update invoice paid amount and status
    const newPaidAmount = Number(existing.paidAmount) + request.body.amount;
    const total = Number(existing.total);

    let status = existing.status;
    let paidAt = existing.paidAt;

    if (newPaidAmount >= total) {
      status = 'PAID';
      paidAt = new Date();
    } else if (newPaidAmount > 0) {
      status = 'PARTIALLY_PAID';
    }

    const invoice = await prisma.invoice.update({
      where: {
        id: request.params.id,
      },
      data: {
        paidAmount: new Decimal(newPaidAmount),
        status,
        paidAt,
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
            email: true,
            phone: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        items: true,
        payments: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    return reply.send({ invoice });
  });

  // DELETE /api/v1/invoices/:id - Delete invoice
  fastify.delete<{
    Params: {
      id: string;
    };
  }>('/:id', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['Invoices'],
      summary: 'Delete invoice',
    },
  }, async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    const existing = await prisma.invoice.findUnique({
      where: {
        id: request.params.id,
      },
    });

    if (!existing) {
      return reply.code(404).send({ error: 'Invoice not found' });
    }

    // Verify company access
    const companyAccess = await prisma.companyUser.findFirst({
      where: {
        companyId: existing.companyId,
        userId: request.user.id,
      },
    });

    if (!companyAccess) {
      return reply.code(403).send({ error: 'Access denied' });
    }

    // Only allow deletion of draft invoices
    if (existing.status !== 'DRAFT') {
      return reply.code(400).send({ error: 'Only draft invoices can be deleted' });
    }

    await prisma.invoice.delete({
      where: {
        id: request.params.id,
      },
    });

    return reply.code(204).send();
  });
};
