import type { FastifyPluginAsync } from 'fastify';
import type { PrismaClient } from '../generated/prisma';
import { EstimatesService } from '../services/estimates/estimates.service';

type EstimatesRoutesOptions = {
  prisma: PrismaClient;
};

export const estimatesRoutes: FastifyPluginAsync<EstimatesRoutesOptions> = async (
  fastify,
  options
) => {
  const { prisma } = options;
  const service = new EstimatesService(prisma);

  // GET /api/v1/estimates - List estimates
  fastify.get<{
    Querystring: {
      projectId?: string;
    };
  }>('/', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['Estimates'],
      summary: 'List estimates',
      querystring: {
        type: 'object',
        properties: {
          projectId: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            estimates: {
              type: 'array',
              items: { type: 'object' },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    // Get estimates based on query parameter
    const estimates = request.query.projectId
      ? await service.listProjectEstimates(request.query.projectId)
      : await service.listEstimates(request.user.companyId);

    return { estimates };
  });

  // GET /api/v1/estimates/:id - Get estimate
  fastify.get<{
    Params: {
      id: string;
    };
  }>('/:id', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['Estimates'],
      summary: 'Get estimate',
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            estimate: { type: 'object' },
          },
        },
      },
    },
  }, async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    const estimate = await service.getEstimate(request.params.id);

    return { estimate };
  });

  // POST /api/v1/estimates - Create estimate
  fastify.post<{
    Body: {
      projectId: string;
      name: string;
      description?: string;
      validUntil?: string;
    };
  }>('/', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['Estimates'],
      summary: 'Create estimate',
      body: {
        type: 'object',
        required: ['projectId', 'name'],
        properties: {
          projectId: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          validUntil: { type: 'string', format: 'date-time' },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            estimate: { type: 'object' },
          },
        },
      },
    },
  }, async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    const estimate = await service.createEstimate(
      {
        projectId: request.body.projectId,
        name: request.body.name,
        description: request.body.description,
        validUntil: request.body.validUntil ? new Date(request.body.validUntil) : undefined,
      },
      request.user.id
    );

    return reply.code(201).send({ estimate });
  });

  // POST /api/v1/estimates/:id/line-items - Add line item
  fastify.post<{
    Params: {
      id: string;
    };
    Body: {
      category: string;
      description: string;
      quantity: number;
      unit: string;
      unitCost: number;
      markup?: number;
      taxRate?: number;
    };
  }>('/:id/line-items', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['Estimates'],
      summary: 'Add line item to estimate',
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
      body: {
        type: 'object',
        required: ['category', 'description', 'quantity', 'unit', 'unitCost'],
        properties: {
          category: { type: 'string' },
          description: { type: 'string' },
          quantity: { type: 'number' },
          unit: { type: 'string' },
          unitCost: { type: 'number' },
          markup: { type: 'number' },
          taxRate: { type: 'number' },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            lineItem: { type: 'object' },
          },
        },
      },
    },
  }, async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    const lineItem = await service.addLineItem(request.params.id, {
      category: request.body.category,
      description: request.body.description,
      quantity: request.body.quantity,
      unit: request.body.unit,
      unitCost: request.body.unitCost,
      markup: request.body.markup,
      taxRate: request.body.taxRate,
    });

    return reply.code(201).send({ lineItem });
  });

  // PATCH /api/v1/estimates/:id - Update estimate
  fastify.patch<{
    Params: {
      id: string;
    };
    Body: {
      name?: string;
      description?: string;
      validUntil?: string;
    };
  }>('/:id', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['Estimates'],
      summary: 'Update estimate',
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          validUntil: { type: 'string', format: 'date-time' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            estimate: { type: 'object' },
          },
        },
      },
    },
  }, async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    const estimate = await service.updateEstimate(request.params.id, {
      name: request.body.name,
      description: request.body.description,
      validUntil: request.body.validUntil ? new Date(request.body.validUntil) : undefined,
    });

    return { estimate };
  });

  // POST /api/v1/estimates/:id/approve - Approve estimate
  fastify.post<{
    Params: {
      id: string;
    };
  }>('/:id/approve', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['Estimates'],
      summary: 'Approve estimate',
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            estimate: { type: 'object' },
          },
        },
      },
    },
  }, async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    const estimate = await service.approveEstimate(request.params.id, request.user.id);

    return { estimate };
  });

  // DELETE /api/v1/estimates/:id - Delete estimate
  fastify.delete<{
    Params: {
      id: string;
    };
  }>('/:id', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['Estimates'],
      summary: 'Delete estimate',
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
      response: {
        204: {
          type: 'null',
        },
      },
    },
  }, async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    await service.deleteEstimate(request.params.id);

    return reply.code(204).send();
  });

  // GET /api/v1/estimates/:id/summary - Get estimate summary
  fastify.get<{
    Params: {
      id: string;
    };
  }>('/:id/summary', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['Estimates'],
      summary: 'Get estimate summary',
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            summary: { type: 'object' },
          },
        },
      },
    },
  }, async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    const summary = await service.getEstimateSummary(request.params.id);

    return { summary };
  });

  // GET /api/v1/estimates/:id/export - Export estimate to CSV
  fastify.get<{
    Params: {
      id: string;
    };
  }>('/:id/export', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['Estimates'],
      summary: 'Export estimate to CSV',
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'string',
        },
      },
    },
  }, async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    const csv = await service.exportEstimateToCSV(request.params.id);

    reply.header('Content-Type', 'text/csv');
    reply.header('Content-Disposition', 'attachment; filename=estimate.csv');

    return csv;
  });
};
