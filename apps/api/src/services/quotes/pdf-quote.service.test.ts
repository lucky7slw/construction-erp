import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaClient } from '../../generated/prisma';
import { PDFQuoteService } from './pdf-quote.service';
import { setupTestDatabase, cleanupTestDatabase } from '../../test-helpers/database';
import { createTestCompany, createTestUser, createTestCustomer } from '../../test-helpers/factories';
import { existsSync, unlinkSync } from 'fs';
import path from 'path';

describe('PDFQuoteService', () => {
  let prisma: PrismaClient;
  let pdfService: PDFQuoteService;
  let testCompany: any;
  let testUser: any;
  let testCustomer: any;

  beforeAll(async () => {
    prisma = await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase(prisma);
    await prisma.$disconnect();
  });

  afterEach(async () => {
    // Clean up test data after each test
    await cleanupTestDatabase(prisma);
  });

  beforeEach(async () => {
    // Create test data
    testCompany = await createTestCompany(prisma, {
      name: 'Test Construction Co',
      legalName: 'Test Construction Co. Ltd',
      address: '123 Builder St',
      city: 'Construction City',
      postalCode: '12345',
      phone: '+1-555-0123',
      email: 'info@testconstruction.com',
      logo: 'https://example.com/logo.png',
    });

    testUser = await createTestUser(prisma, {
      email: 'builder@test.com',
      firstName: 'Bob',
      lastName: 'Builder',
      companyId: testCompany.id,
    });

    testCustomer = await createTestCustomer(prisma, {
      companyId: testCompany.id,
      name: 'John Customer',
      email: 'john@example.com',
      phone: '+1-555-9999',
      address: '456 Client Ave',
      city: 'Customer City',
      postalCode: '67890',
    });

    pdfService = new PDFQuoteService(prisma);
  });

  describe('generateQuotePDF', () => {
    it('should generate a PDF for a valid quote with all required sections', async () => {
      // Create a quote with items
      const quote = await prisma.quote.create({
        data: {
          quoteNumber: 'QUO-2025-0001',
          title: 'Kitchen Renovation Project',
          description: 'Complete kitchen renovation including cabinets and countertops',
          status: 'DRAFT',
          subtotal: 15000,
          taxRate: 0.13,
          taxAmount: 1950,
          total: 16950,
          validUntil: new Date('2025-12-31'),
          notes: 'Payment terms: 50% upfront, 50% on completion',
          companyId: testCompany.id,
          customerId: testCustomer.id,
          createdById: testUser.id,
          items: {
            create: [
              {
                description: 'Kitchen Cabinets - Premium Oak',
                quantity: 15,
                unitPrice: 500,
                total: 7500,
                category: 'Materials',
                sortOrder: 0,
              },
              {
                description: 'Granite Countertops',
                quantity: 25,
                unitPrice: 200,
                total: 5000,
                category: 'Materials',
                sortOrder: 1,
              },
              {
                description: 'Installation Labor',
                quantity: 50,
                unitPrice: 50,
                total: 2500,
                category: 'Labor',
                sortOrder: 2,
              },
            ],
          },
        },
        include: {
          items: true,
          company: true,
          customer: true,
          createdBy: true,
        },
      });

      const result = await pdfService.generateQuotePDF(quote.id);

      // Verify PDF was generated
      expect(result).toBeDefined();
      expect(result.pdfPath).toBeDefined();
      expect(result.pdfUrl).toBeDefined();
      expect(result.pdfUrl).toContain(quote.quoteNumber);

      // Verify file exists
      expect(existsSync(result.pdfPath)).toBe(true);

      // Cleanup
      if (existsSync(result.pdfPath)) {
        unlinkSync(result.pdfPath);
      }
    });

    it('should include company branding in the PDF', async () => {
      const quote = await prisma.quote.create({
        data: {
          quoteNumber: 'QUO-2025-0002',
          title: 'Test Quote',
          status: 'DRAFT',
          subtotal: 1000,
          taxRate: 0.13,
          taxAmount: 130,
          total: 1130,
          companyId: testCompany.id,
          customerId: testCustomer.id,
          createdById: testUser.id,
          items: {
            create: [
              {
                description: 'Test Item',
                quantity: 1,
                unitPrice: 1000,
                total: 1000,
                category: 'Materials',
                sortOrder: 0,
              },
            ],
          },
        },
      });

      const result = await pdfService.generateQuotePDF(quote.id);

      // The PDF should be generated successfully with company info
      expect(result.pdfPath).toBeDefined();
      expect(existsSync(result.pdfPath)).toBe(true);

      // Cleanup
      if (existsSync(result.pdfPath)) {
        unlinkSync(result.pdfPath);
      }
    });

    it('should group line items by category in the PDF', async () => {
      const quote = await prisma.quote.create({
        data: {
          quoteNumber: 'QUO-2025-0003',
          title: 'Multi-Category Project',
          status: 'DRAFT',
          subtotal: 10000,
          taxRate: 0.13,
          taxAmount: 1300,
          total: 11300,
          companyId: testCompany.id,
          customerId: testCustomer.id,
          createdById: testUser.id,
          items: {
            create: [
              {
                description: 'Material A',
                quantity: 10,
                unitPrice: 100,
                total: 1000,
                category: 'Materials',
                sortOrder: 0,
              },
              {
                description: 'Labor A',
                quantity: 20,
                unitPrice: 50,
                total: 1000,
                category: 'Labor',
                sortOrder: 1,
              },
              {
                description: 'Equipment Rental',
                quantity: 5,
                unitPrice: 200,
                total: 1000,
                category: 'Equipment',
                sortOrder: 2,
              },
              {
                description: 'Material B',
                quantity: 70,
                unitPrice: 100,
                total: 7000,
                category: 'Materials',
                sortOrder: 3,
              },
            ],
          },
        },
      });

      const result = await pdfService.generateQuotePDF(quote.id);

      expect(result.pdfPath).toBeDefined();
      expect(existsSync(result.pdfPath)).toBe(true);

      // Cleanup
      if (existsSync(result.pdfPath)) {
        unlinkSync(result.pdfPath);
      }
    });

    it('should throw error when quote does not exist', async () => {
      await expect(
        pdfService.generateQuotePDF('non-existent-quote-id')
      ).rejects.toThrow('Quote not found');
    });

    it('should include valid until date in the PDF', async () => {
      const validUntil = new Date('2025-12-31');
      const quote = await prisma.quote.create({
        data: {
          quoteNumber: 'QUO-2025-0004',
          title: 'Quote with Expiry',
          status: 'DRAFT',
          subtotal: 5000,
          taxRate: 0.13,
          taxAmount: 650,
          total: 5650,
          validUntil,
          companyId: testCompany.id,
          customerId: testCustomer.id,
          createdById: testUser.id,
          items: {
            create: [
              {
                description: 'Test Item',
                quantity: 1,
                unitPrice: 5000,
                total: 5000,
                category: 'Materials',
                sortOrder: 0,
              },
            ],
          },
        },
      });

      const result = await pdfService.generateQuotePDF(quote.id);

      expect(result.pdfPath).toBeDefined();
      expect(existsSync(result.pdfPath)).toBe(true);

      // Cleanup
      if (existsSync(result.pdfPath)) {
        unlinkSync(result.pdfPath);
      }
    });

    it('should include terms and conditions from notes field', async () => {
      const quote = await prisma.quote.create({
        data: {
          quoteNumber: 'QUO-2025-0005',
          title: 'Quote with Terms',
          status: 'DRAFT',
          subtotal: 3000,
          taxRate: 0.13,
          taxAmount: 390,
          total: 3390,
          notes: 'Terms:\n1. Payment due within 30 days\n2. Work to be completed within 60 days',
          companyId: testCompany.id,
          customerId: testCustomer.id,
          createdById: testUser.id,
          items: {
            create: [
              {
                description: 'Test Item',
                quantity: 1,
                unitPrice: 3000,
                total: 3000,
                category: 'Labor',
                sortOrder: 0,
              },
            ],
          },
        },
      });

      const result = await pdfService.generateQuotePDF(quote.id);

      expect(result.pdfPath).toBeDefined();
      expect(existsSync(result.pdfPath)).toBe(true);

      // Cleanup
      if (existsSync(result.pdfPath)) {
        unlinkSync(result.pdfPath);
      }
    });
  });

  describe('getQuotePDFPath', () => {
    it('should return existing PDF path if already generated', async () => {
      const quote = await prisma.quote.create({
        data: {
          quoteNumber: 'QUO-2025-0006',
          title: 'Test Quote',
          status: 'DRAFT',
          subtotal: 1000,
          taxRate: 0.13,
          taxAmount: 130,
          total: 1130,
          companyId: testCompany.id,
          customerId: testCustomer.id,
          createdById: testUser.id,
          items: {
            create: [
              {
                description: 'Test Item',
                quantity: 1,
                unitPrice: 1000,
                total: 1000,
                category: 'Materials',
                sortOrder: 0,
              },
            ],
          },
        },
      });

      // Generate PDF first time
      const firstResult = await pdfService.generateQuotePDF(quote.id);

      // Get path without regenerating
      const path = await pdfService.getQuotePDFPath(quote.id);

      expect(path).toBe(firstResult.pdfPath);
      expect(existsSync(path)).toBe(true);

      // Cleanup
      if (existsSync(path)) {
        unlinkSync(path);
      }
    });

    it('should return null when PDF has not been generated', async () => {
      const quote = await prisma.quote.create({
        data: {
          quoteNumber: 'QUO-2025-0007',
          title: 'Test Quote',
          status: 'DRAFT',
          subtotal: 1000,
          taxRate: 0.13,
          taxAmount: 130,
          total: 1130,
          companyId: testCompany.id,
          customerId: testCustomer.id,
          createdById: testUser.id,
          items: {
            create: [
              {
                description: 'Test Item',
                quantity: 1,
                unitPrice: 1000,
                total: 1000,
                category: 'Materials',
                sortOrder: 0,
              },
            ],
          },
        },
      });

      const path = await pdfService.getQuotePDFPath(quote.id);

      expect(path).toBeNull();
    });
  });
});