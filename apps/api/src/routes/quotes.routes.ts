import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { QuoteService } from '../services/quotes/quote.service';
import { AIService } from '../services/ai/ai.service';
import {
  QuoteGenerationRequestSchema,
  CreateQuoteVersionSchema,
  CreateQuoteApprovalSchema,
  UpdateQuoteApprovalSchema,
} from '../types/crm';

type QuotesRoutesOptions = FastifyPluginOptions & {
  prisma: PrismaClient;
  aiService: AIService;
};

export async function quotesRoutes(
  fastify: FastifyInstance,
  options: QuotesRoutesOptions
) {
  const quoteService = new QuoteService(options.prisma, options.aiService);

  // AI Quote Generation
  fastify.post('/quotes/generate', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['Quotes'],
      summary: 'Generate quote using AI',
      description: 'Generate a detailed construction quote in under 10 minutes using AI analysis of historical projects',
      // body: QuoteGenerationRequestSchema, // Validation happens in handler
      response: {
        201: {
          type: 'object',
          properties: {
            quote: { type: 'object' },
            generationTime: { type: 'number' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const startTime = Date.now();
    const body = QuoteGenerationRequestSchema.parse(request.body);

    const quote = await quoteService.generateQuoteWithAI(body, request.user!.id);
    const generationTime = Date.now() - startTime;

    reply.code(201).send({ quote, generationTime });
  });

  // Quote Management Routes
  fastify.get('/quotes/:id', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['Quotes'],
      summary: 'Get quote with items',
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
            quote: { type: 'object' },
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
    const { id } = request.params as { id: string };
    const quote = await quoteService.getQuoteWithItems(id);

    if (!quote) {
      reply.code(404).send({ error: 'Quote not found' });
      return;
    }

    return { quote };
  });

  fastify.patch('/quotes/:id/status', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['Quotes'],
      summary: 'Update quote status',
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
          status: {
            type: 'string',
            enum: ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED'],
          },
        },
        required: ['status'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            quote: { type: 'object' },
          },
        },
      },
    },
  }, async (request) => {
    const { id } = request.params as { id: string };
    const { status } = request.body as { status: any };

    const quote = await quoteService.updateQuoteStatus(id, status);

    return { quote };
  });

  fastify.get('/companies/:companyId/quotes', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['Quotes'],
      summary: 'Get quotes for a company',
      params: {
        type: 'object',
        properties: {
          companyId: { type: 'string' },
        },
        required: ['companyId'],
      },
      querystring: {
        type: 'object',
        properties: {
          status: { type: 'string' },
          customerId: { type: 'string' },
          leadId: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            quotes: {
              type: 'array',
              items: { type: 'object' },
            },
          },
        },
      },
    },
  }, async (request) => {
    const { companyId } = request.params as { companyId: string };
    const { status, customerId, leadId } = request.query as any;

    const quotes = await quoteService.getQuotesByCompany(companyId, {
      status,
      customerId,
      leadId,
    });

    return { quotes };
  });

  fastify.get('/customers/:customerId/quotes', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['Quotes'],
      summary: 'Get quotes for a customer',
      params: {
        type: 'object',
        properties: {
          customerId: { type: 'string' },
        },
        required: ['customerId'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            quotes: {
              type: 'array',
              items: { type: 'object' },
            },
          },
        },
      },
    },
  }, async (request) => {
    const { customerId } = request.params as { customerId: string };
    const quotes = await quoteService.getQuotesByCustomer(customerId);

    return { quotes };
  });

  fastify.get('/leads/:leadId/quotes', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['Quotes'],
      summary: 'Get quotes for a lead',
      params: {
        type: 'object',
        properties: {
          leadId: { type: 'string' },
        },
        required: ['leadId'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            quotes: {
              type: 'array',
              items: { type: 'object' },
            },
          },
        },
      },
    },
  }, async (request) => {
    const { leadId } = request.params as { leadId: string };
    const quotes = await quoteService.getQuotesByLead(leadId);

    return { quotes };
  });

  // Quote Versioning Routes
  fastify.post('/quotes/:id/versions', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['Quotes'],
      summary: 'Create a new quote version',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
        required: ['id'],
      },
      // body: CreateQuoteVersionSchema, // Validation happens in handler
      response: {
        201: {
          type: 'object',
          properties: {
            version: { type: 'object' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { changeReason } = request.body as { changeReason?: string };

    const version = await quoteService.createQuoteVersion(id, changeReason);

    reply.code(201).send({ version });
  });

  fastify.get('/quotes/:id/versions', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['Quotes'],
      summary: 'Get all versions of a quote',
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
            versions: {
              type: 'array',
              items: { type: 'object' },
            },
          },
        },
      },
    },
  }, async (request) => {
    const { id } = request.params as { id: string };
    const versions = await quoteService.getQuoteVersions(id);

    return { versions };
  });

  // Quote Approval Routes
  fastify.post('/quotes/:id/approvals', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['Quotes'],
      summary: 'Request quote approval',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
        required: ['id'],
      },
      // body: CreateQuoteApprovalSchema, // Validation happens in handler
      response: {
        201: {
          type: 'object',
          properties: {
            approval: { type: 'object' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { approverId, comments } = CreateQuoteApprovalSchema.parse(request.body);

    const approval = await options.prisma.quoteApproval.create({
      data: {
        quoteId: id,
        approverId,
        requesterId: request.user!.id,
        status: 'PENDING',
        comments,
      },
    });

    reply.code(201).send({ approval });
  });

  fastify.patch('/approvals/:id', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['Quotes'],
      summary: 'Update approval status',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
        required: ['id'],
      },
      // body: UpdateQuoteApprovalSchema, // Validation happens in handler
      response: {
        200: {
          type: 'object',
          properties: {
            approval: { type: 'object' },
          },
        },
      },
    },
  }, async (request) => {
    const { id } = request.params as { id: string };
    const { status, comments } = UpdateQuoteApprovalSchema.parse(request.body);

    const updateData: any = { status, comments };

    if (status === 'APPROVED') {
      updateData.approvedAt = new Date();
    } else if (status === 'REJECTED') {
      updateData.rejectedAt = new Date();
    }

    const approval = await options.prisma.quoteApproval.update({
      where: { id },
      data: updateData,
    });

    return { approval };
  });

  fastify.get('/quotes/:id/approvals', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['Quotes'],
      summary: 'Get quote approvals',
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
            approvals: {
              type: 'array',
              items: { type: 'object' },
            },
          },
        },
      },
    },
  }, async (request) => {
    const { id } = request.params as { id: string };

    const approvals = await options.prisma.quoteApproval.findMany({
      where: { quoteId: id },
      orderBy: { createdAt: 'desc' },
    });

    return { approvals };
  });
}