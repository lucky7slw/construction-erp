import { PrismaClient, POStatus } from '../../generated/prisma';
import { WebSocketService } from '../websocket.service';

export type PurchaseOrderItemInput = {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  taskId?: string;
};

export type PurchaseOrderCreateInput = {
  projectId: string;
  supplierId: string;
  deliveryDate?: Date;
  deliveryAddress?: string;
  notes?: string;
  lineItems: PurchaseOrderItemInput[];
};

export type PurchaseOrderUpdateInput = {
  deliveryDate?: Date;
  deliveryAddress?: string;
  notes?: string;
  lineItems?: PurchaseOrderItemInput[];
};

export type ReceiveItemInput = {
  itemId: string;
  quantityReceived: number;
};

export class PurchaseOrderService {
  constructor(
    private prisma: PrismaClient,
    private wsService?: WebSocketService
  ) {}

  private async generatePONumber(): Promise<string> {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');

    // Get count of POs this month
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const count = await this.prisma.purchaseOrder.count({
      where: {
        createdAt: {
          gte: startOfMonth,
        },
      },
    });

    const sequence = (count + 1).toString().padStart(4, '0');
    return `PO-${year}${month}-${sequence}`;
  }

  async createPurchaseOrder(
    input: PurchaseOrderCreateInput,
    createdById: string
  ) {
    // Verify project and supplier exist
    const [project, supplier] = await Promise.all([
      this.prisma.project.findUnique({
        where: { id: input.projectId },
        select: { companyId: true, name: true },
      }),
      this.prisma.supplier.findUnique({
        where: { id: input.supplierId },
        select: { name: true },
      }),
    ]);

    if (!project) {
      throw new Error('Project not found');
    }

    if (!supplier) {
      throw new Error('Supplier not found');
    }

    // Calculate totals
    const subtotal = input.lineItems.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );
    const tax = subtotal * 0.0; // TODO: Make tax rate configurable
    const total = subtotal + tax;

    // Generate PO number
    const poNumber = await this.generatePONumber();

