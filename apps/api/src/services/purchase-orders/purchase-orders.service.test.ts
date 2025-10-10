import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { PrismaClient } from '../../generated/prisma';
import { setupTestDatabase, cleanupTestDatabase } from '../../test-helpers/database';
import { PurchaseOrdersService } from './purchase-orders.service';

describe('PurchaseOrdersService', () => {
  let prisma: PrismaClient;
  let service: PurchaseOrdersService;
  let testUser: any;
  let testCompany: any;
  let testProject: any;
  let testSupplier: any;

  beforeAll(async () => {
    prisma = await setupTestDatabase();
    service = new PurchaseOrdersService(prisma);

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
        email: 'po@test.com',
        password: 'hashedpassword',
        firstName: 'PO',
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
      },
    });

    testSupplier = await prisma.supplier.create({
      data: {
        name: 'Building Supply Co',
        companyId: testCompany.id,
        email: 'supplier@building.com',
        phone: '555-0500',
        address: '123 Supply St',
      },
    });
  });

  afterEach(async () => {
    await prisma.purchaseOrderItem.deleteMany({});
    await prisma.purchaseOrder.deleteMany({});
  });

  describe('createPurchaseOrder', () => {
    it('should create PO with auto-generated number', async () => {
      const po = await service.createPurchaseOrder(
        {
          projectId: testProject.id,
          supplierId: testSupplier.id,
          deliveryAddress: '456 Job Site Ave',
        },
        testUser.id
      );

      expect(po.poNumber).toMatch(/^PO-[A-Z0-9]+-001$/);
      expect(po.status).toBe('DRAFT');
      expect(Number(po.subtotal)).toBe(0);
      expect(Number(po.total)).toBe(0);
    });

    it('should increment PO numbers sequentially', async () => {
      const po1 = await service.createPurchaseOrder(
        {
          projectId: testProject.id,
          supplierId: testSupplier.id,
        },
        testUser.id
      );

      const po2 = await service.createPurchaseOrder(
        {
          projectId: testProject.id,
          supplierId: testSupplier.id,
        },
        testUser.id
      );

      expect(po1.poNumber).toMatch(/-001$/);
      expect(po2.poNumber).toMatch(/-002$/);
    });
  });

  describe('addLineItem', () => {
    it('should add line item and recalculate totals', async () => {
      const po = await service.createPurchaseOrder(
        {
          projectId: testProject.id,
          supplierId: testSupplier.id,
        },
        testUser.id
      );

      await service.addLineItem(po.id, {
        description: '2x4 Lumber',
        quantity: 100,
        unit: 'pieces',
        unitPrice: 5.50,
      });

      const updated = await service.getPurchaseOrder(po.id);
      expect(Number(updated.subtotal)).toBe(550); // 100 * 5.50
      expect(Number(updated.total)).toBe(550); // subtotal + tax (tax is 0)
    });

    it('should handle multiple line items', async () => {
      const po = await service.createPurchaseOrder(
        {
          projectId: testProject.id,
          supplierId: testSupplier.id,
        },
        testUser.id
      );

      await service.addLineItem(po.id, {
        description: 'Cement',
        quantity: 50,
        unit: 'bags',
        unitPrice: 10,
      });

      await service.addLineItem(po.id, {
        description: 'Rebar',
        quantity: 200,
        unit: 'feet',
        unitPrice: 2.50,
      });

      const updated = await service.getPurchaseOrder(po.id);
      expect(updated.lineItems.length).toBe(2);
      expect(Number(updated.subtotal)).toBe(1000); // 500 + 500
    });
  });

  describe('updateLineItem', () => {
    it('should update line item and recalculate', async () => {
      const po = await service.createPurchaseOrder(
        {
          projectId: testProject.id,
          supplierId: testSupplier.id,
        },
        testUser.id
      );

      const item = await service.addLineItem(po.id, {
        description: 'Paint',
        quantity: 10,
        unit: 'gallons',
        unitPrice: 30,
      });

      await service.updateLineItem(item.id, {
        quantity: 15,
        unitPrice: 35,
      });

      const updated = await service.getPurchaseOrder(po.id);
      expect(Number(updated.subtotal)).toBe(525); // 15 * 35
    });
  });

  describe('deleteLineItem', () => {
    it('should delete line item and recalculate totals', async () => {
      const po = await service.createPurchaseOrder(
        {
          projectId: testProject.id,
          supplierId: testSupplier.id,
        },
        testUser.id
      );

      const item1 = await service.addLineItem(po.id, {
        description: 'Item 1',
        quantity: 10,
        unit: 'units',
        unitPrice: 50,
      });

      await service.addLineItem(po.id, {
        description: 'Item 2',
        quantity: 5,
        unit: 'units',
        unitPrice: 100,
      });

      await service.deleteLineItem(item1.id);

      const updated = await service.getPurchaseOrder(po.id);
      expect(updated.lineItems.length).toBe(1);
      expect(Number(updated.subtotal)).toBe(500); // Only second item remains
    });
  });

  describe('receiveItems', () => {
    it('should update received quantity', async () => {
      const po = await service.createPurchaseOrder(
        {
          projectId: testProject.id,
          supplierId: testSupplier.id,
        },
        testUser.id
      );

      const item = await service.addLineItem(po.id, {
        description: 'Lumber',
        quantity: 100,
        unit: 'pieces',
        unitPrice: 5,
      });

      const received = await service.receiveItems(po.id, item.id, 50);

      expect(Number(received.receivedQty)).toBe(50);
    });

    it('should update PO status to PARTIALLY_RECEIVED', async () => {
      const po = await service.createPurchaseOrder(
        {
          projectId: testProject.id,
          supplierId: testSupplier.id,
        },
        testUser.id
      );

      const item = await service.addLineItem(po.id, {
        description: 'Materials',
        quantity: 100,
        unit: 'units',
        unitPrice: 10,
      });

      await service.sendPO(po.id);
      await service.receiveItems(po.id, item.id, 50);

      const updated = await service.getPurchaseOrder(po.id);
      expect(updated.status).toBe('PARTIALLY_RECEIVED');
    });

    it('should update PO status to RECEIVED when all items received', async () => {
      const po = await service.createPurchaseOrder(
        {
          projectId: testProject.id,
          supplierId: testSupplier.id,
        },
        testUser.id
      );

      const item = await service.addLineItem(po.id, {
        description: 'Materials',
        quantity: 100,
        unit: 'units',
        unitPrice: 10,
      });

      await service.sendPO(po.id);
      await service.receiveItems(po.id, item.id, 100);

      const updated = await service.getPurchaseOrder(po.id);
      expect(updated.status).toBe('RECEIVED');
    });
  });

  describe('sendPO', () => {
    it('should update status to SENT', async () => {
      const po = await service.createPurchaseOrder(
        {
          projectId: testProject.id,
          supplierId: testSupplier.id,
        },
        testUser.id
      );

      const sent = await service.sendPO(po.id);

      expect(sent.status).toBe('SENT');
    });
  });

  describe('approvePO', () => {
    it('should approve PO and set approver', async () => {
      const po = await service.createPurchaseOrder(
        {
          projectId: testProject.id,
          supplierId: testSupplier.id,
        },
        testUser.id
      );

      const approved = await service.approvePO(po.id, testUser.id);

      expect(approved.approvedBy).toBe(testUser.id);
      expect(approved.approvedAt).toBeTruthy();
    });
  });

  describe('cancelPO', () => {
    it('should cancel PO', async () => {
      const po = await service.createPurchaseOrder(
        {
          projectId: testProject.id,
          supplierId: testSupplier.id,
        },
        testUser.id
      );

      const cancelled = await service.cancelPO(po.id);

      expect(cancelled.status).toBe('CANCELLED');
    });
  });

  describe('getPOSummary', () => {
    it('should provide comprehensive summary', async () => {
      const po1 = await service.createPurchaseOrder(
        {
          projectId: testProject.id,
          supplierId: testSupplier.id,
        },
        testUser.id
      );

      await service.addLineItem(po1.id, {
        description: 'Item',
        quantity: 10,
        unit: 'units',
        unitPrice: 100,
      });

      const po2 = await service.createPurchaseOrder(
        {
          projectId: testProject.id,
          supplierId: testSupplier.id,
        },
        testUser.id
      );

      const item2 = await service.addLineItem(po2.id, {
        description: 'Item',
        quantity: 5,
        unit: 'units',
        unitPrice: 200,
      });

      await service.sendPO(po2.id);
      await service.receiveItems(po2.id, item2.id, 5);

      const summary = await service.getPOSummary(testProject.id);

      expect(summary.totalPOs).toBe(2);
      expect(summary.totalOrdered).toBe(2000); // 1000 + 1000
      expect(summary.byStatus.DRAFT).toBe(1);
      expect(summary.byStatus.RECEIVED).toBe(1);
    });
  });

  describe('getUnreceivedItems', () => {
    it('should find items pending receiving', async () => {
      const po = await service.createPurchaseOrder(
        {
          projectId: testProject.id,
          supplierId: testSupplier.id,
          deliveryDate: new Date('2025-12-01'),
        },
        testUser.id
      );

      const item = await service.addLineItem(po.id, {
        description: 'Pending Materials',
        quantity: 100,
        unit: 'units',
        unitPrice: 10,
      });

      await service.sendPO(po.id);
      await service.receiveItems(po.id, item.id, 30);

      const unreceived = await service.getUnreceivedItems(testProject.id);

      expect(unreceived.length).toBe(1);
      expect(unreceived[0].item).toBe('Pending Materials');
      expect(unreceived[0].ordered).toBe(100);
      expect(unreceived[0].received).toBe(30);
      expect(unreceived[0].outstanding).toBe(70);
    });
  });

  describe('listPurchaseOrders', () => {
    it('should filter by status', async () => {
      const po1 = await service.createPurchaseOrder(
        {
          projectId: testProject.id,
          supplierId: testSupplier.id,
        },
        testUser.id
      );

      const po2 = await service.createPurchaseOrder(
        {
          projectId: testProject.id,
          supplierId: testSupplier.id,
        },
        testUser.id
      );

      await service.sendPO(po2.id);

      const drafts = await service.listPurchaseOrders(testProject.id, {
        status: 'DRAFT',
      });

      expect(drafts.length).toBe(1);
      expect(drafts[0].status).toBe('DRAFT');
    });

    it('should filter by supplier', async () => {
      const supplier2 = await prisma.supplier.create({
        data: {
          name: 'Another Supplier',
          companyId: testCompany.id,
          email: 'supplier2@test.com',
        },
      });

      await service.createPurchaseOrder(
        {
          projectId: testProject.id,
          supplierId: testSupplier.id,
        },
        testUser.id
      );

      await service.createPurchaseOrder(
        {
          projectId: testProject.id,
          supplierId: supplier2.id,
        },
        testUser.id
      );

      const filtered = await service.listPurchaseOrders(testProject.id, {
        supplierId: testSupplier.id,
      });

      expect(filtered.length).toBe(1);
      expect(filtered[0].supplier.id).toBe(testSupplier.id);
    });
  });
});
