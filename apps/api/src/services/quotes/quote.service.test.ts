import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { QuoteStatus } from '@prisma/client';
import { prisma } from '../../lib/database';
import { redis } from '../../lib/redis';
import { QuoteService } from './quote.service';
import { AIService } from '../ai/ai.service';
import type { AIConfig } from '../../types/ai';
import type { QuoteGenerationRequest } from '../../types/crm';

const aiConfig: AIConfig = {
  geminiApiKey: process.env.GEMINI_API_KEY!,
  model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
  maxTokens: Number(process.env.GEMINI_MAX_TOKENS) || 4096,
  temperature: Number(process.env.GEMINI_TEMPERATURE) || 0.7,
  rateLimitPerMinute: Number(process.env.AI_RATE_LIMIT) || 60,
  cacheEnabled: process.env.AI_CACHE_ENABLED !== 'false',
  cacheTtlSeconds: Number(process.env.AI_CACHE_TTL) || 3600,
};

const aiService = new AIService(prisma, redis, aiConfig);
const quoteService = new QuoteService(prisma, aiService);

describe('QuoteService - AI-Powered Quote Generation', () => {
  let testCompanyId: string;
  let testUserId: string;
  let testCustomerId: string;
  let testProjectId: string;
  let testLeadId: string;

  beforeEach(async () => {
    const testUser = await prisma.user.create({
      data: {
        email: `test-quote-${Date.now()}@example.com`,
        password: 'hashed_password',
        firstName: 'Test',
        lastName: 'User',
      },
    });
    testUserId = testUser.id;

    const testCompany = await prisma.company.create({
      data: {
        name: `Test Company ${Date.now()}`,
        users: {
          create: {
            userId: testUserId,
            isOwner: true,
          },
        },
      },
    });
    testCompanyId = testCompany.id;

    const testCustomer = await prisma.customer.create({
      data: {
        companyId: testCompanyId,
        name: 'Test Customer',
        email: 'customer@example.com',
        phone: '+1234567890',
      },
    });
    testCustomerId = testCustomer.id;

    const testProject = await prisma.project.create({
      data: {
        name: 'Historical Project',
        description: 'Similar completed project for reference',
        companyId: testCompanyId,
        customerId: testCustomerId,
        createdById: testUserId,
        status: 'COMPLETED',
        budget: 100000,
        actualCost: 95000,
        plannedHours: 800,
        actualHours: 850,
      },
    });
    testProjectId = testProject.id;

    const testLead = await prisma.lead.create({
      data: {
        companyId: testCompanyId,
        customerId: testCustomerId,
        title: 'Kitchen Renovation Lead',
        source: 'WEBSITE',
        contactName: 'Test Contact',
        value: 50000,
        createdById: testUserId,
      },
    });
    testLeadId = testLead.id;
  });

  afterEach(async () => {
    await prisma.quoteApproval.deleteMany({ where: { quote: { companyId: testCompanyId } } });
    await prisma.quoteVersion.deleteMany({ where: { quote: { companyId: testCompanyId } } });
    await prisma.quoteItem.deleteMany({ where: { quote: { companyId: testCompanyId } } });
    await prisma.quote.deleteMany({ where: { companyId: testCompanyId } });
    await prisma.lead.deleteMany({ where: { companyId: testCompanyId } });
    await prisma.project.deleteMany({ where: { companyId: testCompanyId } });
    await prisma.customer.deleteMany({ where: { companyId: testCompanyId } });
    await prisma.companyUser.deleteMany({ where: { companyId: testCompanyId } });
    await prisma.company.deleteMany({ where: { id: testCompanyId } });
    await prisma.user.deleteMany({ where: { id: testUserId } });
  });

  describe('AI Quote Generation', () => {
    it('should generate a quote using AI in under 10 minutes', async () => {
      const startTime = Date.now();

      const request: QuoteGenerationRequest = {
        companyId: testCompanyId,
        customerId: testCustomerId,
        leadId: testLeadId,
        title: 'Kitchen Renovation Quote',
        description: 'Complete kitchen remodel with modern appliances',
        projectType: 'RESIDENTIAL_RENOVATION',
        scope: 'Full kitchen tear-out and rebuild, new cabinets, countertops, appliances, flooring, electrical, plumbing',
        requirements: [
          'Remove existing cabinets and appliances',
          'Install custom cabinetry',
          'Install granite countertops',
          'Update electrical for new appliances',
          'Install new plumbing fixtures',
          'Install hardwood flooring',
          'Paint walls and ceiling',
        ],
        constraints: {
          budget: 60000,
          timeline: '6 weeks',
          materials: ['granite', 'hardwood', 'custom cabinets'],
        },
        taxRate: 0.08,
        profitMargin: 20,
        validityDays: 30,
      };

      const result = await quoteService.generateQuoteWithAI(request, testUserId);

      const generationTime = Date.now() - startTime;

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.title).toBe('Kitchen Renovation Quote');
      expect(result.status).toBe('DRAFT');
      expect(result.aiGenerated).toBe(true);
      expect(result.items).toBeDefined();
      expect(result.items.length).toBeGreaterThan(0);
      expect(result.subtotal).toBeGreaterThan(0);
      expect(result.total).toBeGreaterThan(0);
      expect(result.profitMargin?.toString()).toBe('20');

      // Verify AI analysis data exists
      expect(result.aiAnalysisData).toBeDefined();
      const analysisData = result.aiAnalysisData as any;
      expect(analysisData.historicalProjects).toBeDefined();
      expect(analysisData.confidence).toBeGreaterThan(0);
      expect(analysisData.reasoning).toBeDefined();

      // Verify generation time is under 10 minutes (600000ms)
      console.log(`Quote generation time: ${generationTime}ms (${(generationTime / 1000).toFixed(2)}s)`);
      expect(generationTime).toBeLessThan(600000);

      // Verify tax calculation
      const expectedTax = result.subtotal * 0.08;
      expect(Math.abs(Number(result.taxAmount) - expectedTax)).toBeLessThan(0.01);

      // Verify total calculation
      const expectedTotal = Number(result.subtotal) + Number(result.taxAmount);
      expect(Math.abs(Number(result.total) - expectedTotal)).toBeLessThan(0.01);
    }, 600000); // Set test timeout to 10 minutes

    it('should analyze historical projects for pricing intelligence', async () => {
      // Create more historical projects with varying budgets
      await prisma.project.create({
        data: {
          name: 'Kitchen Renovation 2023-Q1',
          description: 'Mid-range kitchen remodel',
          companyId: testCompanyId,
          customerId: testCustomerId,
          createdById: testUserId,
          status: 'COMPLETED',
          budget: 55000,
          actualCost: 52000,
        },
      });

      await prisma.project.create({
        data: {
          name: 'Kitchen Renovation 2023-Q3',
          description: 'High-end kitchen with custom features',
          companyId: testCompanyId,
          customerId: testCustomerId,
          createdById: testUserId,
          status: 'COMPLETED',
          budget: 85000,
          actualCost: 82000,
        },
      });

      const request: QuoteGenerationRequest = {
        companyId: testCompanyId,
        customerId: testCustomerId,
        title: 'Kitchen Renovation Analysis Test',
        projectType: 'RESIDENTIAL_RENOVATION',
        scope: 'Standard kitchen renovation',
        requirements: ['Cabinets', 'Countertops', 'Appliances'],
        taxRate: 0.08,
        profitMargin: 20,
        validityDays: 30,
      };

      const result = await quoteService.generateQuoteWithAI(request, testUserId);

      const analysisData = result.aiAnalysisData as any;
      expect(analysisData.historicalProjects).toBeDefined();
      expect(analysisData.historicalProjects.length).toBeGreaterThan(0);

      // Verify historical projects have similarity scores
      analysisData.historicalProjects.forEach((project: any) => {
        expect(project.similarity).toBeGreaterThanOrEqual(0);
        expect(project.similarity).toBeLessThanOrEqual(1);
        expect(project.budget).toBeDefined();
        expect(project.actualCost).toBeDefined();
      });
    });

    it('should provide market rate analysis in quote', async () => {
      const request: QuoteGenerationRequest = {
        companyId: testCompanyId,
        customerId: testCustomerId,
        title: 'Market Rate Test Quote',
        projectType: 'RESIDENTIAL_RENOVATION',
        scope: 'Kitchen renovation with standard features',
        requirements: ['Cabinets', 'Countertops', 'Flooring'],
        taxRate: 0.08,
        profitMargin: 20,
        validityDays: 30,
      };

      const result = await quoteService.generateQuoteWithAI(request, testUserId);

      const analysisData = result.aiAnalysisData as any;
      expect(analysisData.marketRates).toBeDefined();
      expect(typeof analysisData.marketRates).toBe('object');

      // Should have market rates for common categories
      const marketRates = analysisData.marketRates;
      expect(Object.keys(marketRates).length).toBeGreaterThan(0);
    });

    it('should include risk assessment in AI analysis', async () => {
      const request: QuoteGenerationRequest = {
        companyId: testCompanyId,
        customerId: testCustomerId,
        title: 'Risk Assessment Test Quote',
        projectType: 'RESIDENTIAL_RENOVATION',
        scope: 'Complex kitchen renovation',
        requirements: ['Custom cabinets', 'Electrical upgrade', 'Plumbing reconfiguration'],
        constraints: {
          budget: 40000,
          timeline: '3 weeks',
        },
        taxRate: 0.08,
        profitMargin: 20,
        validityDays: 30,
      };

      const result = await quoteService.generateQuoteWithAI(request, testUserId);

      const analysisData = result.aiAnalysisData as any;
      expect(analysisData.risks).toBeDefined();
      expect(Array.isArray(analysisData.risks)).toBe(true);

      if (analysisData.risks.length > 0) {
        analysisData.risks.forEach((risk: any) => {
          expect(risk.description).toBeDefined();
          expect(['LOW', 'MEDIUM', 'HIGH']).toContain(risk.impact);
          expect(risk.mitigation).toBeDefined();
        });
      }
    });

    it('should generate itemized quote items with categories', async () => {
      const request: QuoteGenerationRequest = {
        companyId: testCompanyId,
        customerId: testCustomerId,
        title: 'Itemized Quote Test',
        projectType: 'RESIDENTIAL_RENOVATION',
        scope: 'Complete kitchen renovation',
        requirements: [
          'Remove old cabinets',
          'Install new cabinets',
          'Install countertops',
          'Install flooring',
          'Electrical work',
          'Plumbing work',
        ],
        taxRate: 0.08,
        profitMargin: 20,
        validityDays: 30,
      };

      const result = await quoteService.generateQuoteWithAI(request, testUserId);

      expect(result.items.length).toBeGreaterThan(0);

      result.items.forEach((item) => {
        expect(item.description).toBeDefined();
        expect(item.description.length).toBeGreaterThan(0);
        expect(Number(item.quantity)).toBeGreaterThan(0);
        expect(Number(item.unitPrice)).toBeGreaterThan(0);
        expect(Number(item.total)).toBeGreaterThan(0);

        // Verify total = quantity * unitPrice
        const calculatedTotal = Number(item.quantity) * Number(item.unitPrice);
        expect(Math.abs(Number(item.total) - calculatedTotal)).toBeLessThan(0.01);

        // Should have category
        expect(item.category).toBeDefined();
      });

      // Verify subtotal matches sum of items
      const itemsTotal = result.items.reduce((sum, item) => sum + Number(item.total), 0);
      expect(Math.abs(Number(result.subtotal) - itemsTotal)).toBeLessThan(0.01);
    });

    it('should apply profit margin correctly', async () => {
      const profitMargin = 25;

      const request: QuoteGenerationRequest = {
        companyId: testCompanyId,
        customerId: testCustomerId,
        title: 'Profit Margin Test',
        projectType: 'RESIDENTIAL_RENOVATION',
        scope: 'Basic kitchen update',
        requirements: ['Cabinets', 'Countertops'],
        taxRate: 0.08,
        profitMargin,
        validityDays: 30,
      };

      const result = await quoteService.generateQuoteWithAI(request, testUserId);

      expect(result.profitMargin?.toString()).toBe(profitMargin.toString());

      // The AI should factor profit margin into pricing
      const analysisData = result.aiAnalysisData as any;
      expect(analysisData.assumptions).toBeDefined();
      expect(Array.isArray(analysisData.assumptions)).toBe(true);
    });

    it('should set valid until date based on validity days', async () => {
      const validityDays = 45;

      const request: QuoteGenerationRequest = {
        companyId: testCompanyId,
        customerId: testCustomerId,
        title: 'Validity Test Quote',
        projectType: 'RESIDENTIAL_RENOVATION',
        scope: 'Kitchen renovation',
        requirements: ['Cabinets'],
        taxRate: 0.08,
        profitMargin: 20,
        validityDays,
      };

      const result = await quoteService.generateQuoteWithAI(request, testUserId);

      expect(result.validUntil).toBeDefined();

      const validUntilDate = new Date(result.validUntil!);
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() + validityDays);

      // Allow 1 day tolerance for test execution time
      const daysDifference = Math.abs(
        (validUntilDate.getTime() - expectedDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      expect(daysDifference).toBeLessThan(1);
    });
  });

  describe('Quote Management', () => {
    it('should retrieve quote with all items', async () => {
      const request: QuoteGenerationRequest = {
        companyId: testCompanyId,
        customerId: testCustomerId,
        title: 'Retrieve Test Quote',
        projectType: 'RESIDENTIAL_RENOVATION',
        scope: 'Kitchen renovation',
        requirements: ['Cabinets', 'Countertops'],
        taxRate: 0.08,
        profitMargin: 20,
        validityDays: 30,
      };

      const created = await quoteService.generateQuoteWithAI(request, testUserId);

      const retrieved = await quoteService.getQuoteWithItems(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe(created.id);
      expect(retrieved!.items).toBeDefined();
      expect(retrieved!.items.length).toBe(created.items.length);
    });

    it('should update quote status', async () => {
      const request: QuoteGenerationRequest = {
        companyId: testCompanyId,
        customerId: testCustomerId,
        title: 'Status Test Quote',
        projectType: 'RESIDENTIAL_RENOVATION',
        scope: 'Kitchen renovation',
        requirements: ['Cabinets'],
        taxRate: 0.08,
        profitMargin: 20,
        validityDays: 30,
      };

      const quote = await quoteService.generateQuoteWithAI(request, testUserId);

      const updated = await quoteService.updateQuoteStatus(quote.id, 'SENT');

      expect(updated.status).toBe('SENT');
      expect(updated.sentAt).toBeDefined();
      expect(updated.sentAt).toBeInstanceOf(Date);
    });

    it('should list quotes by company', async () => {
      await quoteService.generateQuoteWithAI({
        companyId: testCompanyId,
        customerId: testCustomerId,
        title: 'Quote 1',
        projectType: 'RESIDENTIAL_RENOVATION',
        scope: 'Kitchen',
        requirements: ['Cabinets'],
        taxRate: 0.08,
        profitMargin: 20,
        validityDays: 30,
      }, testUserId);

      await quoteService.generateQuoteWithAI({
        companyId: testCompanyId,
        customerId: testCustomerId,
        title: 'Quote 2',
        projectType: 'RESIDENTIAL_RENOVATION',
        scope: 'Bathroom',
        requirements: ['Tiles'],
        taxRate: 0.08,
        profitMargin: 20,
        validityDays: 30,
      }, testUserId);

      const quotes = await quoteService.getQuotesByCompany(testCompanyId);

      expect(quotes.length).toBeGreaterThanOrEqual(2);
      expect(quotes.every(q => q.companyId === testCompanyId)).toBe(true);
    });

    it('should filter quotes by status', async () => {
      const quote1 = await quoteService.generateQuoteWithAI({
        companyId: testCompanyId,
        customerId: testCustomerId,
        title: 'Draft Quote',
        projectType: 'RESIDENTIAL_RENOVATION',
        scope: 'Kitchen',
        requirements: ['Cabinets'],
        taxRate: 0.08,
        profitMargin: 20,
        validityDays: 30,
      }, testUserId);

      const quote2 = await quoteService.generateQuoteWithAI({
        companyId: testCompanyId,
        customerId: testCustomerId,
        title: 'Sent Quote',
        projectType: 'RESIDENTIAL_RENOVATION',
        scope: 'Bathroom',
        requirements: ['Tiles'],
        taxRate: 0.08,
        profitMargin: 20,
        validityDays: 30,
      }, testUserId);

      await quoteService.updateQuoteStatus(quote2.id, 'SENT');

      const sentQuotes = await quoteService.getQuotesByCompany(testCompanyId, { status: 'SENT' });

      expect(sentQuotes.length).toBeGreaterThanOrEqual(1);
      expect(sentQuotes.every(q => q.status === 'SENT')).toBe(true);
    });

    it('should get quotes by customer', async () => {
      await quoteService.generateQuoteWithAI({
        companyId: testCompanyId,
        customerId: testCustomerId,
        title: 'Customer Quote 1',
        projectType: 'RESIDENTIAL_RENOVATION',
        scope: 'Kitchen',
        requirements: ['Cabinets'],
        taxRate: 0.08,
        profitMargin: 20,
        validityDays: 30,
      }, testUserId);

      const quotes = await quoteService.getQuotesByCustomer(testCustomerId);

      expect(quotes.length).toBeGreaterThanOrEqual(1);
      expect(quotes.every(q => q.customerId === testCustomerId)).toBe(true);
    });

    it('should get quotes by lead', async () => {
      await quoteService.generateQuoteWithAI({
        companyId: testCompanyId,
        customerId: testCustomerId,
        leadId: testLeadId,
        title: 'Lead Quote 1',
        projectType: 'RESIDENTIAL_RENOVATION',
        scope: 'Kitchen',
        requirements: ['Cabinets'],
        taxRate: 0.08,
        profitMargin: 20,
        validityDays: 30,
      }, testUserId);

      const quotes = await quoteService.getQuotesByLead(testLeadId);

      expect(quotes.length).toBeGreaterThanOrEqual(1);
      expect(quotes.every(q => q.leadId === testLeadId)).toBe(true);
    });
  });

  describe('Quote Versioning', () => {
    it('should create a new version when quote is modified', async () => {
      const quote = await quoteService.generateQuoteWithAI({
        companyId: testCompanyId,
        customerId: testCustomerId,
        title: 'Version Test Quote',
        projectType: 'RESIDENTIAL_RENOVATION',
        scope: 'Kitchen',
        requirements: ['Cabinets'],
        taxRate: 0.08,
        profitMargin: 20,
        validityDays: 30,
      }, testUserId);

      const version = await quoteService.createQuoteVersion(
        quote.id,
        'Initial version before customer changes'
      );

      expect(version).toBeDefined();
      expect(version.quoteId).toBe(quote.id);
      expect(version.version).toBe(1);
      expect(version.changeReason).toBe('Initial version before customer changes');
      expect(version.items).toBeDefined();
    });

    it('should retrieve all versions of a quote', async () => {
      const quote = await quoteService.generateQuoteWithAI({
        companyId: testCompanyId,
        customerId: testCustomerId,
        title: 'Multi-Version Test',
        projectType: 'RESIDENTIAL_RENOVATION',
        scope: 'Kitchen',
        requirements: ['Cabinets'],
        taxRate: 0.08,
        profitMargin: 20,
        validityDays: 30,
      }, testUserId);

      await quoteService.createQuoteVersion(quote.id, 'Version 1');
      await quoteService.createQuoteVersion(quote.id, 'Version 2');
      await quoteService.createQuoteVersion(quote.id, 'Version 3');

      const versions = await quoteService.getQuoteVersions(quote.id);

      expect(versions.length).toBe(3);
      expect(versions[0].version).toBe(1);
      expect(versions[1].version).toBe(2);
      expect(versions[2].version).toBe(3);
    });
  });
});