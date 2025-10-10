import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/database.js';

const BudgetCategorySchema = z.enum([
  'LABOR',
  'MATERIALS',
  'EQUIPMENT',
  'SUBCONTRACTORS',
  'PERMITS',
  'OVERHEAD',
  'CONTINGENCY',
  'OTHER'
]);

const CreateBudgetLineItemSchema = z.object({
  projectId: z.string(),
  category: BudgetCategorySchema,
  name: z.string(),
  description: z.string().optional(),
  costCode: z.string().optional(),
  budgetedAmount: z.number(),
  notes: z.string().optional(),
});

const UpdateBudgetLineItemSchema = z.object({
  category: BudgetCategorySchema.optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  costCode: z.string().optional(),
  budgetedAmount: z.number().optional(),
  actualAmount: z.number().optional(),
  committedAmount: z.number().optional(),
  notes: z.string().optional(),
});

export default async function budgetRoutes(fastify: FastifyInstance) {
  // Get budget summary for a project
  fastify.get('/projects/:projectId/budget/summary', async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
      const { projectId } = request.params as { projectId: string };
      const user = (request as any).user;

      // Get project with budget info
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: {
          id: true,
          budget: true,
          actualCost: true,
          budgetLines: {
            select: {
              category: true,
              budgetedAmount: true,
              actualAmount: true,
              committedAmount: true,
            },
          },
        },
      });

      if (!project) {
        return reply.code(404).send({ error: 'Project not found' });
      }

      // Calculate summary by category
      const categoryBreakdown = project.budgetLines.reduce((acc, line) => {
        const category = line.category;
        if (!acc[category]) {
          acc[category] = {
            budgeted: 0,
            actual: 0,
            committed: 0,
          };
        }
        acc[category].budgeted += Number(line.budgetedAmount);
        acc[category].actual += Number(line.actualAmount);
        acc[category].committed += Number(line.committedAmount);
        return acc;
      }, {} as Record<string, { budgeted: number; actual: number; committed: number }>);

      const totalBudgeted = Object.values(categoryBreakdown).reduce(
        (sum, cat) => sum + cat.budgeted,
        0
      );
      const totalActual = Object.values(categoryBreakdown).reduce(
        (sum, cat) => sum + cat.actual,
        0
      );
      const totalCommitted = Object.values(categoryBreakdown).reduce(
        (sum, cat) => sum + cat.committed,
        0
      );

      return reply.send({
        summary: {
          totalBudget: Number(project.budget) || totalBudgeted,
          totalActual,
          totalCommitted,
          variance: (Number(project.budget) || totalBudgeted) - totalActual,
          percentageUsed: Number(project.budget)
            ? (totalActual / Number(project.budget)) * 100
            : 0,
        },
        categoryBreakdown,
      });
  });

  // Get all budget line items for a project
  fastify.get('/projects/:projectId/budget/line-items', async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
      const { projectId } = request.params as { projectId: string };

      const budgetLines = await prisma.budgetLineItem.findMany({
        where: { projectId },
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
      });

      return reply.send({ budgetLines });
  });

  // Create budget line item
  fastify.post('/budget/line-items', async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
      const data = CreateBudgetLineItemSchema.parse(request.body);

      const budgetLine = await prisma.budgetLineItem.create({
        data: {
          ...data,
          budgetedAmount: data.budgetedAmount,
        },
      });

      return reply.code(201).send({ budgetLine });
  });

  // Update budget line item
  fastify.patch('/budget/line-items/:id', async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
      const { id } = request.params as { id: string };
      const data = UpdateBudgetLineItemSchema.parse(request.body);

      const budgetLine = await prisma.budgetLineItem.update({
        where: { id },
        data,
      });

      return reply.send({ budgetLine });
  });

  // Delete budget line item
  fastify.delete('/budget/line-items/:id', async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
    const { id } = request.params as { id: string };

    await prisma.budgetLineItem.delete({
      where: { id },
    });

    return reply.code(204).send();
  });
}
