import { PrismaClient, Quote, QuoteItem, QuoteVersion, QuoteStatus } from '@prisma/client';
import { AIService } from '../ai/ai.service';
import { WebSocketService } from '../websocket.service';
import { renderPrompt } from '../../prompts/templates';
import {
  QuoteGenerationRequest,
  GeneratedQuote,
  GeneratedQuoteSchema,
  QuoteGenerationError,
} from '../../types/crm';

type QuoteWithItems = Quote & {
  items: QuoteItem[];
};

type QuoteFilters = {
  status?: QuoteStatus;
  customerId?: string;
  leadId?: string;
};

export class QuoteService {
  constructor(
    private prisma: PrismaClient,
    private aiService: AIService,
    private wsService?: WebSocketService
  ) {}

  async generateQuoteWithAI(
    request: QuoteGenerationRequest,
    createdById: string
  ): Promise<QuoteWithItems> {
    const startTime = Date.now();

    try {
      // Fetch historical projects for AI analysis
      // Filter for completed projects with both budget and actualCost set
      const historicalProjects = await this.prisma.project.findMany({
        where: {
          companyId: request.companyId,
          status: 'COMPLETED',
        },
        select: {
          id: true,
          name: true,
          description: true,
          budget: true,
          actualCost: true,
        },
        orderBy: {
          updatedAt: 'desc',
        },
      });

      // Format historical data for AI - filter out projects without budget/actualCost
      const historicalData = historicalProjects
        .filter(p => p.budget !== null && p.actualCost !== null)
        .slice(0, 10) // Limit to 10 most recent
        .map(p => ({
          id: p.id,
          name: p.name,
          description: p.description || '',
          budget: Number(p.budget),
          actualCost: Number(p.actualCost),
        }));

      // Prepare AI prompt variables
      const variables = {
        projectType: request.projectType,
        scope: request.scope,
        requirements: request.requirements.join('\n- '),
        constraints: request.constraints
          ? JSON.stringify(request.constraints, null, 2)
          : '',
        historicalProjects: historicalData.length > 0
          ? JSON.stringify(historicalData, null, 2)
          : 'No historical data available',
        profitMargin: request.profitMargin.toString(),
      };

      const prompt = renderPrompt('QUOTE_GENERATION', variables);

      // Generate quote using AI
      const aiResponse = await this.aiService['geminiClient'].generateContent(
        prompt,
        createdById
      );

      // Parse AI response
      const cleanResponse = this.extractJsonFromResponse(aiResponse);
      const parsed = JSON.parse(cleanResponse);

      // Validate against schema
      const generatedQuote = GeneratedQuoteSchema.parse({
        ...parsed,
        title: request.title,
        description: request.description,
        taxRate: request.taxRate,
        profitMargin: request.profitMargin,
        validUntil: new Date(Date.now() + request.validityDays * 24 * 60 * 60 * 1000),
        generationTime: Date.now() - startTime,
      });

      // Calculate totals
      const subtotal = generatedQuote.items.reduce(
        (sum, item) => sum + item.quantity * item.unitPrice,
        0
      );
      const taxAmount = subtotal * generatedQuote.taxRate;
      const total = subtotal + taxAmount;

      // Generate quote number
      const quoteNumber = await this.generateQuoteNumber(request.companyId);

      // Create quote in database
      const quote = await this.prisma.quote.create({
        data: {
          quoteNumber,
          title: generatedQuote.title,
          description: generatedQuote.description,
          status: 'DRAFT',
          subtotal,
          taxRate: generatedQuote.taxRate,
          taxAmount,
          total,
          validUntil: generatedQuote.validUntil,
          companyId: request.companyId,
          customerId: request.customerId,
          projectId: request.projectId,
          leadId: request.leadId,
          createdById,
          aiGenerated: true,
          aiAnalysisData: generatedQuote.aiAnalysisData,
          profitMargin: generatedQuote.profitMargin,
          items: {
            create: generatedQuote.items.map((item, index) => ({
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              total: item.quantity * item.unitPrice,
              category: item.category,
              sortOrder: index,
            })),
          },
        },
        include: {
          items: {
            orderBy: {
              sortOrder: 'asc',
            },
          },
        },
      });

      // Emit WebSocket event for real-time updates
      if (this.wsService) {
        this.wsService.broadcastToCompany(request.companyId, 'quote:created', {
          quoteId: quote.id,
          quoteNumber: quote.quoteNumber,
          customerId: quote.customerId,
          leadId: quote.leadId,
          total: Number(quote.total),
          status: quote.status,
          createdById,
          generationTime: Date.now() - startTime,
          timestamp: new Date(),
        });

        // Also notify the customer's assigned users
        if (request.leadId) {
          const lead = await this.prisma.lead.findUnique({
            where: { id: request.leadId },
            select: { assignedToId: true },
          });

          if (lead?.assignedToId) {
            this.wsService.emitToUser(lead.assignedToId, 'quote:created', {
              quoteId: quote.id,
              quoteNumber: quote.quoteNumber,
              leadId: request.leadId,
              total: Number(quote.total),
              timestamp: new Date(),
            });
          }
        }
      }

      return quote;
    } catch (error) {
      throw new QuoteGenerationError(
        'Failed to generate quote with AI',
        { request, error }
      );
    }
  }

