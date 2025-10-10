import { PrismaClient, BudgetCategory } from '../../generated/prisma';

// ============================================================================
// INPUT TYPES
// ============================================================================

type BudgetLineItemCreateInput = {
  projectId: string;
  category: BudgetCategory;
  name: string;
  description?: string;
  costCode?: string;
  budgetedAmount: number;
  notes?: string;
};

type CostTransactionInput = {
  budgetLineId: string;
  projectId: string;
  transactionType: 'ACTUAL' | 'COMMITTED' | 'ADJUSTMENT';
  amount: number;
  description: string;
  transactionDate: Date;
  referenceType?: string;
  referenceId?: string;
};

// ============================================================================
// SERVICE
// ============================================================================

export class BudgetService {
  constructor(private prisma: PrismaClient) {}

  // ========================================
  // BUDGET LINE ITEMS
  // ========================================

  async createBudgetLine(
    input: BudgetLineItemCreateInput
  ): Promise<any> {
    return this.prisma.budgetLineItem.create({
      data: {
        projectId: input.projectId,
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
  }

  async getBudgetLine(budgetLineId: string): Promise<any> {
    return this.prisma.budgetLineItem.findUniqueOrThrow({
      where: { id: budgetLineId },
      include: {
        transactions: {
          orderBy: { transactionDate: 'desc' },
        },
      },
    });
  }

  async listBudgetLines(
    projectId: string,
    filters?: {
      category?: BudgetCategory;
      costCode?: string;
    }
  ): Promise<any[]> {
    return this.prisma.budgetLineItem.findMany({
      where: {
        projectId,
        ...(filters?.category && { category: filters.category }),
        ...(filters?.costCode && { costCode: filters.costCode }),
      },
      include: {
        _count: {
          select: { transactions: true },
        },
      },
      orderBy: [
        { category: 'asc' },
        { name: 'asc' },
      ],
    });
  }

  async updateBudgetLine(
    budgetLineId: string,
    updates: Partial<BudgetLineItemCreateInput>
  ): Promise<any> {
    return this.prisma.budgetLineItem.update({
      where: { id: budgetLineId },
      data: updates,
      include: {
        transactions: true,
      },
    });
  }

  async deleteBudgetLine(budgetLineId: string): Promise<void> {
    await this.prisma.budgetLineItem.delete({
      where: { id: budgetLineId },
    });
  }

  // ========================================
  // COST TRANSACTIONS
  // ========================================

  async recordTransaction(
    input: CostTransactionInput,
    createdById: string
  ): Promise<any> {
    const transaction = await this.prisma.costTransaction.create({
      data: {
        budgetLineId: input.budgetLineId,
        projectId: input.projectId,
        transactionType: input.transactionType,
        amount: input.amount,
        description: input.description,
        transactionDate: input.transactionDate,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        createdById,
      },
      include: {
        budgetLine: true,
      },
    });

    // Update budget line amounts based on transaction type
    await this.updateBudgetLineAmounts(input.budgetLineId);

    return transaction;
  }

  async getTransaction(transactionId: string): Promise<any> {
    return this.prisma.costTransaction.findUniqueOrThrow({
      where: { id: transactionId },
      include: {
        budgetLine: true,
        createdBy: true,
      },
    });
  }

  async listTransactions(
    projectId: string,
    filters?: {
      budgetLineId?: string;
      transactionType?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<any[]> {
    return this.prisma.costTransaction.findMany({
      where: {
        projectId,
        ...(filters?.budgetLineId && { budgetLineId: filters.budgetLineId }),
        ...(filters?.transactionType && { transactionType: filters.transactionType }),
        ...(filters?.startDate || filters?.endDate ? {
          transactionDate: {
            ...(filters.startDate && { gte: filters.startDate }),
            ...(filters.endDate && { lte: filters.endDate }),
          },
        } : {}),
      },
      include: {
        budgetLine: true,
        createdBy: true,
      },
      orderBy: { transactionDate: 'desc' },
    });
  }

  async deleteTransaction(transactionId: string): Promise<void> {
    const transaction = await this.prisma.costTransaction.findUniqueOrThrow({
      where: { id: transactionId },
    });

    await this.prisma.costTransaction.delete({
      where: { id: transactionId },
    });

    await this.updateBudgetLineAmounts(transaction.budgetLineId);
  }

  private async updateBudgetLineAmounts(budgetLineId: string): Promise<void> {
    const budgetLine = await this.prisma.budgetLineItem.findUniqueOrThrow({
      where: { id: budgetLineId },
      include: { transactions: true },
    });

    const actualAmount = budgetLine.transactions
      .filter((t) => t.transactionType === 'ACTUAL' || t.transactionType === 'ADJUSTMENT')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const committedAmount = budgetLine.transactions
      .filter((t) => t.transactionType === 'COMMITTED')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    await this.prisma.budgetLineItem.update({
      where: { id: budgetLineId },
      data: {
        actualAmount,
        committedAmount,
      },
    });
  }

  // ========================================
  // BUDGET ANALYTICS
  // ========================================

  async getProjectBudgetSummary(projectId: string): Promise<any> {
    const budgetLines = await this.prisma.budgetLineItem.findMany({
      where: { projectId },
      include: { transactions: true },
    });

    const totalBudgeted = budgetLines.reduce(
      (sum, line) => sum + Number(line.budgetedAmount),
      0
    );

    const totalActual = budgetLines.reduce(
      (sum, line) => sum + Number(line.actualAmount),
      0
    );

    const totalCommitted = budgetLines.reduce(
      (sum, line) => sum + Number(line.committedAmount),
      0
    );

    const totalRemaining = totalBudgeted - totalActual - totalCommitted;
    const percentSpent = totalBudgeted > 0 ? (totalActual / totalBudgeted) * 100 : 0;
    const percentCommitted = totalBudgeted > 0 ? (totalCommitted / totalBudgeted) * 100 : 0;

    const byCategory = budgetLines.reduce((acc, line) => {
      if (!acc[line.category]) {
        acc[line.category] = {
          category: line.category,
          budgeted: 0,
          actual: 0,
          committed: 0,
          remaining: 0,
        };
      }

      const budgeted = Number(line.budgetedAmount);
      const actual = Number(line.actualAmount);
      const committed = Number(line.committedAmount);

      acc[line.category].budgeted += budgeted;
      acc[line.category].actual += actual;
      acc[line.category].committed += committed;
      acc[line.category].remaining += budgeted - actual - committed;

      return acc;
    }, {} as Record<string, any>);

    return {
      totalBudgeted,
      totalActual,
      totalCommitted,
      totalRemaining,
      percentSpent: Math.round(percentSpent * 100) / 100,
      percentCommitted: Math.round(percentCommitted * 100) / 100,
      byCategory: Object.values(byCategory),
    };
  }

  async getBudgetVariances(projectId: string): Promise<any[]> {
    const budgetLines = await this.prisma.budgetLineItem.findMany({
      where: { projectId },
    });

    return budgetLines
      .map((line) => {
        const budgeted = Number(line.budgetedAmount);
        const actual = Number(line.actualAmount);
        const committed = Number(line.committedAmount);
        const variance = budgeted - actual - committed;
        const percentVariance = budgeted > 0 ? (variance / budgeted) * 100 : 0;

        return {
          budgetLineId: line.id,
          name: line.name,
          category: line.category,
          budgeted,
          actual,
          committed,
          variance,
          percentVariance: Math.round(percentVariance * 100) / 100,
          status: variance < 0 ? 'OVER_BUDGET' : variance === 0 ? 'ON_BUDGET' : 'UNDER_BUDGET',
        };
      })
      .filter((v) => Math.abs(v.variance) > 0.01) // Only show items with variance
      .sort((a, b) => a.variance - b.variance); // Worst variances first
  }

  async getOverBudgetItems(projectId: string): Promise<any[]> {
    const budgetLines = await this.prisma.budgetLineItem.findMany({
      where: { projectId },
    });

    return budgetLines
      .map((line) => {
        const budgeted = Number(line.budgetedAmount);
        const actual = Number(line.actualAmount);
        const committed = Number(line.committedAmount);
        const total = actual + committed;
        const overAmount = total - budgeted;

        return {
          budgetLineId: line.id,
          name: line.name,
          category: line.category,
          costCode: line.costCode,
          budgeted,
          actual,
          committed,
          total,
          overAmount,
        };
      })
      .filter((item) => item.overAmount > 0.01) // Only items over budget
      .sort((a, b) => b.overAmount - a.overAmount); // Worst first
  }

  async getCashFlowProjection(
    projectId: string,
    startDate: Date,
    endDate: Date
  ): Promise<any[]> {
    const transactions = await this.prisma.costTransaction.findMany({
      where: {
        projectId,
        transactionDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        budgetLine: true,
      },
      orderBy: { transactionDate: 'asc' },
    });

    // Group by month
    const byMonth = transactions.reduce((acc, transaction) => {
      const monthKey = transaction.transactionDate.toISOString().substring(0, 7); // YYYY-MM

      if (!acc[monthKey]) {
        acc[monthKey] = {
          month: monthKey,
          actual: 0,
          committed: 0,
          total: 0,
          transactions: 0,
        };
      }

      const amount = Number(transaction.amount);
      if (transaction.transactionType === 'ACTUAL' || transaction.transactionType === 'ADJUSTMENT') {
        acc[monthKey].actual += amount;
      } else if (transaction.transactionType === 'COMMITTED') {
        acc[monthKey].committed += amount;
      }

      acc[monthKey].total += amount;
      acc[monthKey].transactions++;

      return acc;
    }, {} as Record<string, any>);

    return Object.values(byMonth).sort((a, b) => a.month.localeCompare(b.month));
  }

  async getBudgetByCategory(projectId: string): Promise<any[]> {
    const budgetLines = await this.prisma.budgetLineItem.findMany({
      where: { projectId },
    });

    const byCategory = budgetLines.reduce((acc, line) => {
      if (!acc[line.category]) {
        acc[line.category] = {
          category: line.category,
          budgeted: 0,
          actual: 0,
          committed: 0,
          remaining: 0,
          lineCount: 0,
        };
      }

      const budgeted = Number(line.budgetedAmount);
      const actual = Number(line.actualAmount);
      const committed = Number(line.committedAmount);

      acc[line.category].budgeted += budgeted;
      acc[line.category].actual += actual;
      acc[line.category].committed += committed;
      acc[line.category].remaining += budgeted - actual - committed;
      acc[line.category].lineCount++;

      return acc;
    }, {} as Record<string, any>);

    return Object.values(byCategory).sort((a, b) => b.budgeted - a.budgeted);
  }

  async getBudgetByCostCode(projectId: string): Promise<any[]> {
    const budgetLines = await this.prisma.budgetLineItem.findMany({
      where: { projectId },
    });

    const byCostCode = budgetLines
      .filter((line) => line.costCode) // Only include lines with cost codes
      .reduce((acc, line) => {
        const code = line.costCode!;

        if (!acc[code]) {
          acc[code] = {
            costCode: code,
            budgeted: 0,
            actual: 0,
            committed: 0,
            remaining: 0,
            lineCount: 0,
          };
        }

        const budgeted = Number(line.budgetedAmount);
        const actual = Number(line.actualAmount);
        const committed = Number(line.committedAmount);

        acc[code].budgeted += budgeted;
        acc[code].actual += actual;
        acc[code].committed += committed;
        acc[code].remaining += budgeted - actual - committed;
        acc[code].lineCount++;

        return acc;
      }, {} as Record<string, any>);

    return Object.values(byCostCode).sort((a, b) => b.budgeted - a.budgeted);
  }

  async exportBudgetToCSV(projectId: string): Promise<string> {
    const budgetLines = await this.prisma.budgetLineItem.findMany({
      where: { projectId },
      orderBy: [
        { category: 'asc' },
        { name: 'asc' },
      ],
    });

    let csv = 'Category,Cost Code,Name,Description,Budgeted,Actual,Committed,Remaining,Variance %\n';

    for (const line of budgetLines) {
      const budgeted = Number(line.budgetedAmount);
      const actual = Number(line.actualAmount);
      const committed = Number(line.committedAmount);
      const remaining = budgeted - actual - committed;
      const variancePercent = budgeted > 0 ? ((remaining / budgeted) * 100).toFixed(2) : '0';

      const row = [
        line.category,
        line.costCode || '',
        line.name,
        line.description || '',
        budgeted.toFixed(2),
        actual.toFixed(2),
        committed.toFixed(2),
        remaining.toFixed(2),
        variancePercent,
      ];

      csv += row.map(v => `"${v}"`).join(',') + '\n';
    }

    return csv;
  }
}
