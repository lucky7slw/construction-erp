import { PrismaClient, BidStatus, BidType } from '../../generated/prisma';

// ============================================================================
// INPUT TYPES
// ============================================================================

type BidCreateInput = {
  projectId: string;
  supplierId?: string;
  bidType: BidType;
  scopeOfWork: string;
  dueDate?: Date;
  validUntil?: Date;
  bondRequired?: boolean;
  bondAmount?: number;
  taxPercent?: number;
  notes?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
};

type BidLineItemInput = {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  notes?: string;
  linkedEstimateLineId?: string;
  sortOrder?: number;
};

type BidPackageInput = {
  name: string;
  projectId: string;
  description?: string;
  scopeDocument?: string;
  dueDate?: Date;
};

type BidComparisonCriteria = {
  priceWeight: number;      // 0-1
  timelineWeight: number;   // 0-1
  experienceWeight: number; // 0-1
  qualityWeight: number;    // 0-1
};

// ============================================================================
// SERVICE
// ============================================================================

export class BidsService {
  constructor(private prisma: PrismaClient) {}

  // ========================================
  // BID CRUD
  // ========================================

  async createBid(input: BidCreateInput, createdById: string): Promise<any> {
    const bidNumber = await this.generateBidNumber(input.projectId);

    return this.prisma.bid.create({
      data: {
        ...input,
        bidNumber,
        createdById,
      },
      include: {
        project: true,
        supplier: true,
        lineItems: true,
      },
    });
  }

  async getBid(bidId: string): Promise<any> {
    return this.prisma.bid.findUniqueOrThrow({
      where: { id: bidId },
      include: {
        project: true,
        supplier: true,
        createdBy: true,
        lineItems: {
          orderBy: { sortOrder: 'asc' },
          include: {
            linkedEstimateLine: true,
          },
        },
      },
    });
  }

