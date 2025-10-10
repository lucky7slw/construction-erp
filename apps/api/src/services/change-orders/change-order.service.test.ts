import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '../../generated/prisma';
import { ChangeOrderService } from './change-order.service';
import { setupTestDatabase, cleanupTestDatabase } from '../../test-helpers/database';
import { createTestCompany, createTestUser, createTestProject } from '../../test-helpers/factories';

describe('ChangeOrderService', () => {
  let prisma: PrismaClient;
  let service: ChangeOrderService;
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

    service = new ChangeOrderService(prisma);
  });

  afterEach(async () => {
    await cleanupTestDatabase(prisma);
  });

  describe('createChangeOrder', () => {
    it('should create a change order with line items', async () => {
      const co = await service.createChangeOrder(
        {
          projectId: testProject.id,
          title: 'Add Bathroom Upgrade',
          description: 'Client wants upgraded fixtures',
          reason: 'Client request',
          timeImpact: 5,
          lineItems: [
            {
              description: 'Premium Vanity',
              quantity: 1,
              unit: 'unit',
              unitPrice: 2500,
            },
            {
              description: 'Upgraded Tile',
              quantity: 50,
              unit: 'sqft',
              unitPrice: 15,
            },
          ],
        },
        testUser.id
      );

      expect(co.id).toBeDefined();
      expect(co.coNumber).toMatch(/^CO-\d{4}-\d{4}$/);
      expect(co.status).toBe('DRAFT');
      expect(co.title).toBe('Add Bathroom Upgrade');
      expect(Number(co.costImpact)).toBe(3250); // 2500 + (50 * 15)
      expect(co.timeImpact).toBe(5);
      expect(co.lineItems).toHaveLength(2);
      expect(co.lineItems[0].description).toBe('Premium Vanity');
      expect(Number(co.lineItems[0].total)).toBe(2500);
    });

    it('should throw error if project not found', async () => {
      await expect(
        service.createChangeOrder(
          {
            projectId: 'invalid-id',
            title: 'Test CO',
            description: 'Test',
            reason: 'Test',
            timeImpact: 0,
            lineItems: [],
          },
          testUser.id
        )
      ).rejects.toThrow('Project not found');
    });
  });

  describe('getChangeOrder', () => {
    it('should get change order by id', async () => {
      const created = await service.createChangeOrder(
        {
          projectId: testProject.id,
          title: 'Test CO',
          description: 'Test Description',
          reason: 'Test Reason',
          timeImpact: 3,
          lineItems: [
            {
              description: 'Item 1',
              quantity: 10,
              unit: 'units',
              unitPrice: 50,
            },
          ],
        },
        testUser.id
      );

      const co = await service.getChangeOrder(created.id);

      expect(co.id).toBe(created.id);
      expect(co.project.name).toBe('Test Project');
      expect(co.requester.email).toBe(testUser.email);
    });

    it('should throw error if CO not found', async () => {
      await expect(service.getChangeOrder('invalid-id')).rejects.toThrow(
        'Change order not found'
      );
    });
  });

  describe('updateChangeOrder', () => {
    it('should update CO details', async () => {
      const co = await service.createChangeOrder(
        {
          projectId: testProject.id,
          title: 'Original Title',
          description: 'Original Description',
          reason: 'Original Reason',
          timeImpact: 2,
          lineItems: [
            {
              description: 'Item 1',
              quantity: 5,
              unit: 'units',
              unitPrice: 100,
            },
          ],
        },
        testUser.id
      );

      const updated = await service.updateChangeOrder(co.id, {
        title: 'Updated Title',
        description: 'Updated Description',
        timeImpact: 7,
      });

      expect(updated.title).toBe('Updated Title');
      expect(updated.description).toBe('Updated Description');
      expect(updated.timeImpact).toBe(7);
    });

    it('should update line items and recalculate cost', async () => {
      const co = await service.createChangeOrder(
        {
          projectId: testProject.id,
          title: 'Test CO',
          description: 'Test',
          reason: 'Test',
          timeImpact: 1,
          lineItems: [
            {
              description: 'Original Item',
              quantity: 10,
              unit: 'units',
              unitPrice: 50,
            },
          ],
        },
        testUser.id
      );

      const updated = await service.updateChangeOrder(co.id, {
        lineItems: [
          {
            description: 'New Item 1',
            quantity: 5,
            unit: 'units',
            unitPrice: 100,
          },
          {
            description: 'New Item 2',
            quantity: 20,
            unit: 'units',
            unitPrice: 25,
          },
        ],
      });

      expect(updated.lineItems).toHaveLength(2);
      expect(Number(updated.costImpact)).toBe(1000); // (5 * 100) + (20 * 25)
    });

    it('should throw error if CO not in draft status', async () => {
      const co = await service.createChangeOrder(
        {
          projectId: testProject.id,
          title: 'Test CO',
          description: 'Test',
          reason: 'Test',
          timeImpact: 1,
          lineItems: [
            {
              description: 'Item',
              quantity: 1,
              unit: 'unit',
              unitPrice: 100,
            },
          ],
        },
        testUser.id
      );

      await service.submitForApproval(co.id);

      await expect(
        service.updateChangeOrder(co.id, { title: 'Try to update' })
      ).rejects.toThrow('Can only update draft change orders');
    });
  });

  describe('deleteChangeOrder', () => {
    it('should delete draft change order', async () => {
      const co = await service.createChangeOrder(
        {
          projectId: testProject.id,
          title: 'To Delete',
          description: 'Test',
          reason: 'Test',
          timeImpact: 1,
          lineItems: [
            {
              description: 'Item',
              quantity: 1,
              unit: 'unit',
              unitPrice: 100,
            },
          ],
        },
        testUser.id
      );

      const result = await service.deleteChangeOrder(co.id);

      expect(result.success).toBe(true);

      await expect(service.getChangeOrder(co.id)).rejects.toThrow(
        'Change order not found'
      );
    });

    it('should throw error if CO not in draft status', async () => {
      const co = await service.createChangeOrder(
        {
          projectId: testProject.id,
          title: 'Test CO',
          description: 'Test',
          reason: 'Test',
          timeImpact: 1,
          lineItems: [
            {
              description: 'Item',
              quantity: 1,
              unit: 'unit',
              unitPrice: 100,
            },
          ],
        },
        testUser.id
      );

      await service.submitForApproval(co.id);

      await expect(service.deleteChangeOrder(co.id)).rejects.toThrow(
        'Can only delete draft change orders'
      );
    });
  });

  describe('submitForApproval', () => {
    it('should submit draft CO for approval', async () => {
      const co = await service.createChangeOrder(
        {
          projectId: testProject.id,
          title: 'Test CO',
          description: 'Test',
          reason: 'Test',
          timeImpact: 2,
          lineItems: [
            {
              description: 'Item',
              quantity: 10,
              unit: 'units',
              unitPrice: 50,
            },
          ],
        },
        testUser.id
      );

      const submitted = await service.submitForApproval(co.id);

      expect(submitted.status).toBe('PENDING_APPROVAL');
    });

    it('should throw error if CO not in draft status', async () => {
      const co = await service.createChangeOrder(
        {
          projectId: testProject.id,
          title: 'Test CO',
          description: 'Test',
          reason: 'Test',
          timeImpact: 1,
          lineItems: [
            {
              description: 'Item',
              quantity: 1,
              unit: 'unit',
              unitPrice: 100,
            },
          ],
        },
        testUser.id
      );

      await service.submitForApproval(co.id);

      await expect(service.submitForApproval(co.id)).rejects.toThrow(
        'Can only submit draft change orders'
      );
    });
  });

  describe('approveChangeOrder', () => {
    it('should approve pending CO', async () => {
      const co = await service.createChangeOrder(
        {
          projectId: testProject.id,
          title: 'Test CO',
          description: 'Test',
          reason: 'Test',
          timeImpact: 3,
          lineItems: [
            {
              description: 'Item',
              quantity: 5,
              unit: 'units',
              unitPrice: 200,
            },
          ],
        },
        testUser.id
      );

      await service.submitForApproval(co.id);

      const approved = await service.approveChangeOrder(co.id, testUser.id);

      expect(approved.status).toBe('APPROVED');
      expect(approved.approver?.id).toBe(testUser.id);
      expect(approved.approvedAt).toBeDefined();
      expect(approved.approver?.firstName).toBe('Test');
    });

    it('should throw error if CO not pending', async () => {
      const co = await service.createChangeOrder(
        {
          projectId: testProject.id,
          title: 'Test CO',
          description: 'Test',
          reason: 'Test',
          timeImpact: 1,
          lineItems: [
            {
              description: 'Item',
              quantity: 1,
              unit: 'unit',
              unitPrice: 100,
            },
          ],
        },
        testUser.id
      );

      await expect(service.approveChangeOrder(co.id, testUser.id)).rejects.toThrow(
        'Can only approve pending change orders'
      );
    });
  });

  describe('rejectChangeOrder', () => {
    it('should reject pending CO', async () => {
      const co = await service.createChangeOrder(
        {
          projectId: testProject.id,
          title: 'Test CO',
          description: 'Test',
          reason: 'Test',
          timeImpact: 1,
          lineItems: [
            {
              description: 'Item',
              quantity: 1,
              unit: 'unit',
              unitPrice: 500,
            },
          ],
        },
        testUser.id
      );

      await service.submitForApproval(co.id);

      const rejected = await service.rejectChangeOrder(
        co.id,
        testUser.id,
        'Out of budget'
      );

      expect(rejected.status).toBe('REJECTED');
      expect(rejected.notes).toBe('Out of budget');
    });

    it('should throw error if CO not pending', async () => {
      const co = await service.createChangeOrder(
        {
          projectId: testProject.id,
          title: 'Test CO',
          description: 'Test',
          reason: 'Test',
          timeImpact: 1,
          lineItems: [
            {
              description: 'Item',
              quantity: 1,
              unit: 'unit',
              unitPrice: 100,
            },
          ],
        },
        testUser.id
      );

      await expect(
        service.rejectChangeOrder(co.id, testUser.id, 'Reason')
      ).rejects.toThrow('Can only reject pending change orders');
    });
  });

  describe('implementChangeOrder', () => {
    it('should implement approved CO and update project budget', async () => {
      const co = await service.createChangeOrder(
        {
          projectId: testProject.id,
          title: 'Budget Increase CO',
          description: 'Test',
          reason: 'Test',
          timeImpact: 2,
          lineItems: [
            {
              description: 'Item',
              quantity: 10,
              unit: 'units',
              unitPrice: 150,
            },
          ],
        },
        testUser.id
      );

      await service.submitForApproval(co.id);
      await service.approveChangeOrder(co.id, testUser.id);

      const implemented = await service.implementChangeOrder(co.id);

      expect(implemented.status).toBe('IMPLEMENTED');

      // Check project budget was updated
      const updatedProject = await prisma.project.findUnique({
        where: { id: testProject.id },
      });

      expect(Number(updatedProject?.budget)).toBe(101500); // 100000 + 1500
    });

    it('should throw error if CO not approved', async () => {
      const co = await service.createChangeOrder(
        {
          projectId: testProject.id,
          title: 'Test CO',
          description: 'Test',
          reason: 'Test',
          timeImpact: 1,
          lineItems: [
            {
              description: 'Item',
              quantity: 1,
              unit: 'unit',
              unitPrice: 100,
            },
          ],
        },
        testUser.id
      );

      await expect(service.implementChangeOrder(co.id)).rejects.toThrow(
        'Can only implement approved change orders'
      );
    });
  });

  describe('cancelChangeOrder', () => {
    it('should cancel CO', async () => {
      const co = await service.createChangeOrder(
        {
          projectId: testProject.id,
          title: 'Test CO',
          description: 'Test',
          reason: 'Test',
          timeImpact: 1,
          lineItems: [
            {
              description: 'Item',
              quantity: 1,
              unit: 'unit',
              unitPrice: 100,
            },
          ],
        },
        testUser.id
      );

      const cancelled = await service.cancelChangeOrder(co.id);

      expect(cancelled.status).toBe('CANCELLED');
    });

    it('should throw error if CO is implemented', async () => {
      const co = await service.createChangeOrder(
        {
          projectId: testProject.id,
          title: 'Test CO',
          description: 'Test',
          reason: 'Test',
          timeImpact: 1,
          lineItems: [
            {
              description: 'Item',
              quantity: 1,
              unit: 'unit',
              unitPrice: 100,
            },
          ],
        },
        testUser.id
      );

      await service.submitForApproval(co.id);
      await service.approveChangeOrder(co.id, testUser.id);
      await service.implementChangeOrder(co.id);

      await expect(service.cancelChangeOrder(co.id)).rejects.toThrow(
        'Cannot cancel implemented change orders'
      );
    });
  });

  describe('getProjectChangeOrders', () => {
    it('should get all COs for a project', async () => {
      await service.createChangeOrder(
        {
          projectId: testProject.id,
          title: 'CO 1',
          description: 'Test',
          reason: 'Test',
          timeImpact: 1,
          lineItems: [
            {
              description: 'Item 1',
              quantity: 5,
              unit: 'units',
              unitPrice: 50,
            },
          ],
        },
        testUser.id
      );

      await service.createChangeOrder(
        {
          projectId: testProject.id,
          title: 'CO 2',
          description: 'Test',
          reason: 'Test',
          timeImpact: 2,
          lineItems: [
            {
              description: 'Item 2',
              quantity: 10,
              unit: 'units',
              unitPrice: 30,
            },
          ],
        },
        testUser.id
      );

      const cos = await service.getProjectChangeOrders(testProject.id);

      expect(cos).toHaveLength(2);
    });

    it('should filter by status', async () => {
      const co1 = await service.createChangeOrder(
        {
          projectId: testProject.id,
          title: 'CO 1',
          description: 'Test',
          reason: 'Test',
          timeImpact: 1,
          lineItems: [
            {
              description: 'Item',
              quantity: 1,
              unit: 'unit',
              unitPrice: 100,
            },
          ],
        },
        testUser.id
      );

      const co2 = await service.createChangeOrder(
        {
          projectId: testProject.id,
          title: 'CO 2',
          description: 'Test',
          reason: 'Test',
          timeImpact: 1,
          lineItems: [
            {
              description: 'Item',
              quantity: 1,
              unit: 'unit',
              unitPrice: 200,
            },
          ],
        },
        testUser.id
      );

      await service.submitForApproval(co1.id);

      const draftCOs = await service.getProjectChangeOrders(testProject.id, {
        status: 'DRAFT',
      });

      const pendingCOs = await service.getProjectChangeOrders(testProject.id, {
        status: 'PENDING_APPROVAL',
      });

      expect(draftCOs).toHaveLength(1);
      expect(draftCOs[0].id).toBe(co2.id);
      expect(pendingCOs).toHaveLength(1);
      expect(pendingCOs[0].id).toBe(co1.id);
    });
  });

  describe('getChangeOrderStats', () => {
    it('should calculate CO statistics', async () => {
      const co1 = await service.createChangeOrder(
        {
          projectId: testProject.id,
          title: 'CO 1',
          description: 'Test',
          reason: 'Test',
          timeImpact: 5,
          lineItems: [
            {
              description: 'Item',
              quantity: 10,
              unit: 'units',
              unitPrice: 100,
            },
          ],
        },
        testUser.id
      );

      const co2 = await service.createChangeOrder(
        {
          projectId: testProject.id,
          title: 'CO 2',
          description: 'Test',
          reason: 'Test',
          timeImpact: 3,
          lineItems: [
            {
              description: 'Item',
              quantity: 5,
              unit: 'units',
              unitPrice: 200,
            },
          ],
        },
        testUser.id
      );

      const co3 = await service.createChangeOrder(
        {
          projectId: testProject.id,
          title: 'CO 3',
          description: 'Test',
          reason: 'Test',
          timeImpact: 2,
          lineItems: [
            {
              description: 'Item',
              quantity: 20,
              unit: 'units',
              unitPrice: 50,
            },
          ],
        },
        testUser.id
      );

      // Approve CO1
      await service.submitForApproval(co1.id);
      await service.approveChangeOrder(co1.id, testUser.id);

      // Reject CO2
      await service.submitForApproval(co2.id);
      await service.rejectChangeOrder(co2.id, testUser.id, 'Over budget');

      // Keep CO3 as draft

      const stats = await service.getChangeOrderStats(testProject.id);

      expect(stats.totalCOs).toBe(3);
      expect(stats.totalCostImpact).toBe(3000); // 1000 + 1000 + 1000
      expect(stats.totalTimeImpact).toBe(10); // 5 + 3 + 2
      expect(stats.byStatus['DRAFT']).toBe(1);
      expect(stats.byStatus['APPROVED']).toBe(1);
      expect(stats.byStatus['REJECTED']).toBe(1);
      expect(stats.approvedCost).toBe(1000);
      expect(stats.approvalRate).toBe(50); // 1 approved, 1 rejected = 50%
    });
  });
});
