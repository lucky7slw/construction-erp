import type { FastifyPluginAsync } from 'fastify';
import type { PrismaClient } from '../generated/prisma';
import type { AIService } from '../services/ai/ai.service';
import { Decimal } from '@prisma/client/runtime/library';

type ExpensesRoutesOptions = {
  prisma: PrismaClient;
  aiService?: AIService;
};

export const expensesRoutes: FastifyPluginAsync<ExpensesRoutesOptions> = async (
  fastify,
  options
) => {
  const { prisma, aiService } = options;

  // GET /api/v1/expenses - List all expenses
  fastify.get<{
    Querystring: {
      projectId?: string;
      category?: string;
      userId?: string;
      startDate?: string;
      endDate?: string;
      billable?: string;
    };
  }>('/', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['Expenses'],
      summary: 'List all expenses',
      description: 'Get all expenses with optional filtering',
      querystring: {
        type: 'object',
        properties: {
          projectId: { type: 'string' },
          category: {
            type: 'string',
            enum: ['MATERIALS', 'EQUIPMENT', 'LABOR', 'TRANSPORTATION', 'PERMITS', 'UTILITIES', 'INSURANCE', 'OTHER'],
          },
          userId: { type: 'string' },
          startDate: { type: 'string', format: 'date' },
          endDate: { type: 'string', format: 'date' },
          billable: { type: 'string', enum: ['true', 'false'] },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            expenses: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  description: { type: 'string' },
                  amount: { type: 'number' },
                  category: { type: 'string' },
                  date: { type: 'string' },
                  receipt: { type: 'string', nullable: true },
                  billable: { type: 'boolean' },
                  reimbursable: { type: 'boolean' },
                  userId: { type: 'string' },
                  projectId: { type: 'string', nullable: true },
                  supplierId: { type: 'string', nullable: true },
                  createdAt: { type: 'string' },
                  updatedAt: { type: 'string' },
                },
              },
            },
            summary: {
              type: 'object',
              properties: {
                totalAmount: { type: 'number' },
                billableAmount: { type: 'number' },
                reimbursableAmount: { type: 'number' },
                categorySummary: { type: 'object' },
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

    // Filter by project
    if (request.query.projectId) {
      where.projectId = request.query.projectId;
    }

    // Filter by category
    if (request.query.category) {
      where.category = request.query.category;
    }

    // Filter by user (default to current user if not specified)
    if (request.query.userId) {
      where.userId = request.query.userId;
    } else {
      where.userId = request.user.id;
    }

    // Filter by billable status
    if (request.query.billable) {
      where.billable = request.query.billable === 'true';
    }

    // Filter by date range
    if (request.query.startDate || request.query.endDate) {
      where.date = {};
      if (request.query.startDate) {
        where.date.gte = new Date(request.query.startDate);
      }
      if (request.query.endDate) {
        where.date.lte = new Date(request.query.endDate);
      }
    }

    // Only show expenses from accessible projects
    if (!request.query.projectId) {
      where.OR = [
        { projectId: null },
        {
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
      ];
    }

    const expenses = await prisma.expense.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        supplier: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
    });

    // Calculate summary
    const totalAmount = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
    const billableAmount = expenses
      .filter((expense) => expense.billable)
      .reduce((sum, expense) => sum + Number(expense.amount), 0);
    const reimbursableAmount = expenses
      .filter((expense) => expense.reimbursable)
      .reduce((sum, expense) => sum + Number(expense.amount), 0);

    // Category summary
    const categorySummary: Record<string, number> = {};
    expenses.forEach((expense) => {
      const category = expense.category;
      categorySummary[category] = (categorySummary[category] || 0) + Number(expense.amount);
    });

    return {
      expenses,
      summary: {
        totalAmount,
        billableAmount,
        reimbursableAmount,
        categorySummary,
      },
    };
  });

  // POST /api/v1/expenses - Create new expense
  fastify.post<{
    Body: {
      description: string;
      amount: number;
      category?: string;
      date: string;
      receipt?: string;
      billable?: boolean;
      reimbursable?: boolean;
      projectId?: string;
      supplierId?: string;
      autoCategorizePer?: boolean;
    };
  }>('/', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['Expenses'],
      summary: 'Create new expense',
      body: {
        type: 'object',
        required: ['description', 'amount', 'date'],
        properties: {
          description: { type: 'string' },
          amount: { type: 'number', minimum: 0.01 },
          category: {
            type: 'string',
            enum: ['MATERIALS', 'EQUIPMENT', 'LABOR', 'TRANSPORTATION', 'PERMITS', 'UTILITIES', 'INSURANCE', 'OTHER'],
          },
          date: { type: 'string', format: 'date' },
          receipt: { type: 'string' },
          billable: { type: 'boolean' },
          reimbursable: { type: 'boolean' },
          projectId: { type: 'string' },
          supplierId: { type: 'string' },
          autoCategorize: { type: 'boolean' },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            expense: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                description: { type: 'string' },
                amount: { type: 'number' },
                category: { type: 'string' },
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

    // If project specified, verify user has access
    if (request.body.projectId) {
      const project = await prisma.project.findFirst({
        where: {
          id: request.body.projectId,
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
      });

      if (!project) {
        return reply.code(403).send({ error: 'Access denied to this project' });
      }
    }

    // Auto-categorize using AI if requested and no category provided
    let category = request.body.category;
    if (!category && request.body.autoCategorize !== false && aiService) {
      try {
        const aiCategory = await aiService.categorizeExpense({
          description: request.body.description,
          amount: request.body.amount,
          projectId: request.body.projectId,
        });
        category = aiCategory as any;
      } catch (error) {
        fastify.log.warn(error, 'Failed to auto-categorize expense, using OTHER');
        category = 'OTHER';
      }
    } else if (!category) {
      category = 'OTHER';
    }

    const expense = await prisma.expense.create({
      data: {
        description: request.body.description,
        amount: new Decimal(request.body.amount),
        category: category as any,
        date: new Date(request.body.date),
        receipt: request.body.receipt,
        billable: request.body.billable ?? false,
        reimbursable: request.body.reimbursable ?? false,
        userId: request.user.id,
        projectId: request.body.projectId,
        supplierId: request.body.supplierId,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        project: true,
        supplier: true,
      },
    });

    // Update project actual cost if project specified
    if (request.body.projectId) {
      await prisma.project.update({
        where: { id: request.body.projectId },
        data: {
          actualCost: {
            increment: new Decimal(request.body.amount),
          },
        },
      });
    }

    // Emit WebSocket event for real-time updates
    if (expense.project) {
      // wsService.broadcastToCompany(expense.project.companyId, 'expense:created', { expense });
    }

    return reply.code(201).send({ expense });
  });

  // PATCH /api/v1/expenses/:id - Update expense
  fastify.patch<{
    Params: { id: string };
    Body: {
      description?: string;
      amount?: number;
      category?: string;
      date?: string;
      receipt?: string;
      billable?: boolean;
      reimbursable?: boolean;
    };
  }>('/:id', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['Expenses'],
      summary: 'Update expense',
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
          description: { type: 'string' },
          amount: { type: 'number', minimum: 0.01 },
          category: {
            type: 'string',
            enum: ['MATERIALS', 'EQUIPMENT', 'LABOR', 'TRANSPORTATION', 'PERMITS', 'UTILITIES', 'INSURANCE', 'OTHER'],
          },
          date: { type: 'string', format: 'date' },
          receipt: { type: 'string' },
          billable: { type: 'boolean' },
          reimbursable: { type: 'boolean' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            expense: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                amount: { type: 'number' },
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

    // Get existing expense
    const existingExpense = await prisma.expense.findFirst({
      where: {
        id: request.params.id,
        userId: request.user.id,
      },
      include: {
        project: true,
      },
    });

    if (!existingExpense) {
      return reply.code(404).send({ error: 'Expense not found' });
    }

    const updateData: any = {};
    if (request.body.description) updateData.description = request.body.description;
    if (request.body.category) updateData.category = request.body.category as any;
    if (request.body.date) updateData.date = new Date(request.body.date);
    if (request.body.receipt !== undefined) updateData.receipt = request.body.receipt;
    if (request.body.billable !== undefined) updateData.billable = request.body.billable;
    if (request.body.reimbursable !== undefined) updateData.reimbursable = request.body.reimbursable;

    // Handle amount update (need to adjust project total)
    if (request.body.amount !== undefined) {
      const amountDiff = request.body.amount - Number(existingExpense.amount);
      updateData.amount = new Decimal(request.body.amount);

      // Update project actual cost if project specified
      if (existingExpense.projectId) {
        await prisma.project.update({
          where: { id: existingExpense.projectId },
          data: {
            actualCost: {
              increment: new Decimal(amountDiff),
            },
          },
        });
      }
    }

    const expense = await prisma.expense.update({
      where: { id: request.params.id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        project: true,
        supplier: true,
      },
    });

    // Emit WebSocket event for real-time updates
    if (expense.project) {
      // wsService.broadcastToCompany(expense.project.companyId, 'expense:updated', { expense });
    }

    return { expense };
  });

  // DELETE /api/v1/expenses/:id - Delete expense
  fastify.delete<{
    Params: { id: string };
  }>('/:id', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['Expenses'],
      summary: 'Delete expense',
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

    // Get existing expense
    const existingExpense = await prisma.expense.findFirst({
      where: {
        id: request.params.id,
        userId: request.user.id,
      },
      include: {
        project: true,
      },
    });

    if (!existingExpense) {
      return reply.code(404).send({ error: 'Expense not found' });
    }

    // Update project actual cost if project specified
    if (existingExpense.projectId) {
      await prisma.project.update({
        where: { id: existingExpense.projectId },
        data: {
          actualCost: {
            decrement: existingExpense.amount,
          },
        },
      });
    }

    await prisma.expense.delete({
      where: { id: request.params.id },
    });

    // Emit WebSocket event for real-time updates
    if (existingExpense.project) {
      // wsService.broadcastToCompany(existingExpense.project.companyId, 'expense:deleted', { expenseId: request.params.id });
    }

    return { message: 'Expense deleted successfully' };
  });
};