  async listBids(
    projectId: string,
    filters?: {
      status?: BidStatus;
      bidType?: BidType;
      supplierId?: string;
    }
  ): Promise<any[]> {
    return this.prisma.bid.findMany({
      where: {
        projectId,
        ...(filters?.status && { status: filters.status }),
        ...(filters?.bidType && { bidType: filters.bidType }),
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

  async updateBid(
    bidId: string,
    updates: Partial<{
      status: BidStatus;
      dueDate: Date;
      validUntil: Date;
      notes: string;
      contactName: string;
      contactEmail: string;
      contactPhone: string;
      attachmentUrls: any;
    }>
  ): Promise<any> {
    return this.prisma.bid.update({
      where: { id: bidId },
      data: updates,
      include: {
        lineItems: true,
      },
    });
  }

  async deleteBid(bidId: string): Promise<void> {
    await this.prisma.bid.delete({
      where: { id: bidId },
    });
  }

  // ========================================
  // BID LINE ITEMS
  // ========================================

  async addLineItem(bidId: string, input: BidLineItemInput): Promise<any> {
    const total = input.quantity * input.unitPrice;

    const lineItem = await this.prisma.bidLineItem.create({
      data: {
        bidId,
        ...input,
        total,
      },
      include: {
        linkedEstimateLine: true,
      },
    });

    // Recalculate bid totals
    await this.recalculateBidTotals(bidId);

    return lineItem;
  }

  async updateLineItem(
    lineItemId: string,
    updates: Partial<BidLineItemInput>
  ): Promise<any> {
    const lineItem = await this.prisma.bidLineItem.findUniqueOrThrow({
      where: { id: lineItemId },
    });

    const quantity = updates.quantity ?? Number(lineItem.quantity);
    const unitPrice = updates.unitPrice ?? Number(lineItem.unitPrice);
    const total = quantity * unitPrice;

    const updated = await this.prisma.bidLineItem.update({
      where: { id: lineItemId },
      data: {
        ...updates,
        total,
      },
      include: {
        linkedEstimateLine: true,
      },
    });

    // Recalculate bid totals
    await this.recalculateBidTotals(lineItem.bidId);

    return updated;
  }

  async deleteLineItem(lineItemId: string): Promise<void> {
    const lineItem = await this.prisma.bidLineItem.findUniqueOrThrow({
      where: { id: lineItemId },
    });

    await this.prisma.bidLineItem.delete({
      where: { id: lineItemId },
    });

    // Recalculate bid totals
    await this.recalculateBidTotals(lineItem.bidId);
  }

  // ========================================
  // BID STATUS MANAGEMENT
  // ========================================

  async submitBid(bidId: string): Promise<any> {
    return this.prisma.bid.update({
      where: { id: bidId },
      data: {
        status: 'SUBMITTED',
        submittedDate: new Date(),
      },
      include: {
        lineItems: true,
      },
    });
  }

  async awardBid(bidId: string): Promise<any> {
    const bid = await this.prisma.bid.findUniqueOrThrow({
      where: { id: bidId },
    });

    if (bid.status !== 'SUBMITTED' && bid.status !== 'UNDER_REVIEW') {
      throw new Error('Can only award submitted or reviewed bids');
    }

    return this.prisma.bid.update({
      where: { id: bidId },
      data: {
        status: 'AWARDED',
        awardedDate: new Date(),
      },
      include: {
        lineItems: true,
        supplier: true,
      },
    });
  }

  async declineBid(bidId: string, reason: string): Promise<any> {
    return this.prisma.bid.update({
      where: { id: bidId },
      data: {
        status: 'DECLINED',
        declinedReason: reason,
      },
    });
  }

  // ========================================
  // BID PACKAGES
  // ========================================

  async createBidPackage(input: BidPackageInput, createdById: string): Promise<any> {
    return this.prisma.bidPackage.create({
      data: {
        ...input,
        createdById,
      },
      include: {
        project: true,
        invitations: {
          include: {
            supplier: true,
          },
        },
      },
    });
  }

  async getBidPackage(packageId: string): Promise<any> {
    return this.prisma.bidPackage.findUniqueOrThrow({
      where: { id: packageId },
      include: {
        project: true,
        invitations: {
          include: {
            supplier: true,
            sentBy: true,
          },
        },
      },
    });
  }

  async inviteSupplierToBidPackage(
    packageId: string,
    supplierId: string,
    sentByUserId: string,
    notes?: string
  ): Promise<any> {
    return this.prisma.bidPackageInvitation.create({
      data: {
        packageId,
        supplierId,
        sentByUserId,
        notes,
      },
      include: {
        supplier: true,
        sentBy: true,
      },
    });
  }

  async listBidPackages(projectId: string): Promise<any[]> {
    return this.prisma.bidPackage.findMany({
      where: { projectId },
      include: {
        _count: {
          select: { invitations: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ========================================
  // BID COMPARISON
  // ========================================

  async compareBids(
    projectId: string,
    scopeFilter?: string
  ): Promise<any> {
    const bids = await this.prisma.bid.findMany({
      where: {
        projectId,
        status: { in: ['SUBMITTED', 'UNDER_REVIEW'] },
        ...(scopeFilter && { scopeOfWork: { contains: scopeFilter } }),
      },
      include: {
        supplier: true,
        lineItems: true,
      },
      orderBy: { total: 'asc' },
    });

    if (bids.length === 0) {
      return {
        bids: [],
        comparison: null,
      };
    }

    // Find min and max for normalization
    const totals = bids.map(b => Number(b.total));
    const minTotal = Math.min(...totals);
    const maxTotal = Math.max(...totals);

    const comparison = bids.map(bid => {
      // Normalize price (lower is better)
      const priceScore = maxTotal === minTotal
        ? 1
        : 1 - ((Number(bid.total) - minTotal) / (maxTotal - minTotal));

      return {
        bidId: bid.id,
        bidNumber: bid.bidNumber,
        supplier: bid.supplier?.name || 'Direct',
        total: Number(bid.total),
        lineItemCount: bid.lineItems.length,
        priceScore: Math.round(priceScore * 100) / 100,
        submittedDate: bid.submittedDate,
        validUntil: bid.validUntil,
        bondRequired: bid.bondRequired,
      };
    });

    return {
      bids,
      comparison,
      lowestBid: comparison[0],
      highestBid: comparison[comparison.length - 1],
      averageTotal: totals.reduce((a, b) => a + b, 0) / totals.length,
    };
  }

  async scoreBid(
    bidId: string,
    criteria: BidComparisonCriteria,
    scores: {
      priceScore: number;      // 0-10
      timelineScore: number;   // 0-10
      experienceScore: number; // 0-10
      qualityScore: number;    // 0-10
    }
  ): Promise<any> {
    // Validate weights sum to 1
    const totalWeight =
      criteria.priceWeight +
      criteria.timelineWeight +
      criteria.experienceWeight +
      criteria.qualityWeight;

    if (Math.abs(totalWeight - 1) > 0.01) {
      throw new Error('Criteria weights must sum to 1.0');
    }

    // Calculate weighted score (0-10 scale converted to 0-1)
    const comparisonScore =
      (scores.priceScore / 10) * criteria.priceWeight +
      (scores.timelineScore / 10) * criteria.timelineWeight +
      (scores.experienceScore / 10) * criteria.experienceWeight +
      (scores.qualityScore / 10) * criteria.qualityScore;

    return this.prisma.bid.update({
      where: { id: bidId },
      data: { comparisonScore },
      include: {
        supplier: true,
        lineItems: true,
      },
    });
  }

  async getRankedBids(projectId: string): Promise<any[]> {
    const bids = await this.prisma.bid.findMany({
      where: {
        projectId,
        status: { in: ['SUBMITTED', 'UNDER_REVIEW'] },
        comparisonScore: { not: null },
      },
      include: {
        supplier: true,
        _count: {
          select: { lineItems: true },
        },
      },
      orderBy: { comparisonScore: 'desc' },
    });

    return bids.map((bid, index) => ({
      rank: index + 1,
      bidId: bid.id,
      bidNumber: bid.bidNumber,
      supplier: bid.supplier?.name || 'Direct',
      total: Number(bid.total),
      comparisonScore: Number(bid.comparisonScore),
      lineItemCount: bid._count.lineItems,
      status: bid.status,
    }));
  }

  // ========================================
  // ANALYTICS
  // ========================================

  async getBidStatistics(projectId: string): Promise<any> {
    const bids = await this.prisma.bid.findMany({
      where: { projectId },
      include: {
        lineItems: true,
      },
    });

    const byStatus = bids.reduce((acc, bid) => {
      acc[bid.status] = (acc[bid.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byType = bids.reduce((acc, bid) => {
      acc[bid.bidType] = (acc[bid.bidType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const submittedBids = bids.filter(b => b.status === 'SUBMITTED' || b.status === 'UNDER_REVIEW');
    const awardedBids = bids.filter(b => b.status === 'AWARDED');

    return {
      totalBids: bids.length,
      byStatus,
      byType,
      submittedCount: submittedBids.length,
      awardedCount: awardedBids.length,
      declinedCount: bids.filter(b => b.status === 'DECLINED').length,
      averageBidValue: submittedBids.length > 0
        ? submittedBids.reduce((sum, b) => sum + Number(b.total), 0) / submittedBids.length
        : 0,
      totalAwardedValue: awardedBids.reduce((sum, b) => sum + Number(b.total), 0),
    };
  }

  // ========================================
  // HELPERS
  // ========================================

  private async generateBidNumber(projectId: string): Promise<string> {
    const count = await this.prisma.bid.count({
      where: { projectId },
    });

    const project = await this.prisma.project.findUniqueOrThrow({
      where: { id: projectId },
    });

    // Generate format: BID-[ProjectName abbreviation]-[sequential]
    const abbreviation = project.name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 3);

    return `BID-${abbreviation}-${String(count + 1).padStart(4, '0')}`;
  }

  private async recalculateBidTotals(bidId: string): Promise<void> {
    const bid = await this.prisma.bid.findUniqueOrThrow({
      where: { id: bidId },
      include: { lineItems: true },
    });

    const subtotal = bid.lineItems.reduce(
      (sum, item) => sum + Number(item.total),
      0
    );

    const taxAmount = subtotal * (Number(bid.taxPercent) / 100);
    const total = subtotal + taxAmount;

    await this.prisma.bid.update({
      where: { id: bidId },
      data: {
        subtotal,
        taxAmount,
        total,
      },
    });
  }

  async exportBidComparisonToCSV(projectId: string): Promise<string> {
    const comparison = await this.compareBids(projectId);

    let csv = 'Bid Number,Supplier,Total,Line Items,Price Score,Submitted Date,Valid Until,Bond Required\n';

    for (const bid of comparison.comparison) {
      const row = [
        bid.bidNumber,
        bid.supplier,
        bid.total,
        bid.lineItemCount,
        bid.priceScore,
        bid.submittedDate || '',
        bid.validUntil || '',
        bid.bondRequired ? 'Yes' : 'No',
      ];
      csv += row.map(v => `"${v}"`).join(',') + '\n';
    }

    return csv;
  }
}
