import { PrismaClient, SelectionStatus, SelectionCategory } from '../../generated/prisma';

// ============================================================================
// INPUT TYPES
// ============================================================================

type SelectionCreateInput = {
  projectId: string;
  customerId?: string;
  category: SelectionCategory;
  name: string;
  description?: string;
  manufacturer?: string;
  model?: string;
  sku?: string;
  color?: string;
  finish?: string;
  quantity?: number;
  unit?: string;
  unitPrice?: number;
  budgetAmount?: number;
  vendorName?: string;
  vendorContact?: string;
  leadTime?: number;
  dueDate?: Date;
  notes?: string;
  imageUrls?: any;
  specSheetUrl?: string;
};

type SelectionOptionInput = {
  name: string;
  description?: string;
  manufacturer?: string;
  model?: string;
  sku?: string;
  color?: string;
  finish?: string;
  unitPrice: number;
  imageUrls?: any;
  specSheetUrl?: string;
  isRecommended?: boolean;
  notes?: string;
  sortOrder?: number;
};

// ============================================================================
// SERVICE
// ============================================================================

export class SelectionsService {
  constructor(private prisma: PrismaClient) {}

  // ========================================
  // SELECTION CRUD
  // ========================================

  async createSelection(input: SelectionCreateInput, createdById: string): Promise<any> {
    const totalPrice = input.unitPrice && input.quantity
      ? input.unitPrice * input.quantity
      : null;

    const variance = totalPrice && input.budgetAmount
      ? totalPrice - input.budgetAmount
      : null;

    return this.prisma.selection.create({
      data: {
        ...input,
        totalPrice,
        variance,
        createdById,
      },
      include: {
        project: true,
        customer: true,
        options: true,
      },
    });
  }

