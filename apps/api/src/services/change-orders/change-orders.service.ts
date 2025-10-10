import { PrismaClient, ChangeOrderStatus } from '../../generated/prisma';

// ============================================================================
// INPUT TYPES
// ============================================================================

type ChangeOrderCreateInput = {
  projectId: string;
  title: string;
  description: string;
  reason: string;
  costImpact: number;
  timeImpact: number; // days
  attachments?: string[];
  notes?: string;
};

type ChangeOrderItemInput = {
  description: string;
  quantity: number;
  unit: string;
  unitCost: number;
};

// ============================================================================
// SERVICE
// ============================================================================

export class ChangeOrdersService {
  constructor(private prisma: PrismaClient) {}

  // ========================================
  // CO NUMBER GENERATION
  // ========================================

  async generateCONumber(projectId: string): Promise<string> {
    const project = await this.prisma.project.findUniqueOrThrow({
      where: { id: projectId },
      include: {
        changeOrders: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    const lastCO = project.changeOrders[0];
    if (!lastCO) {
      return `CO-${projectId.substring(0, 8).toUpperCase()}-001`;
    }

    const lastNumber = parseInt(lastCO.coNumber.split('-').pop() || '0');
    const nextNumber = (lastNumber + 1).toString().padStart(3, '0');
    return `CO-${projectId.substring(0, 8).toUpperCase()}-${nextNumber}`;
  }

  // ========================================
  // CRUD OPERATIONS
  // ========================================

  async createChangeOrder(
    input: ChangeOrderCreateInput,
    requestedBy: string
  ): Promise<any> {
    const coNumber = await this.generateCONumber(input.projectId);

    return this.prisma.changeOrder.create({
      data: {
        coNumber,
        projectId: input.projectId,
        title: input.title,
        description: input.description,
        reason: input.reason,
        costImpact: input.costImpact,
        timeImpact: input.timeImpact,
        attachments: input.attachments || [],
        notes: input.notes,
        requestedBy,
        requestedAt: new Date(),
      },
      include: {
        project: true,
        requester: true,
        lineItems: true,
      },
    });
  }

  async getChangeOrder(coId: string): Promise<any> {
    return this.prisma.changeOrder.findUniqueOrThrow({
      where: { id: coId },
      include: {
        project: true,
        requester: true,
        approver: true,
        lineItems: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  async listChangeOrders(
    projectId: string,
    filters?: {
      status?: ChangeOrderStatus;
    }
  ): Promise<any[]> {
    return this.prisma.changeOrder.findMany({
      where: {
        projectId,
        ...(filters?.status && { status: filters.status }),
      },
      include: {
        requester: true,
        approver: true,
        _count: {
          select: { lineItems: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateChangeOrder(
    coId: string,
    updates: Partial<ChangeOrderCreateInput>
  ): Promise<any> {
    return this.prisma.changeOrder.update({
      where: { id: coId },
      data: updates,
      include: {
        lineItems: true,
      },
    });
  }

  async deleteChangeOrder(coId: string): Promise<void> {
    await this.prisma.changeOrder.delete({
      where: { id: coId },
    });
  }

  // ========================================
  // LINE ITEMS
  // ========================================

  async addLineItem(coId: string, input: ChangeOrderItemInput): Promise<any> {
    const total = input.quantity * input.unitCost;

    const item = await this.prisma.changeOrderItem.create({
      data: {
        coId,
        description: input.description,
        quantity: input.quantity,
        unit: input.unit,
        unitCost: input.unitCost,
        total,
      },
    });

    await this.recalculateCostImpact(coId);
    return item;
  }

  async updateLineItem(
    itemId: string,
    updates: Partial<ChangeOrderItemInput>
  ): Promise<any> {
    const current = await this.prisma.changeOrderItem.findUniqueOrThrow({
      where: { id: itemId },
    });

    const quantity = updates.quantity ?? Number(current.quantity);
    const unitCost = updates.unitCost ?? Number(current.unitCost);
    const total = quantity * unitCost;

    const updated = await this.prisma.changeOrderItem.update({
      where: { id: itemId },
      data: {
        ...updates,
        total,
      },
    });

    await this.recalculateCostImpact(current.coId);
    return updated;
  }

  async deleteLineItem(itemId: string): Promise<void> {
    const item = await this.prisma.changeOrderItem.findUniqueOrThrow({
      where: { id: itemId },
    });

    await this.prisma.changeOrderItem.delete({
      where: { id: itemId },
    });

    await this.recalculateCostImpact(item.coId);
  }

  private async recalculateCostImpact(coId: string): Promise<void> {
    const co = await this.prisma.changeOrder.findUniqueOrThrow({
      where: { id: coId },
      include: { lineItems: true },
    });

    const costImpact = co.lineItems.reduce(
      (sum, item) => sum + Number(item.total),
      0
    );

    await this.prisma.changeOrder.update({
      where: { id: coId },
      data: { costImpact },
    });
  }

  // ========================================
  // WORKFLOW MANAGEMENT
  // ========================================

  async submitForApproval(coId: string): Promise<any> {
    return this.prisma.changeOrder.update({
      where: { id: coId },
      data: {
        status: 'PENDING_APPROVAL',
      },
    });
  }

  async approveChangeOrder(coId: string, approvedBy: string): Promise<any> {
    const approved = await this.prisma.changeOrder.update({
      where: { id: coId },
      data: {
        status: 'APPROVED',
        approvedBy,
        approvedAt: new Date(),
      },
      include: {
        approver: true,
        project: true,
      },
    });

    // Update project budget
    await this.updateProjectBudget(approved.projectId, Number(approved.costImpact));

    return approved;
  }

  async rejectChangeOrder(coId: string, approvedBy: string, reason?: string): Promise<any> {
    return this.prisma.changeOrder.update({
      where: { id: coId },
      data: {
        status: 'REJECTED',
        approvedBy,
        approvedAt: new Date(),
        notes: reason,
      },
      include: {
        approver: true,
      },
    });
  }

  async markAsImplemented(coId: string): Promise<any> {
    return this.prisma.changeOrder.update({
      where: { id: coId },
      data: {
        status: 'IMPLEMENTED',
      },
    });
  }

  async cancelChangeOrder(coId: string): Promise<any> {
    return this.prisma.changeOrder.update({
      where: { id: coId },
      data: {
        status: 'CANCELLED',
      },
    });
  }

  private async updateProjectBudget(projectId: string, costImpact: number): Promise<void> {
    const project = await this.prisma.project.findUniqueOrThrow({
      where: { id: projectId },
    });

    const currentBudget = Number(project.budget) || 0;
    const newBudget = currentBudget + costImpact;

    await this.prisma.project.update({
      where: { id: projectId },
      data: {
        budget: newBudget,
      },
    });
  }

  // ========================================
  // ANALYTICS
  // ========================================

  async getCOSummary(projectId: string): Promise<any> {
    const cos = await this.prisma.changeOrder.findMany({
      where: { projectId },
      include: { lineItems: true },
    });

    const byStatus = cos.reduce((acc, co) => {
      acc[co.status] = (acc[co.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalCostImpact = cos.reduce(
      (sum, co) => sum + Number(co.costImpact),
      0
    );

    const approvedCostImpact = cos
      .filter((co) => co.status === 'APPROVED' || co.status === 'IMPLEMENTED')
      .reduce((sum, co) => sum + Number(co.costImpact), 0);

    const totalTimeImpact = cos.reduce((sum, co) => sum + co.timeImpact, 0);

    const approvedTimeImpact = cos
      .filter((co) => co.status === 'APPROVED' || co.status === 'IMPLEMENTED')
      .reduce((sum, co) => sum + co.timeImpact, 0);

    return {
      totalCOs: cos.length,
      totalCostImpact,
      approvedCostImpact,
      totalTimeImpact,
      approvedTimeImpact,
      byStatus,
      pendingApproval: cos.filter((co) => co.status === 'PENDING_APPROVAL').length,
    };
  }

  async getPendingApprovals(projectId: string): Promise<any[]> {
    return this.prisma.changeOrder.findMany({
      where: {
        projectId,
        status: 'PENDING_APPROVAL',
      },
      include: {
        requester: true,
        _count: {
          select: { lineItems: true },
        },
      },
      orderBy: { requestedAt: 'asc' },
    });
  }

  async getCOsByReason(projectId: string): Promise<any> {
    const cos = await this.prisma.changeOrder.findMany({
      where: { projectId },
    });

    const byReason = cos.reduce((acc, co) => {
      if (!acc[co.reason]) {
        acc[co.reason] = {
          reason: co.reason,
          count: 0,
          totalCost: 0,
          totalTime: 0,
        };
      }
      acc[co.reason].count++;
      acc[co.reason].totalCost += Number(co.costImpact);
      acc[co.reason].totalTime += co.timeImpact;
      return acc;
    }, {} as Record<string, any>);

    return Object.values(byReason);
  }

  async exportCOsToCSV(projectId: string): Promise<string> {
    const cos = await this.prisma.changeOrder.findMany({
      where: { projectId },
      include: {
        requester: true,
        approver: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    let csv = 'CO Number,Title,Status,Requested By,Cost Impact,Time Impact (days),Requested Date,Approved Date,Approved By\n';

    for (const co of cos) {
      const row = [
        co.coNumber,
        co.title,
        co.status,
        `${co.requester.firstName} ${co.requester.lastName}`,
        co.costImpact,
        co.timeImpact,
        co.requestedAt.toISOString().split('T')[0],
        co.approvedAt?.toISOString().split('T')[0] || '',
        co.approver ? `${co.approver.firstName} ${co.approver.lastName}` : '',
      ];
      csv += row.map(v => `"${v}"`).join(',') + '\n';
    }

    return csv;
  }
}
