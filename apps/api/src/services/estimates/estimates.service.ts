import { PrismaClient, Prisma, EstimateStatus, EstimateLineCategory } from '../../generated/prisma';

// ============================================================================
// TYPES
// ============================================================================

export type EstimateCreateInput = {
  name: string;
  projectId: string;
  description?: string;
  overheadPercent?: number;
  profitPercent?: number;
  taxPercent?: number;
  validUntil?: Date;
  notes?: string;
};

export type EstimateLineItemInput = {
  category: EstimateLineCategory;
  description: string;
  quantity: number;
  unit: string;
  unitCost: number;
  laborHours?: number;
  laborRate?: number;
  materialCost?: number;
  equipmentCost?: number;
  markup?: number;
  notes?: string;
};

export type EstimateTemplateInput = {
  name: string;
  description?: string;
  category: string;
  companyId: string;
  lineItems: EstimateLineItemInput[];
  defaultMarkup?: number;
  isPublic?: boolean;
};

export type CostDatabaseItemInput = {
  companyId: string;
  category: EstimateLineCategory;
  name: string;
  description?: string;
  unit: string;
  currentCost: number;
  supplierName?: string;
};

export type AssemblyInput = {
  name: string;
  description?: string;
  category: string;
  companyId: string;
  components: AssemblyComponent[];
  isPublic?: boolean;
};

export type AssemblyComponent = {
  description: string;
  quantity: number;
  unit: string;
  unitCost: number;
  laborHours?: number;
  laborRate?: number;
  materialCost?: number;
  category: EstimateLineCategory;
};

export type AIEstimateRequest = {
  projectDescription: string;
  projectType: string;
  squareFootage?: number;
  location?: string;
  quality?: 'BUDGET' | 'STANDARD' | 'PREMIUM' | 'LUXURY';
};

export type AIEstimateResponse = {
  lineItems: EstimateLineItemInput[];
  confidence: number;
  analysisData: {
    similarProjects: number;
    marketConditions: string;
    riskFactors: string[];
    recommendations: string[];
  };
};

export type EstimateVarianceReport = {
  estimateId: string;
  estimateName: string;
  estimatedTotal: number;
  actualCost: number;
  variance: number;
  variancePercent: number;
  categoryBreakdown: CategoryVariance[];
};

export type CategoryVariance = {
  category: string;
  estimated: number;
  actual: number;
  variance: number;
  variancePercent: number;
};

// ============================================================================
// SERVICE
// ============================================================================

export class EstimatesService {
  constructor(private prisma: PrismaClient) {}

  // ============================================================================
  // ESTIMATE CRUD OPERATIONS
  // ============================================================================