  async getSelection(selectionId: string): Promise<any> {
    return this.prisma.selection.findUniqueOrThrow({
      where: { id: selectionId },
      include: {
        project: true,
        customer: true,
        createdBy: true,
        approvedBy: true,
        options: {
          orderBy: { sortOrder: 'asc' },
        },
        changes: {
          include: {
            changedBy: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async listSelections(
    projectId: string,
    filters?: {
      status?: SelectionStatus;
      category?: SelectionCategory;
      customerId?: string;
    }
  ): Promise<any[]> {
    return this.prisma.selection.findMany({
      where: {
        projectId,
        ...(filters?.status && { status: filters.status }),
        ...(filters?.category && { category: filters.category }),
        ...(filters?.customerId && { customerId: filters.customerId }),
      },
      include: {
        customer: true,
        _count: {
          select: { options: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateSelection(
    selectionId: string,
    updates: Partial<SelectionCreateInput>,
    changedByUserId?: string,
    reason?: string
  ): Promise<any> {
    const current = await this.prisma.selection.findUniqueOrThrow({
      where: { id: selectionId },
    });

    // Track changes
    if (changedByUserId) {
      const changes: Record<string, any> = {};
      Object.keys(updates).forEach(key => {
        if ((updates as any)[key] !== (current as any)[key]) {
          changes[key] = {
            from: (current as any)[key],
            to: (updates as any)[key],
          };
        }
      });

      if (Object.keys(changes).length > 0) {
        await this.prisma.selectionChange.create({
          data: {
            selectionId,
            changedByUserId,
            changeType: 'UPDATE',
            previousValue: changes,
            newValue: updates,
            reason,
          },
        });
      }
    }

    // Recalculate totals if price or quantity changed
    let totalPrice = current.totalPrice ? Number(current.totalPrice) : null;
    let variance = current.variance ? Number(current.variance) : null;

    if (updates.unitPrice !== undefined || updates.quantity !== undefined) {
      const newUnitPrice = updates.unitPrice ?? (current.unitPrice ? Number(current.unitPrice) : null);
      const newQuantity = updates.quantity ?? Number(current.quantity);

      if (newUnitPrice && newQuantity) {
        totalPrice = newUnitPrice * newQuantity;

        const budgetAmount = updates.budgetAmount ?? (current.budgetAmount ? Number(current.budgetAmount) : null);
        if (budgetAmount) {
          variance = totalPrice - budgetAmount;
        }
      }
    }

    return this.prisma.selection.update({
      where: { id: selectionId },
      data: {
        ...updates,
        ...(totalPrice !== null && { totalPrice }),
        ...(variance !== null && { variance }),
      },
      include: {
        options: true,
        changes: {
          include: { changedBy: true },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });
  }

  async deleteSelection(selectionId: string): Promise<void> {
    await this.prisma.selection.delete({
      where: { id: selectionId },
    });
  }

  // ========================================
  // SELECTION OPTIONS
  // ========================================

  async addOption(selectionId: string, input: SelectionOptionInput): Promise<any> {
    return this.prisma.selectionOption.create({
      data: {
        selectionId,
        ...input,
      },
    });
  }

  async updateOption(optionId: string, updates: Partial<SelectionOptionInput>): Promise<any> {
    return this.prisma.selectionOption.update({
      where: { id: optionId },
      data: updates,
    });
  }

  async deleteOption(optionId: string): Promise<void> {
    await this.prisma.selectionOption.delete({
      where: { id: optionId },
    });
  }

  async selectOption(selectionId: string, optionId: string, userId: string): Promise<any> {
    const option = await this.prisma.selectionOption.findUniqueOrThrow({
      where: { id: optionId },
    });

    const selection = await this.prisma.selection.findUniqueOrThrow({
      where: { id: selectionId },
    });

    return this.updateSelection(
      selectionId,
      {
        status: 'SELECTED',
        manufacturer: option.manufacturer || selection.manufacturer,
        model: option.model || selection.model,
        sku: option.sku || selection.sku,
        color: option.color || selection.color,
        finish: option.finish || selection.finish,
        unitPrice: Number(option.unitPrice),
        selectedDate: new Date(),
      },
      userId,
      `Selected option: ${option.name}`
    );
  }

  // ========================================
  // STATUS MANAGEMENT
  // ========================================

  async approveSelection(selectionId: string, approvedByUserId: string): Promise<any> {
    return this.prisma.selection.update({
      where: { id: selectionId },
      data: {
        status: 'APPROVED',
        approvedDate: new Date(),
        approvedByUserId,
      },
      include: {
        approvedBy: true,
      },
    });
  }

  async markAsOrdered(selectionId: string, userId: string): Promise<any> {
    return this.updateSelection(
      selectionId,
      {
        status: 'ORDERED',
        orderedDate: new Date(),
      },
      userId,
      'Marked as ordered'
    );
  }

  async markAsInstalled(selectionId: string, userId: string): Promise<any> {
    return this.updateSelection(
      selectionId,
      {
        status: 'INSTALLED',
        installedDate: new Date(),
      },
      userId,
      'Marked as installed'
    );
  }

  async rejectSelection(selectionId: string, userId: string, reason: string): Promise<any> {
    return this.updateSelection(
      selectionId,
      {
        status: 'REJECTED',
        notes: reason,
      },
      userId,
      reason
    );
  }

  // ========================================
  // ANALYTICS
  // ========================================

  async getSelectionsSummary(projectId: string): Promise<any> {
    const selections = await this.prisma.selection.findMany({
      where: { projectId },
    });

    const byCategory = selections.reduce((acc, sel) => {
      if (!acc[sel.category]) {
        acc[sel.category] = {
          category: sel.category,
          count: 0,
          totalBudget: 0,
          totalActual: 0,
          totalVariance: 0,
          pending: 0,
          selected: 0,
          approved: 0,
          ordered: 0,
          installed: 0,
        };
      }

      acc[sel.category].count++;
      acc[sel.category].totalBudget += sel.budgetAmount ? Number(sel.budgetAmount) : 0;
      acc[sel.category].totalActual += sel.totalPrice ? Number(sel.totalPrice) : 0;
      acc[sel.category].totalVariance += sel.variance ? Number(sel.variance) : 0;

      if (sel.status === 'PENDING') acc[sel.category].pending++;
      else if (sel.status === 'SELECTED') acc[sel.category].selected++;
      else if (sel.status === 'APPROVED') acc[sel.category].approved++;
      else if (sel.status === 'ORDERED') acc[sel.category].ordered++;
      else if (sel.status === 'INSTALLED') acc[sel.category].installed++;

      return acc;
    }, {} as Record<string, any>);

    const totalBudget = selections.reduce((sum, s) => sum + (s.budgetAmount ? Number(s.budgetAmount) : 0), 0);
    const totalActual = selections.reduce((sum, s) => sum + (s.totalPrice ? Number(s.totalPrice) : 0), 0);
    const totalVariance = totalActual - totalBudget;

    return {
      totalSelections: selections.length,
      totalBudget,
      totalActual,
      totalVariance,
      variancePercent: totalBudget > 0 ? (totalVariance / totalBudget) * 100 : 0,
      byCategory: Object.values(byCategory),
      byStatus: {
        pending: selections.filter(s => s.status === 'PENDING').length,
        selected: selections.filter(s => s.status === 'SELECTED').length,
        approved: selections.filter(s => s.status === 'APPROVED').length,
        ordered: selections.filter(s => s.status === 'ORDERED').length,
        installed: selections.filter(s => s.status === 'INSTALLED').length,
        rejected: selections.filter(s => s.status === 'REJECTED').length,
      },
    };
  }

  async getOverdueSelections(projectId: string): Promise<any[]> {
    const now = new Date();

    return this.prisma.selection.findMany({
      where: {
        projectId,
        dueDate: {
          lt: now,
        },
        status: {
          in: ['PENDING', 'SELECTED'],
        },
      },
      include: {
        customer: true,
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  async exportSelectionsToCSV(projectId: string): Promise<string> {
    const selections = await this.prisma.selection.findMany({
      where: { projectId },
      include: {
        customer: true,
      },
      orderBy: { category: 'asc' },
    });

    let csv = 'Category,Name,Status,Manufacturer,Model,Color,Finish,Quantity,Unit Price,Total,Budget,Variance,Due Date,Customer\n';

    for (const sel of selections) {
      const row = [
        sel.category,
        sel.name,
        sel.status,
        sel.manufacturer || '',
        sel.model || '',
        sel.color || '',
        sel.finish || '',
        sel.quantity,
        sel.unitPrice || '',
        sel.totalPrice || '',
        sel.budgetAmount || '',
        sel.variance || '',
        sel.dueDate?.toISOString().split('T')[0] || '',
        sel.customer?.name || '',
      ];
      csv += row.map(v => `"${v}"`).join(',') + '\n';
    }

    return csv;
  }
}
