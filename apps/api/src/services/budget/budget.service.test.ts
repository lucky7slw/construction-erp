import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { PrismaClient } from '../../generated/prisma';
import { setupTestDatabase, cleanupTestDatabase } from '../../test-helpers/database';
import { BudgetService } from './budget.service';

describe('BudgetService', () => {
  let prisma: PrismaClient;
  let service: BudgetService;
  let testUser: any;
  let testCompany: any;
  let testProject: any;

  beforeAll(async () => {
    prisma = await setupTestDatabase();
    service = new BudgetService(prisma);

    await cleanupTestDatabase(prisma);

    testCompany = await prisma.company.create({
      data: {
        name: 'Test Construction Co',
        email: 'test@construction.com',
        phone: '555-0100',
      },
    });

    testUser = await prisma.user.create({
      data: {
        email: 'budget@test.com',
        password: 'hashedpassword',
        firstName: 'Budget',
        lastName: 'Tester',
      },
    });

    await prisma.companyUser.create({
      data: {
        userId: testUser.id,
        companyId: testCompany.id,
        isOwner: true,
      },
    });

    testProject = await prisma.project.create({
      data: {
        name: 'Budget Test Project',
        companyId: testCompany.id,
        createdById: testUser.id,
        status: 'ACTIVE',
        budget: 500000,
      },
    });
  });

  afterEach(async () => {
    await prisma.costTransaction.deleteMany({});
    await prisma.budgetLineItem.deleteMany({});
  });

  describe('createBudgetLine', () => {
    it('should create budget line with initial values', async () => {
      const budgetLine = await service.createBudgetLine({
        projectId: testProject.id,
        category: 'LABOR',
        name: 'Framing Labor',
        description: 'Labor costs for framing work',
        costCode: 'LAB-001',
        budgetedAmount: 50000,
        notes: 'Includes 3 carpenters for 2 weeks',
      });

      expect(budgetLine.category).toBe('LABOR');
      expect(budgetLine.name).toBe('Framing Labor');
      expect(Number(budgetLine.budgetedAmount)).toBe(50000);
      expect(Number(budgetLine.actualAmount)).toBe(0);
      expect(Number(budgetLine.committedAmount)).toBe(0);
      expect(budgetLine.costCode).toBe('LAB-001');
    });

    it('should create budget line without optional fields', async () => {
      const budgetLine = await service.createBudgetLine({
        projectId: testProject.id,
        category: 'MATERIALS',
        name: 'Lumber',
        budgetedAmount: 25000,
      });

      expect(budgetLine.category).toBe('MATERIALS');
      expect(budgetLine.description).toBeNull();
      expect(budgetLine.costCode).toBeNull();
      expect(budgetLine.notes).toBeNull();
    });
  });

  describe('recordTransaction', () => {
    it('should record ACTUAL transaction and update budget line', async () => {
      const budgetLine = await service.createBudgetLine({
        projectId: testProject.id,
        category: 'MATERIALS',
        name: 'Concrete',
        budgetedAmount: 30000,
      });

      await service.recordTransaction(
        {
          budgetLineId: budgetLine.id,
          projectId: testProject.id,
          transactionType: 'ACTUAL',
          amount: 5000,
          description: 'Concrete delivery',
          transactionDate: new Date('2025-01-15'),
          referenceType: 'INVOICE',
          referenceId: 'INV-123',
        },
        testUser.id
      );

      const updated = await service.getBudgetLine(budgetLine.id);
      expect(Number(updated.actualAmount)).toBe(5000);
      expect(Number(updated.committedAmount)).toBe(0);
    });

    it('should record COMMITTED transaction and update budget line', async () => {
      const budgetLine = await service.createBudgetLine({
        projectId: testProject.id,
        category: 'EQUIPMENT',
        name: 'Excavator Rental',
        budgetedAmount: 10000,
      });

      await service.recordTransaction(
        {
          budgetLineId: budgetLine.id,
          projectId: testProject.id,
          transactionType: 'COMMITTED',
          amount: 3000,
          description: 'PO for excavator',
          transactionDate: new Date('2025-01-10'),
          referenceType: 'PO',
          referenceId: 'PO-123',
        },
        testUser.id
      );

      const updated = await service.getBudgetLine(budgetLine.id);
      expect(Number(updated.actualAmount)).toBe(0);
      expect(Number(updated.committedAmount)).toBe(3000);
    });

    it('should handle multiple transactions on same budget line', async () => {
      const budgetLine = await service.createBudgetLine({
        projectId: testProject.id,
        category: 'SUBCONTRACTORS',
        name: 'Electrical Work',
        budgetedAmount: 40000,
      });

      await service.recordTransaction(
        {
          budgetLineId: budgetLine.id,
          projectId: testProject.id,
          transactionType: 'COMMITTED',
          amount: 10000,
          description: 'PO for electrical',
          transactionDate: new Date('2025-01-05'),
        },
        testUser.id
      );

      await service.recordTransaction(
        {
          budgetLineId: budgetLine.id,
          projectId: testProject.id,
          transactionType: 'ACTUAL',
          amount: 8000,
          description: 'First payment',
          transactionDate: new Date('2025-01-20'),
        },
        testUser.id
      );

      const updated = await service.getBudgetLine(budgetLine.id);
      expect(Number(updated.actualAmount)).toBe(8000);
      expect(Number(updated.committedAmount)).toBe(10000);
    });

    it('should handle ADJUSTMENT transactions', async () => {
      const budgetLine = await service.createBudgetLine({
        projectId: testProject.id,
        category: 'MATERIALS',
        name: 'Steel',
        budgetedAmount: 20000,
      });

      await service.recordTransaction(
        {
          budgetLineId: budgetLine.id,
          projectId: testProject.id,
          transactionType: 'ACTUAL',
          amount: 15000,
          description: 'Initial steel purchase',
          transactionDate: new Date('2025-01-10'),
        },
        testUser.id
      );

      await service.recordTransaction(
        {
          budgetLineId: budgetLine.id,
          projectId: testProject.id,
          transactionType: 'ADJUSTMENT',
          amount: -2000,
          description: 'Credit for returned materials',
          transactionDate: new Date('2025-01-15'),
        },
        testUser.id
      );

      const updated = await service.getBudgetLine(budgetLine.id);
      expect(Number(updated.actualAmount)).toBe(13000); // 15000 - 2000
    });
  });

  describe('deleteTransaction', () => {
    it('should delete transaction and recalculate budget line', async () => {
      const budgetLine = await service.createBudgetLine({
        projectId: testProject.id,
        category: 'LABOR',
        name: 'Demo Labor',
        budgetedAmount: 15000,
      });

      const transaction = await service.recordTransaction(
        {
          budgetLineId: budgetLine.id,
          projectId: testProject.id,
          transactionType: 'ACTUAL',
          amount: 5000,
          description: 'Week 1 labor',
          transactionDate: new Date('2025-01-10'),
        },
        testUser.id
      );

      await service.recordTransaction(
        {
          budgetLineId: budgetLine.id,
          projectId: testProject.id,
          transactionType: 'ACTUAL',
          amount: 6000,
          description: 'Week 2 labor',
          transactionDate: new Date('2025-01-17'),
        },
        testUser.id
      );

      await service.deleteTransaction(transaction.id);

      const updated = await service.getBudgetLine(budgetLine.id);
      expect(Number(updated.actualAmount)).toBe(6000); // Only second transaction remains
    });
  });

  describe('getProjectBudgetSummary', () => {
    it('should provide comprehensive budget summary', async () => {
      await service.createBudgetLine({
        projectId: testProject.id,
        category: 'LABOR',
        name: 'General Labor',
        budgetedAmount: 100000,
      });

      const materialsLine = await service.createBudgetLine({
        projectId: testProject.id,
        category: 'MATERIALS',
        name: 'Materials Budget',
        budgetedAmount: 80000,
      });

      await service.recordTransaction(
        {
          budgetLineId: materialsLine.id,
          projectId: testProject.id,
          transactionType: 'ACTUAL',
          amount: 30000,
          description: 'Materials purchased',
          transactionDate: new Date('2025-01-15'),
        },
        testUser.id
      );

      await service.recordTransaction(
        {
          budgetLineId: materialsLine.id,
          projectId: testProject.id,
          transactionType: 'COMMITTED',
          amount: 20000,
          description: 'Materials on order',
          transactionDate: new Date('2025-01-20'),
        },
        testUser.id
      );

      const summary = await service.getProjectBudgetSummary(testProject.id);

      expect(summary.totalBudgeted).toBe(180000); // 100k + 80k
      expect(summary.totalActual).toBe(30000);
      expect(summary.totalCommitted).toBe(20000);
      expect(summary.totalRemaining).toBe(130000); // 180k - 30k - 20k
      expect(summary.percentSpent).toBe(16.67); // (30k / 180k) * 100
      expect(summary.percentCommitted).toBe(11.11); // (20k / 180k) * 100
      expect(summary.byCategory.length).toBe(2);
    });
  });

  describe('getBudgetVariances', () => {
    it('should identify budget variances', async () => {
      const overBudgetLine = await service.createBudgetLine({
        projectId: testProject.id,
        category: 'LABOR',
        name: 'Over Budget Item',
        budgetedAmount: 10000,
      });

      const underBudgetLine = await service.createBudgetLine({
        projectId: testProject.id,
        category: 'MATERIALS',
        name: 'Under Budget Item',
        budgetedAmount: 20000,
      });

      await service.recordTransaction(
        {
          budgetLineId: overBudgetLine.id,
          projectId: testProject.id,
          transactionType: 'ACTUAL',
          amount: 12000,
          description: 'Over budget spending',
          transactionDate: new Date('2025-01-15'),
        },
        testUser.id
      );

      await service.recordTransaction(
        {
          budgetLineId: underBudgetLine.id,
          projectId: testProject.id,
          transactionType: 'ACTUAL',
          amount: 15000,
          description: 'Under budget spending',
          transactionDate: new Date('2025-01-15'),
        },
        testUser.id
      );

      const variances = await service.getBudgetVariances(testProject.id);

      expect(variances.length).toBe(2);

      const overItem = variances.find((v) => v.name === 'Over Budget Item');
      expect(overItem?.variance).toBe(-2000); // 10k - 12k
      expect(overItem?.status).toBe('OVER_BUDGET');

      const underItem = variances.find((v) => v.name === 'Under Budget Item');
      expect(underItem?.variance).toBe(5000); // 20k - 15k
      expect(underItem?.status).toBe('UNDER_BUDGET');
    });
  });

  describe('getOverBudgetItems', () => {
    it('should find items that are over budget', async () => {
      const onBudgetLine = await service.createBudgetLine({
        projectId: testProject.id,
        category: 'LABOR',
        name: 'On Budget',
        budgetedAmount: 10000,
      });

      const overBudgetLine = await service.createBudgetLine({
        projectId: testProject.id,
        category: 'MATERIALS',
        name: 'Over Budget',
        budgetedAmount: 15000,
      });

      await service.recordTransaction(
        {
          budgetLineId: onBudgetLine.id,
          projectId: testProject.id,
          transactionType: 'ACTUAL',
          amount: 9000,
          description: 'On budget',
          transactionDate: new Date('2025-01-15'),
        },
        testUser.id
      );

      await service.recordTransaction(
        {
          budgetLineId: overBudgetLine.id,
          projectId: testProject.id,
          transactionType: 'ACTUAL',
          amount: 18000,
          description: 'Over budget',
          transactionDate: new Date('2025-01-15'),
        },
        testUser.id
      );

      const overBudget = await service.getOverBudgetItems(testProject.id);

      expect(overBudget.length).toBe(1);
      expect(overBudget[0].name).toBe('Over Budget');
      expect(overBudget[0].overAmount).toBe(3000); // 18k - 15k
    });
  });

  describe('getCashFlowProjection', () => {
    it('should group transactions by month', async () => {
      const budgetLine = await service.createBudgetLine({
        projectId: testProject.id,
        category: 'MATERIALS',
        name: 'Materials',
        budgetedAmount: 50000,
      });

      await service.recordTransaction(
        {
          budgetLineId: budgetLine.id,
          projectId: testProject.id,
          transactionType: 'ACTUAL',
          amount: 10000,
          description: 'January purchase',
          transactionDate: new Date('2025-01-15'),
        },
        testUser.id
      );

      await service.recordTransaction(
        {
          budgetLineId: budgetLine.id,
          projectId: testProject.id,
          transactionType: 'COMMITTED',
          amount: 5000,
          description: 'January PO',
          transactionDate: new Date('2025-01-20'),
        },
        testUser.id
      );

      await service.recordTransaction(
        {
          budgetLineId: budgetLine.id,
          projectId: testProject.id,
          transactionType: 'ACTUAL',
          amount: 15000,
          description: 'February purchase',
          transactionDate: new Date('2025-02-10'),
        },
        testUser.id
      );

      const cashFlow = await service.getCashFlowProjection(
        testProject.id,
        new Date('2025-01-01'),
        new Date('2025-02-28')
      );

      expect(cashFlow.length).toBe(2); // Jan and Feb

      const jan = cashFlow.find((m) => m.month === '2025-01');
      expect(jan?.actual).toBe(10000);
      expect(jan?.committed).toBe(5000);
      expect(jan?.total).toBe(15000);
      expect(jan?.transactions).toBe(2);

      const feb = cashFlow.find((m) => m.month === '2025-02');
      expect(feb?.actual).toBe(15000);
      expect(feb?.committed).toBe(0);
      expect(feb?.total).toBe(15000);
      expect(feb?.transactions).toBe(1);
    });
  });

  describe('getBudgetByCategory', () => {
    it('should group budget by category', async () => {
      const laborLine1 = await service.createBudgetLine({
        projectId: testProject.id,
        category: 'LABOR',
        name: 'Framing',
        budgetedAmount: 30000,
      });

      const laborLine2 = await service.createBudgetLine({
        projectId: testProject.id,
        category: 'LABOR',
        name: 'Finishing',
        budgetedAmount: 20000,
      });

      const materialsLine = await service.createBudgetLine({
        projectId: testProject.id,
        category: 'MATERIALS',
        name: 'Lumber',
        budgetedAmount: 25000,
      });

      await service.recordTransaction(
        {
          budgetLineId: laborLine1.id,
          projectId: testProject.id,
          transactionType: 'ACTUAL',
          amount: 15000,
          description: 'Labor payment',
          transactionDate: new Date('2025-01-15'),
        },
        testUser.id
      );

      const byCategory = await service.getBudgetByCategory(testProject.id);

      expect(byCategory.length).toBe(2);

      const labor = byCategory.find((c) => c.category === 'LABOR');
      expect(labor?.budgeted).toBe(50000); // 30k + 20k
      expect(labor?.actual).toBe(15000);
      expect(labor?.lineCount).toBe(2);

      const materials = byCategory.find((c) => c.category === 'MATERIALS');
      expect(materials?.budgeted).toBe(25000);
      expect(materials?.actual).toBe(0);
      expect(materials?.lineCount).toBe(1);
    });
  });

  describe('getBudgetByCostCode', () => {
    it('should group budget by cost code', async () => {
      await service.createBudgetLine({
        projectId: testProject.id,
        category: 'LABOR',
        name: 'Framing Labor',
        costCode: 'LAB-001',
        budgetedAmount: 30000,
      });

      await service.createBudgetLine({
        projectId: testProject.id,
        category: 'LABOR',
        name: 'Site Labor',
        costCode: 'LAB-001',
        budgetedAmount: 20000,
      });

      await service.createBudgetLine({
        projectId: testProject.id,
        category: 'MATERIALS',
        name: 'Lumber',
        costCode: 'MAT-001',
        budgetedAmount: 25000,
      });

      await service.createBudgetLine({
        projectId: testProject.id,
        category: 'MATERIALS',
        name: 'No Cost Code',
        budgetedAmount: 10000,
      });

      const byCostCode = await service.getBudgetByCostCode(testProject.id);

      expect(byCostCode.length).toBe(2); // Only items with cost codes

      const lab001 = byCostCode.find((c) => c.costCode === 'LAB-001');
      expect(lab001?.budgeted).toBe(50000); // 30k + 20k
      expect(lab001?.lineCount).toBe(2);

      const mat001 = byCostCode.find((c) => c.costCode === 'MAT-001');
      expect(mat001?.budgeted).toBe(25000);
      expect(mat001?.lineCount).toBe(1);
    });
  });

  describe('exportBudgetToCSV', () => {
    it('should generate CSV export', async () => {
      const budgetLine = await service.createBudgetLine({
        projectId: testProject.id,
        category: 'LABOR',
        name: 'Test Labor',
        description: 'Test description',
        costCode: 'LAB-001',
        budgetedAmount: 10000,
      });

      await service.recordTransaction(
        {
          budgetLineId: budgetLine.id,
          projectId: testProject.id,
          transactionType: 'ACTUAL',
          amount: 8000,
          description: 'Labor payment',
          transactionDate: new Date('2025-01-15'),
        },
        testUser.id
      );

      const csv = await service.exportBudgetToCSV(testProject.id);

      expect(csv).toContain('Category,Cost Code,Name,Description,Budgeted,Actual,Committed,Remaining,Variance %');
      expect(csv).toContain('LABOR');
      expect(csv).toContain('LAB-001');
      expect(csv).toContain('Test Labor');
      expect(csv).toContain('10000.00');
      expect(csv).toContain('8000.00');
      expect(csv).toContain('2000.00');
      expect(csv).toContain('20.00'); // (2000 / 10000) * 100
    });
  });

  describe('listBudgetLines', () => {
    it('should filter by category', async () => {
      await service.createBudgetLine({
        projectId: testProject.id,
        category: 'LABOR',
        name: 'Labor 1',
        budgetedAmount: 10000,
      });

      await service.createBudgetLine({
        projectId: testProject.id,
        category: 'MATERIALS',
        name: 'Materials 1',
        budgetedAmount: 15000,
      });

      const laborLines = await service.listBudgetLines(testProject.id, {
        category: 'LABOR',
      });

      expect(laborLines.length).toBe(1);
      expect(laborLines[0].category).toBe('LABOR');
    });

    it('should filter by cost code', async () => {
      await service.createBudgetLine({
        projectId: testProject.id,
        category: 'LABOR',
        name: 'Labor 1',
        costCode: 'LAB-001',
        budgetedAmount: 10000,
      });

      await service.createBudgetLine({
        projectId: testProject.id,
        category: 'LABOR',
        name: 'Labor 2',
        costCode: 'LAB-002',
        budgetedAmount: 15000,
      });

      const filtered = await service.listBudgetLines(testProject.id, {
        costCode: 'LAB-001',
      });

      expect(filtered.length).toBe(1);
      expect(filtered[0].costCode).toBe('LAB-001');
    });
  });

  describe('listTransactions', () => {
    it('should filter transactions by date range', async () => {
      const budgetLine = await service.createBudgetLine({
        projectId: testProject.id,
        category: 'MATERIALS',
        name: 'Materials',
        budgetedAmount: 50000,
      });

      await service.recordTransaction(
        {
          budgetLineId: budgetLine.id,
          projectId: testProject.id,
          transactionType: 'ACTUAL',
          amount: 10000,
          description: 'January transaction',
          transactionDate: new Date('2025-01-15'),
        },
        testUser.id
      );

      await service.recordTransaction(
        {
          budgetLineId: budgetLine.id,
          projectId: testProject.id,
          transactionType: 'ACTUAL',
          amount: 15000,
          description: 'February transaction',
          transactionDate: new Date('2025-02-15'),
        },
        testUser.id
      );

      const januaryTransactions = await service.listTransactions(testProject.id, {
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
      });

      expect(januaryTransactions.length).toBe(1);
      expect(januaryTransactions[0].description).toBe('January transaction');
    });

    it('should filter by transaction type', async () => {
      const budgetLine = await service.createBudgetLine({
        projectId: testProject.id,
        category: 'MATERIALS',
        name: 'Materials',
        budgetedAmount: 50000,
      });

      await service.recordTransaction(
        {
          budgetLineId: budgetLine.id,
          projectId: testProject.id,
          transactionType: 'ACTUAL',
          amount: 10000,
          description: 'Actual transaction',
          transactionDate: new Date('2025-01-15'),
        },
        testUser.id
      );

      await service.recordTransaction(
        {
          budgetLineId: budgetLine.id,
          projectId: testProject.id,
          transactionType: 'COMMITTED',
          amount: 5000,
          description: 'Committed transaction',
          transactionDate: new Date('2025-01-15'),
        },
        testUser.id
      );

      const actualTransactions = await service.listTransactions(testProject.id, {
        transactionType: 'ACTUAL',
      });

      expect(actualTransactions.length).toBe(1);
      expect(actualTransactions[0].transactionType).toBe('ACTUAL');
    });
  });
});