  async createEstimate(
    input: EstimateCreateInput,
    createdById: string
  ): Promise<any> {
    // Generate estimate number
    const count = await this.prisma.estimate.count();
    const estimateNumber = `EST-${String(count + 1).padStart(5, '0')}`;

    const estimate = await this.prisma.estimate.create({
      data: {
        estimateNumber,
        name: input.name,
        projectId: input.projectId,
        description: input.description,
        overheadPercent: input.overheadPercent || 0,
        profitPercent: input.profitPercent || 0,
        taxPercent: input.taxPercent || 0,
        validUntil: input.validUntil,
        notes: input.notes,
        createdById,
      },
      include: {
        lineItems: true,
        project: true,
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

    return estimate;
  }

  async addLineItem(
    estimateId: string,
    input: EstimateLineItemInput
  ): Promise<any> {
    // Calculate costs
    const subtotal = input.quantity * input.unitCost;
    const markupAmount = subtotal * ((input.markup || 0) / 100);
    const total = subtotal + markupAmount;

    const lineItem = await this.prisma.estimateLineItem.create({
      data: {
        estimateId,
        category: input.category,
        description: input.description,
        quantity: input.quantity,
        unit: input.unit,
        unitCost: input.unitCost,
        laborHours: input.laborHours,
        laborRate: input.laborRate,
        materialCost: input.materialCost,
        equipmentCost: input.equipmentCost,
        subtotal,
        markup: input.markup || 0,
        total,
        notes: input.notes,
      },
    });

    // Recalculate estimate totals
    await this.recalculateEstimate(estimateId);

    return lineItem;
  }

  async updateLineItem(
    lineItemId: string,
    updates: Partial<EstimateLineItemInput>
  ): Promise<any> {
    const lineItem = await this.prisma.estimateLineItem.findUnique({
      where: { id: lineItemId },
    });

    if (!lineItem) {
      throw new Error('Line item not found');
    }

    // Merge updates with existing data
    const quantity = updates.quantity !== undefined ? updates.quantity : Number(lineItem.quantity);
    const unitCost = updates.unitCost !== undefined ? updates.unitCost : Number(lineItem.unitCost);
    const markup = updates.markup !== undefined ? updates.markup : Number(lineItem.markup);

    const subtotal = quantity * unitCost;
    const markupAmount = subtotal * (markup / 100);
    const total = subtotal + markupAmount;

    const updated = await this.prisma.estimateLineItem.update({
      where: { id: lineItemId },
      data: {
        ...updates,
        subtotal,
        total,
      },
    });

    // Recalculate estimate totals
    await this.recalculateEstimate(lineItem.estimateId);

    return updated;
  }

  async deleteLineItem(lineItemId: string): Promise<void> {
    const lineItem = await this.prisma.estimateLineItem.findUnique({
      where: { id: lineItemId },
    });

    if (!lineItem) {
      throw new Error('Line item not found');
    }

    await this.prisma.estimateLineItem.delete({
      where: { id: lineItemId },
    });

    // Recalculate estimate totals
    await this.recalculateEstimate(lineItem.estimateId);
  }

  private async recalculateEstimate(estimateId: string): Promise<void> {
    const estimate = await this.prisma.estimate.findUnique({
      where: { id: estimateId },
      include: { lineItems: true },
    });

    if (!estimate) {
      throw new Error('Estimate not found');
    }

    // Calculate subtotal from all line items
    const subtotal = estimate.lineItems.reduce(
      (sum, item) => sum + Number(item.total),
      0
    );

    // Calculate overhead
    const overheadAmount = subtotal * (Number(estimate.overheadPercent) / 100);

    // Calculate profit
    const baseAmount = subtotal + overheadAmount;
    const profitAmount = baseAmount * (Number(estimate.profitPercent) / 100);

    // Calculate tax
    const taxableAmount = baseAmount + profitAmount;
    const taxAmount = taxableAmount * (Number(estimate.taxPercent) / 100);

    // Calculate total
    const total = taxableAmount + taxAmount;

    await this.prisma.estimate.update({
      where: { id: estimateId },
      data: {
        subtotal,
        overheadAmount,
        profitAmount,
        taxAmount,
        total,
      },
    });
  }

  async getEstimate(estimateId: string): Promise<any> {
    const estimate = await this.prisma.estimate.findUnique({
      where: { id: estimateId },
      include: {
        lineItems: {
          orderBy: { sortOrder: 'asc' },
        },
        project: true,
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

    if (!estimate) {
      throw new Error('Estimate not found');
    }

    return estimate;
  }

  async listEstimates(companyId: string): Promise<any[]> {
    return this.prisma.estimate.findMany({
      where: {
        project: {
          companyId,
        },
      },
      include: {
        lineItems: true,
        project: {
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
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listProjectEstimates(projectId: string): Promise<any[]> {
    return this.prisma.estimate.findMany({
      where: { projectId },
      include: {
        lineItems: true,
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateEstimateStatus(
    estimateId: string,
    status: EstimateStatus
  ): Promise<any> {
    return this.prisma.estimate.update({
      where: { id: estimateId },
      data: { status },
    });
  }

  async deleteEstimate(estimateId: string): Promise<void> {
    await this.prisma.estimate.delete({
      where: { id: estimateId },
    });
  }

  // ============================================================================
  // TEMPLATES
  // ============================================================================

  async createTemplate(input: EstimateTemplateInput, createdById: string): Promise<any> {
    return this.prisma.estimateTemplate.create({
      data: {
        name: input.name,
        description: input.description,
        category: input.category,
        companyId: input.companyId,
        lineItems: input.lineItems,
        defaultMarkup: input.defaultMarkup || 0,
        isPublic: input.isPublic || false,
        createdById,
      },
    });
  }

  async applyTemplate(
    estimateId: string,
    templateId: string
  ): Promise<any> {
    const template = await this.prisma.estimateTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new Error('Template not found');
    }

    const lineItems = template.lineItems as EstimateLineItemInput[];

    // Add all line items from template
    for (const item of lineItems) {
      await this.addLineItem(estimateId, item);
    }

    // Increment use count
    await this.prisma.estimateTemplate.update({
      where: { id: templateId },
      data: {
        useCount: { increment: 1 },
      },
    });

    return this.getEstimate(estimateId);
  }

  async listTemplates(companyId: string): Promise<any[]> {
    return this.prisma.estimateTemplate.findMany({
      where: {
        OR: [
          { companyId },
          { isPublic: true },
        ],
      },
      orderBy: [
        { useCount: 'desc' },
        { name: 'asc' },
      ],
    });
  }

  // ============================================================================
  // COST DATABASE
  // ============================================================================

  async addCostDatabaseItem(input: CostDatabaseItemInput): Promise<any> {
    return this.prisma.costDatabaseItem.create({
      data: {
        companyId: input.companyId,
        category: input.category,
        name: input.name,
        description: input.description,
        unit: input.unit,
        currentCost: input.currentCost,
        averageCost: input.currentCost,
        lowestCost: input.currentCost,
        highestCost: input.currentCost,
        supplierName: input.supplierName,
        priceHistory: [
          {
            date: new Date().toISOString(),
            cost: input.currentCost,
          },
        ],
      },
    });
  }

  async updateCostDatabaseItem(
    itemId: string,
    newCost: number
  ): Promise<any> {
    const item = await this.prisma.costDatabaseItem.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      throw new Error('Cost database item not found');
    }

    const currentCost = newCost;
    const lowestCost = Math.min(Number(item.lowestCost), newCost);
    const highestCost = Math.max(Number(item.highestCost), newCost);

    const priceHistory = (item.priceHistory as any[]) || [];
    priceHistory.push({
      date: new Date().toISOString(),
      cost: newCost,
    });

    // Calculate average from price history
    const totalCost = priceHistory.reduce((sum, entry) => sum + entry.cost, 0);
    const averageCost = totalCost / priceHistory.length;

    return this.prisma.costDatabaseItem.update({
      where: { id: itemId },
      data: {
        currentCost,
        averageCost,
        lowestCost,
        highestCost,
        priceHistory,
        lastUpdated: new Date(),
      },
    });
  }

  async searchCostDatabase(
    companyId: string,
    query: string,
    category?: EstimateLineCategory
  ): Promise<any[]> {
    return this.prisma.costDatabaseItem.findMany({
      where: {
        companyId,
        ...(category && { category }),
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      },
      orderBy: { usageCount: 'desc' },
      take: 20,
    });
  }

  async incrementCostDatabaseUsage(itemId: string): Promise<void> {
    await this.prisma.costDatabaseItem.update({
      where: { id: itemId },
      data: {
        usageCount: { increment: 1 },
      },
    });
  }

  // ============================================================================
  // ASSEMBLIES
  // ============================================================================

  async createAssembly(input: AssemblyInput, createdById: string): Promise<any> {
    // Calculate total cost and labor hours from components
    const totalCost = input.components.reduce((sum, comp) => {
      const compCost = comp.quantity * comp.unitCost;
      const laborCost = (comp.laborHours || 0) * (comp.laborRate || 0);
      return sum + compCost + laborCost;
    }, 0);

    const totalLaborHours = input.components.reduce((sum, comp) => {
      return sum + (comp.laborHours || 0);
    }, 0);

    return this.prisma.estimateAssembly.create({
      data: {
        name: input.name,
        description: input.description,
        category: input.category,
        companyId: input.companyId,
        components: input.components,
        totalCost,
        totalLaborHours,
        isPublic: input.isPublic || false,
        createdById,
      },
    });
  }

  async applyAssembly(
    estimateId: string,
    assemblyId: string,
    quantity: number = 1
  ): Promise<any> {
    const assembly = await this.prisma.estimateAssembly.findUnique({
      where: { id: assemblyId },
    });

    if (!assembly) {
      throw new Error('Assembly not found');
    }

    const components = assembly.components as AssemblyComponent[];

    // Add all components as line items, scaled by quantity
    for (const comp of components) {
      await this.addLineItem(estimateId, {
        category: comp.category,
        description: `${assembly.name} - ${comp.description}`,
        quantity: comp.quantity * quantity,
        unit: comp.unit,
        unitCost: comp.unitCost,
        laborHours: comp.laborHours ? comp.laborHours * quantity : undefined,
        laborRate: comp.laborRate,
        materialCost: comp.materialCost,
      });
    }

    // Increment use count
    await this.prisma.estimateAssembly.update({
      where: { id: assemblyId },
      data: {
        useCount: { increment: 1 },
      },
    });

    return this.getEstimate(estimateId);
  }

  async listAssemblies(companyId: string, category?: string): Promise<any[]> {
    return this.prisma.estimateAssembly.findMany({
      where: {
        OR: [
          { companyId },
          { isPublic: true },
        ],
        ...(category && { category }),
      },
      orderBy: [
        { useCount: 'desc' },
        { name: 'asc' },
      ],
    });
  }

  // ============================================================================
  // AI-POWERED FEATURES
  // ============================================================================

  async generateAIEstimate(
    request: AIEstimateRequest,
    projectId: string,
    companyId: string,
    createdById: string
  ): Promise<any> {
    // In production, this would call an AI service (Claude, GPT-4, etc.)
    // For now, we'll generate based on historical data

    const confidence = 0.85; // 85% confidence

    // Get historical estimates for similar projects
    const similarEstimates = await this.prisma.estimate.findMany({
      where: {
        project: {
          companyId,
          description: {
            contains: request.projectType,
            mode: 'insensitive',
          },
        },
        status: {
          in: ['APPROVED', 'CONVERTED'],
        },
      },
      include: {
        lineItems: true,
      },
      take: 10,
    });

    // Generate line items based on patterns
    const lineItems: EstimateLineItemInput[] = [];

    if (similarEstimates.length > 0) {
      // Analyze common line items
      const categoryMap = new Map<string, any[]>();

      for (const est of similarEstimates) {
        for (const item of est.lineItems) {
          const key = `${item.category}-${item.description}`;
          if (!categoryMap.has(key)) {
            categoryMap.set(key, []);
          }
          categoryMap.get(key)!.push(item);
        }
      }

      // Calculate average costs for common items
      for (const [key, items] of categoryMap.entries()) {
        const avgQuantity = items.reduce((sum, i) => sum + Number(i.quantity), 0) / items.length;
        const avgUnitCost = items.reduce((sum, i) => sum + Number(i.unitCost), 0) / items.length;
        const avgMarkup = items.reduce((sum, i) => sum + Number(i.markup), 0) / items.length;

        lineItems.push({
          category: items[0].category as EstimateLineCategory,
          description: items[0].description,
          quantity: Math.round(avgQuantity * 100) / 100,
          unit: items[0].unit,
          unitCost: Math.round(avgUnitCost * 100) / 100,
          markup: Math.round(avgMarkup * 100) / 100,
        });
      }
    } else {
      // Fallback: Generate basic estimate structure
      lineItems.push(
        {
          category: 'LABOR',
          description: 'General labor',
          quantity: 40,
          unit: 'hours',
          unitCost: 50,
          markup: 20,
        },
        {
          category: 'MATERIALS',
          description: 'Materials and supplies',
          quantity: 1,
          unit: 'lot',
          unitCost: 5000,
          markup: 25,
        },
        {
          category: 'EQUIPMENT',
          description: 'Equipment rental',
          quantity: 5,
          unit: 'days',
          unitCost: 200,
          markup: 15,
        }
      );
    }

    const analysisData = {
      similarProjects: similarEstimates.length,
      marketConditions: 'Stable',
      riskFactors: [
        'Weather delays possible',
        'Material price volatility',
      ],
      recommendations: [
        'Add 10% contingency for unknowns',
        'Lock in material prices with suppliers',
        'Consider phased approach for large projects',
      ],
    };

    // Create the AI-generated estimate
    const estimate = await this.createEstimate(
      {
        name: `AI Generated - ${request.projectType}`,
        projectId,
        description: `AI-generated estimate based on ${similarEstimates.length} similar projects`,
        overheadPercent: 10,
        profitPercent: 15,
        taxPercent: 8,
      },
      createdById
    );

    // Add AI-generated line items
    for (const item of lineItems) {
      await this.addLineItem(estimate.id, item);
    }

    // Mark as AI-generated with confidence score
    await this.prisma.estimate.update({
      where: { id: estimate.id },
      data: {
        aiGenerated: true,
        aiConfidenceScore: confidence,
        aiAnalysisData: analysisData,
      },
    });

    return this.getEstimate(estimate.id);
  }

  async predictCostTrends(companyId: string): Promise<any> {
    // Analyze cost database for price trends
    const items = await this.prisma.costDatabaseItem.findMany({
      where: { companyId },
    });

    const trends = items.map((item) => {
      const priceHistory = (item.priceHistory as any[]) || [];

      if (priceHistory.length < 2) {
        return {
          itemId: item.id,
          name: item.name,
          currentCost: Number(item.currentCost),
          trend: 'STABLE' as const,
          predictedCost: Number(item.currentCost),
          confidence: 0.5,
        };
      }

      // Simple linear regression for trend
      const costs = priceHistory.map((h) => h.cost);
      const avgCost = costs.reduce((sum, c) => sum + c, 0) / costs.length;
      const recentCost = costs[costs.length - 1];
      const oldestCost = costs[0];

      const trend = recentCost > oldestCost + (avgCost * 0.05)
        ? 'INCREASING'
        : recentCost < oldestCost - (avgCost * 0.05)
        ? 'DECREASING'
        : 'STABLE';

      // Predict next month's cost based on trend
      const trendRate = (recentCost - oldestCost) / costs.length;
      const predictedCost = recentCost + trendRate;

      return {
        itemId: item.id,
        name: item.name,
        currentCost: Number(item.currentCost),
        trend,
        predictedCost: Math.max(0, Math.round(predictedCost * 100) / 100),
        confidence: Math.min(0.95, 0.6 + (costs.length / 20)),
      };
    });

    return trends;
  }

  // ============================================================================
  // VARIANCE ANALYSIS
  // ============================================================================

  async compareEstimateToActuals(
    estimateId: string
  ): Promise<EstimateVarianceReport> {
    const estimate = await this.prisma.estimate.findUnique({
      where: { id: estimateId },
      include: {
        lineItems: true,
        project: {
          include: {
            expenses: true,
            timeEntries: true,
            purchaseOrders: true,
          },
        },
      },
    });

    if (!estimate) {
      throw new Error('Estimate not found');
    }

    const estimatedTotal = Number(estimate.total);

    // Calculate actual costs from project
    const expenseCosts = estimate.project.expenses.reduce(
      (sum, exp) => sum + Number(exp.amount),
      0
    );

    const laborCosts = estimate.project.timeEntries.reduce((sum, entry) => {
      const hours = Number(entry.hours);
      const rate = Number(entry.hourlyRate || 0);
      return sum + (hours * rate);
    }, 0);

    const poCosts = estimate.project.purchaseOrders.reduce(
      (sum, po) => sum + Number(po.total),
      0
    );

    const actualCost = expenseCosts + laborCosts + poCosts;
    const variance = estimatedTotal - actualCost;
    const variancePercent = estimatedTotal > 0
      ? (variance / estimatedTotal) * 100
      : 0;

    // Category breakdown
    const categoryBreakdown: CategoryVariance[] = [];

    const categories = ['LABOR', 'MATERIALS', 'EQUIPMENT', 'SUBCONTRACTORS', 'OTHER'];
    for (const cat of categories) {
      const estimated = estimate.lineItems
        .filter((item) => item.category === cat)
        .reduce((sum, item) => sum + Number(item.total), 0);

      // Match actuals to categories (simplified)
      let actual = 0;
      if (cat === 'LABOR') {
        actual = laborCosts;
      } else if (cat === 'MATERIALS') {
        actual = estimate.project.expenses
          .filter((e) => e.category === 'MATERIALS')
          .reduce((sum, e) => sum + Number(e.amount), 0);
      }

      const catVariance = estimated - actual;
      const catVariancePercent = estimated > 0 ? (catVariance / estimated) * 100 : 0;

      if (estimated > 0 || actual > 0) {
        categoryBreakdown.push({
          category: cat,
          estimated,
          actual,
          variance: catVariance,
          variancePercent: Math.round(catVariancePercent * 100) / 100,
        });
      }
    }

    return {
      estimateId: estimate.id,
      estimateName: estimate.name,
      estimatedTotal,
      actualCost,
      variance,
      variancePercent: Math.round(variancePercent * 100) / 100,
      categoryBreakdown,
    };
  }

  // ============================================================================
  // CONVERT TO QUOTE
  // ============================================================================

  async convertToQuote(estimateId: string, customerId: string): Promise<any> {
    const estimate = await this.prisma.estimate.findUnique({
      where: { id: estimateId },
      include: {
        lineItems: true,
        project: true,
      },
    });

    if (!estimate) {
      throw new Error('Estimate not found');
    }

    if (estimate.status === 'CONVERTED') {
      throw new Error('Estimate already converted');
    }

    // Generate quote number
    const count = await this.prisma.quote.count();
    const quoteNumber = `Q-${String(count + 1).padStart(5, '0')}`;

    // Create quote
    const quote = await this.prisma.quote.create({
      data: {
        quoteNumber,
        title: estimate.name,
        description: estimate.description,
        status: 'DRAFT',
        subtotal: estimate.subtotal,
        taxRate: estimate.taxPercent,
        taxAmount: estimate.taxAmount,
        total: estimate.total,
        validUntil: estimate.validUntil,
        notes: estimate.notes,
        companyId: estimate.project.companyId,
        customerId,
        projectId: estimate.projectId,
        createdById: estimate.createdById,
      },
    });

    // Convert line items to quote items
    for (const lineItem of estimate.lineItems) {
      await this.prisma.quoteItem.create({
        data: {
          quoteId: quote.id,
          description: lineItem.description,
          quantity: lineItem.quantity,
          unitPrice: lineItem.unitCost,
          total: lineItem.total,
          sortOrder: lineItem.sortOrder,
          category: lineItem.category,
        },
      });
    }

    // Mark estimate as converted
    await this.prisma.estimate.update({
      where: { id: estimateId },
      data: {
        status: 'CONVERTED',
        convertedToQuoteId: quote.id,
      },
    });

    return quote;
  }
}
