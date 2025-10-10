import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '../../generated/prisma';
import { BudgetTrackingService } from './budget-tracking.service';
import { setupTestDatabase, cleanupTestDatabase } from '../../test-helpers/database';
import { createTestCompany, createTestUser, createTestProject } from '../../test-helpers/factories';

describe('BudgetTrackingService', () => {
  let prisma: PrismaClient;
  let service: BudgetTrackingService;
  let testCompany: any;
  let testUser: any;
  let testProject: any;

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
    testProject = await createTestProject(prisma, {
      name: 'Test Project',
      companyId: testCompany.id,
      createdById: testUser.id,
      budget: 100000,
    });

    service = new BudgetTrackingService(prisma);
  });

  afterEach(async () => {
    await cleanupTestDatabase(prisma);
  });

  describe('createBudgetLine', () => {
    it('should create a budget line item', async () => {
      const line = await service.createBudgetLine({
        projectId: testProject.id,
        category: 'MATERIALS',
        name: 'Lumber',
        description: 'Framing lumber for main structure',
        costCode: 'MAT-001',
        budgetedAmount: 15000,
      });

      expect(line.id).toBeDefined();
      expect(line.name).toBe('Lumber');
      expect(line.category).toBe('MATERIALS');
      expect(Number(line.budgetedAmount)).toBe(15000);
      expect(Number(line.actualAmount)).toBe(0);
      expect(Number(line.committedAmount)).toBe(0);
    });

    it('should throw error if project not found', async () => {
      await expect(
        service.createBudgetLine({
          projectId: 'invalid-id',
          category: 'LABOR',
          name: 'Test',
          budgetedAmount: 1000,
        })
      ).rejects.toThrow('Project not found');
    });
  });

  describe('getBudgetLine', () => {
    it('should get budget line with transactions', async () => {
      const created = await service.createBudgetLine({
        projectId: testProject.id,
        category: 'LABOR',
        name: 'Carpenters',
        budgetedAmount: 25000,
      });

      const line = await service.getBudgetLine(created.id);

      expect(line.id).toBe(created.id);
      expect(line.transactions).toBeDefined();
      expect(line.project.name).toBe('Test Project');
    });

    it('should throw error if budget line not found', async () => {
      await expect(service.getBudgetLine('invalid-id')).rejects.toThrow(
        'Budget line not found'
      );
    });
  });

  describe('updateBudgetLine', () => {
    it('should update budget line properties', async () => {
      const line = await service.createBudgetLine({
        projectId: testProject.id,
        category: 'EQUIPMENT',
        name: 'Excavator',
        budgetedAmount: 5000,
      });

      const updated = await service.updateBudgetLine(line.id, {
        budgetedAmount: 6000,
        notes: 'Increased due to longer rental period',
      });

      expect(Number(updated.budgetedAmount)).toBe(6000);
      expect(updated.notes).toBe('Increased due to longer rental period');
    });
  });

  describe('deleteBudgetLine', () => {
    it('should delete budget line with no transactions', async () => {
      const line = await service.createBudgetLine({
        projectId: testProject.id,
        category: 'OTHER',
        name: 'Temp Item',
        budgetedAmount: 100,
      });

      const result = await service.deleteBudgetLine(line.id);

      expect(result.success).toBe(true);

      await expect(service.getBudgetLine(line.id)).rejects.toThrow(
        'Budget line not found'
      );
    });

    it('should throw error if budget line has transactions', async () => {
      const line = await service.createBudgetLine({
        projectId: testProject.id,
        category: 'MATERIALS',
        name: 'Test',
        budgetedAmount: 1000,
      });

      await service.addTransaction(
        {
          budgetLineId: line.id,
          projectId: testProject.id,
          transactionType: 'ACTUAL',
          amount: 500,
          description: 'Test expense',
          transactionDate: new Date(),
        },
        testUser.id
      );

      await expect(service.deleteBudgetLine(line.id)).rejects.toThrow(
        'Cannot delete budget line with existing transactions'
      );
    });
  });

  describe('getProjectBudget', () => {
    it('should get all budget lines for a project', async () => {
      await service.createBudgetLine({
        projectId: testProject.id,
        category: 'LABOR',
        name: 'Carpenters',
        budgetedAmount: 25000,
      });

      await service.createBudgetLine({
        projectId: testProject.id,
        category: 'MATERIALS',
        name: 'Lumber',
        budgetedAmount: 15000,
      });

      const lines = await service.getProjectBudget(testProject.id);

      expect(lines).toHaveLength(2);
      expect(lines[0].category).toBe('LABOR');
      expect(lines[1].category).toBe('MATERIALS');
    });

    it('should filter by category', async () => {
      await service.createBudgetLine({
        projectId: testProject.id,
        category: 'LABOR',
        name: 'Carpenters',
        budgetedAmount: 25000,
      });

      await service.createBudgetLine({
        projectId: testProject.id,
        category: 'MATERIALS',
        name: 'Lumber',
        budgetedAmount: 15000,
      });

      const lines = await service.getProjectBudget(testProject.id, {
        category: 'LABOR',
      });

      expect(lines).toHaveLength(1);
      expect(lines[0].category).toBe('LABOR');
    });
  });

  describe('addTransaction', () => {
    it('should add actual transaction and update budget line', async () => {
      const line = await service.createBudgetLine({
        projectId: testProject.id,
        category: 'MATERIALS',
        name: 'Concrete',
        budgetedAmount: 10000,
      });

      const transaction = await service.addTransaction(
        {
          budgetLineId: line.id,
          projectId: testProject.id,
          transactionType: 'ACTUAL',
          amount: 2500,
          description: 'Foundation concrete delivery',
          transactionDate: new Date(),
        },
        testUser.id
      );

      expect(transaction.id).toBeDefined();
      expect(Number(transaction.amount)).toBe(2500);
      expect(transaction.transactionType).toBe('ACTUAL');

      const updated = await service.getBudgetLine(line.id);
      expect(Number(updated.actualAmount)).toBe(2500);
    });

    it('should add committed transaction for PO', async () => {
      const line = await service.createBudgetLine({
        projectId: testProject.id,
        category: 'MATERIALS',
        name: 'Steel',
        budgetedAmount: 20000,
      });

      const transaction = await service.addTransaction(
        {
          budgetLineId: line.id,
          projectId: testProject.id,
          transactionType: 'COMMITTED',
          amount: 15000,
          description: 'PO for structural steel',
          transactionDate: new Date(),
          referenceType: 'PO',
          referenceId: 'po-123',
        },
        testUser.id
      );

      expect(transaction.transactionType).toBe('COMMITTED');

      const updated = await service.getBudgetLine(line.id);
      expect(Number(updated.committedAmount)).toBe(15000);
    });

    it('should handle adjustment transactions', async () => {
      const line = await service.createBudgetLine({
        projectId: testProject.id,
        category: 'OTHER',
        name: 'Contingency',
        budgetedAmount: 5000,
      });

      await service.addTransaction(
        {
          budgetLineId: line.id,
          projectId: testProject.id,
          transactionType: 'ADJUSTMENT',
          amount: 2000,
          description: 'Change order adjustment',
          transactionDate: new Date(),
          referenceType: 'CO',
          referenceId: 'co-123',
        },
        testUser.id
      );

      const updated = await service.getBudgetLine(line.id);
      // Adjustments don't update actual or committed
      expect(Number(updated.actualAmount)).toBe(0);
      expect(Number(updated.committedAmount)).toBe(0);
    });
  });

  describe('deleteTransaction', () => {
    it('should delete transaction and reverse budget line amounts', async () => {
      const line = await service.createBudgetLine({
        projectId: testProject.id,
        category: 'LABOR',
        name: 'Electricians',
        budgetedAmount: 15000,
      });

      const transaction = await service.addTransaction(
        {
          budgetLineId: line.id,
          projectId: testProject.id,
          transactionType: 'ACTUAL',
          amount: 3000,
          description: 'Week 1 labor',
          transactionDate: new Date(),
        },
        testUser.id
      );

      await service.deleteTransaction(transaction.id);

      const updated = await service.getBudgetLine(line.id);
      expect(Number(updated.actualAmount)).toBe(0);
    });
  });

  describe('getBudgetVariance', () => {
    it('should calculate budget variance report', async () => {
      const laborLine = await service.createBudgetLine({
        projectId: testProject.id,
        category: 'LABOR',
        name: 'Carpenters',
        budgetedAmount: 25000,
      });

      const materialsLine = await service.createBudgetLine({
        projectId: testProject.id,
        category: 'MATERIALS',
        name: 'Lumber',
        budgetedAmount: 15000,
      });

      // Add some actual costs
      await service.addTransaction(
        {
          budgetLineId: laborLine.id,
          projectId: testProject.id,
          transactionType: 'ACTUAL',
          amount: 12000,
          description: 'Week 1-2 labor',
          transactionDate: new Date(),
        },
        testUser.id
      );

      await service.addTransaction(
        {
          budgetLineId: materialsLine.id,
          projectId: testProject.id,
          transactionType: 'ACTUAL',
          amount: 8000,
          description: 'Initial lumber order',
          transactionDate: new Date(),
        },
        testUser.id
      );

      // Add committed costs
      await service.addTransaction(
        {
          budgetLineId: materialsLine.id,
          projectId: testProject.id,
          transactionType: 'COMMITTED',
          amount: 5000,
          description: 'PO for additional lumber',
          transactionDate: new Date(),
        },
        testUser.id
      );

      const variance = await service.getBudgetVariance(testProject.id);

      expect(variance.totalBudgeted).toBe(40000);
      expect(variance.totalActual).toBe(20000);
      expect(variance.totalCommitted).toBe(5000);
      expect(variance.totalRemaining).toBe(15000);
      expect(variance.varianceAmount).toBe(20000);
      expect(variance.variancePercent).toBe(50);

      expect(variance.byCategory).toHaveLength(2);
      expect(variance.byCategory[0].category).toBe('LABOR');
      expect(variance.byCategory[0].budgeted).toBe(25000);
      expect(variance.byCategory[0].actual).toBe(12000);
    });

    it('should identify at-risk budget lines', async () => {
      const line = await service.createBudgetLine({
        projectId: testProject.id,
        category: 'EQUIPMENT',
        name: 'Excavator Rental',
        budgetedAmount: 5000,
      });

      // Spend 95% of budget
      await service.addTransaction(
        {
          budgetLineId: line.id,
          projectId: testProject.id,
          transactionType: 'ACTUAL',
          amount: 4750,
          description: 'Rental costs',
          transactionDate: new Date(),
        },
        testUser.id
      );

      const variance = await service.getBudgetVariance(testProject.id);

      expect(variance.atRisk).toHaveLength(1);
      expect(variance.atRisk[0].name).toBe('Excavator Rental');
      expect(variance.atRisk[0].variancePercent).toBe(5);
    });

    it('should handle over-budget scenarios', async () => {
      const line = await service.createBudgetLine({
        projectId: testProject.id,
        category: 'MATERIALS',
        name: 'Drywall',
        budgetedAmount: 10000,
      });

      // Spend more than budget
      await service.addTransaction(
        {
          budgetLineId: line.id,
          projectId: testProject.id,
          transactionType: 'ACTUAL',
          amount: 12000,
          description: 'Additional drywall needed',
          transactionDate: new Date(),
        },
        testUser.id
      );

      const variance = await service.getBudgetVariance(testProject.id);

      expect(variance.varianceAmount).toBe(-2000);
      expect(variance.variancePercent).toBe(-20);
      expect(variance.atRisk).toHaveLength(1);
    });
  });

  describe('importFromPurchaseOrder', () => {
    it('should create budget transactions from PO', async () => {
      // Create a purchase order
      const supplier = await prisma.supplier.create({
        data: {
          name: 'Test Supplier',
          email: 'supplier@test.com',
          companyId: testCompany.id,
        },
      });

      const po = await prisma.purchaseOrder.create({
        data: {
          poNumber: 'PO-2510-0001',
          projectId: testProject.id,
          supplierId: supplier.id,
          status: 'SENT',
          subtotal: 5000,
          tax: 0,
          total: 5000,
          createdById: testUser.id,
          lineItems: {
            create: [
              {
                description: 'Lumber 2x4',
                quantity: 100,
                unit: 'pieces',
                unitPrice: 30,
                total: 3000,
              },
              {
                description: 'Lumber 2x6',
                quantity: 50,
                unit: 'pieces',
                unitPrice: 40,
                total: 2000,
              },
            ],
          },
        },
      });

      const transactions = await service.importFromPurchaseOrder(po.id);

      expect(transactions).toHaveLength(2);
      expect(transactions[0].transactionType).toBe('COMMITTED');
      expect(transactions[0].referenceType).toBe('PO');
      expect(transactions[0].referenceId).toBe(po.id);

      const budget = await service.getProjectBudget(testProject.id);
      expect(budget.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('importFromChangeOrder', () => {
    it('should create budget adjustments from approved CO', async () => {
      // Create a change order
      const co = await prisma.changeOrder.create({
        data: {
          coNumber: 'CO-2510-0001',
          projectId: testProject.id,
          title: 'Additional bathroom',
          description: 'Client requested extra bathroom',
          reason: 'Scope change',
          costImpact: 8000,
          timeImpact: 5,
          status: 'APPROVED',
          requestedBy: testUser.id,
          requestedAt: new Date(),
          approvedBy: testUser.id,
          approvedAt: new Date(),
          lineItems: {
            create: [
              {
                description: 'Plumbing fixtures',
                quantity: 1,
                unit: 'lot',
                unitCost: 3000,
                total: 3000,
              },
              {
                description: 'Tile work',
                quantity: 1,
                unit: 'lot',
                unitCost: 5000,
                total: 5000,
              },
            ],
          },
        },
      });

      const transactions = await service.importFromChangeOrder(co.id);

      expect(transactions).toHaveLength(2);
      expect(transactions[0].transactionType).toBe('ADJUSTMENT');
      expect(transactions[0].referenceType).toBe('CO');
    });

    it('should throw error for unapproved CO', async () => {
      const co = await prisma.changeOrder.create({
        data: {
          coNumber: 'CO-2510-0002',
          projectId: testProject.id,
          title: 'Test CO',
          description: 'Test',
          reason: 'Test',
          costImpact: 1000,
          timeImpact: 1,
          status: 'DRAFT',
          requestedBy: testUser.id,
          requestedAt: new Date(),
          lineItems: {
            create: [
              {
                description: 'Test item',
                quantity: 1,
                unit: 'ea',
                unitCost: 1000,
                total: 1000,
              },
            ],
          },
        },
      });

      await expect(service.importFromChangeOrder(co.id)).rejects.toThrow(
        'Can only import from approved or implemented change orders'
      );
    });
  });

  describe('getBudgetForecast', () => {
    it('should calculate budget forecast with burn rate', async () => {
      const line = await service.createBudgetLine({
        projectId: testProject.id,
        category: 'LABOR',
        name: 'General Labor',
        budgetedAmount: 50000,
      });

      await service.addTransaction(
        {
          budgetLineId: line.id,
          projectId: testProject.id,
          transactionType: 'ACTUAL',
          amount: 15000,
          description: 'Labor costs',
          transactionDate: new Date(),
        },
        testUser.id
      );

      await service.addTransaction(
        {
          budgetLineId: line.id,
          projectId: testProject.id,
          transactionType: 'COMMITTED',
          amount: 20000,
          description: 'Committed labor',
          transactionDate: new Date(),
        },
        testUser.id
      );

      const forecast = await service.getBudgetForecast(testProject.id);

      expect(forecast.currentBudget).toBe(50000);
      expect(forecast.actualSpent).toBe(15000);
      expect(forecast.committed).toBe(20000);
      expect(forecast.projectedTotal).toBe(35000);
      expect(forecast.projectedOverrun).toBe(0);
      expect(forecast.completionPercent).toBe(30);
      expect(forecast.riskLevel).toBe('LOW');
    });

    it('should identify high risk when over budget', async () => {
      const line = await service.createBudgetLine({
        projectId: testProject.id,
        category: 'MATERIALS',
        name: 'Materials',
        budgetedAmount: 10000,
      });

      await service.addTransaction(
        {
          budgetLineId: line.id,
          projectId: testProject.id,
          transactionType: 'ACTUAL',
          amount: 9500,
          description: 'Materials',
          transactionDate: new Date(),
        },
        testUser.id
      );

      const forecast = await service.getBudgetForecast(testProject.id);

      expect(forecast.riskLevel).toBe('HIGH');
    });
  });
});
