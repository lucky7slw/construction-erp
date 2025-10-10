import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '../../generated/prisma';
import { PurchaseOrderService } from './purchase-order.service';
import { setupTestDatabase, cleanupTestDatabase } from '../../test-helpers/database';
import { createTestCompany, createTestUser, createTestProject } from '../../test-helpers/factories';

describe('PurchaseOrderService', () => {
  let prisma: PrismaClient;
  let service: PurchaseOrderService;
  let testCompany: any;
  let testUser: any;
  let testProject: any;
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
    testProject = await createTestProject(prisma, {
      name: 'Test Project',
      companyId: testCompany.id,
      createdById: testUser.id,
    });

    // Create a test supplier
    testSupplier = await prisma.supplier.create({
      data: {
        name: 'Test Supplier',
        companyId: testCompany.id,
        email: 'supplier@test.com',
        phone: '555-1234',
      },
    });

    service = new PurchaseOrderService(prisma);
  });

  afterEach(async () => {
    await cleanupTestDatabase(prisma);
  });

  describe('createPurchaseOrder', () => {
    it('should create a purchase order with line items', async () => {
      const po = await service.createPurchaseOrder(
        {
          projectId: testProject.id,
          supplierId: testSupplier.id,
          deliveryDate: new Date('2025-11-01'),
          deliveryAddress: '123 Main St',
          notes: 'Deliver to job site',
          lineItems: [
            {
              description: '2x4 Lumber',
              quantity: 100,
              unit: 'pcs',
              unitPrice: 5.5,
            },
            {
              description: 'Concrete Mix',
              quantity: 50,
              unit: 'bags',
              unitPrice: 12.0,
            },
          ],
        },
        testUser.id
      );

      expect(po.id).toBeDefined();
      expect(po.poNumber).toMatch(/^PO-\d{4}-\d{4}$/);
      expect(po.status).toBe('DRAFT');
      expect(Number(po.subtotal)).toBe(1150); // (100 * 5.5) + (50 * 12)
      expect(Number(po.total)).toBe(1150);
      expect(po.lineItems).toHaveLength(2);
      expect(po.lineItems[0].description).toBe('2x4 Lumber');
      expect(Number(po.lineItems[0].quantity)).toBe(100);
      expect(Number(po.lineItems[0].unitPrice)).toBe(5.5);
      expect(Number(po.lineItems[0].total)).toBe(550);
    });

    it('should link line items to tasks', async () => {
      const task = await prisma.task.create({
        data: {
          title: 'Frame walls',
          projectId: testProject.id,
          status: 'TODO',
        },
      });

      const po = await service.createPurchaseOrder(
        {
          projectId: testProject.id,
          supplierId: testSupplier.id,
          lineItems: [
            {
              description: 'Framing lumber',
              quantity: 200,
              unit: 'pcs',
              unitPrice: 6.0,
              taskId: task.id,
            },
          ],
        },
        testUser.id
      );

      expect(po.lineItems[0].task).toBeDefined();
      expect(po.lineItems[0].task?.id).toBe(task.id);
      expect(po.lineItems[0].task?.title).toBe('Frame walls');
    });

    it('should throw error if project not found', async () => {
      await expect(
        service.createPurchaseOrder(
          {
            projectId: 'invalid-id',
            supplierId: testSupplier.id,
            lineItems: [
              {
                description: 'Test',
                quantity: 1,
                unit: 'pcs',
                unitPrice: 10,
              },
            ],
          },
          testUser.id
        )
      ).rejects.toThrow('Project not found');
    });

    it('should throw error if supplier not found', async () => {
      await expect(
        service.createPurchaseOrder(
          {
            projectId: testProject.id,
            supplierId: 'invalid-id',
            lineItems: [
              {
                description: 'Test',
                quantity: 1,
                unit: 'pcs',
                unitPrice: 10,
              },
            ],
          },
          testUser.id
        )
      ).rejects.toThrow('Supplier not found');
    });
  });

  describe('getPurchaseOrder', () => {
    it('should get purchase order by id', async () => {
      const created = await service.createPurchaseOrder(
        {
          projectId: testProject.id,
          supplierId: testSupplier.id,
          lineItems: [
            {
              description: 'Test item',
              quantity: 10,
              unit: 'pcs',
              unitPrice: 5.0,
            },
          ],
        },
        testUser.id
      );

      const po = await service.getPurchaseOrder(created.id);

      expect(po.id).toBe(created.id);
      expect(po.supplier.name).toBe('Test Supplier');
      expect(po.project.name).toBe('Test Project');
      expect(po.createdBy.email).toBe(testUser.email);
    });

    it('should throw error if PO not found', async () => {
      await expect(service.getPurchaseOrder('invalid-id')).rejects.toThrow(
        'Purchase order not found'
      );
    });
  });

  describe('updatePurchaseOrder', () => {
    it('should update delivery details', async () => {
      const po = await service.createPurchaseOrder(
        {
          projectId: testProject.id,
          supplierId: testSupplier.id,
          lineItems: [
            {
              description: 'Item 1',
              quantity: 5,
              unit: 'pcs',
              unitPrice: 10.0,
            },
          ],
        },
        testUser.id
      );

      const updated = await service.updatePurchaseOrder(po.id, {
        deliveryDate: new Date('2025-12-01'),
        deliveryAddress: '456 Oak Ave',
        notes: 'Updated notes',
      });

      expect(updated.deliveryAddress).toBe('456 Oak Ave');
      expect(updated.notes).toBe('Updated notes');
    });

    it('should update line items and recalculate totals', async () => {
      const po = await service.createPurchaseOrder(
        {
          projectId: testProject.id,
          supplierId: testSupplier.id,
          lineItems: [
            {
              description: 'Original item',
              quantity: 10,
              unit: 'pcs',
              unitPrice: 5.0,
            },
          ],
        },
        testUser.id
      );

      const updated = await service.updatePurchaseOrder(po.id, {
        lineItems: [
          {
            description: 'New item 1',
            quantity: 20,
            unit: 'pcs',
            unitPrice: 3.0,
          },
          {
            description: 'New item 2',
            quantity: 5,
            unit: 'boxes',
            unitPrice: 25.0,
          },
        ],
      });

      expect(updated.lineItems).toHaveLength(2);
      expect(Number(updated.subtotal)).toBe(185); // (20 * 3) + (5 * 25)
      expect(Number(updated.total)).toBe(185);
    });

    it('should throw error if PO not in draft status', async () => {
      const po = await service.createPurchaseOrder(
        {
          projectId: testProject.id,
          supplierId: testSupplier.id,
          lineItems: [
            {
              description: 'Item',
              quantity: 1,
              unit: 'pcs',
              unitPrice: 10.0,
            },
          ],
        },
        testUser.id
      );

      // Approve the PO
      await service.approvePurchaseOrder(po.id, testUser.id);

      await expect(
        service.updatePurchaseOrder(po.id, {
          notes: 'Try to update',
        })
      ).rejects.toThrow('Can only update draft purchase orders');
    });
  });

  describe('deletePurchaseOrder', () => {
    it('should delete draft purchase order', async () => {
      const po = await service.createPurchaseOrder(
        {
          projectId: testProject.id,
          supplierId: testSupplier.id,
          lineItems: [
            {
              description: 'To delete',
              quantity: 1,
              unit: 'pcs',
              unitPrice: 10.0,
            },
          ],
        },
        testUser.id
      );

      const result = await service.deletePurchaseOrder(po.id);

      expect(result.success).toBe(true);

      await expect(service.getPurchaseOrder(po.id)).rejects.toThrow(
        'Purchase order not found'
      );
    });

    it('should throw error if PO not in draft status', async () => {
      const po = await service.createPurchaseOrder(
        {
          projectId: testProject.id,
          supplierId: testSupplier.id,
          lineItems: [
            {
              description: 'Item',
              quantity: 1,
              unit: 'pcs',
              unitPrice: 10.0,
            },
          ],
        },
        testUser.id
      );

      await service.approvePurchaseOrder(po.id, testUser.id);

      await expect(service.deletePurchaseOrder(po.id)).rejects.toThrow(
        'Can only delete draft purchase orders'
      );
    });
  });

  describe('approvePurchaseOrder', () => {
    it('should approve draft PO', async () => {
      const po = await service.createPurchaseOrder(
        {
          projectId: testProject.id,
          supplierId: testSupplier.id,
          lineItems: [
            {
              description: 'Item',
              quantity: 10,
              unit: 'pcs',
              unitPrice: 15.0,
            },
          ],
        },
        testUser.id
      );

      const approved = await service.approvePurchaseOrder(po.id, testUser.id);

      expect(approved.status).toBe('SENT');
      expect(approved.approvedBy).toBe(testUser.id);
      expect(approved.approvedAt).toBeDefined();
      expect(approved.approver?.firstName).toBe('Test');
    });

    it('should throw error if PO not in draft status', async () => {
      const po = await service.createPurchaseOrder(
        {
          projectId: testProject.id,
          supplierId: testSupplier.id,
          lineItems: [
            {
              description: 'Item',
              quantity: 1,
              unit: 'pcs',
              unitPrice: 10.0,
            },
          ],
        },
        testUser.id
      );

      await service.approvePurchaseOrder(po.id, testUser.id);

      await expect(service.approvePurchaseOrder(po.id, testUser.id)).rejects.toThrow(
        'Can only approve draft purchase orders'
      );
    });
  });

  describe('receiveItems', () => {
    it('should receive partial quantity', async () => {
      const po = await service.createPurchaseOrder(
        {
          projectId: testProject.id,
          supplierId: testSupplier.id,
          lineItems: [
            {
              description: 'Lumber',
              quantity: 100,
              unit: 'pcs',
              unitPrice: 5.0,
            },
          ],
        },
        testUser.id
      );

      await service.approvePurchaseOrder(po.id, testUser.id);

      const itemId = po.lineItems[0].id;

      const received = await service.receiveItems(po.id, [
        {
          itemId,
          quantityReceived: 50,
        },
      ]);

      expect(received.status).toBe('PARTIALLY_RECEIVED');
      expect(Number(received.lineItems[0].receivedQty)).toBe(50);
    });

    it('should mark as received when all items received', async () => {
      const po = await service.createPurchaseOrder(
        {
          projectId: testProject.id,
          supplierId: testSupplier.id,
          lineItems: [
            {
              description: 'Item 1',
              quantity: 10,
              unit: 'pcs',
              unitPrice: 5.0,
            },
            {
              description: 'Item 2',
              quantity: 20,
              unit: 'pcs',
              unitPrice: 3.0,
            },
          ],
        },
        testUser.id
      );

      await service.approvePurchaseOrder(po.id, testUser.id);

      const item1Id = po.lineItems[0].id;
      const item2Id = po.lineItems[1].id;

      const received = await service.receiveItems(po.id, [
        { itemId: item1Id, quantityReceived: 10 },
        { itemId: item2Id, quantityReceived: 20 },
      ]);

      expect(received.status).toBe('RECEIVED');
    });

    it('should allow multiple partial receipts', async () => {
      const po = await service.createPurchaseOrder(
        {
          projectId: testProject.id,
          supplierId: testSupplier.id,
          lineItems: [
            {
              description: 'Lumber',
              quantity: 100,
              unit: 'pcs',
              unitPrice: 5.0,
            },
          ],
        },
        testUser.id
      );

      await service.approvePurchaseOrder(po.id, testUser.id);

      const itemId = po.lineItems[0].id;

      await service.receiveItems(po.id, [
        { itemId, quantityReceived: 30 },
      ]);

      await service.receiveItems(po.id, [
        { itemId, quantityReceived: 40 },
      ]);

      const final = await service.receiveItems(po.id, [
        { itemId, quantityReceived: 30 },
      ]);

      expect(final.status).toBe('RECEIVED');
      expect(Number(final.lineItems[0].receivedQty)).toBe(100);
    });

    it('should throw error if receiving more than ordered', async () => {
      const po = await service.createPurchaseOrder(
        {
          projectId: testProject.id,
          supplierId: testSupplier.id,
          lineItems: [
            {
              description: 'Item',
              quantity: 10,
              unit: 'pcs',
              unitPrice: 5.0,
            },
          ],
        },
        testUser.id
      );

      await service.approvePurchaseOrder(po.id, testUser.id);

      const itemId = po.lineItems[0].id;

      await expect(
        service.receiveItems(po.id, [
          { itemId, quantityReceived: 15 },
        ])
      ).rejects.toThrow('Cannot receive more than ordered quantity');
    });

    it('should throw error if PO is draft', async () => {
      const po = await service.createPurchaseOrder(
        {
          projectId: testProject.id,
          supplierId: testSupplier.id,
          lineItems: [
            {
              description: 'Item',
              quantity: 10,
              unit: 'pcs',
              unitPrice: 5.0,
            },
          ],
        },
        testUser.id
      );

      const itemId = po.lineItems[0].id;

      await expect(
        service.receiveItems(po.id, [
          { itemId, quantityReceived: 5 },
        ])
      ).rejects.toThrow('Cannot receive items for draft or cancelled POs');
    });

    it('should throw error if item not found', async () => {
      const po = await service.createPurchaseOrder(
        {
          projectId: testProject.id,
          supplierId: testSupplier.id,
          lineItems: [
            {
              description: 'Item',
              quantity: 10,
              unit: 'pcs',
              unitPrice: 5.0,
            },
          ],
        },
        testUser.id
      );

      await service.approvePurchaseOrder(po.id, testUser.id);

      await expect(
        service.receiveItems(po.id, [
          { itemId: 'invalid-id', quantityReceived: 5 },
        ])
      ).rejects.toThrow('Line item invalid-id not found');
    });
  });

  describe('getProjectPurchaseOrders', () => {
    it('should get all POs for a project', async () => {
      await service.createPurchaseOrder(
        {
          projectId: testProject.id,
          supplierId: testSupplier.id,
          lineItems: [
            {
              description: 'Item 1',
              quantity: 10,
              unit: 'pcs',
              unitPrice: 5.0,
            },
          ],
        },
        testUser.id
      );

      await service.createPurchaseOrder(
        {
          projectId: testProject.id,
          supplierId: testSupplier.id,
          lineItems: [
            {
              description: 'Item 2',
              quantity: 20,
              unit: 'pcs',
              unitPrice: 3.0,
            },
          ],
        },
        testUser.id
      );

      const pos = await service.getProjectPurchaseOrders(testProject.id);

      expect(pos).toHaveLength(2);
    });

    it('should filter by status', async () => {
      const po1 = await service.createPurchaseOrder(
        {
          projectId: testProject.id,
          supplierId: testSupplier.id,
          lineItems: [
            {
              description: 'Item 1',
              quantity: 10,
              unit: 'pcs',
              unitPrice: 5.0,
            },
          ],
        },
        testUser.id
      );

      const po2 = await service.createPurchaseOrder(
        {
          projectId: testProject.id,
          supplierId: testSupplier.id,
          lineItems: [
            {
              description: 'Item 2',
              quantity: 20,
              unit: 'pcs',
              unitPrice: 3.0,
            },
          ],
        },
        testUser.id
      );

      await service.approvePurchaseOrder(po1.id, testUser.id);

      const draftPOs = await service.getProjectPurchaseOrders(testProject.id, {
        status: 'DRAFT',
      });

      const sentPOs = await service.getProjectPurchaseOrders(testProject.id, {
        status: 'SENT',
      });

      expect(draftPOs).toHaveLength(1);
      expect(draftPOs[0].id).toBe(po2.id);
      expect(sentPOs).toHaveLength(1);
      expect(sentPOs[0].id).toBe(po1.id);
    });

    it('should filter by supplier', async () => {
      const otherSupplier = await prisma.supplier.create({
        data: {
          name: 'Other Supplier',
          companyId: testCompany.id,
        },
      });

      await service.createPurchaseOrder(
        {
          projectId: testProject.id,
          supplierId: testSupplier.id,
          lineItems: [
            {
              description: 'Item 1',
              quantity: 10,
              unit: 'pcs',
              unitPrice: 5.0,
            },
          ],
        },
        testUser.id
      );

      await service.createPurchaseOrder(
        {
          projectId: testProject.id,
          supplierId: otherSupplier.id,
          lineItems: [
            {
              description: 'Item 2',
              quantity: 20,
              unit: 'pcs',
              unitPrice: 3.0,
            },
          ],
        },
        testUser.id
      );

      const pos = await service.getProjectPurchaseOrders(testProject.id, {
        supplierId: testSupplier.id,
      });

      expect(pos).toHaveLength(1);
      expect(pos[0].supplier.id).toBe(testSupplier.id);
    });
  });

  describe('cancelPurchaseOrder', () => {
    it('should cancel PO', async () => {
      const po = await service.createPurchaseOrder(
        {
          projectId: testProject.id,
          supplierId: testSupplier.id,
          lineItems: [
            {
              description: 'Item',
              quantity: 10,
              unit: 'pcs',
              unitPrice: 5.0,
            },
          ],
        },
        testUser.id
      );

      const cancelled = await service.cancelPurchaseOrder(po.id, testUser.id);

      expect(cancelled.status).toBe('CANCELLED');
    });

    it('should throw error if PO is received', async () => {
      const po = await service.createPurchaseOrder(
        {
          projectId: testProject.id,
          supplierId: testSupplier.id,
          lineItems: [
            {
              description: 'Item',
              quantity: 10,
              unit: 'pcs',
              unitPrice: 5.0,
            },
          ],
        },
        testUser.id
      );

      await service.approvePurchaseOrder(po.id, testUser.id);

      const itemId = po.lineItems[0].id;
      await service.receiveItems(po.id, [
        { itemId, quantityReceived: 10 },
      ]);

      await expect(service.cancelPurchaseOrder(po.id, testUser.id)).rejects.toThrow(
        'Cannot cancel received or invoiced purchase orders'
      );
    });
  });

  describe('getPurchaseOrderStats', () => {
    it('should calculate PO statistics', async () => {
      const po1 = await service.createPurchaseOrder(
        {
          projectId: testProject.id,
          supplierId: testSupplier.id,
          lineItems: [
            {
              description: 'Item 1',
              quantity: 10,
              unit: 'pcs',
              unitPrice: 100.0,
            },
          ],
        },
        testUser.id
      );

      const po2 = await service.createPurchaseOrder(
        {
          projectId: testProject.id,
          supplierId: testSupplier.id,
          lineItems: [
            {
              description: 'Item 2',
              quantity: 5,
              unit: 'pcs',
              unitPrice: 200.0,
            },
          ],
        },
        testUser.id
      );

      await service.approvePurchaseOrder(po1.id, testUser.id);

      const itemId = po1.lineItems[0].id;
      await service.receiveItems(po1.id, [
        { itemId, quantityReceived: 10 },
      ]);

      const stats = await service.getPurchaseOrderStats(testProject.id);

      expect(stats.totalPOs).toBe(2);
      expect(stats.totalValue).toBe(2000); // 1000 + 1000
      expect(stats.byStatus['DRAFT']).toBe(1);
      expect(stats.byStatus['RECEIVED']).toBe(1);
      expect(stats.pendingValue).toBe(1000);
      expect(stats.receivedValue).toBe(1000);
    });
  });
});
