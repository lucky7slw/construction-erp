import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { PrismaClient } from '../../generated/prisma';
import { setupTestDatabase, cleanupTestDatabase } from '../../test-helpers/database';
import { ChangeOrdersService } from './change-orders.service';

describe('ChangeOrdersService', () => {
  let prisma: PrismaClient;
  let service: ChangeOrdersService;
  let testUser: any;
  let testCompany: any;
  let testProject: any;

  beforeAll(async () => {
    prisma = await setupTestDatabase();
    service = new ChangeOrdersService(prisma);

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
        email: 'co@test.com',
        password: 'hashedpassword',
        firstName: 'CO',
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
        name: 'Construction Project',
        companyId: testCompany.id,
        createdById: testUser.id,
        status: 'ACTIVE',
        budget: 100000,
      },
    });
  });

  afterEach(async () => {
    await prisma.changeOrderItem.deleteMany({});
    await prisma.changeOrder.deleteMany({});
  });

  describe('createChangeOrder', () => {
    it('should create CO with auto-generated number', async () => {
      const co = await service.createChangeOrder(
        {
          projectId: testProject.id,
          title: 'Foundation Adjustment',
          description: 'Adjust foundation depth due to soil conditions',
          reason: 'Site Conditions',
          costImpact: 5000,
          timeImpact: 5,
        },
        testUser.id
      );

      expect(co.coNumber).toMatch(/^CO-[A-Z0-9]+-001$/);
      expect(co.status).toBe('DRAFT');
      expect(Number(co.costImpact)).toBe(5000);
      expect(co.timeImpact).toBe(5);
      expect(co.requestedBy).toBe(testUser.id);
      expect(co.requestedAt).toBeTruthy();
    });

    it('should increment CO numbers sequentially', async () => {
      const co1 = await service.createChangeOrder(
        {
          projectId: testProject.id,
          title: 'Change 1',
          description: 'First change',
          reason: 'Client Request',
          costImpact: 1000,
          timeImpact: 2,
        },
        testUser.id
      );

      const co2 = await service.createChangeOrder(
        {
          projectId: testProject.id,
          title: 'Change 2',
          description: 'Second change',
          reason: 'Design Change',
          costImpact: 2000,
          timeImpact: 3,
        },
        testUser.id
      );

      expect(co1.coNumber).toMatch(/-001$/);
      expect(co2.coNumber).toMatch(/-002$/);
    });

    it('should support attachments and notes', async () => {
      const co = await service.createChangeOrder(
        {
          projectId: testProject.id,
          title: 'Material Change',
          description: 'Change flooring material',
          reason: 'Client Request',
          costImpact: 3000,
          timeImpact: 0,
          attachments: ['file1.pdf', 'file2.jpg'],
          notes: 'Client prefers hardwood over carpet',
        },
        testUser.id
      );

      expect(co.attachments).toEqual(['file1.pdf', 'file2.jpg']);
      expect(co.notes).toBe('Client prefers hardwood over carpet');
    });
  });

  describe('addLineItem', () => {
    it('should add line item and recalculate cost impact', async () => {
      const co = await service.createChangeOrder(
        {
          projectId: testProject.id,
          title: 'Window Upgrade',
          description: 'Upgrade to energy-efficient windows',
          reason: 'Client Request',
          costImpact: 0,
          timeImpact: 3,
        },
        testUser.id
      );

      await service.addLineItem(co.id, {
        description: 'Triple-pane windows',
        quantity: 10,
        unit: 'units',
        unitCost: 500,
      });

      const updated = await service.getChangeOrder(co.id);
      expect(Number(updated.costImpact)).toBe(5000); // 10 * 500
    });

    it('should handle multiple line items', async () => {
      const co = await service.createChangeOrder(
        {
          projectId: testProject.id,
          title: 'Kitchen Upgrade',
          description: 'Upgrade kitchen fixtures',
          reason: 'Client Request',
          costImpact: 0,
          timeImpact: 5,
        },
        testUser.id
      );

      await service.addLineItem(co.id, {
        description: 'Cabinet hardware',
        quantity: 20,
        unit: 'pieces',
        unitCost: 25,
      });

      await service.addLineItem(co.id, {
        description: 'Countertop upgrade',
        quantity: 30,
        unit: 'sq ft',
        unitCost: 100,
      });

      const updated = await service.getChangeOrder(co.id);
      expect(updated.lineItems.length).toBe(2);
      expect(Number(updated.costImpact)).toBe(3500); // 500 + 3000
    });
  });

  describe('updateLineItem', () => {
    it('should update line item and recalculate', async () => {
      const co = await service.createChangeOrder(
        {
          projectId: testProject.id,
          title: 'Fixture Change',
          description: 'Change light fixtures',
          reason: 'Design Change',
          costImpact: 0,
          timeImpact: 1,
        },
        testUser.id
      );

      const item = await service.addLineItem(co.id, {
        description: 'Light fixtures',
        quantity: 5,
        unit: 'units',
        unitCost: 100,
      });

      await service.updateLineItem(item.id, {
        quantity: 8,
        unitCost: 120,
      });

      const updated = await service.getChangeOrder(co.id);
      expect(Number(updated.costImpact)).toBe(960); // 8 * 120
    });
  });

  describe('deleteLineItem', () => {
    it('should delete line item and recalculate cost impact', async () => {
      const co = await service.createChangeOrder(
        {
          projectId: testProject.id,
          title: 'Multiple Items',
          description: 'Test deletion',
          reason: 'Testing',
          costImpact: 0,
          timeImpact: 0,
        },
        testUser.id
      );

      const item1 = await service.addLineItem(co.id, {
        description: 'Item 1',
        quantity: 10,
        unit: 'units',
        unitCost: 50,
      });

      await service.addLineItem(co.id, {
        description: 'Item 2',
        quantity: 5,
        unit: 'units',
        unitCost: 100,
      });

      await service.deleteLineItem(item1.id);

      const updated = await service.getChangeOrder(co.id);
      expect(updated.lineItems.length).toBe(1);
      expect(Number(updated.costImpact)).toBe(500); // Only second item remains
    });
  });

  describe('submitForApproval', () => {
    it('should update status to PENDING_APPROVAL', async () => {
      const co = await service.createChangeOrder(
        {
          projectId: testProject.id,
          title: 'Ready for Approval',
          description: 'Complete change order',
          reason: 'Client Request',
          costImpact: 2000,
          timeImpact: 3,
        },
        testUser.id
      );

      const submitted = await service.submitForApproval(co.id);

      expect(submitted.status).toBe('PENDING_APPROVAL');
    });
  });

  describe('approveChangeOrder', () => {
    it('should approve CO and update project budget', async () => {
      const initialBudget = Number(testProject.budget);

      const co = await service.createChangeOrder(
        {
          projectId: testProject.id,
          title: 'Budget Impact Test',
          description: 'Test budget update',
          reason: 'Testing',
          costImpact: 10000,
          timeImpact: 5,
        },
        testUser.id
      );

      const approved = await service.approveChangeOrder(co.id, testUser.id);

      expect(approved.status).toBe('APPROVED');
      expect(approved.approvedBy).toBe(testUser.id);
      expect(approved.approvedAt).toBeTruthy();

      const updatedProject = await prisma.project.findUnique({
        where: { id: testProject.id },
      });

      expect(Number(updatedProject!.budget)).toBe(initialBudget + 10000);
    });
  });

  describe('rejectChangeOrder', () => {
    it('should reject CO with reason', async () => {
      const co = await service.createChangeOrder(
        {
          projectId: testProject.id,
          title: 'To Be Rejected',
          description: 'Test rejection',
          reason: 'Testing',
          costImpact: 5000,
          timeImpact: 2,
        },
        testUser.id
      );

      const rejected = await service.rejectChangeOrder(
        co.id,
        testUser.id,
        'Cost too high for current budget'
      );

      expect(rejected.status).toBe('REJECTED');
      expect(rejected.approvedBy).toBe(testUser.id);
      expect(rejected.notes).toBe('Cost too high for current budget');
    });
  });

  describe('markAsImplemented', () => {
    it('should update status to IMPLEMENTED', async () => {
      const co = await service.createChangeOrder(
        {
          projectId: testProject.id,
          title: 'To Be Implemented',
          description: 'Test implementation',
          reason: 'Testing',
          costImpact: 3000,
          timeImpact: 4,
        },
        testUser.id
      );

      await service.approveChangeOrder(co.id, testUser.id);
      const implemented = await service.markAsImplemented(co.id);

      expect(implemented.status).toBe('IMPLEMENTED');
    });
  });

  describe('cancelChangeOrder', () => {
    it('should cancel CO', async () => {
      const co = await service.createChangeOrder(
        {
          projectId: testProject.id,
          title: 'To Be Cancelled',
          description: 'Test cancellation',
          reason: 'Testing',
          costImpact: 1000,
          timeImpact: 1,
        },
        testUser.id
      );

      const cancelled = await service.cancelChangeOrder(co.id);

      expect(cancelled.status).toBe('CANCELLED');
    });
  });

  describe('getCOSummary', () => {
    it('should provide comprehensive summary', async () => {
      const co1 = await service.createChangeOrder(
        {
          projectId: testProject.id,
          title: 'Change 1',
          description: 'First change',
          reason: 'Client Request',
          costImpact: 5000,
          timeImpact: 3,
        },
        testUser.id
      );

      const co2 = await service.createChangeOrder(
        {
          projectId: testProject.id,
          title: 'Change 2',
          description: 'Second change',
          reason: 'Site Conditions',
          costImpact: 8000,
          timeImpact: 5,
        },
        testUser.id
      );

      await service.submitForApproval(co2.id);
      await service.approveChangeOrder(co2.id, testUser.id);

      const summary = await service.getCOSummary(testProject.id);

      expect(summary.totalCOs).toBe(2);
      expect(summary.totalCostImpact).toBe(13000);
      expect(summary.approvedCostImpact).toBe(8000);
      expect(summary.totalTimeImpact).toBe(8);
      expect(summary.approvedTimeImpact).toBe(5);
      expect(summary.byStatus.DRAFT).toBe(1);
      expect(summary.byStatus.APPROVED).toBe(1);
    });
  });

  describe('getPendingApprovals', () => {
    it('should find COs pending approval', async () => {
      const co1 = await service.createChangeOrder(
        {
          projectId: testProject.id,
          title: 'Pending 1',
          description: 'First pending',
          reason: 'Client Request',
          costImpact: 2000,
          timeImpact: 2,
        },
        testUser.id
      );

      const co2 = await service.createChangeOrder(
        {
          projectId: testProject.id,
          title: 'Pending 2',
          description: 'Second pending',
          reason: 'Design Change',
          costImpact: 3000,
          timeImpact: 3,
        },
        testUser.id
      );

      await service.submitForApproval(co1.id);
      await service.submitForApproval(co2.id);

      const pending = await service.getPendingApprovals(testProject.id);

      expect(pending.length).toBe(2);
      expect(pending[0].status).toBe('PENDING_APPROVAL');
      expect(pending[1].status).toBe('PENDING_APPROVAL');
    });
  });

  describe('getCOsByReason', () => {
    it('should group COs by reason', async () => {
      await service.createChangeOrder(
        {
          projectId: testProject.id,
          title: 'Client Request 1',
          description: 'First client request',
          reason: 'Client Request',
          costImpact: 2000,
          timeImpact: 2,
        },
        testUser.id
      );

      await service.createChangeOrder(
        {
          projectId: testProject.id,
          title: 'Client Request 2',
          description: 'Second client request',
          reason: 'Client Request',
          costImpact: 3000,
          timeImpact: 3,
        },
        testUser.id
      );

      await service.createChangeOrder(
        {
          projectId: testProject.id,
          title: 'Site Condition',
          description: 'Site issue',
          reason: 'Site Conditions',
          costImpact: 5000,
          timeImpact: 5,
        },
        testUser.id
      );

      const byReason = await service.getCOsByReason(testProject.id);

      expect(byReason.length).toBe(2);

      const clientRequests = byReason.find(r => r.reason === 'Client Request');
      expect(clientRequests?.count).toBe(2);
      expect(clientRequests?.totalCost).toBe(5000);
      expect(clientRequests?.totalTime).toBe(5);

      const siteConditions = byReason.find(r => r.reason === 'Site Conditions');
      expect(siteConditions?.count).toBe(1);
      expect(siteConditions?.totalCost).toBe(5000);
      expect(siteConditions?.totalTime).toBe(5);
    });
  });

  describe('exportCOsToCSV', () => {
    it('should generate CSV with all COs', async () => {
      await service.createChangeOrder(
        {
          projectId: testProject.id,
          title: 'Export Test',
          description: 'Test CSV export',
          reason: 'Testing',
          costImpact: 1000,
          timeImpact: 1,
        },
        testUser.id
      );

      const csv = await service.exportCOsToCSV(testProject.id);

      expect(csv).toContain('CO Number,Title,Status,Requested By,Cost Impact,Time Impact (days),Requested Date,Approved Date,Approved By');
      expect(csv).toContain('Export Test');
      expect(csv).toContain('DRAFT');
      expect(csv).toContain('CO Tester');
      expect(csv).toContain('1000');
    });
  });

  describe('listChangeOrders', () => {
    it('should filter by status', async () => {
      const co1 = await service.createChangeOrder(
        {
          projectId: testProject.id,
          title: 'Draft CO',
          description: 'Draft change',
          reason: 'Testing',
          costImpact: 1000,
          timeImpact: 1,
        },
        testUser.id
      );

      const co2 = await service.createChangeOrder(
        {
          projectId: testProject.id,
          title: 'Approved CO',
          description: 'Approved change',
          reason: 'Testing',
          costImpact: 2000,
          timeImpact: 2,
        },
        testUser.id
      );

      await service.approveChangeOrder(co2.id, testUser.id);

      const drafts = await service.listChangeOrders(testProject.id, {
        status: 'DRAFT',
      });

      expect(drafts.length).toBe(1);
      expect(drafts[0].status).toBe('DRAFT');
    });
  });
});