  async getQuoteWithItems(quoteId: string): Promise<QuoteWithItems | null> {
    return this.prisma.quote.findUnique({
      where: { id: quoteId },
      include: {
        items: {
          orderBy: {
            sortOrder: 'asc',
          },
        },
      },
    });
  }

  async updateQuoteStatus(
    quoteId: string,
    status: QuoteStatus
  ): Promise<Quote> {
    const updateData: any = { status };

    if (status === 'SENT') {
      updateData.sentAt = new Date();
    } else if (status === 'ACCEPTED') {
      updateData.acceptedAt = new Date();
    }

    const quote = await this.prisma.quote.update({
      where: { id: quoteId },
      data: updateData,
    });

    // Emit WebSocket event for status change
    if (this.wsService) {
      this.wsService.broadcastToCompany(quote.companyId, 'quote:updated', {
        quoteId: quote.id,
        quoteNumber: quote.quoteNumber,
        status: quote.status,
        previousStatus: status,
        customerId: quote.customerId,
        leadId: quote.leadId,
        timestamp: new Date(),
      });

      // Notify relevant users
      if (quote.leadId) {
        const lead = await this.prisma.lead.findUnique({
          where: { id: quote.leadId },
          select: { assignedToId: true, createdById: true },
        });

        if (lead?.assignedToId) {
          this.wsService.emitToUser(lead.assignedToId, 'quote:updated', {
            quoteId: quote.id,
            status: quote.status,
            leadId: quote.leadId,
            timestamp: new Date(),
          });
        }
      }
    }

    return quote;
  }

  async getQuotesByCompany(
    companyId: string,
    filters?: QuoteFilters
  ): Promise<Quote[]> {
    const where: any = { companyId };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.customerId) {
      where.customerId = filters.customerId;
    }

    if (filters?.leadId) {
      where.leadId = filters.leadId;
    }

