import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { CRMService } from '../services/crm/crm.service';
import {
  CreateLeadSchema,
  UpdateLeadSchema,
  CreateInteractionSchema,
  CreateFollowUpSchema,
  UpdateFollowUpSchema,
} from '../types/crm';

type CRMRoutesOptions = FastifyPluginOptions & {
  prisma: PrismaClient;
};

export async function crmRoutes(
  fastify: FastifyInstance,
  options: CRMRoutesOptions
) {
  const crmService = new CRMService(options.prisma);

  // Lead Management Routes
  fastify.post('/leads', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['CRM'],
      summary: 'Create a new lead',
      // body: CreateLeadSchema, // Validation happens in handler
      response: {
        201: {
          type: 'object',
          properties: {
            lead: { type: 'object' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const body = CreateLeadSchema.parse(request.body);
    const lead = await crmService.createLead(body, request.user!.id);

    reply.code(201).send({ lead });
  });

  fastify.get('/leads', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['CRM'],
      summary: 'Get leads for a company',
      querystring: {
        type: 'object',
        properties: {
          companyId: { type: 'string' },
          status: { type: 'string' },
          assignedToId: { type: 'string' },
          source: { type: 'string' },
        },
        required: ['companyId'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            leads: {
              type: 'array',
              items: { type: 'object' },
            },
          },
        },
      },
    },
  }, async (request) => {
    const { companyId, status, assignedToId, source } = request.query as any;

    const leads = await crmService.getLeadsByCompany(companyId, {
      status,
      assignedToId,
      source,
    });

    return { leads };
  });

  fastify.get('/leads/:id', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['CRM'],
      summary: 'Get a single lead',
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
            lead: { type: 'object' },
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
    const lead = await crmService.getLead(id);

    if (!lead) {
      reply.code(404).send({ error: 'Lead not found' });
      return;
    }

    return { lead };
  });

  fastify.patch('/leads/:id', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['CRM'],
      summary: 'Update a lead',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
        required: ['id'],
      },
      // body: UpdateLeadSchema, // Validation happens in handler
      response: {
        200: {
          type: 'object',
          properties: {
            lead: { type: 'object' },
          },
        },
      },
    },
  }, async (request) => {
    const { id } = request.params as { id: string };
    const body = UpdateLeadSchema.parse(request.body);

    const lead = await crmService.updateLead(id, body);

    return { lead };
  });

  // Customer Interaction Routes
  fastify.post('/interactions', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['CRM'],
      summary: 'Create a customer interaction',
      // body: CreateInteractionSchema, // Validation happens in handler
      response: {
        201: {
          type: 'object',
          properties: {
            interaction: { type: 'object' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const body = CreateInteractionSchema.parse(request.body);
    const interaction = await crmService.createInteraction(body, request.user!.id);

    reply.code(201).send({ interaction });
  });

  fastify.get('/customers/:customerId/interactions', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['CRM'],
      summary: 'Get customer interactions',
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
            interactions: {
              type: 'array',
              items: { type: 'object' },
            },
          },
        },
      },
    },
  }, async (request) => {
    const { customerId } = request.params as { customerId: string };
    const interactions = await crmService.getCustomerInteractions(customerId);

    return { interactions };
  });

  fastify.get('/leads/:leadId/interactions', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['CRM'],
      summary: 'Get lead interactions',
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
            interactions: {
              type: 'array',
              items: { type: 'object' },
            },
          },
        },
      },
    },
  }, async (request) => {
    const { leadId } = request.params as { leadId: string };
    const interactions = await crmService.getLeadInteractions(leadId);

    return { interactions };
  });

  // Follow-up Task Routes
  fastify.post('/follow-ups', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['CRM'],
      summary: 'Create a follow-up task',
      // body: CreateFollowUpSchema, // Validation happens in handler
      response: {
        201: {
          type: 'object',
          properties: {
            followUp: { type: 'object' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const body = CreateFollowUpSchema.parse(request.body);
    const followUp = await crmService.createFollowUpTask(body);

    reply.code(201).send({ followUp });
  });

  fastify.patch('/follow-ups/:id', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['CRM'],
      summary: 'Update a follow-up task',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
        required: ['id'],
      },
      // body: UpdateFollowUpSchema, // Validation happens in handler
      response: {
        200: {
          type: 'object',
          properties: {
            followUp: { type: 'object' },
          },
        },
      },
    },
  }, async (request) => {
    const { id } = request.params as { id: string };
    const body = UpdateFollowUpSchema.parse(request.body);

    const followUp = await crmService.updateFollowUpTask(id, body);

    return { followUp };
  });

  fastify.get('/leads/:leadId/follow-ups', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['CRM'],
      summary: 'Get follow-up tasks for a lead',
      params: {
        type: 'object',
        properties: {
          leadId: { type: 'string' },
        },
        required: ['leadId'],
      },
      querystring: {
        type: 'object',
        properties: {
          status: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            followUps: {
              type: 'array',
              items: { type: 'object' },
            },
          },
        },
      },
    },
  }, async (request) => {
    const { leadId } = request.params as { leadId: string };
    const { status } = request.query as any;

    const followUps = await crmService.getLeadFollowUps(leadId, { status });

    return { followUps };
  });

  // Pipeline Analytics Route
  fastify.get('/pipeline/:companyId', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['CRM'],
      summary: 'Get pipeline metrics for a company',
      params: {
        type: 'object',
        properties: {
          companyId: { type: 'string' },
        },
        required: ['companyId'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            metrics: { type: 'object' },
          },
        },
      },
    },
  }, async (request) => {
    const { companyId } = request.params as { companyId: string };
    const metrics = await crmService.getPipelineMetrics(companyId);

    return { metrics };
  });

  // Lead Conversion Route
  fastify.post('/leads/:id/convert', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['CRM'],
      summary: 'Convert lead to customer',
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
          createProject: { type: 'boolean' },
          projectName: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            customer: { type: 'object' },
            lead: { type: 'object' },
            project: { type: 'object' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { createProject, projectName } = request.body as {
      createProject?: boolean;
      projectName?: string;
    };

    const result = await crmService.convertLeadToCustomer(id, {
      createProject,
      projectName,
    });

    return reply.send(result);
  });

  // Customer Routes
  fastify.get('/customers', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['CRM'],
      summary: 'Get customers for a company',
      querystring: {
        type: 'object',
        properties: {
          companyId: { type: 'string' },
          isActive: { type: 'boolean' },
        },
        required: ['companyId'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            customers: {
              type: 'array',
              items: { type: 'object' },
            },
          },
        },
      },
    },
  }, async (request) => {
    const { companyId, isActive } = request.query as {
      companyId: string;
      isActive?: boolean;
    };

    const where: any = { companyId };
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const customers = await options.prisma.customer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { projects: true, quotes: true, leads: true },
        },
      },
    });

    return { customers };
  });

  fastify.get('/customers/:id', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['CRM'],
      summary: 'Get a single customer',
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
            customer: { type: 'object' },
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

    const customer = await options.prisma.customer.findUnique({
      where: { id },
      include: {
        projects: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        leads: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        _count: {
          select: { projects: true, quotes: true, invoices: true, interactions: true },
        },
      },
    });

    if (!customer) {
      reply.code(404).send({ error: 'Customer not found' });
      return;
    }

    return { customer };
  });

  fastify.get('/customers/:id/projects', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['CRM'],
      summary: 'Get projects for a customer',
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
            projects: {
              type: 'array',
              items: { type: 'object' },
            },
          },
        },
      },
    },
  }, async (request) => {
    const { id } = request.params as { id: string };

    const projects = await options.prisma.project.findMany({
      where: { customerId: id },
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    return { projects };
  });

  // Project-Customer Assignment Routes
  fastify.post('/projects/:projectId/assign-customer', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['CRM'],
      summary: 'Assign customer to project',
      params: {
        type: 'object',
        properties: {
          projectId: { type: 'string' },
        },
        required: ['projectId'],
      },
      body: {
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
            project: { type: 'object' },
          },
        },
      },
    },
  }, async (request) => {
    const { projectId } = request.params as { projectId: string };
    const { customerId } = request.body as { customerId: string };

    const project = await options.prisma.project.update({
      where: { id: projectId },
      data: { customerId },
      include: {
        customer: true,
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    return { project };
  });

  fastify.delete('/projects/:projectId/assign-customer', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['CRM'],
      summary: 'Remove customer from project',
      params: {
        type: 'object',
        properties: {
          projectId: { type: 'string' },
        },
        required: ['projectId'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            project: { type: 'object' },
          },
        },
      },
    },
  }, async (request) => {
    const { projectId } = request.params as { projectId: string };

    const project = await options.prisma.project.update({
      where: { id: projectId },
      data: { customerId: null },
    });

    return { project };
  });
}