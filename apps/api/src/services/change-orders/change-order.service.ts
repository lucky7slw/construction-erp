import { PrismaClient, ChangeOrderStatus } from '../../generated/prisma';
import { WebSocketService } from '../websocket.service';

export type ChangeOrderItemInput = {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
};

export type ChangeOrderCreateInput = {
  projectId: string;
  title: string;
  description: string;
  reason: string;
  timeImpact: number; // days
  attachments?: string[];
  lineItems: ChangeOrderItemInput[];
};

export type ChangeOrderUpdateInput = {
  title?: string;
  description?: string;
  reason?: string;
  timeImpact?: number;
  attachments?: string[];
  lineItems?: ChangeOrderItemInput[];
};

export class ChangeOrderService {
  constructor(
    private prisma: PrismaClient,
    private wsService?: WebSocketService
  ) {}

  private async generateCONumber(): Promise<string> {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');

    // Get count of COs this month
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const count = await this.prisma.changeOrder.count({
      where: {
        createdAt: {
          gte: startOfMonth,
        },
      },
    });

    const sequence = (count + 1).toString().padStart(4, '0');
    return `CO-${year}${month}-${sequence}`;
  }

  async createChangeOrder(
    input: ChangeOrderCreateInput,
    requestedById: string
  ) {
    // Verify project exists
    const project = await this.prisma.project.findUnique({
      where: { id: input.projectId },
      select: { companyId: true, name: true, budget: true },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    // Calculate cost impact
    const costImpact = input.lineItems.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );

    // Generate CO number
    const coNumber = await this.generateCONumber();

    // Create change order with line items
    const co = await this.prisma.changeOrder.create({
      data: {
        coNumber,
        title: input.title,
        description: input.description,
        reason: input.reason,
        costImpact,
        timeImpact: input.timeImpact,
        status: 'DRAFT',
        attachments: input.attachments || [],
        requestedAt: new Date(),
        project: {
          connect: { id: input.projectId },
        },
        requester: {
          connect: { id: requestedById },
        },
        lineItems: {
          create: input.lineItems.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unitCost: item.unitPrice,
            total: item.quantity * item.unitPrice,
          })),
        },
      },
      include: {
        lineItems: true,
        requester: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
            companyId: true,
            budget: true,
          },
        },
      },
    });

    // Emit WebSocket event
    if (this.wsService) {
      this.wsService.broadcastToCompany(project.companyId, 'co:created', {
        coId: co.id,
        coNumber: co.coNumber,
        projectId: input.projectId,
        projectName: project.name,
        title: co.title,
        costImpact: Number(co.costImpact),
        timeImpact: co.timeImpact,
        requestedBy: co.requester,
        timestamp: new Date(),
      });
    }

    return co;
  }

  async getChangeOrder(id: string) {
    const co = await this.prisma.changeOrder.findUnique({
      where: { id },
      include: {
        lineItems: true,
        requester: {
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
        project: {
          select: {
            id: true,
            name: true,
            companyId: true,
            budget: true,
          },
        },
      },
    });

    if (!co) {
      throw new Error('Change order not found');
    }

    return co;
  }

  async updateChangeOrder(
    id: string,
    input: ChangeOrderUpdateInput
  ) {
    const existing = await this.getChangeOrder(id);

    if (existing.status !== 'DRAFT') {
      throw new Error('Can only update draft change orders');
    }

    // If line items provided, recalculate cost impact
    let updateData: any = {
      title: input.title,
      description: input.description,
      reason: input.reason,
      timeImpact: input.timeImpact,
      attachments: input.attachments,
    };

    if (input.lineItems) {
      const costImpact = input.lineItems.reduce(
        (sum, item) => sum + item.quantity * item.unitPrice,
        0
      );

      updateData.costImpact = costImpact;

      // Delete existing items and create new ones
      await this.prisma.changeOrderItem.deleteMany({
        where: { coId: id },
      });
    }

    const updated = await this.prisma.changeOrder.update({
      where: { id },
      data: updateData,
      include: {
        lineItems: true,
        requester: {
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
      await this.prisma.changeOrderItem.createMany({
        data: input.lineItems.map((item) => ({
          coId: id,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unitCost: item.unitPrice,
          total: item.quantity * item.unitPrice,
        })),
      });
    }

    // Fetch complete updated CO
    return this.getChangeOrder(id);
  }

  async deleteChangeOrder(id: string) {
    const existing = await this.getChangeOrder(id);

    if (existing.status !== 'DRAFT') {
      throw new Error('Can only delete draft change orders');
    }

    await this.prisma.changeOrder.delete({
      where: { id },
    });

    // Emit WebSocket event
    if (this.wsService) {
      this.wsService.broadcastToCompany(
        existing.project.companyId,
        'co:deleted',
        {
          coId: id,
          coNumber: existing.coNumber,
          projectId: existing.project.id,
          timestamp: new Date(),
        }
      );
    }

    return { success: true };
  }

  async submitForApproval(id: string) {
    const co = await this.getChangeOrder(id);

    if (co.status !== 'DRAFT') {
      throw new Error('Can only submit draft change orders');
    }

    const submitted = await this.prisma.changeOrder.update({
      where: { id },
      data: {
        status: 'PENDING_APPROVAL',
      },
      include: {
        project: {
          select: {
            companyId: true,
            name: true,
          },
        },
        requester: {
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
      this.wsService.broadcastToCompany(
        co.project.companyId,
        'co:submitted',
        {
          coId: submitted.id,
          coNumber: submitted.coNumber,
          projectId: co.project.id,
          projectName: submitted.project.name,
          title: submitted.title,
          costImpact: Number(submitted.costImpact),
          requestedBy: submitted.requester,
          timestamp: new Date(),
        }
      );
    }

    return submitted;
  }

  async approveChangeOrder(id: string, approvedById: string) {
    const co = await this.getChangeOrder(id);

    if (co.status !== 'PENDING_APPROVAL') {
      throw new Error('Can only approve pending change orders');
    }

    const approved = await this.prisma.changeOrder.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approver: {
          connect: { id: approvedById },
        },
        approvedAt: new Date(),
      },
      include: {
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
      this.wsService.broadcastToCompany(
        co.project.companyId,
        'co:approved',
        {
          coId: approved.id,
          coNumber: approved.coNumber,
          projectId: co.project.id,
          projectName: approved.project.name,
          title: approved.title,
          costImpact: Number(approved.costImpact),
          timeImpact: approved.timeImpact,
          approvedBy: approved.approver,
          timestamp: new Date(),
        }
      );
    }

    return approved;
  }

  async rejectChangeOrder(
    id: string,
    rejectedById: string,
    rejectionReason: string
  ) {
    const co = await this.getChangeOrder(id);

    if (co.status !== 'PENDING_APPROVAL') {
      throw new Error('Can only reject pending change orders');
    }

    const rejected = await this.prisma.changeOrder.update({
      where: { id },
      data: {
        status: 'REJECTED',
        approver: {
          connect: { id: rejectedById },
        },
        approvedAt: new Date(),
        notes: rejectionReason,
      },
      include: {
        project: {
          select: {
            companyId: true,
          },
        },
      },
    });

    // Emit WebSocket event
    if (this.wsService) {
      this.wsService.broadcastToCompany(
        co.project.companyId,
        'co:rejected',
        {
          coId: rejected.id,
          coNumber: rejected.coNumber,
          projectId: co.project.id,
          rejectionReason,
          timestamp: new Date(),
        }
      );
    }

    return rejected;
  }

  async implementChangeOrder(id: string) {
    const co = await this.getChangeOrder(id);

    if (co.status !== 'APPROVED') {
      throw new Error('Can only implement approved change orders');
    }

    // Update project budget if exists
    if (co.project.budget) {
      const newBudget = Number(co.project.budget) + Number(co.costImpact);
      await this.prisma.project.update({
        where: { id: co.projectId },
        data: {
          budget: newBudget,
        },
      });
    }

    const implemented = await this.prisma.changeOrder.update({
      where: { id },
      data: {
        status: 'IMPLEMENTED',
      },
      include: {
        project: {
          select: {
            companyId: true,
            name: true,
          },
        },
      },
    });

    // Emit WebSocket event
    if (this.wsService) {
      this.wsService.broadcastToCompany(
        co.project.companyId,
        'co:implemented',
        {
          coId: implemented.id,
          coNumber: implemented.coNumber,
          projectId: co.project.id,
          projectName: implemented.project.name,
          budgetAdjustment: Number(co.costImpact),
          timestamp: new Date(),
        }
      );
    }

    return implemented;
  }

  async cancelChangeOrder(id: string) {
    const co = await this.getChangeOrder(id);

    if (co.status === 'IMPLEMENTED') {
      throw new Error('Cannot cancel implemented change orders');
    }

    const cancelled = await this.prisma.changeOrder.update({
      where: { id },
      data: {
        status: 'CANCELLED',
      },
    });

    return cancelled;
  }

  async getProjectChangeOrders(
    projectId: string,
    filter?: {
      status?: ChangeOrderStatus;
    }
  ) {
    const where: any = { projectId };

    if (filter?.status) {
      where.status = filter.status;
    }

    return this.prisma.changeOrder.findMany({
      where,
      include: {
        lineItems: true,
        requester: {
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

  async getChangeOrderStats(projectId: string) {
    const cos = await this.prisma.changeOrder.findMany({
      where: { projectId },
    });

    const stats = {
      totalCOs: cos.length,
      totalCostImpact: 0,
      totalTimeImpact: 0,
      byStatus: {} as Record<string, number>,
      approvedCost: 0,
      pendingCost: 0,
      approvalRate: 0,
    };

    let approvedCount = 0;
    let rejectedCount = 0;

    for (const co of cos) {
      const cost = Number(co.costImpact);
      stats.totalCostImpact += cost;
      stats.totalTimeImpact += co.timeImpact;

      stats.byStatus[co.status] = (stats.byStatus[co.status] || 0) + 1;

      if (co.status === 'APPROVED' || co.status === 'IMPLEMENTED') {
        stats.approvedCost += cost;
        approvedCount++;
      } else if (co.status === 'PENDING_APPROVAL') {
        stats.pendingCost += cost;
      }

      if (co.status === 'REJECTED') {
        rejectedCount++;
      }
    }

    const decidedCount = approvedCount + rejectedCount;
    stats.approvalRate =
      decidedCount > 0 ? Math.round((approvedCount / decidedCount) * 100) : 0;

    return stats;
  }
}