    return this.prisma.quote.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getQuotesByCustomer(customerId: string): Promise<Quote[]> {
    return this.prisma.quote.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getQuotesByLead(leadId: string): Promise<Quote[]> {
    return this.prisma.quote.findMany({
      where: { leadId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createQuoteVersion(
    quoteId: string,
    changeReason?: string
  ): Promise<QuoteVersion> {
    const quote = await this.prisma.quote.findUnique({
      where: { id: quoteId },
      include: {
        items: {
          orderBy: {
            sortOrder: 'asc',
          },
        },
        versions: {
          orderBy: {
            version: 'desc',
          },
          take: 1,
        },
      },
    });

    if (!quote) {
      throw new QuoteGenerationError('Quote not found');
    }

    const nextVersion = quote.versions.length > 0
      ? quote.versions[0].version + 1
      : 1;

    const version = await this.prisma.quoteVersion.create({
      data: {
        quoteId,
        version: nextVersion,
        title: quote.title,
        description: quote.description,
        subtotal: quote.subtotal,
        taxRate: quote.taxRate,
        taxAmount: quote.taxAmount,
        total: quote.total,
        notes: quote.notes,
        changeReason,
        items: quote.items.map(item => ({
          description: item.description,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          total: Number(item.total),
          category: item.category,
          sortOrder: item.sortOrder,
        })),
      },
    });

    // Emit WebSocket event for version creation
    if (this.wsService) {
      this.wsService.broadcastToCompany(quote.companyId, 'quote:version_created', {
        quoteId,
        version: nextVersion,
        changeReason,
        timestamp: new Date(),
      });
    }

    return version;
  }

  async getQuoteVersions(quoteId: string): Promise<QuoteVersion[]> {
    return this.prisma.quoteVersion.findMany({
      where: { quoteId },
      orderBy: {
        version: 'asc',
      },
    });
  }

  async requestApproval(
    quoteId: string,
    approverId: string,
    requesterId: string,
    comments?: string
  ): Promise<void> {
    const quote = await this.prisma.quote.findUnique({
      where: { id: quoteId },
      select: { companyId: true, quoteNumber: true, total: true },
    });

    if (!quote) {
      throw new QuoteGenerationError('Quote not found');
    }

    const approval = await this.prisma.quoteApproval.create({
      data: {
        quoteId,
        approverId,
        requesterId,
        status: 'PENDING',
        comments,
      },
    });

    // Emit WebSocket event for approval request
    if (this.wsService) {
      // Notify the approver
      this.wsService.emitToUser(approverId, 'approval:requested', {
        approvalId: approval.id,
        quoteId,
        quoteNumber: quote.quoteNumber,
        total: Number(quote.total),
        requesterId,
        comments,
        timestamp: new Date(),
      });

      // Broadcast to company
      this.wsService.broadcastToCompany(quote.companyId, 'approval:requested', {
        approvalId: approval.id,
        quoteId,
        approverId,
        requesterId,
        timestamp: new Date(),
      });
    }
  }

  async respondToApproval(
    approvalId: string,
    status: 'APPROVED' | 'REJECTED',
    comments?: string
  ): Promise<void> {
    const approval = await this.prisma.quoteApproval.findUnique({
      where: { id: approvalId },
      include: {
        quote: {
          select: { companyId: true, quoteNumber: true },
        },
      },
    });

    if (!approval) {
      throw new QuoteGenerationError('Approval not found');
    }

    const updateData: any = { status, comments };

    if (status === 'APPROVED') {
      updateData.approvedAt = new Date();
    } else if (status === 'REJECTED') {
      updateData.rejectedAt = new Date();
    }

    await this.prisma.quoteApproval.update({
      where: { id: approvalId },
      data: updateData,
    });

    // Emit WebSocket event for approval response
    if (this.wsService) {
      // Notify the requester
      this.wsService.emitToUser(approval.requesterId, 'approval:responded', {
        approvalId,
        quoteId: approval.quoteId,
        quoteNumber: approval.quote.quoteNumber,
        status,
        approverId: approval.approverId,
        comments,
        timestamp: new Date(),
      });

      // Broadcast to company
      this.wsService.broadcastToCompany(approval.quote.companyId, 'approval:responded', {
        approvalId,
        quoteId: approval.quoteId,
        status,
        timestamp: new Date(),
      });
    }
  }

  private async generateQuoteNumber(companyId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `QUO-${year}`;

    const lastQuote = await this.prisma.quote.findFirst({
      where: {
        companyId,
        quoteNumber: {
          startsWith: prefix,
        },
      },
      orderBy: {
        quoteNumber: 'desc',
      },
    });

    if (!lastQuote) {
      return `${prefix}-0001`;
    }

    const lastNumber = parseInt(lastQuote.quoteNumber.split('-').pop() || '0');
    const nextNumber = lastNumber + 1;

    return `${prefix}-${nextNumber.toString().padStart(4, '0')}`;
  }

  private extractJsonFromResponse(response: string): string {
    // Try to find JSON in the response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return jsonMatch[0];
    }

    throw new QuoteGenerationError(
      'No valid JSON found in AI response',
      { response }
    );
  }
}