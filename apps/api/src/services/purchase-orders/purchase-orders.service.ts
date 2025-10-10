import { PrismaClient, POStatus } from '../../generated/prisma';

// ============================================================================
// INPUT TYPES
// ============================================================================

type PurchaseOrderCreateInput = {
  projectId: string;
  supplierId: string;
  deliveryDate?: Date;
  deliveryAddress?: string;
  notes?: string;
};

type PurchaseOrderItemInput = {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  estimateLineId?: string;
  taskId?: string;
};

// ============================================================================
// SERVICE
// ============================================================================

export class PurchaseOrdersService {
  constructor(private prisma: PrismaClient) {}

  // ========================================
  // PO NUMBER GENERATION
  // ========================================

  async generatePONumber(projectId: string): Promise<string> {
    const project = await this.prisma.project.findUniqueOrThrow({
      where: { id: projectId },
      include: {
        purchaseOrders: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    const lastPO = project.purchaseOrders[0];
    if (!lastPO) {
      return `PO-${projectId.substring(0, 8).toUpperCase()}-001`;
    }

    const lastNumber = parseInt(lastPO.poNumber.split('-').pop() || '0');
    const nextNumber = (lastNumber + 1).toString().padStart(3, '0');
    return `PO-${projectId.substring(0, 8).toUpperCase()}-${nextNumber}`;
  }

  // ========================================
  // CRUD OPERATIONS
  // ========================================

  async createPurchaseOrder(
    input: PurchaseOrderCreateInput,
    createdById: string
  ): Promise<any> {
    const poNumber = await this.generatePONumber(input.projectId);

    return this.prisma.purchaseOrder.create({
      data: {
        poNumber,
        projectId: input.projectId,
        supplierId: input.supplierId,
        deliveryDate: input.deliveryDate,
        deliveryAddress: input.deliveryAddress,
        subtotal: 0,
        tax: 0,
        total: 0,
        notes: input.notes,
        createdById,
      },
      include: {
        project: true,
        supplier: true,
        lineItems: true,
      },
    });
  }

  async getPurchaseOrder(poId: string): Promise<any> {
    return this.prisma.purchaseOrder.findUniqueOrThrow({
      where: { id: poId },
      include: {
        project: true,
        supplier: true,
        createdBy: true,
        approver: true,
        lineItems: {
          include: {
            task: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  async listPurchaseOrders(
    projectId: string,
    filters?: {
      status?: POStatus;
      supplierId?: string;
    }
  ): Promise<any[]> {
    return this.prisma.purchaseOrder.findMany({
      where: {
        projectId,
        ...(filters?.status && { status: filters.status }),
        ...(filters?.supplierId && { supplierId: filters.supplierId }),
      },
      include: {
        supplier: true,
        _count: {
          select: { lineItems: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updatePurchaseOrder(
    poId: string,
    updates: Partial<PurchaseOrderCreateInput>
  ): Promise<any> {
    return this.prisma.purchaseOrder.update({
      where: { id: poId },
      data: updates,
      include: {
        lineItems: true,
        supplier: true,
      },
    });
  }

  async deletePurchaseOrder(poId: string): Promise<void> {
    await this.prisma.purchaseOrder.delete({
      where: { id: poId },
    });
  }

  // ========================================
  // LINE ITEMS
  // ========================================

  async addLineItem(poId: string, input: PurchaseOrderItemInput): Promise<any> {
    const total = input.quantity * input.unitPrice;

    const item = await this.prisma.purchaseOrderItem.create({
      data: {
        poId,
        description: input.description,
        quantity: input.quantity,
        unit: input.unit,
        unitPrice: input.unitPrice,
        total,
        taskId: input.taskId,
      },
    });

    await this.recalculateTotals(poId);
    return item;
  }

  async updateLineItem(
    itemId: string,
    updates: Partial<PurchaseOrderItemInput>
  ): Promise<any> {
    const current = await this.prisma.purchaseOrderItem.findUniqueOrThrow({
      where: { id: itemId },
    });

    const quantity = updates.quantity ?? Number(current.quantity);
    const unitPrice = updates.unitPrice ?? Number(current.unitPrice);
    const total = quantity * unitPrice;

    const updated = await this.prisma.purchaseOrderItem.update({
      where: { id: itemId },
      data: {
        ...updates,
        total,
      },
    });

    await this.recalculateTotals(current.poId);
    return updated;
  }

  async deleteLineItem(itemId: string): Promise<void> {
    const item = await this.prisma.purchaseOrderItem.findUniqueOrThrow({
      where: { id: itemId },
    });

    await this.prisma.purchaseOrderItem.delete({
      where: { id: itemId },
    });

    await this.recalculateTotals(item.poId);
  }

  private async recalculateTotals(poId: string): Promise<void> {
    const po = await this.prisma.purchaseOrder.findUniqueOrThrow({
      where: { id: poId },
      include: { lineItems: true },
    });

    const subtotal = po.lineItems.reduce(
      (sum, item) => sum + Number(item.total),
      0
    );

    // Tax amount stays as-is (can be manually set or calculated elsewhere)
    const tax = Number(po.tax);
    const total = subtotal + tax;

    await this.prisma.purchaseOrder.update({
      where: { id: poId },
      data: {
        subtotal,
        total,
      },
    });
  }

  // ========================================
  // RECEIVING
  // ========================================

  async receiveItems(poId: string, itemId: string, receivedQty: number): Promise<any> {
    const item = await this.prisma.purchaseOrderItem.update({
      where: { id: itemId },
      data: {
        receivedQty: {
          increment: receivedQty,
        },
      },
    });

    // Update PO status based on received quantities
    const po = await this.prisma.purchaseOrder.findUniqueOrThrow({
      where: { id: poId },
      include: { lineItems: true },
    });

    const allReceived = po.lineItems.every(
      (item) => Number(item.receivedQty) >= Number(item.quantity)
    );
    const anyReceived = po.lineItems.some((item) => Number(item.receivedQty) > 0);

    let newStatus: POStatus = po.status;
    if (allReceived) {
      newStatus = 'RECEIVED';
    } else if (anyReceived) {
      newStatus = 'PARTIALLY_RECEIVED';
    }

    if (newStatus !== po.status) {
      await this.prisma.purchaseOrder.update({
        where: { id: poId },
        data: { status: newStatus },
      });
    }

    return item;
  }

  // ========================================
  // STATUS MANAGEMENT
  // ========================================

  async sendPO(poId: string): Promise<any> {
    return this.prisma.purchaseOrder.update({
      where: { id: poId },
      data: {
        status: 'SENT',
      },
    });
  }

  async acknowledgePO(poId: string): Promise<any> {
    return this.prisma.purchaseOrder.update({
      where: { id: poId },
      data: {
        status: 'ACKNOWLEDGED',
      },
    });
  }

  async approvePO(poId: string, approvedBy: string): Promise<any> {
    return this.prisma.purchaseOrder.update({
      where: { id: poId },
      data: {
        approvedBy,
        approvedAt: new Date(),
      },
      include: {
        approver: true,
      },
    });
  }

  async markAsInvoiced(poId: string): Promise<any> {
    return this.prisma.purchaseOrder.update({
      where: { id: poId },
      data: {
        status: 'INVOICED',
      },
    });
  }

  async cancelPO(poId: string): Promise<any> {
    return this.prisma.purchaseOrder.update({
      where: { id: poId },
      data: {
        status: 'CANCELLED',
      },
    });
  }

  // ========================================
  // ANALYTICS
  // ========================================

  async getPOSummary(projectId: string): Promise<any> {
    const pos = await this.prisma.purchaseOrder.findMany({
      where: { projectId },
      include: { lineItems: true },
    });

    const byStatus = pos.reduce((acc, po) => {
      acc[po.status] = (acc[po.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalOrdered = pos.reduce((sum, po) => sum + Number(po.total), 0);
    const totalReceived = pos
      .filter((po) => po.status === 'RECEIVED' || po.status === 'INVOICED')
      .reduce((sum, po) => sum + Number(po.total), 0);

    return {
      totalPOs: pos.length,
      totalOrdered,
      totalReceived,
      byStatus,
      pendingReceiving: pos.filter((po) => po.status === 'PARTIALLY_RECEIVED').length,
    };
  }

  async getUnreceivedItems(projectId: string): Promise<any[]> {
    const pos = await this.prisma.purchaseOrder.findMany({
      where: {
        projectId,
        status: {
          in: ['SENT', 'ACKNOWLEDGED', 'PARTIALLY_RECEIVED'],
        },
      },
      include: {
        supplier: true,
        lineItems: {
          where: {
            receivedQty: {
              lt: this.prisma.purchaseOrderItem.fields.quantity,
            },
          },
        },
      },
    });

    return pos.flatMap((po) =>
      po.lineItems.map((item) => ({
        poNumber: po.poNumber,
        supplier: po.supplier.name,
        item: item.description,
        ordered: Number(item.quantity),
        received: Number(item.receivedQty),
        outstanding: Number(item.quantity) - Number(item.receivedQty),
        deliveryDate: po.deliveryDate,
      }))
    );
  }

  async createFromEstimate(estimateId: string, createdById: string): Promise<any> {
    const estimate = await this.prisma.estimate.findUniqueOrThrow({
      where: { id: estimateId },
      include: {
        lineItems: {
          where: {
            category: {
              in: ['MATERIALS', 'EQUIPMENT'],
            },
          },
        },
        project: true,
      },
    });

    if (estimate.lineItems.length === 0) {
      throw new Error('No material or equipment line items found in estimate');
    }

    // For simplicity, create one PO (in real system, might create multiple POs by supplier)
    const po = await this.createPurchaseOrder(
      {
        projectId: estimate.projectId,
        supplierId: '', // Would need to be specified
        deliveryAddress: estimate.project.address || '',
      },
      createdById
    );

    for (const line of estimate.lineItems) {
      await this.addLineItem(po.id, {
        description: line.description,
        quantity: Number(line.quantity),
        unit: line.unit,
        unitPrice: Number(line.unitCost),
      });
    }

    return this.getPurchaseOrder(po.id);
  }
}
