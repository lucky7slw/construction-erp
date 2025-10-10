import { PrismaClient } from '../../generated/prisma';

export type FinancialOverview = {
  projectId: string;
  projectName: string;
  revenue: RevenueMetrics;
  costs: CostMetrics;
  profitability: ProfitabilityMetrics;
  cashFlow: CashFlowMetrics;
  invoicing: InvoicingMetrics;
  budget: BudgetMetrics;
  laborMetrics: LaborMetrics;
};

export type RevenueMetrics = {
  totalQuoted: number;
  totalInvoiced: number;
  totalPaid: number;
  totalOutstanding: number;
  invoiceCount: number;
  paidInvoiceCount: number;
  overdueInvoiceCount: number;
};

export type CostMetrics = {
  totalExpenses: number;
  totalPOValue: number;
  totalCOValue: number;
  laborCosts: number;
  materialCosts: number;
  equipmentCosts: number;
  subcontractorCosts: number;
  otherCosts: number;
};

export type ProfitabilityMetrics = {
  grossProfit: number;
  grossMargin: number; // percentage
  netProfit: number;
  netMargin: number; // percentage
  estimatedFinalProfit: number;
  estimatedFinalMargin: number;
};

export type CashFlowMetrics = {
  cashIn: number;
  cashOut: number;
  netCashFlow: number;
  projectedCashFlow: number;
  daysOfCash: number;
};

export type InvoicingMetrics = {
  averageDaysToPayment: number;
  averageInvoiceValue: number;
  largestOutstanding: number;
  percentPaidOnTime: number;
};

export type BudgetMetrics = {
  totalBudgeted: number;
  totalActual: number;
  totalCommitted: number;
  remaining: number;
  variance: number;
  variancePercent: number;
  completionPercent: number;
};

export type LaborMetrics = {
  totalHoursBudgeted: number;
  totalHoursActual: number;
  totalLaborCost: number;
  averageHourlyRate: number;
  laborEfficiency: number; // percent
};

export type CompanyFinancialOverview = {
  companyId: string;
  period: {
    startDate: Date;
    endDate: Date;
  };
  totalRevenue: number;
  totalCosts: number;
  netProfit: number;
  profitMargin: number;
  activeProjects: number;
  completedProjects: number;
  totalInvoiced: number;
  totalPaid: number;
  totalOutstanding: number;
  projectBreakdown: {
    projectId: string;
    projectName: string;
    revenue: number;
    costs: number;
    profit: number;
    margin: number;
  }[];
};

export class FinancialOverviewService {
  constructor(private prisma: PrismaClient) {}