    // Create PO with line items
    const po = await this.prisma.purchaseOrder.create({
      data: {
        poNumber,
        projectId: input.projectId,
        supplierId: input.supplierId,
        status: 'DRAFT',
        subtotal,
        tax,
        total,
        deliveryDate: input.deliveryDate,
        deliveryAddress: input.deliveryAddress,
        notes: input.notes,
        createdById,
        lineItems: {
          create: input.lineItems.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitPrice,
            total: item.quantity * item.unitPrice,
            taskId: item.taskId,
          })),
        },
      },
      include: {
        lineItems: {
          include: {
            task: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
        supplier: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
            companyId: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Emit WebSocket event
    if (this.wsService) {
      this.wsService.broadcastToCompany(project.companyId, 'po:created', {
        poId: po.id,
        poNumber: po.poNumber,
        projectId: input.projectId,
        projectName: project.name,
        supplierName: supplier.name,
        total: Number(po.total),
        createdBy: po.createdBy,
        timestamp: new Date(),
      });
    }

    return po;
  }

  async getPurchaseOrder(id: string) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        lineItems: {
          include: {
            task: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
        supplier: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            address: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
            companyId: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        approver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!po) {
      throw new Error('Purchase order not found');
    }

    return po;
  }

  async updatePurchaseOrder(
    id: string,
    input: PurchaseOrderUpdateInput
  ) {
    const existing = await this.getPurchaseOrder(id);

    if (existing.status !== 'DRAFT') {
      throw new Error('Can only update draft purchase orders');
    }

    // If line items provided, recalculate totals
    let updateData: any = {
      deliveryDate: input.deliveryDate,
      deliveryAddress: input.deliveryAddress,
      notes: input.notes,
    };

    if (input.lineItems) {
      const subtotal = input.lineItems.reduce(
        (sum, item) => sum + item.quantity * item.unitPrice,
        0
      );
      const tax = subtotal * 0.0;
      const total = subtotal + tax;

      updateData = {
        ...updateData,
        subtotal,
        tax,
        total,
      };

      // Delete existing items and create new ones
      await this.prisma.purchaseOrderItem.deleteMany({
        where: { poId: id },
      });
    }

    const updated = await this.prisma.purchaseOrder.update({
      where: { id },
      data: updateData,
      include: {
        lineItems: true,
        supplier: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Create new line items if provided
    if (input.lineItems) {
      await this.prisma.purchaseOrderItem.createMany({
        data: input.lineItems.map((item) => ({
          poId: id,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          total: item.quantity * item.unitPrice,
          taskId: item.taskId,
        })),
      });
    }

    // Fetch complete updated PO
    return this.getPurchaseOrder(id);
  }

  async deletePurchaseOrder(id: string) {
    const existing = await this.getPurchaseOrder(id);

    if (existing.status !== 'DRAFT') {
      throw new Error('Can only delete draft purchase orders');
    }

    await this.prisma.purchaseOrder.delete({
      where: { id },
    });

    // Emit WebSocket event
    if (this.wsService) {
      this.wsService.broadcastToCompany(
        existing.project.companyId,
        'po:deleted',
        {
          poId: id,
          poNumber: existing.poNumber,
          projectId: existing.project.id,
          timestamp: new Date(),
        }
      );
    }

    return { success: true };
  }

  async approvePurchaseOrder(id: string, approvedBy: string) {
    const po = await this.getPurchaseOrder(id);

    if (po.status !== 'DRAFT') {
      throw new Error('Can only approve draft purchase orders');
    }

    const approved = await this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: 'SENT',
        approvedBy,
        approvedAt: new Date(),
      },
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        project: {
          select: {
            companyId: true,
            name: true,
          },
        },
        approver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Emit WebSocket event
    if (this.wsService) {
      this.wsService.broadcastToCompany(po.project.companyId, 'po:approved', {
        poId: approved.id,
        poNumber: approved.poNumber,
        projectId: po.project.id,
        projectName: po.project.name,
        supplierName: approved.supplier.name,
        total: Number(approved.total),
        approvedBy: approved.approver,
        timestamp: new Date(),
      });
    }

    return approved;
  }

  async receiveItems(id: string, items: ReceiveItemInput[]) {
    const po = await this.getPurchaseOrder(id);

    if (po.status === 'DRAFT' || po.status === 'CANCELLED') {
      throw new Error('Cannot receive items for draft or cancelled POs');
    }

    // Update received quantities
    for (const item of items) {
      const lineItem = po.lineItems.find((li) => li.id === item.itemId);
      if (!lineItem) {
        throw new Error(`Line item ${item.itemId} not found`);
      }

      const newReceivedQty = Number(lineItem.receivedQty) + item.quantityReceived;
      if (newReceivedQty > Number(lineItem.quantity)) {
        throw new Error(
          `Cannot receive more than ordered quantity for item: ${lineItem.description}`
        );
      }

      await this.prisma.purchaseOrderItem.update({
        where: { id: item.itemId },
        data: {
          receivedQty: newReceivedQty,
        },
      });
    }

    // Check if all items fully received
    const updatedPO = await this.getPurchaseOrder(id);
    const allReceived = updatedPO.lineItems.every(
      (item) => Number(item.receivedQty) >= Number(item.quantity)
    );
    const anyReceived = updatedPO.lineItems.some(
      (item) => Number(item.receivedQty) > 0
    );

    let newStatus: POStatus = po.status;
    if (allReceived) {
      newStatus = 'RECEIVED';
    } else if (anyReceived) {
      newStatus = 'PARTIALLY_RECEIVED';
    }

    if (newStatus !== po.status) {
      await this.prisma.purchaseOrder.update({
        where: { id },
        data: { status: newStatus },
      });
    }

    // Emit WebSocket event
    if (this.wsService) {
      this.wsService.broadcastToCompany(po.project.companyId, 'po:received', {
        poId: id,
        poNumber: po.poNumber,
        projectId: po.project.id,
        status: newStatus,
        itemsReceived: items.length,
        timestamp: new Date(),
      });
    }

    return this.getPurchaseOrder(id);
  }

  async getProjectPurchaseOrders(
    projectId: string,
    filter?: {
      status?: POStatus;
      supplierId?: string;
    }
  ) {
    const where: any = { projectId };

    if (filter?.status) {
      where.status = filter.status;
    }

    if (filter?.supplierId) {
      where.supplierId = filter.supplierId;
    }

    return this.prisma.purchaseOrder.findMany({
      where,
      include: {
        lineItems: true,
        supplier: {
          select: {
            id: true,
            name: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        approver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async cancelPurchaseOrder(id: string, cancelledBy: string) {
    const po = await this.getPurchaseOrder(id);

    if (po.status === 'RECEIVED' || po.status === 'INVOICED') {
      throw new Error('Cannot cancel received or invoiced purchase orders');
    }

    const cancelled = await this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: 'CANCELLED',
      },
    });

    // Emit WebSocket event
    if (this.wsService) {
      this.wsService.broadcastToCompany(po.project.companyId, 'po:cancelled', {
        poId: id,
        poNumber: po.poNumber,
        projectId: po.project.id,
        timestamp: new Date(),
      });
    }

    return cancelled;
  }

  async getPurchaseOrderStats(projectId: string) {
    const pos = await this.prisma.purchaseOrder.findMany({
      where: { projectId },
      include: {
        lineItems: true,
      },
    });

    const stats = {
      totalPOs: pos.length,
      totalValue: 0,
      byStatus: {} as Record<string, number>,
      pendingValue: 0,
      receivedValue: 0,
    };

    for (const po of pos) {
      const poTotal = Number(po.total);
      stats.totalValue += poTotal;

      stats.byStatus[po.status] = (stats.byStatus[po.status] || 0) + 1;

      if (po.status === 'DRAFT' || po.status === 'SENT') {
        stats.pendingValue += poTotal;
      } else if (po.status === 'RECEIVED' || po.status === 'INVOICED') {
        stats.receivedValue += poTotal;
      }
    }

    return stats;
  }
}
