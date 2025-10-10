import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '../../generated/prisma';
import { FinancialOverviewService } from './financial-overview.service';
import { setupTestDatabase, cleanupTestDatabase } from '../../test-helpers/database';
import { createTestCompany, createTestUser, createTestProject } from '../../test-helpers/factories';

describe('FinancialOverviewService', () => {
  let prisma: PrismaClient;
  let service: FinancialOverviewService;
  let testCompany: any;
  let testUser: any;
  let testProject: any;
  let testCustomer: any;
  let testSupplier: any;

  beforeAll(async () => {
    prisma = await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase(prisma);
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    testCompany = await createTestCompany(prisma, {
      name: 'Test Construction Co',
    });
    testUser = await createTestUser(prisma, {
      email: `test-${Date.now()}@test.com`,
      firstName: 'Test',
      lastName: 'User',
      companyId: testCompany.id,
    });
    testCustomer = await prisma.customer.create({
      data: {
        name: 'Test Customer',
        email: 'customer@test.com',
        companyId: testCompany.id,
      },
    });
    testSupplier = await prisma.supplier.create({
      data: {
        name: 'Test Supplier',
        email: 'supplier@test.com',
        companyId: testCompany.id,
      },
    });
    testProject = await createTestProject(prisma, {
      name: 'Test Project',
      companyId: testCompany.id,
      createdById: testUser.id,
      status: 'ACTIVE',
      budget: 100000,
      plannedHours: 500,
    });

    service = new FinancialOverviewService(prisma);
  });

  afterEach(async () => {
    await cleanupTestDatabase(prisma);
  });

  describe('getProjectFinancialOverview', () => {
    it('should calculate complete financial overview', async () => {
      // Create quote
      await prisma.quote.create({
        data: {
          quoteNumber: 'Q-001',
          title: 'Project Quote',
          companyId: testCompany.id,
          customerId: testCustomer.id,
          projectId: testProject.id,
          status: 'ACCEPTED',
          subtotal: 120000,
          taxRate: 0,
          taxAmount: 0,
          total: 120000,
          createdById: testUser.id,
        },
      });

      // Create invoices
      const invoice1 = await prisma.invoice.create({
        data: {
          invoiceNumber: 'INV-001',
          title: 'Invoice 1',
          companyId: testCompany.id,
          customerId: testCustomer.id,
          projectId: testProject.id,
          status: 'PAID',
          subtotal: 50000,
          taxRate: 0,
          taxAmount: 0,
          total: 50000,
          dueDate: new Date('2025-09-30'),
          paidAt: new Date('2025-09-28'),
          createdAt: new Date('2025-09-01'),
          createdById: testUser.id,
        },
      });

      const invoice2 = await prisma.invoice.create({
        data: {
          invoiceNumber: 'INV-002',
          title: 'Invoice',
          companyId: testCompany.id,
          customerId: testCustomer.id,
          projectId: testProject.id,
          status: 'SENT',
          subtotal: 50000,
          taxRate: 0,
          taxAmount: 0,
          total: 50000,
          dueDate: new Date('2025-10-30'),
          createdById: testUser.id,
        },
      });

      // Create expenses
      await prisma.expense.create({
        data: {
          description: 'Materials',
          amount: 15000,
          category: 'MATERIALS',
          date: new Date(),
          projectId: testProject.id,
          userId: testUser.id,
        },
      });

      await prisma.expense.create({
        data: {
          description: 'Equipment rental',
          amount: 5000,
          category: 'EQUIPMENT',
          date: new Date(),
          projectId: testProject.id,
          userId: testUser.id,
        },
      });

      // Create time entries
      await prisma.timeEntry.create({
        data: {
          date: new Date(),
          hours: 40,
          hourlyRate: 50,
          description: 'Week 1 labor',
          projectId: testProject.id,
          userId: testUser.id,
        },
      });

      // Create PO
      await prisma.purchaseOrder.create({
        data: {
          poNumber: 'PO-001',
          projectId: testProject.id,
          supplierId: testSupplier.id,
          status: 'SENT',
          subtotal: 10000,
          tax: 0,
          total: 10000,
          createdById: testUser.id,
        },
      });

      // Create Change Order
      await prisma.changeOrder.create({
        data: {
          coNumber: 'CO-001',
          projectId: testProject.id,
          title: 'Additional work',
          description: 'Extra bathroom',
          reason: 'Client request',
          costImpact: 8000,
          timeImpact: 5,
          status: 'APPROVED',
          requestedBy: testUser.id,
          requestedAt: new Date(),
        },
      });

      const overview = await service.getProjectFinancialOverview(testProject.id);

      // Revenue assertions
      expect(overview.revenue.totalQuoted).toBe(120000);
      expect(overview.revenue.totalInvoiced).toBe(100000);
      expect(overview.revenue.totalPaid).toBe(50000);
      expect(overview.revenue.totalOutstanding).toBe(50000);
      expect(overview.revenue.invoiceCount).toBe(2);
      expect(overview.revenue.paidInvoiceCount).toBe(1);

      // Cost assertions
      expect(overview.costs.totalExpenses).toBe(20000);
      expect(overview.costs.laborCosts).toBe(2000);
      expect(overview.costs.totalPOValue).toBe(10000);
      expect(overview.costs.totalCOValue).toBe(8000);
      expect(overview.costs.materialCosts).toBe(15000);
      expect(overview.costs.equipmentCosts).toBe(5000);

      // Profitability assertions
      expect(overview.profitability.grossProfit).toBe(60000); // 100k - (20k + 2k + 10k + 8k)
      expect(overview.profitability.grossMargin).toBe(60);

      // Cash flow assertions
      expect(overview.cashFlow.cashIn).toBe(50000);
      expect(overview.cashFlow.cashOut).toBe(22000); // expenses + labor
      expect(overview.cashFlow.netCashFlow).toBe(28000);

      // Invoicing metrics
      expect(overview.invoicing.averageDaysToPayment).toBe(27); // Paid 2 days early
      expect(overview.invoicing.averageInvoiceValue).toBe(50000);
      expect(overview.invoicing.largestOutstanding).toBe(50000);

      // Labor metrics
      expect(overview.laborMetrics.totalHoursBudgeted).toBe(500);
      expect(overview.laborMetrics.totalLaborCost).toBe(2000);
    });

    it('should handle projects with no financial data', async () => {
      const overview = await service.getProjectFinancialOverview(testProject.id);

      expect(overview.revenue.totalInvoiced).toBe(0);
      expect(overview.costs.totalExpenses).toBe(0);
      expect(overview.profitability.grossProfit).toBe(0);
      expect(overview.cashFlow.netCashFlow).toBe(0);
    });

    it('should throw error for non-existent project', async () => {
      await expect(
        service.getProjectFinancialOverview('invalid-id')
      ).rejects.toThrow('Project not found');
    });
  });

  describe('getCompanyFinancialOverview', () => {
    it('should aggregate financials across multiple projects', async () => {
      // Project 1
      await prisma.invoice.create({
        data: {
          invoiceNumber: 'INV-001',
          title: 'Invoice',
          companyId: testCompany.id,
          customerId: testCustomer.id,
          projectId: testProject.id,
          status: 'PAID',
          subtotal: 50000,
          taxRate: 0,
          taxAmount: 0,
          total: 50000,
          dueDate: new Date(),
          paidAt: new Date(),
          createdById: testUser.id,
        },
      });

      await prisma.expense.create({
        data: {
          description: 'Materials',
          amount: 20000,
          category: 'MATERIALS',
          date: new Date(),
          projectId: testProject.id,
          userId: testUser.id,
        },
      });

      // Project 2
      const project2 = await createTestProject(prisma, {
        name: 'Test Project 2',
        companyId: testCompany.id,
        createdById: testUser.id,
        status: 'COMPLETED',
      });

      await prisma.invoice.create({
        data: {
          invoiceNumber: 'INV-002',
          title: 'Invoice',
          companyId: testCompany.id,
          customerId: testCustomer.id,
          projectId: project2.id,
          status: 'PAID',
          subtotal: 30000,
          taxRate: 0,
          taxAmount: 0,
          total: 30000,
          dueDate: new Date(),
          paidAt: new Date(),
          createdById: testUser.id,
        },
      });

      await prisma.expense.create({
        data: {
          description: 'Labor',
          amount: 10000,
          category: 'LABOR',
          date: new Date(),
          projectId: project2.id,
          userId: testUser.id,
        },
      });

      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);

      const overview = await service.getCompanyFinancialOverview(
        testCompany.id,
        startDate,
        endDate
      );

      expect(overview.totalRevenue).toBe(80000);
      expect(overview.totalCosts).toBe(30000);
      expect(overview.netProfit).toBe(50000);
      expect(overview.profitMargin).toBe(62.5);
      expect(overview.totalInvoiced).toBe(80000);
      expect(overview.totalPaid).toBe(80000);
      expect(overview.activeProjects).toBe(1);
      expect(overview.completedProjects).toBe(1);
      expect(overview.projectBreakdown).toHaveLength(2);
    });

    it('should filter projects by date range', async () => {
      await prisma.invoice.create({
        data: {
          invoiceNumber: 'INV-001',
          title: 'Invoice',
          companyId: testCompany.id,
          customerId: testCustomer.id,
          projectId: testProject.id,
          status: 'PAID',
          subtotal: 50000,
          taxRate: 0,
          taxAmount: 0,
          total: 50000,
          dueDate: new Date(),
          paidAt: new Date(),
          createdById: testUser.id,
        },
      });

      // Query for future date range (should return no projects)
      const futureStart = new Date();
      futureStart.setFullYear(futureStart.getFullYear() + 1);
      const futureEnd = new Date();
      futureEnd.setFullYear(futureEnd.getFullYear() + 2);

      const overview = await service.getCompanyFinancialOverview(
        testCompany.id,
        futureStart,
        futureEnd
      );

      expect(overview.totalRevenue).toBe(0);
      expect(overview.activeProjects).toBe(0);
      expect(overview.projectBreakdown).toHaveLength(0);
    });
  });

  describe('getProjectCashFlowProjection', () => {
    it('should project cash flow for upcoming months', async () => {
      const today = new Date();
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      // Create invoice due next month
      await prisma.invoice.create({
        data: {
          invoiceNumber: 'INV-001',
          title: 'Invoice',
          customerId: testCustomer.id,
          companyId: testCompany.id,
          projectId: testProject.id,
          status: 'SENT',
          subtotal: 30000,
          taxRate: 0,
          taxAmount: 0,
          total: 30000,
          dueDate: nextMonth,
          createdById: testUser.id,
        },
      });

      // Create PO with delivery next month
      await prisma.purchaseOrder.create({
        data: {
          poNumber: 'PO-001',
          projectId: testProject.id,
          supplierId: testSupplier.id,
          status: 'SENT',
          subtotal: 15000,
          tax: 0,
          total: 15000,
          deliveryDate: nextMonth,
          createdById: testUser.id,
        },
      });

      const projection = await service.getProjectCashFlowProjection(testProject.id, 3);

      expect(projection.projections).toHaveLength(3);

      // Check next month has the expected values
      const nextMonthProjection = projection.projections[1];
      expect(nextMonthProjection.expectedIncome).toBe(30000);
      expect(nextMonthProjection.expectedExpenses).toBe(15000);
      expect(nextMonthProjection.netCashFlow).toBe(15000);
    });

    it('should handle projects with no scheduled cash flow', async () => {
      const projection = await service.getProjectCashFlowProjection(testProject.id, 6);

      expect(projection.projections).toHaveLength(6);

      // All months should have zero cash flow
      projection.projections.forEach((month) => {
        expect(month.expectedIncome).toBe(0);
        expect(month.expectedExpenses).toBe(0);
        expect(month.netCashFlow).toBe(0);
        expect(month.cumulativeCashFlow).toBe(0);
      });
    });

    it('should calculate cumulative cash flow correctly', async () => {
      const month1 = new Date();
      month1.setMonth(month1.getMonth() + 1);
      const month2 = new Date();
      month2.setMonth(month2.getMonth() + 2);

      await prisma.invoice.create({
        data: {
          invoiceNumber: 'INV-001',
          title: 'Invoice',
          customerId: testCustomer.id,
          companyId: testCompany.id,
          projectId: testProject.id,
          status: 'SENT',
          subtotal: 20000,
          taxRate: 0,
          taxAmount: 0,
          total: 20000,
          dueDate: month1,
          createdById: testUser.id,
        },
      });

      await prisma.invoice.create({
        data: {
          invoiceNumber: 'INV-002',
          title: 'Invoice',
          customerId: testCustomer.id,
          companyId: testCompany.id,
          projectId: testProject.id,
          status: 'SENT',
          subtotal: 30000,
          taxRate: 0,
          taxAmount: 0,
          total: 30000,
          dueDate: month2,
          createdById: testUser.id,
        },
      });

      const projection = await service.getProjectCashFlowProjection(testProject.id, 3);

      // Month 1: +20000, cumulative: 20000
      // Month 2: +30000, cumulative: 50000
      expect(projection.projections[1].cumulativeCashFlow).toBe(20000);
      expect(projection.projections[2].cumulativeCashFlow).toBe(50000);
    });

    it('should throw error for non-existent project', async () => {
      await expect(
        service.getProjectCashFlowProjection('invalid-id', 6)
      ).rejects.toThrow('Project not found');
    });
  });

  describe('revenue calculations', () => {
    it('should identify overdue invoices', async () => {
      const pastDate = new Date();
      pastDate.setMonth(pastDate.getMonth() - 2);

      await prisma.invoice.create({
        data: {
          invoiceNumber: 'INV-001',
          title: 'Invoice',
          customerId: testCustomer.id,
          companyId: testCompany.id,
          projectId: testProject.id,
          status: 'SENT',
          subtotal: 10000,
          taxRate: 0,
          taxAmount: 0,
          total: 10000,
          dueDate: pastDate,
          createdById: testUser.id,
        },
      });

      const overview = await service.getProjectFinancialOverview(testProject.id);

      expect(overview.revenue.overdueInvoiceCount).toBe(1);
    });

    it('should calculate invoicing metrics correctly', async () => {
      const issuedDate = new Date('2025-09-01');
      const dueDate = new Date('2025-09-30');
      const paidDate = new Date('2025-09-25'); // Paid 5 days early

      await prisma.invoice.create({
        data: {
          invoiceNumber: 'INV-001',
          title: 'Invoice',
          companyId: testCompany.id,
          customerId: testCustomer.id,
          projectId: testProject.id,
          status: 'PAID',
          subtotal: 25000,
          taxRate: 0,
          taxAmount: 0,
          total: 25000,
          dueDate: dueDate,
          paidAt: paidDate,
          createdAt: issuedDate,
          createdById: testUser.id,
        },
      });

      const overview = await service.getProjectFinancialOverview(testProject.id);

      expect(overview.invoicing.averageDaysToPayment).toBe(24);
      expect(overview.invoicing.percentPaidOnTime).toBe(100);
    });
  });

  describe('budget integration', () => {
    it('should include budget metrics when budget lines exist', async () => {
      await prisma.budgetLineItem.create({
        data: {
          projectId: testProject.id,
          category: 'LABOR',
          name: 'Construction Labor',
          budgetedAmount: 50000,
          actualAmount: 20000,
          committedAmount: 15000,
        },
      });

      const overview = await service.getProjectFinancialOverview(testProject.id);

      expect(overview.budget.totalBudgeted).toBe(50000);
      expect(overview.budget.totalActual).toBe(20000);
      expect(overview.budget.totalCommitted).toBe(15000);
      expect(overview.budget.remaining).toBe(15000);
      expect(overview.budget.completionPercent).toBe(40);
    });

    it('should calculate budget variance', async () => {
      await prisma.budgetLineItem.create({
        data: {
          projectId: testProject.id,
          category: 'MATERIALS',
          name: 'Materials',
          budgetedAmount: 30000,
          actualAmount: 25000,
        },
      });

      const overview = await service.getProjectFinancialOverview(testProject.id);

      expect(overview.budget.variance).toBe(5000);
      expect(overview.budget.variancePercent).toBe(17); // (5000/30000)*100 = 16.67, rounded to 17
    });
  });
});
