import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { PrismaClient } from '../../generated/prisma';
import { setupTestDatabase, cleanupTestDatabase } from '../../test-helpers/database';
import { SelectionsService } from './selections.service';

describe('SelectionsService', () => {
  let prisma: PrismaClient;
  let service: SelectionsService;
  let testUser: any;
  let testCompany: any;
  let testProject: any;
  let testCustomer: any;

  beforeAll(async () => {
    prisma = await setupTestDatabase();
    service = new SelectionsService(prisma);

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
        email: 'selections@test.com',
        password: 'hashedpassword',
        firstName: 'Selection',
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
        name: 'Residential Project',
        companyId: testCompany.id,
        createdById: testUser.id,
        status: 'ACTIVE',
      },
    });

    testCustomer = await prisma.customer.create({
      data: {
        name: 'John Smith',
        companyId: testCompany.id,
        email: 'john@smith.com',
        phone: '555-0300',
      },
    });
  });

  afterEach(async () => {
    await prisma.selectionChange.deleteMany({});
    await prisma.selectionOption.deleteMany({});
    await prisma.selection.deleteMany({});
  });

  describe('createSelection', () => {
    it('should create selection with calculated totals', async () => {
      const selection = await service.createSelection(
        {
          projectId: testProject.id,
          customerId: testCustomer.id,
          category: 'FLOORING',
          name: 'Living Room Hardwood',
          description: 'Oak hardwood flooring',
          manufacturer: 'Premium Floors Inc',
          model: 'OF-300',
          color: 'Natural Oak',
          quantity: 500,
          unit: 'sqft',
          unitPrice: 8.50,
          budgetAmount: 4000,
        },
        testUser.id
      );

      expect(selection.name).toBe('Living Room Hardwood');
      expect(selection.category).toBe('FLOORING');
      expect(selection.status).toBe('PENDING');
      expect(Number(selection.totalPrice)).toBe(4250); // 500 * 8.50
      expect(Number(selection.variance)).toBe(250); // 4250 - 4000 (over budget)
    });

    it('should create selection without pricing', async () => {
      const selection = await service.createSelection(
        {
          projectId: testProject.id,
          category: 'PAINT',
          name: 'Interior Paint Color',
          description: 'Main living areas',
        },
        testUser.id
      );

      expect(selection.totalPrice).toBeNull();
      expect(selection.variance).toBeNull();
    });
  });

  describe('addOption', () => {
    it('should add multiple options to selection', async () => {
      const selection = await service.createSelection(
        {
          projectId: testProject.id,
          category: 'COUNTERTOPS',
          name: 'Kitchen Countertops',
        },
        testUser.id
      );

      const option1 = await service.addOption(selection.id, {
        name: 'Granite - Black Galaxy',
        manufacturer: 'Stone Works',
        unitPrice: 85,
        isRecommended: true,
        sortOrder: 1,
      });

      const option2 = await service.addOption(selection.id, {
        name: 'Quartz - Calacatta',
        manufacturer: 'Quartz Masters',
        unitPrice: 95,
        sortOrder: 2,
      });

      expect(option1.isRecommended).toBe(true);
      expect(Number(option1.unitPrice)).toBe(85);
      expect(Number(option2.unitPrice)).toBe(95);
    });
  });

  describe('selectOption', () => {
    it('should apply option details to selection', async () => {
      const selection = await service.createSelection(
        {
          projectId: testProject.id,
          category: 'APPLIANCES',
          name: 'Refrigerator',
          quantity: 1,
          budgetAmount: 2000,
        },
        testUser.id
      );

      const option = await service.addOption(selection.id, {
        name: 'Samsung French Door',
        manufacturer: 'Samsung',
        model: 'RF28R7351',
        color: 'Stainless Steel',
        unitPrice: 2200,
      });

      const updated = await service.selectOption(selection.id, option.id, testUser.id);

      expect(updated.status).toBe('SELECTED');
      expect(updated.manufacturer).toBe('Samsung');
      expect(updated.model).toBe('RF28R7351');
      expect(Number(updated.unitPrice)).toBe(2200);
      expect(Number(updated.totalPrice)).toBe(2200);
      expect(updated.selectedDate).toBeTruthy();
    });
  });

  describe('approveSelection', () => {
    it('should approve selection and set approver', async () => {
      const selection = await service.createSelection(
        {
          projectId: testProject.id,
          category: 'CABINETS',
          name: 'Kitchen Cabinets',
        },
        testUser.id
      );

      const approved = await service.approveSelection(selection.id, testUser.id);

      expect(approved.status).toBe('APPROVED');
      expect(approved.approvedByUserId).toBe(testUser.id);
      expect(approved.approvedDate).toBeTruthy();
    });
  });

  describe('markAsOrdered', () => {
    it('should update status to ordered', async () => {
      const selection = await service.createSelection(
        {
          projectId: testProject.id,
          category: 'FIXTURES',
          name: 'Bathroom Faucet',
        },
        testUser.id
      );

      const ordered = await service.markAsOrdered(selection.id, testUser.id);

      expect(ordered.status).toBe('ORDERED');
      expect(ordered.orderedDate).toBeTruthy();
    });
  });

  describe('markAsInstalled', () => {
    it('should update status to installed', async () => {
      const selection = await service.createSelection(
        {
          projectId: testProject.id,
          category: 'LIGHTING',
          name: 'Pendant Lights',
        },
        testUser.id
      );

      const installed = await service.markAsInstalled(selection.id, testUser.id);

      expect(installed.status).toBe('INSTALLED');
      expect(installed.installedDate).toBeTruthy();
    });
  });

  describe('updateSelection', () => {
    it('should track changes when updating', async () => {
      const selection = await service.createSelection(
        {
          projectId: testProject.id,
          category: 'TILE',
          name: 'Bathroom Tile',
          unitPrice: 5,
        },
        testUser.id
      );

      const updated = await service.updateSelection(
        selection.id,
        { unitPrice: 6, color: 'White' },
        testUser.id,
        'Price increase from supplier'
      );

      expect(Number(updated.unitPrice)).toBe(6);

      const withChanges = await service.getSelection(selection.id);
      expect(withChanges.changes.length).toBe(1);
      expect(withChanges.changes[0].changeType).toBe('UPDATE');
      expect(withChanges.changes[0].reason).toBe('Price increase from supplier');
    });
  });

  describe('getSelectionsSummary', () => {
    it('should provide comprehensive summary', async () => {
      await service.createSelection(
        {
          projectId: testProject.id,
          category: 'FLOORING',
          name: 'Floor 1',
          unitPrice: 10,
          quantity: 100,
          budgetAmount: 900,
        },
        testUser.id
      );

      await service.createSelection(
        {
          projectId: testProject.id,
          category: 'FLOORING',
          name: 'Floor 2',
          unitPrice: 12,
          quantity: 50,
          budgetAmount: 500,
        },
        testUser.id
      );

      const summary = await service.getSelectionsSummary(testProject.id);

      expect(summary.totalSelections).toBe(2);
      expect(summary.totalBudget).toBe(1400);
      expect(summary.totalActual).toBe(1600); // 1000 + 600
      expect(summary.totalVariance).toBe(200); // over budget
      expect(summary.byCategory.length).toBe(1);
      expect(summary.byCategory[0].category).toBe('FLOORING');
      expect(summary.byCategory[0].count).toBe(2);
    });
  });

  describe('getOverdueSelections', () => {
    it('should find selections past due date', async () => {
      const pastDate = new Date('2024-01-01');

      await service.createSelection(
        {
          projectId: testProject.id,
          category: 'PAINT',
          name: 'Overdue Selection',
          dueDate: pastDate,
        },
        testUser.id
      );

      await service.createSelection(
        {
          projectId: testProject.id,
          category: 'PAINT',
          name: 'Future Selection',
          dueDate: new Date('2026-01-01'),
        },
        testUser.id
      );

      const overdue = await service.getOverdueSelections(testProject.id);

      expect(overdue.length).toBe(1);
      expect(overdue[0].name).toBe('Overdue Selection');
    });
  });

  describe('exportSelectionsToCSV', () => {
    it('should export selections to CSV format', async () => {
      await service.createSelection(
        {
          projectId: testProject.id,
          customerId: testCustomer.id,
          category: 'CABINETS',
          name: 'Kitchen Cabinets',
          manufacturer: 'Cabinet Co',
          model: 'KC-100',
          color: 'White',
          quantity: 15,
          unitPrice: 500,
        },
        testUser.id
      );

      const csv = await service.exportSelectionsToCSV(testProject.id);

      expect(csv).toContain('Category,Name,Status');
      expect(csv).toContain('CABINETS');
      expect(csv).toContain('Kitchen Cabinets');
      expect(csv).toContain('Cabinet Co');
    });
  });

  describe('listSelections', () => {
    it('should filter by category', async () => {
      await service.createSelection(
        { projectId: testProject.id, category: 'FLOORING', name: 'Floor' },
        testUser.id
      );

      await service.createSelection(
        { projectId: testProject.id, category: 'PAINT', name: 'Paint' },
        testUser.id
      );

      const flooringSelections = await service.listSelections(testProject.id, {
        category: 'FLOORING',
      });

      expect(flooringSelections.length).toBe(1);
      expect(flooringSelections[0].category).toBe('FLOORING');
    });

    it('should filter by status', async () => {
      const s1 = await service.createSelection(
        { projectId: testProject.id, category: 'TILE', name: 'Tile 1' },
        testUser.id
      );

      await service.createSelection(
        { projectId: testProject.id, category: 'TILE', name: 'Tile 2' },
        testUser.id
      );

      await service.approveSelection(s1.id, testUser.id);

      const approved = await service.listSelections(testProject.id, {
        status: 'APPROVED',
      });

      expect(approved.length).toBe(1);
      expect(approved[0].status).toBe('APPROVED');
    });
  });
});
