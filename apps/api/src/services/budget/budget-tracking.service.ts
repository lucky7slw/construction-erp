import { PrismaClient, BudgetCategory } from '../../generated/prisma';
import { WebSocketService } from '../websocket.service';

export type BudgetLineCreateInput = {
  projectId: string;
  category: BudgetCategory;
  name: string;
  description?: string;
  costCode?: string;
  budgetedAmount: number;
  notes?: string;
};

export type BudgetLineUpdateInput = {
  name?: string;
  description?: string;
  costCode?: string;
  budgetedAmount?: number;
  notes?: string;
};

export type CostTransactionCreateInput = {
  budgetLineId: string;
  projectId: string;
  transactionType: 'ACTUAL' | 'COMMITTED' | 'ADJUSTMENT';
  amount: number;
  description: string;
  transactionDate: Date;
  referenceType?: string;
  referenceId?: string;
};

export type BudgetVarianceReport = {
  projectId: string;
  totalBudgeted: number;
  totalActual: number;
  totalCommitted: number;
  totalRemaining: number;
  varianceAmount: number;
  variancePercent: number;
  byCategory: CategoryVariance[];
  atRisk: BudgetLineVariance[];
};

export type CategoryVariance = {
  category: BudgetCategory;
  budgeted: number;
  actual: number;
  committed: number;
  remaining: number;
  variance: number;
  variancePercent: number;
};

export type BudgetLineVariance = {
  id: string;
  name: string;
  category: BudgetCategory;
  budgeted: number;
  actual: number;
  committed: number;
  remaining: number;
  variance: number;
  variancePercent: number;
};

export class BudgetTrackingService {
  constructor(
    private prisma: PrismaClient,
    private wsService?: WebSocketService
  ) {}