  async getProjectFinancialOverview(projectId: string): Promise<FinancialOverview> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        invoices: true,
        expenses: true,
        timeEntries: {
          include: {
            user: true,
          },
        },
        purchaseOrders: {
          include: {
            lineItems: true,
          },
        },
        changeOrders: {
          include: {
            lineItems: true,
          },
        },
        budgetLines: {
          include: {
            transactions: true,
          },
        },
        quotes: true,
      },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    // Calculate Revenue
    const revenue = this.calculateRevenue(project);

    // Calculate Costs
    const costs = this.calculateCosts(project);

    // Calculate Profitability
    const profitability = this.calculateProfitability(revenue, costs);

    // Calculate Cash Flow
    const cashFlow = this.calculateCashFlow(revenue, costs);

    // Calculate Invoicing Metrics
    const invoicing = this.calculateInvoicingMetrics(project.invoices);

    // Calculate Budget Metrics
    const budget = this.calculateBudgetMetrics(project.budgetLines);

    // Calculate Labor Metrics
    const laborMetrics = this.calculateLaborMetrics(project);

    return {
      projectId: project.id,
      projectName: project.name,
      revenue,
      costs,
      profitability,
      cashFlow,
      invoicing,
      budget,
      laborMetrics,
    };
  }

  private calculateRevenue(project: any): RevenueMetrics {
    const totalQuoted = project.quotes
      .filter((q: any) => q.status === 'ACCEPTED')
      .reduce((sum: number, q: any) => sum + Number(q.total), 0);

    const totalInvoiced = project.invoices.reduce(
      (sum: number, inv: any) => sum + Number(inv.total),
      0
    );

    const totalPaid = project.invoices
      .filter((inv: any) => inv.status === 'PAID')
      .reduce((sum: number, inv: any) => sum + Number(inv.total), 0);

    const totalOutstanding = totalInvoiced - totalPaid;

    const invoiceCount = project.invoices.length;
    const paidInvoiceCount = project.invoices.filter(
      (inv: any) => inv.status === 'PAID'
    ).length;

    const today = new Date();
    const overdueInvoiceCount = project.invoices.filter((inv: any) => {
      return inv.status !== 'PAID' && inv.dueDate && new Date(inv.dueDate) < today;
    }).length;

    return {
      totalQuoted,
      totalInvoiced,
      totalPaid,
      totalOutstanding,
      invoiceCount,
      paidInvoiceCount,
      overdueInvoiceCount,
    };
  }

  private calculateCosts(project: any): CostMetrics {
    const totalExpenses = project.expenses.reduce(
      (sum: number, exp: any) => sum + Number(exp.amount),
      0
    );

    const totalPOValue = project.purchaseOrders.reduce(
      (sum: number, po: any) => sum + Number(po.total),
      0
    );

    const approvedCOs = project.changeOrders.filter(
      (co: any) => co.status === 'APPROVED' || co.status === 'IMPLEMENTED'
    );
    const totalCOValue = approvedCOs.reduce(
      (sum: number, co: any) => sum + Number(co.costImpact),
      0
    );

    // Calculate labor costs from time entries
    const laborCosts = project.timeEntries.reduce(
      (sum: number, entry: any) => {
        const hours = Number(entry.hours || 0);
        const rate = Number(entry.hourlyRate || 0);
        return sum + (hours * rate);
      },
      0
    );

    // Categorize expenses
    const materialCosts = project.expenses
      .filter((exp: any) => exp.category === 'MATERIALS')
      .reduce((sum: number, exp: any) => sum + Number(exp.amount), 0);

    const equipmentCosts = project.expenses
      .filter((exp: any) => exp.category === 'EQUIPMENT')
      .reduce((sum: number, exp: any) => sum + Number(exp.amount), 0);

    const subcontractorCosts = project.expenses
      .filter((exp: any) => exp.category === 'SUBCONTRACTORS')
      .reduce((sum: number, exp: any) => sum + Number(exp.amount), 0);

    const otherCosts = project.expenses
      .filter(
        (exp: any) =>
          exp.category !== 'MATERIALS' &&
          exp.category !== 'EQUIPMENT' &&
          exp.category !== 'SUBCONTRACTORS'
      )
      .reduce((sum: number, exp: any) => sum + Number(exp.amount), 0);

    return {
      totalExpenses,
      totalPOValue,
      totalCOValue,
      laborCosts,
      materialCosts,
      equipmentCosts,
      subcontractorCosts,
      otherCosts,
    };
  }

  private calculateProfitability(
    revenue: RevenueMetrics,
    costs: CostMetrics
  ): ProfitabilityMetrics {
    const totalRevenue = revenue.totalInvoiced;
    const totalCosts =
      costs.totalExpenses + costs.laborCosts + costs.totalPOValue + costs.totalCOValue;

    const grossProfit = totalRevenue - totalCosts;
    const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    // Net profit is same as gross for now (no overhead allocation)
    const netProfit = grossProfit;
    const netMargin = grossMargin;

    // Estimated final includes outstanding invoices
    const estimatedFinalRevenue = revenue.totalQuoted || totalRevenue;
    const estimatedFinalProfit = estimatedFinalRevenue - totalCosts;
    const estimatedFinalMargin =
      estimatedFinalRevenue > 0
        ? (estimatedFinalProfit / estimatedFinalRevenue) * 100
        : 0;

    return {
      grossProfit,
      grossMargin,
      netProfit,
      netMargin,
      estimatedFinalProfit,
      estimatedFinalMargin,
    };
  }

  private calculateCashFlow(
    revenue: RevenueMetrics,
    costs: CostMetrics
  ): CashFlowMetrics {
    const cashIn = revenue.totalPaid;
    const cashOut = costs.totalExpenses + costs.laborCosts;
    const netCashFlow = cashIn - cashOut;

    // Projected includes outstanding invoices and committed costs
    const projectedCashFlow =
      revenue.totalInvoiced - (cashOut + costs.totalPOValue + costs.totalCOValue);

    // Days of cash (rough estimate - how many days can operate with current cash)
    const dailyCashBurn = cashOut > 0 ? cashOut / 30 : 0;
    const daysOfCash = dailyCashBurn > 0 ? Math.floor(netCashFlow / dailyCashBurn) : 0;

    return {
      cashIn,
      cashOut,
      netCashFlow,
      projectedCashFlow,
      daysOfCash,
    };
  }

  private calculateInvoicingMetrics(invoices: any[]): InvoicingMetrics {
    const paidInvoices = invoices.filter((inv) => inv.status === 'PAID');

    let totalDaysToPayment = 0;
    for (const inv of paidInvoices) {
      if (inv.paidAt && inv.createdAt) {
        const days = Math.floor(
          (new Date(inv.paidAt).getTime() - new Date(inv.createdAt).getTime()) /
            (1000 * 60 * 60 * 24)
        );
        totalDaysToPayment += days;
      }
    }

    const averageDaysToPayment =
      paidInvoices.length > 0 ? Math.round(totalDaysToPayment / paidInvoices.length) : 0;

    const averageInvoiceValue =
      invoices.length > 0
        ? invoices.reduce((sum, inv) => sum + Number(inv.total), 0) / invoices.length
        : 0;

    const largestOutstanding = invoices
      .filter((inv) => inv.status !== 'PAID')
      .reduce((max, inv) => Math.max(max, Number(inv.total)), 0);

    // Calculate percent paid on time (within 30 days of due date)
    const invoicesWithDueDate = paidInvoices.filter((inv) => inv.dueDate && inv.paidAt);
    let paidOnTime = 0;
    for (const inv of invoicesWithDueDate) {
      const daysToPay = Math.floor(
        (new Date(inv.paidAt).getTime() - new Date(inv.dueDate).getTime()) /
          (1000 * 60 * 60 * 24)
      );
      if (daysToPay <= 0) {
        paidOnTime++;
      }
    }

    const percentPaidOnTime =
      invoicesWithDueDate.length > 0
        ? Math.round((paidOnTime / invoicesWithDueDate.length) * 100)
        : 0;

    return {
      averageDaysToPayment,
      averageInvoiceValue: Math.round(averageInvoiceValue),
      largestOutstanding: Math.round(largestOutstanding),
      percentPaidOnTime,
    };
  }

  private calculateBudgetMetrics(budgetLines: any[]): BudgetMetrics {
    let totalBudgeted = 0;
    let totalActual = 0;
    let totalCommitted = 0;

    for (const line of budgetLines) {
      totalBudgeted += Number(line.budgetedAmount);
      totalActual += Number(line.actualAmount);
      totalCommitted += Number(line.committedAmount);
    }

    const remaining = totalBudgeted - totalActual - totalCommitted;
    const variance = totalBudgeted - totalActual;
    const variancePercent = totalBudgeted > 0 ? (variance / totalBudgeted) * 100 : 0;
    const completionPercent =
      totalBudgeted > 0 ? (totalActual / totalBudgeted) * 100 : 0;

    return {
      totalBudgeted,
      totalActual,
      totalCommitted,
      remaining,
      variance,
      variancePercent: Math.round(variancePercent),
      completionPercent: Math.round(completionPercent),
    };
  }

  private calculateLaborMetrics(project: any): LaborMetrics {
    const totalHoursBudgeted = Number(project.plannedHours || 0);
    const totalHoursActual = Number(project.actualHours || 0);

    const totalLaborCost = project.timeEntries.reduce(
      (sum: number, entry: any) => {
        const hours = Number(entry.hours || 0);
        const rate = Number(entry.hourlyRate || 0);
        return sum + (hours * rate);
      },
      0
    );

    const averageHourlyRate =
      totalHoursActual > 0 ? totalLaborCost / totalHoursActual : 0;

    const laborEfficiency =
      totalHoursBudgeted > 0 ? (totalHoursBudgeted / totalHoursActual) * 100 : 0;

    return {
      totalHoursBudgeted,
      totalHoursActual,
      totalLaborCost,
      averageHourlyRate: Math.round(averageHourlyRate * 100) / 100,
      laborEfficiency: Math.round(laborEfficiency),
    };
  }

  async getCompanyFinancialOverview(
    companyId: string,
    startDate: Date,
    endDate: Date
  ): Promise<CompanyFinancialOverview> {
    const projects = await this.prisma.project.findMany({
      where: {
        companyId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        invoices: true,
        expenses: true,
        timeEntries: true,
        quotes: true,
        purchaseOrders: true,
        changeOrders: true,
        budgetLines: true,
      },
    });

    let totalRevenue = 0;
    let totalCosts = 0;
    let totalInvoiced = 0;
    let totalPaid = 0;
    let totalOutstanding = 0;
    let activeProjects = 0;
    let completedProjects = 0;

    const projectBreakdown = [];

    for (const project of projects) {
      const revenue = this.calculateRevenue(project);
      const costs = this.calculateCosts(project);
      const profitability = this.calculateProfitability(revenue, costs);

      totalRevenue += revenue.totalInvoiced;
      totalCosts += costs.totalExpenses + costs.laborCosts + costs.totalPOValue;
      totalInvoiced += revenue.totalInvoiced;
      totalPaid += revenue.totalPaid;
      totalOutstanding += revenue.totalOutstanding;

      if (project.status === 'ACTIVE') activeProjects++;
      if (project.status === 'COMPLETED') completedProjects++;

      projectBreakdown.push({
        projectId: project.id,
        projectName: project.name,
        revenue: revenue.totalInvoiced,
        costs: costs.totalExpenses + costs.laborCosts + costs.totalPOValue,
        profit: profitability.netProfit,
        margin: profitability.netMargin,
      });
    }

    const netProfit = totalRevenue - totalCosts;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    return {
      companyId,
      period: {
        startDate,
        endDate,
      },
      totalRevenue,
      totalCosts,
      netProfit,
      profitMargin: Math.round(profitMargin * 100) / 100,
      activeProjects,
      completedProjects,
      totalInvoiced,
      totalPaid,
      totalOutstanding,
      projectBreakdown,
    };
  }

  async getProjectCashFlowProjection(
    projectId: string,
    months: number = 6
  ): Promise<{
    projections: {
      month: string;
      expectedIncome: number;
      expectedExpenses: number;
      netCashFlow: number;
      cumulativeCashFlow: number;
    }[];
  }> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        invoices: true,
        purchaseOrders: true,
        budgetLines: {
          include: {
            transactions: true,
          },
        },
      },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    const projections = [];
    let cumulativeCashFlow = 0;

    for (let i = 0; i < months; i++) {
      const targetDate = new Date();
      targetDate.setMonth(targetDate.getMonth() + i);
      const monthKey = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`;

      // Expected income from invoices due this month
      const expectedIncome = project.invoices
        .filter((inv) => {
          if (!inv.dueDate) return false;
          const dueDate = new Date(inv.dueDate);
          return (
            dueDate.getFullYear() === targetDate.getFullYear() &&
            dueDate.getMonth() === targetDate.getMonth() &&
            inv.status !== 'PAID'
          );
        })
        .reduce((sum, inv) => sum + Number(inv.total), 0);

      // Expected expenses from POs and budget
      const expectedExpenses = project.purchaseOrders
        .filter((po) => {
          if (!po.deliveryDate) return false;
          const deliveryDate = new Date(po.deliveryDate);
          return (
            deliveryDate.getFullYear() === targetDate.getFullYear() &&
            deliveryDate.getMonth() === targetDate.getMonth() &&
            (po.status === 'SENT' || po.status === 'ACKNOWLEDGED')
          );
        })
        .reduce((sum, po) => sum + Number(po.total), 0);

      const netCashFlow = expectedIncome - expectedExpenses;
      cumulativeCashFlow += netCashFlow;

      projections.push({
        month: monthKey,
        expectedIncome: Math.round(expectedIncome),
        expectedExpenses: Math.round(expectedExpenses),
        netCashFlow: Math.round(netCashFlow),
        cumulativeCashFlow: Math.round(cumulativeCashFlow),
      });
    }

    return { projections };
  }
}
