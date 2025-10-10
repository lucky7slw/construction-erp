import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '../../generated/prisma';
import { EstimatesService } from './estimates.service';
import { setupTestDatabase, cleanupTestDatabase } from '../../test-helpers/database';
import { createTestCompany, createTestUser, createTestProject } from '../../test-helpers/factories';

describe('EstimatesService', () => {
  let prisma: PrismaClient;
  let service: EstimatesService;
  let testCompany: any;
  let testUser: any;
  let testProject: any;
  let testCustomer: any;

  beforeAll(async () => {
    prisma = await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase(prisma);
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    testCompany = await createTestCompany(prisma, {
      name: 'Test Construction Co',
    });
    testUser = await createTestUser(prisma, {
      email: `test-${Date.now()}@test.com`,
      firstName: 'Test',
      lastName: 'User',
      companyId: testCompany.id,
    });
    testCustomer = await prisma.customer.create({
      data: {
        name: 'Test Customer',
        email: 'customer@test.com',
        companyId: testCompany.id,
      },
    });
    testProject = await createTestProject(prisma, {
      name: 'Test Project',
      companyId: testCompany.id,
      createdById: testUser.id,
      status: 'ACTIVE',
    });

    service = new EstimatesService(prisma);
  });

  afterEach(async () => {
    await cleanupTestDatabase(prisma);
  });

  describe('createEstimate', () => {
    it('should create estimate with auto-generated number', async () => {
      const estimate = await service.createEstimate(
        {
          name: 'Kitchen Renovation',
          projectId: testProject.id,
          description: 'Full kitchen remodel',
          overheadPercent: 10,
          profitPercent: 15,
          taxPercent: 8,
        },
        testUser.id
      );

      expect(estimate.estimateNumber).toMatch(/^EST-\d{5}$/);
      expect(estimate.name).toBe('Kitchen Renovation');
      expect(estimate.status).toBe('DRAFT');
      expect(Number(estimate.total)).toBe(0); // No line items yet
    });

    it('should set default percentages to zero', async () => {
      const estimate = await service.createEstimate(
        {
          name: 'Simple Estimate',
          projectId: testProject.id,
        },
        testUser.id
      );

      expect(Number(estimate.overheadPercent)).toBe(0);
      expect(Number(estimate.profitPercent)).toBe(0);
      expect(Number(estimate.taxPercent)).toBe(0);
    });
  });

  describe('addLineItem', () => {
    it('should add line item and calculate costs', async () => {
      const estimate = await service.createEstimate(
        {
          name: 'Test Estimate',
          projectId: testProject.id,
        },
        testUser.id
      );

      const lineItem = await service.addLineItem(estimate.id, {
        category: 'MATERIALS',
        description: 'Hardwood flooring',
        quantity: 500,
        unit: 'sqft',
        unitCost: 12.50,
        markup: 20,
      });

      expect(Number(lineItem.subtotal)).toBe(6250); // 500 * 12.50
      expect(Number(lineItem.total)).toBe(7500); // 6250 + 20% markup
      expect(lineItem.category).toBe('MATERIALS');
    });

    it('should recalculate estimate totals when adding line items', async () => {
      const estimate = await service.createEstimate(
        {
          name: 'Test Estimate',
          projectId: testProject.id,
          overheadPercent: 10,
          profitPercent: 15,
          taxPercent: 8,
        },
        testUser.id
      );

      await service.addLineItem(estimate.id, {
        category: 'LABOR',
        description: 'Installation labor',
        quantity: 40,
        unit: 'hours',
        unitCost: 50,
        markup: 0,
      });

      const updated = await service.getEstimate(estimate.id);

      expect(Number(updated.subtotal)).toBe(2000); // 40 * 50
      expect(Number(updated.overheadAmount)).toBe(200); // 10% of 2000
      expect(Number(updated.profitAmount)).toBe(330); // 15% of (2000 + 200)
      expect(Number(updated.taxAmount)).toBe(202.4); // 8% of (2000 + 200 + 330)
      expect(Number(updated.total)).toBe(2732.4); // 2000 + 200 + 330 + 202.4
    });

    it('should handle labor hours and rates in line items', async () => {
      const estimate = await service.createEstimate(
        {
          name: 'Test Estimate',
          projectId: testProject.id,
        },
        testUser.id
      );

      const lineItem = await service.addLineItem(estimate.id, {
        category: 'LABOR',
        description: 'Framing labor',
        quantity: 1,
        unit: 'lot',
        unitCost: 5000,
        laborHours: 80,
        laborRate: 62.50,
        markup: 0,
      });

      expect(Number(lineItem.laborHours)).toBe(80);
      expect(Number(lineItem.laborRate)).toBe(62.50);
      expect(Number(lineItem.total)).toBe(5000);
    });
  });

  describe('updateLineItem', () => {
    it('should update line item and recalculate costs', async () => {
      const estimate = await service.createEstimate(
        {
          name: 'Test Estimate',
          projectId: testProject.id,
        },
        testUser.id
      );

      const lineItem = await service.addLineItem(estimate.id, {
        category: 'MATERIALS',
        description: 'Paint',
        quantity: 10,
        unit: 'gallons',
        unitCost: 35,
        markup: 20,
      });

      const updated = await service.updateLineItem(lineItem.id, {
        quantity: 15,
        unitCost: 40,
      });

      expect(Number(updated.subtotal)).toBe(600); // 15 * 40
      expect(Number(updated.total)).toBe(720); // 600 + 20%
    });

    it('should throw error for non-existent line item', async () => {
      await expect(
        service.updateLineItem('invalid-id', { quantity: 5 })
      ).rejects.toThrow('Line item not found');
    });
  });

  describe('deleteLineItem', () => {
    it('should delete line item and recalculate totals', async () => {
      const estimate = await service.createEstimate(
        {
          name: 'Test Estimate',
          projectId: testProject.id,
        },
        testUser.id
      );

      const lineItem1 = await service.addLineItem(estimate.id, {
        category: 'MATERIALS',
        description: 'Item 1',
        quantity: 10,
        unit: 'units',
        unitCost: 100,
        markup: 0,
      });

      await service.addLineItem(estimate.id, {
        category: 'MATERIALS',
        description: 'Item 2',
        quantity: 5,
        unit: 'units',
        unitCost: 200,
        markup: 0,
      });

      await service.deleteLineItem(lineItem1.id);

      const updated = await service.getEstimate(estimate.id);
      expect(updated.lineItems).toHaveLength(1);
      expect(Number(updated.subtotal)).toBe(1000); // Only item 2 remains
    });

    it('should throw error for non-existent line item', async () => {
      await expect(
        service.deleteLineItem('invalid-id')
      ).rejects.toThrow('Line item not found');
    });
  });

  describe('templates', () => {
    it('should create estimate template', async () => {
      const template = await service.createTemplate(
        {
          name: 'Standard Bathroom',
          description: 'Full bathroom renovation template',
          category: 'Bathroom',
          companyId: testCompany.id,
          lineItems: [
            {
              category: 'MATERIALS',
              description: 'Tile and fixtures',
              quantity: 1,
              unit: 'lot',
              unitCost: 3000,
              markup: 25,
            },
            {
              category: 'LABOR',
              description: 'Installation labor',
              quantity: 60,
              unit: 'hours',
              unitCost: 55,
              markup: 0,
            },
          ],
          defaultMarkup: 20,
        },
        testUser.id
      );

      expect(template.name).toBe('Standard Bathroom');
      expect(template.useCount).toBe(0);
      expect(template.lineItems).toHaveLength(2);
    });

    it('should apply template to estimate', async () => {
      const template = await service.createTemplate(
        {
          name: 'Quick Template',
          category: 'Test',
          companyId: testCompany.id,
          lineItems: [
            {
              category: 'MATERIALS',
              description: 'Materials',
              quantity: 10,
              unit: 'units',
              unitCost: 50,
              markup: 20,
            },
          ],
        },
        testUser.id
      );

      const estimate = await service.createEstimate(
        {
          name: 'Test Estimate',
          projectId: testProject.id,
        },
        testUser.id
      );

      await service.applyTemplate(estimate.id, template.id);

      const updated = await service.getEstimate(estimate.id);
      expect(updated.lineItems).toHaveLength(1);
      expect(updated.lineItems[0].description).toBe('Materials');

      // Check use count incremented
      const updatedTemplate = await prisma.estimateTemplate.findUnique({
        where: { id: template.id },
      });
      expect(updatedTemplate!.useCount).toBe(1);
    });

    it('should list templates for company', async () => {
      await service.createTemplate(
        {
          name: 'Template 1',
          category: 'Kitchen',
          companyId: testCompany.id,
          lineItems: [],
        },
        testUser.id
      );

      await service.createTemplate(
        {
          name: 'Template 2',
          category: 'Bathroom',
          companyId: testCompany.id,
          lineItems: [],
          isPublic: true,
        },
        testUser.id
      );

      const templates = await service.listTemplates(testCompany.id);
      expect(templates).toHaveLength(2);
    });
  });

  describe('cost database', () => {
    it('should add cost database item', async () => {
      const item = await service.addCostDatabaseItem({
        companyId: testCompany.id,
        category: 'MATERIALS',
        name: '2x4 Lumber',
        description: 'Dimensional lumber',
        unit: 'board foot',
        currentCost: 1.25,
        supplierName: 'Local Lumber Co',
      });

      expect(item.name).toBe('2x4 Lumber');
      expect(Number(item.currentCost)).toBe(1.25);
      expect(Number(item.averageCost)).toBe(1.25);
      expect(Number(item.lowestCost)).toBe(1.25);
      expect(Number(item.highestCost)).toBe(1.25);
    });

    it('should update cost and track history', async () => {
      const item = await service.addCostDatabaseItem({
        companyId: testCompany.id,
        category: 'MATERIALS',
        name: 'Concrete',
        unit: 'cubic yard',
        currentCost: 150,
      });

      const updated = await service.updateCostDatabaseItem(item.id, 175);

      expect(Number(updated.currentCost)).toBe(175);
      expect(Number(updated.lowestCost)).toBe(150);
      expect(Number(updated.highestCost)).toBe(175);
      expect(Number(updated.averageCost)).toBe(162.5);
      expect(updated.priceHistory).toHaveLength(2);
    });

    it('should search cost database', async () => {
      await service.addCostDatabaseItem({
        companyId: testCompany.id,
        category: 'MATERIALS',
        name: 'Oak flooring',
        unit: 'sqft',
        currentCost: 8.50,
      });

      await service.addCostDatabaseItem({
        companyId: testCompany.id,
        category: 'MATERIALS',
        name: 'Maple flooring',
        unit: 'sqft',
        currentCost: 9.25,
      });

      const results = await service.searchCostDatabase(
        testCompany.id,
        'flooring'
      );

      expect(results).toHaveLength(2);
    });
  });

  describe('assemblies', () => {
    it('should create assembly with calculated totals', async () => {
      const assembly = await service.createAssembly(
        {
          name: 'Basic Door Installation',
          description: 'Pre-hung door with hardware',
          category: 'Doors',
          companyId: testCompany.id,
          components: [
            {
              description: 'Pre-hung door',
              quantity: 1,
              unit: 'each',
              unitCost: 250,
              category: 'MATERIALS',
            },
            {
              description: 'Door hardware',
              quantity: 1,
              unit: 'set',
              unitCost: 75,
              category: 'MATERIALS',
            },
            {
              description: 'Installation labor',
              quantity: 1,
              unit: 'door',
              unitCost: 0,
              laborHours: 4,
              laborRate: 50,
              category: 'LABOR',
            },
          ],
        },
        testUser.id
      );

      expect(Number(assembly.totalCost)).toBe(525); // 250 + 75 + (4*50)
      expect(Number(assembly.totalLaborHours)).toBe(4);
      expect(assembly.components).toHaveLength(3);
    });

    it('should apply assembly to estimate', async () => {
      const assembly = await service.createAssembly(
        {
          name: 'Window Package',
          category: 'Windows',
          companyId: testCompany.id,
          components: [
            {
              description: 'Window unit',
              quantity: 1,
              unit: 'each',
              unitCost: 300,
              category: 'MATERIALS',
            },
            {
              description: 'Installation',
              quantity: 1,
              unit: 'window',
              unitCost: 0,
              laborHours: 3,
              laborRate: 55,
              category: 'LABOR',
            },
          ],
        },
        testUser.id
      );

      const estimate = await service.createEstimate(
        {
          name: 'Test Estimate',
          projectId: testProject.id,
        },
        testUser.id
      );

      await service.applyAssembly(estimate.id, assembly.id, 3); // 3 windows

      const updated = await service.getEstimate(estimate.id);
      expect(updated.lineItems).toHaveLength(2); // 2 components per assembly

      // Check quantities are scaled
      const windowItem = updated.lineItems.find((i: any) =>
        i.description.includes('Window unit')
      );
      expect(Number(windowItem.quantity)).toBe(3);

      // Check use count incremented
      const updatedAssembly = await prisma.estimateAssembly.findUnique({
        where: { id: assembly.id },
      });
      expect(updatedAssembly!.useCount).toBe(1);
    });

    it('should list assemblies for company', async () => {
      await service.createAssembly(
        {
          name: 'Assembly 1',
          category: 'Test',
          companyId: testCompany.id,
          components: [],
        },
        testUser.id
      );

      const assemblies = await service.listAssemblies(testCompany.id);
      expect(assemblies.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('AI features', () => {
    it('should generate AI estimate from similar projects', async () => {
      // Create a historical estimate
      const oldEstimate = await service.createEstimate(
        {
          name: 'Past Kitchen Project',
          projectId: testProject.id,
          description: 'Kitchen remodel',
        },
        testUser.id
      );

      await service.addLineItem(oldEstimate.id, {
        category: 'MATERIALS',
        description: 'Cabinets',
        quantity: 1,
        unit: 'lot',
        unitCost: 5000,
        markup: 25,
      });

      await service.updateEstimateStatus(oldEstimate.id, 'APPROVED');

      // Generate AI estimate
      const aiEstimate = await service.generateAIEstimate(
        {
          projectDescription: 'New kitchen renovation',
          projectType: 'Kitchen',
          squareFootage: 200,
          quality: 'STANDARD',
        },
        testProject.id,
        testCompany.id,
        testUser.id
      );

      expect(aiEstimate.aiGenerated).toBe(true);
      expect(aiEstimate.aiConfidenceScore).toBeDefined();
      expect(aiEstimate.aiAnalysisData).toBeDefined();
      expect(aiEstimate.lineItems.length).toBeGreaterThan(0);
    });

    it('should predict cost trends', async () => {
      const item = await service.addCostDatabaseItem({
        companyId: testCompany.id,
        category: 'MATERIALS',
        name: 'Test Material',
        unit: 'unit',
        currentCost: 100,
      });

      await service.updateCostDatabaseItem(item.id, 105);
      await service.updateCostDatabaseItem(item.id, 110);

      const trends = await service.predictCostTrends(testCompany.id);

      expect(trends).toHaveLength(1);
      expect(trends[0].trend).toBe('INCREASING');
      expect(trends[0].predictedCost).toBeGreaterThan(110);
    });
  });

  describe('variance analysis', () => {
    it('should compare estimate to actual costs', async () => {
      const estimate = await service.createEstimate(
        {
          name: 'Test Estimate',
          projectId: testProject.id,
        },
        testUser.id
      );

      await service.addLineItem(estimate.id, {
        category: 'LABOR',
        description: 'Labor',
        quantity: 100,
        unit: 'hours',
        unitCost: 50,
        markup: 0,
      });

      // Create actual costs in project
      await prisma.timeEntry.create({
        data: {
          projectId: testProject.id,
          userId: testUser.id,
          hours: 80,
          hourlyRate: 50,
          date: new Date(),
          description: 'Actual work',
        },
      });

      const variance = await service.compareEstimateToActuals(estimate.id);

      expect(variance.estimatedTotal).toBe(5000); // 100 * 50
      expect(variance.actualCost).toBe(4000); // 80 * 50
      expect(variance.variance).toBe(1000); // Under budget
      expect(variance.variancePercent).toBe(20); // 20% under
      expect(variance.categoryBreakdown.length).toBeGreaterThan(0);
    });
  });

  describe('convertToQuote', () => {
    it('should convert estimate to quote', async () => {
      const estimate = await service.createEstimate(
        {
          name: 'Test Estimate',
          projectId: testProject.id,
          overheadPercent: 10,
          profitPercent: 15,
          taxPercent: 8,
        },
        testUser.id
      );

      await service.addLineItem(estimate.id, {
        category: 'MATERIALS',
        description: 'Materials',
        quantity: 10,
        unit: 'units',
        unitCost: 100,
        markup: 20,
      });

      // Get updated estimate with recalculated totals
      const updatedEstimate = await service.getEstimate(estimate.id);

      const quote = await service.convertToQuote(estimate.id, testCustomer.id);

      expect(quote.quoteNumber).toMatch(/^Q-\d{5}$/);
      expect(quote.title).toBe('Test Estimate');
      expect(Number(quote.total)).toBe(Number(updatedEstimate.total));

      // Check estimate marked as converted
      const updated = await service.getEstimate(estimate.id);
      expect(updated.status).toBe('CONVERTED');
      expect(updated.convertedToQuoteId).toBe(quote.id);
    });

    it('should throw error if estimate already converted', async () => {
      const estimate = await service.createEstimate(
        {
          name: 'Test Estimate',
          projectId: testProject.id,
        },
        testUser.id
      );

      await service.convertToQuote(estimate.id, testCustomer.id);

      await expect(
        service.convertToQuote(estimate.id, testCustomer.id)
      ).rejects.toThrow('Estimate already converted');
    });
  });

  describe('status management', () => {
    it('should update estimate status', async () => {
      const estimate = await service.createEstimate(
        {
          name: 'Test Estimate',
          projectId: testProject.id,
        },
        testUser.id
      );

      await service.updateEstimateStatus(estimate.id, 'IN_REVIEW');

      const updated = await service.getEstimate(estimate.id);
      expect(updated.status).toBe('IN_REVIEW');
    });
  });

  describe('list operations', () => {
    it('should list project estimates', async () => {
      await service.createEstimate(
        { name: 'Estimate 1', projectId: testProject.id },
        testUser.id
      );

      await service.createEstimate(
        { name: 'Estimate 2', projectId: testProject.id },
        testUser.id
      );

      const estimates = await service.listProjectEstimates(testProject.id);
      expect(estimates).toHaveLength(2);
      expect(estimates[0].name).toBe('Estimate 2'); // Most recent first
    });
  });
});