  async createBudgetLine(input: BudgetLineCreateInput) {
    // Verify project exists
    const project = await this.prisma.project.findUnique({
      where: { id: input.projectId },
      select: { companyId: true, name: true },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    const budgetLine = await this.prisma.budgetLineItem.create({
      data: {
        project: {
          connect: { id: input.projectId },
        },
        category: input.category,
        name: input.name,
        description: input.description,
        costCode: input.costCode,
        budgetedAmount: input.budgetedAmount,
        notes: input.notes,
      },
      include: {
        transactions: true,
      },
    });

    // Emit WebSocket event
    if (this.wsService) {
      this.wsService.broadcastToCompany(project.companyId, 'budget:line:created', {
        budgetLineId: budgetLine.id,
        projectId: input.projectId,
        category: budgetLine.category,
        name: budgetLine.name,
        budgetedAmount: Number(budgetLine.budgetedAmount),
        timestamp: new Date(),
      });
    }

    return budgetLine;
  }

  async getBudgetLine(id: string) {
    const budgetLine = await this.prisma.budgetLineItem.findUnique({
      where: { id },
      include: {
        transactions: {
          include: {
            createdBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: {
            transactionDate: 'desc',
          },
        },
        project: {
          select: {
            id: true,
            name: true,
            companyId: true,
          },
        },
      },
    });

    if (!budgetLine) {
      throw new Error('Budget line not found');
    }

    return budgetLine;
  }

  async updateBudgetLine(id: string, input: BudgetLineUpdateInput) {
    const existing = await this.getBudgetLine(id);

    const updated = await this.prisma.budgetLineItem.update({
      where: { id },
      data: {
        name: input.name,
        description: input.description,
        costCode: input.costCode,
        budgetedAmount: input.budgetedAmount,
        notes: input.notes,
      },
      include: {
        transactions: true,
      },
    });

    // Emit WebSocket event
    if (this.wsService && input.budgetedAmount !== undefined) {
      this.wsService.broadcastToCompany(
        existing.project.companyId,
        'budget:line:updated',
        {
          budgetLineId: updated.id,
          projectId: existing.project.id,
          changes: input,
          timestamp: new Date(),
        }
      );
    }

    return updated;
  }

  async deleteBudgetLine(id: string) {
    const existing = await this.getBudgetLine(id);

    // Check if there are any transactions
    if (existing.transactions.length > 0) {
      throw new Error(
        'Cannot delete budget line with existing transactions. Delete transactions first or set budgeted amount to 0.'
      );
    }

    await this.prisma.budgetLineItem.delete({
      where: { id },
    });

    // Emit WebSocket event
    if (this.wsService) {
      this.wsService.broadcastToCompany(
        existing.project.companyId,
        'budget:line:deleted',
        {
          budgetLineId: id,
          projectId: existing.project.id,
          timestamp: new Date(),
        }
      );
    }

    return { success: true };
  }

  async getProjectBudget(
    projectId: string,
    filter?: {
      category?: BudgetCategory;
    }
  ) {
    const where: any = { projectId };

    if (filter?.category) {
      where.category = filter.category;
    }

    return this.prisma.budgetLineItem.findMany({
      where,
      include: {
        transactions: true,
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
  }

  async addTransaction(input: CostTransactionCreateInput, createdById: string) {
    // Verify budget line exists
    const budgetLine = await this.getBudgetLine(input.budgetLineId);

    const transaction = await this.prisma.costTransaction.create({
      data: {
        budgetLine: {
          connect: { id: input.budgetLineId },
        },
        project: {
          connect: { id: input.projectId },
        },
        transactionType: input.transactionType,
        amount: input.amount,
        description: input.description,
        transactionDate: input.transactionDate,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        createdBy: {
          connect: { id: createdById },
        },
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Update budget line amounts
    if (input.transactionType === 'ACTUAL') {
      await this.prisma.budgetLineItem.update({
        where: { id: input.budgetLineId },
        data: {
          actualAmount: {
            increment: input.amount,
          },
        },
      });
    } else if (input.transactionType === 'COMMITTED') {
      await this.prisma.budgetLineItem.update({
        where: { id: input.budgetLineId },
        data: {
          committedAmount: {
            increment: input.amount,
          },
        },
      });
    }

    // Emit WebSocket event
    if (this.wsService) {
      this.wsService.broadcastToCompany(
        budgetLine.project.companyId,
        'budget:transaction:added',
        {
          transactionId: transaction.id,
          budgetLineId: input.budgetLineId,
          projectId: input.projectId,
          transactionType: input.transactionType,
          amount: Number(transaction.amount),
          timestamp: new Date(),
        }
      );
    }

    return transaction;
  }

  async getTransaction(id: string) {
    const transaction = await this.prisma.costTransaction.findUnique({
      where: { id },
      include: {
        budgetLine: true,
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!transaction) {
      throw new Error('Transaction not found');
    }

    return transaction;
  }

  async deleteTransaction(id: string) {
    const transaction = await this.getTransaction(id);

    // Reverse the budget line amounts
    if (transaction.transactionType === 'ACTUAL') {
      await this.prisma.budgetLineItem.update({
        where: { id: transaction.budgetLineId },
        data: {
          actualAmount: {
            decrement: Number(transaction.amount),
          },
        },
      });
    } else if (transaction.transactionType === 'COMMITTED') {
      await this.prisma.budgetLineItem.update({
        where: { id: transaction.budgetLineId },
        data: {
          committedAmount: {
            decrement: Number(transaction.amount),
          },
        },
      });
    }

    await this.prisma.costTransaction.delete({
      where: { id },
    });

    return { success: true };
  }

  async getBudgetVariance(projectId: string): Promise<BudgetVarianceReport> {
    const budgetLines = await this.prisma.budgetLineItem.findMany({
      where: { projectId },
      include: {
        transactions: true,
      },
    });

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    let totalBudgeted = 0;
    let totalActual = 0;
    let totalCommitted = 0;

    const categoryMap = new Map<BudgetCategory, CategoryVariance>();
    const atRisk: BudgetLineVariance[] = [];

    for (const line of budgetLines) {
      const budgeted = Number(line.budgetedAmount);
      const actual = Number(line.actualAmount);
      const committed = Number(line.committedAmount);
      const remaining = budgeted - actual - committed;
      const variance = budgeted - actual;
      const variancePercent = budgeted > 0 ? (variance / budgeted) * 100 : 0;

      totalBudgeted += budgeted;
      totalActual += actual;
      totalCommitted += committed;

      // Track by category
      const existing = categoryMap.get(line.category);
      if (existing) {
        existing.budgeted += budgeted;
        existing.actual += actual;
        existing.committed += committed;
        existing.remaining += remaining;
      } else {
        categoryMap.set(line.category, {
          category: line.category,
          budgeted,
          actual,
          committed,
          remaining,
          variance,
          variancePercent,
        });
      }

      // Flag items at risk (over budget or within 10% of budget)
      if (variancePercent < 10 || variance < 0) {
        atRisk.push({
          id: line.id,
          name: line.name,
          category: line.category,
          budgeted,
          actual,
          committed,
          remaining,
          variance,
          variancePercent,
        });
      }
    }

    // Calculate category variances
    const byCategory: CategoryVariance[] = [];
    categoryMap.forEach((cat) => {
      cat.variance = cat.budgeted - cat.actual;
      cat.variancePercent = cat.budgeted > 0 ? (cat.variance / cat.budgeted) * 100 : 0;
      byCategory.push(cat);
    });

    const totalRemaining = totalBudgeted - totalActual - totalCommitted;
    const varianceAmount = totalBudgeted - totalActual;
    const variancePercent =
      totalBudgeted > 0 ? (varianceAmount / totalBudgeted) * 100 : 0;

    return {
      projectId,
      totalBudgeted,
      totalActual,
      totalCommitted,
      totalRemaining,
      varianceAmount,
      variancePercent,
      byCategory,
      atRisk,
    };
  }

  async importFromPurchaseOrder(poId: string) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id: poId },
      include: {
        lineItems: true,
        project: {
          select: {
            id: true,
            companyId: true,
          },
        },
      },
    });

    if (!po) {
      throw new Error('Purchase order not found');
    }

    const transactions = [];

    for (const item of po.lineItems) {
      const amount = Number(item.total);

      // Find or create budget line for materials
      let budgetLine = await this.prisma.budgetLineItem.findFirst({
        where: {
          projectId: po.projectId,
          category: 'MATERIALS',
          name: item.description,
        },
      });

      if (!budgetLine) {
        budgetLine = await this.createBudgetLine({
          projectId: po.projectId,
          category: 'MATERIALS',
          name: item.description,
          budgetedAmount: amount,
        });
      }

      // Create committed transaction
      const transaction = await this.addTransaction(
        {
          budgetLineId: budgetLine.id,
          projectId: po.projectId,
          transactionType: 'COMMITTED',
          amount,
          description: `PO ${po.poNumber}: ${item.description}`,
          transactionDate: new Date(),
          referenceType: 'PO',
          referenceId: poId,
        },
        po.createdById
      );

      transactions.push(transaction);
    }

    return transactions;
  }

  async importFromChangeOrder(coId: string) {
    const co = await this.prisma.changeOrder.findUnique({
      where: { id: coId },
      include: {
        lineItems: true,
        project: {
          select: {
            id: true,
            companyId: true,
          },
        },
      },
    });

    if (!co) {
      throw new Error('Change order not found');
    }

    if (co.status !== 'APPROVED' && co.status !== 'IMPLEMENTED') {
      throw new Error('Can only import from approved or implemented change orders');
    }

    const transactions = [];

    for (const item of co.lineItems) {
      const amount = Number(item.total);

      // Find or create budget line
      let budgetLine = await this.prisma.budgetLineItem.findFirst({
        where: {
          projectId: co.projectId,
          name: item.description,
        },
      });

      if (!budgetLine) {
        budgetLine = await this.createBudgetLine({
          projectId: co.projectId,
          category: 'OTHER',
          name: item.description,
          budgetedAmount: amount,
        });
      } else {
        // Update budgeted amount
        await this.updateBudgetLine(budgetLine.id, {
          budgetedAmount: Number(budgetLine.budgetedAmount) + amount,
        });
      }

      // Create adjustment transaction
      const transaction = await this.addTransaction(
        {
          budgetLineId: budgetLine.id,
          projectId: co.projectId,
          transactionType: 'ADJUSTMENT',
          amount,
          description: `CO ${co.coNumber}: ${item.description}`,
          transactionDate: new Date(),
          referenceType: 'CO',
          referenceId: coId,
        },
        co.requestedBy
      );

      transactions.push(transaction);
    }

    return transactions;
  }

  async getBudgetForecast(projectId: string) {
    const variance = await this.getBudgetVariance(projectId);
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: {
        budget: true,
        actualCost: true,
        startDate: true,
        endDate: true,
      },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    const projectedTotal = variance.totalActual + variance.totalCommitted;
    const projectedOverrun = Math.max(0, projectedTotal - variance.totalBudgeted);
    const completionPercent =
      variance.totalBudgeted > 0
        ? (variance.totalActual / variance.totalBudgeted) * 100
        : 0;

    // Calculate burn rate if dates available
    let dailyBurnRate = 0;
    let projectedCompletionDate = null;

    if (project.startDate && project.endDate) {
      const today = new Date();
      const start = new Date(project.startDate);
      const end = new Date(project.endDate);
      const daysElapsed = Math.max(
        1,
        Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
      );
      const totalDays = Math.floor(
        (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
      );

      dailyBurnRate = variance.totalActual / daysElapsed;

      if (dailyBurnRate > 0) {
        const remainingBudget = variance.totalRemaining;
        const daysToComplete = remainingBudget / dailyBurnRate;
        projectedCompletionDate = new Date(
          today.getTime() + daysToComplete * 24 * 60 * 60 * 1000
        );
      }
    }

    return {
      projectId,
      currentBudget: variance.totalBudgeted,
      actualSpent: variance.totalActual,
      committed: variance.totalCommitted,
      projectedTotal,
      projectedOverrun,
      completionPercent: Math.round(completionPercent),
      dailyBurnRate: Math.round(dailyBurnRate),
      projectedCompletionDate,
      riskLevel:
        variance.variancePercent < 10
          ? 'HIGH'
          : variance.variancePercent < 20
            ? 'MEDIUM'
            : 'LOW',
    };
  }
}
