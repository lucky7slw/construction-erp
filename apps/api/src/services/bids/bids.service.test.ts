import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { PrismaClient } from '../../generated/prisma';
import { setupTestDatabase, cleanupTestDatabase } from '../../test-helpers/database';
import { BidsService } from './bids.service';

describe('BidsService', () => {
  let prisma: PrismaClient;
  let service: BidsService;
  let testUser: any;
  let testCompany: any;
  let testProject: any;
  let testSupplier: any;

  beforeAll(async () => {
    prisma = await setupTestDatabase();
    service = new BidsService(prisma);

    await cleanupTestDatabase(prisma);

    testCompany = await prisma.company.create({
      data: {
        name: 'Test Construction Co',
        email: 'test@construction.com',
        phone: '555-0100',
      },
    });

    testUser = await prisma.user.create({
      data: {
        email: 'bids@test.com',
        password: 'hashedpassword',
        firstName: 'Bid',
        lastName: 'Tester',
      },
    });

    await prisma.companyUser.create({
      data: {
        userId: testUser.id,
        companyId: testCompany.id,
        isOwner: true,
      },
    });

    testProject = await prisma.project.create({
      data: {
        name: 'Commercial Build',
        companyId: testCompany.id,
        createdById: testUser.id,
        status: 'ACTIVE',
      },
    });

    testSupplier = await prisma.supplier.create({
      data: {
        name: 'ABC Subcontractors',
        companyId: testCompany.id,
        email: 'abc@subs.com',
        phone: '555-0200',
        contactPerson: 'John Doe',
      },
    });
  });

  afterEach(async () => {
    // Clean up bids only, preserve test data for next test
    await prisma.bidLineItem.deleteMany({});
    await prisma.bid.deleteMany({});
    await prisma.bidPackageInvitation.deleteMany({});
    await prisma.bidPackage.deleteMany({});
  });

  describe('createBid', () => {
    it('should create bid with auto-generated number', async () => {
      const bid = await service.createBid(
        {
          projectId: testProject.id,
          supplierId: testSupplier.id,
          bidType: 'SUBCONTRACTOR',
          scopeOfWork: 'Framing work for entire structure',
          dueDate: new Date('2025-02-01'),
        },
        testUser.id
      );

      expect(bid.bidNumber).toMatch(/^BID-[A-Z]{1,3}-\d{4}$/);
      expect(bid.projectId).toBe(testProject.id);
      expect(bid.supplierId).toBe(testSupplier.id);
      expect(bid.status).toBe('DRAFT');
      expect(Number(bid.total)).toBe(0);
    });

    it('should create bid with bond requirement', async () => {
      const bid = await service.createBid(
        {
          projectId: testProject.id,
          bidType: 'SUBCONTRACTOR',
          scopeOfWork: 'Foundation work',
          bondRequired: true,
          bondAmount: 50000,
        },
        testUser.id
      );

      expect(bid.bondRequired).toBe(true);
      expect(Number(bid.bondAmount)).toBe(50000);
    });
  });

  describe('addLineItem', () => {
    it('should add line item and calculate totals', async () => {
      const bid = await service.createBid(
        {
          projectId: testProject.id,
          bidType: 'SUBCONTRACTOR',
          scopeOfWork: 'Test work',
        },
        testUser.id
      );

      const lineItem = await service.addLineItem(bid.id, {
        description: 'Labor',
        quantity: 40,
        unit: 'hours',
        unitPrice: 75,
      });

      expect(Number(lineItem.total)).toBe(3000);

      const updated = await service.getBid(bid.id);
      expect(Number(updated.subtotal)).toBe(3000);
      expect(Number(updated.total)).toBe(3000);
    });

    it('should calculate tax when taxPercent is set', async () => {
      const bid = await service.createBid(
        {
          projectId: testProject.id,
          bidType: 'SUPPLIER',
          scopeOfWork: 'Materials',
          taxPercent: 8,
        },
        testUser.id
      );

      await service.addLineItem(bid.id, {
        description: 'Lumber',
        quantity: 100,
        unit: 'board feet',
        unitPrice: 5.50,
      });

      const updated = await service.getBid(bid.id);
      expect(Number(updated.subtotal)).toBe(550);
      expect(Number(updated.taxAmount)).toBe(44); // 8% of 550
      expect(Number(updated.total)).toBe(594);
    });
  });

  describe('updateLineItem', () => {
    it('should update line item and recalculate', async () => {
      const bid = await service.createBid(
        {
          projectId: testProject.id,
          bidType: 'SUBCONTRACTOR',
          scopeOfWork: 'Test',
        },
        testUser.id
      );

      const lineItem = await service.addLineItem(bid.id, {
        description: 'Work',
        quantity: 10,
        unit: 'hours',
        unitPrice: 50,
      });

      const updated = await service.updateLineItem(lineItem.id, {
        quantity: 20,
        unitPrice: 60,
      });

      expect(Number(updated.total)).toBe(1200); // 20 * 60
    });
  });

  describe('deleteLineItem', () => {
    it('should delete line item and recalculate totals', async () => {
      const bid = await service.createBid(
        {
          projectId: testProject.id,
          bidType: 'SUBCONTRACTOR',
          scopeOfWork: 'Test',
        },
        testUser.id
      );

      const item1 = await service.addLineItem(bid.id, {
        description: 'Item 1',
        quantity: 10,
        unit: 'units',
        unitPrice: 100,
      });

      await service.addLineItem(bid.id, {
        description: 'Item 2',
        quantity: 5,
        unit: 'units',
        unitPrice: 50,
      });

      let updated = await service.getBid(bid.id);
      expect(Number(updated.subtotal)).toBe(1250); // 1000 + 250

      await service.deleteLineItem(item1.id);

      updated = await service.getBid(bid.id);
      expect(Number(updated.subtotal)).toBe(250);
    });
  });

  describe('submitBid', () => {
    it('should change status to SUBMITTED and set date', async () => {
      const bid = await service.createBid(
        {
          projectId: testProject.id,
          bidType: 'SUBCONTRACTOR',
          scopeOfWork: 'Test',
        },
        testUser.id
      );

      const submitted = await service.submitBid(bid.id);

      expect(submitted.status).toBe('SUBMITTED');
      expect(submitted.submittedDate).toBeTruthy();
    });
  });

  describe('awardBid', () => {
    it('should award submitted bid', async () => {
      const bid = await service.createBid(
        {
          projectId: testProject.id,
          supplierId: testSupplier.id,
          bidType: 'SUBCONTRACTOR',
          scopeOfWork: 'Test',
        },
        testUser.id
      );

      await service.submitBid(bid.id);
      const awarded = await service.awardBid(bid.id);

      expect(awarded.status).toBe('AWARDED');
      expect(awarded.awardedDate).toBeTruthy();
    });

    it('should throw error when awarding non-submitted bid', async () => {
      const bid = await service.createBid(
        {
          projectId: testProject.id,
          bidType: 'SUBCONTRACTOR',
          scopeOfWork: 'Test',
        },
        testUser.id
      );

      await expect(service.awardBid(bid.id)).rejects.toThrow(
        'Can only award submitted or reviewed bids'
      );
    });
  });

  describe('declineBid', () => {
    it('should decline bid with reason', async () => {
      const bid = await service.createBid(
        {
          projectId: testProject.id,
          bidType: 'SUBCONTRACTOR',
          scopeOfWork: 'Test',
        },
        testUser.id
      );

      const declined = await service.declineBid(bid.id, 'Price too high');

      expect(declined.status).toBe('DECLINED');
      expect(declined.declinedReason).toBe('Price too high');
    });
  });

  describe('compareBids', () => {
    it('should compare multiple bids by price', async () => {
      const bid1 = await service.createBid(
        {
          projectId: testProject.id,
          bidType: 'SUBCONTRACTOR',
          scopeOfWork: 'Foundation',
        },
        testUser.id
      );

      await service.addLineItem(bid1.id, {
        description: 'Work',
        quantity: 100,
        unit: 'hours',
        unitPrice: 50,
      });

      await service.submitBid(bid1.id);

      const bid2 = await service.createBid(
        {
          projectId: testProject.id,
          bidType: 'SUBCONTRACTOR',
          scopeOfWork: 'Foundation',
        },
        testUser.id
      );

      await service.addLineItem(bid2.id, {
        description: 'Work',
        quantity: 100,
        unit: 'hours',
        unitPrice: 45,
      });

      await service.submitBid(bid2.id);

      const comparison = await service.compareBids(testProject.id);

      expect(comparison.bids.length).toBe(2);
      expect(comparison.comparison.length).toBe(2);
      expect(comparison.lowestBid.total).toBe(4500);
      expect(comparison.highestBid.total).toBe(5000);
      expect(comparison.averageTotal).toBe(4750);
    });
  });

  describe('scoreBid', () => {
    it('should calculate weighted score', async () => {
      const bid = await service.createBid(
        {
          projectId: testProject.id,
          bidType: 'SUBCONTRACTOR',
          scopeOfWork: 'Test',
        },
        testUser.id
      );

      const scored = await service.scoreBid(
        bid.id,
        {
          priceWeight: 0.4,
          timelineWeight: 0.3,
          experienceWeight: 0.2,
          qualityWeight: 0.1,
        },
        {
          priceScore: 8,
          timelineScore: 7,
          experienceScore: 9,
          qualityScore: 6,
        }
      );

      // (8*0.4 + 7*0.3 + 9*0.2 + 6*0.1) / 10 = 7.7 / 10 = 0.77
      expect(scored.comparisonScore).not.toBeNull();
      if (scored.comparisonScore) {
        expect(Number(scored.comparisonScore)).toBeCloseTo(0.77, 2);
      }
    });

    it('should throw error if weights do not sum to 1', async () => {
      const bid = await service.createBid(
        {
          projectId: testProject.id,
          bidType: 'SUBCONTRACTOR',
          scopeOfWork: 'Test',
        },
        testUser.id
      );

      await expect(
        service.scoreBid(
          bid.id,
          {
            priceWeight: 0.5,
            timelineWeight: 0.3,
            experienceWeight: 0.3,
            qualityWeight: 0.1,
          },
          {
            priceScore: 8,
            timelineScore: 7,
            experienceScore: 9,
            qualityScore: 6,
          }
        )
      ).rejects.toThrow('Criteria weights must sum to 1.0');
    });
  });

  describe('getRankedBids', () => {
    it('should return bids ranked by comparison score', async () => {
      const bid1 = await service.createBid(
        {
          projectId: testProject.id,
          bidType: 'SUBCONTRACTOR',
          scopeOfWork: 'Test',
        },
        testUser.id
      );

      await service.submitBid(bid1.id);
      await service.scoreBid(
        bid1.id,
        { priceWeight: 0.25, timelineWeight: 0.25, experienceWeight: 0.25, qualityWeight: 0.25 },
        { priceScore: 8, timelineScore: 7, experienceScore: 9, qualityScore: 6 }
      );

      const bid2 = await service.createBid(
        {
          projectId: testProject.id,
          bidType: 'SUBCONTRACTOR',
          scopeOfWork: 'Test',
        },
        testUser.id
      );

      await service.submitBid(bid2.id);
      await service.scoreBid(
        bid2.id,
        { priceWeight: 0.25, timelineWeight: 0.25, experienceWeight: 0.25, qualityWeight: 0.25 },
        { priceScore: 9, timelineScore: 8, experienceScore: 10, qualityScore: 8 }
      );

      const ranked = await service.getRankedBids(testProject.id);

      expect(ranked.length).toBe(2);
      expect(ranked[0].rank).toBe(1);
      expect(ranked[0].comparisonScore).toBeGreaterThan(ranked[1].comparisonScore);
    });
  });

  describe('bidPackages', () => {
    it('should create bid package', async () => {
      const package_ = await service.createBidPackage(
        {
          name: 'Electrical Bid Package',
          projectId: testProject.id,
          description: 'All electrical work',
          dueDate: new Date('2025-03-01'),
        },
        testUser.id
      );

      expect(package_.name).toBe('Electrical Bid Package');
      expect(package_.projectId).toBe(testProject.id);
      expect(package_.status).toBe('OPEN');
    });

    it('should invite supplier to bid package', async () => {
      const package_ = await service.createBidPackage(
        {
          name: 'Plumbing Bid Package',
          projectId: testProject.id,
        },
        testUser.id
      );

      const invitation = await service.inviteSupplierToBidPackage(
        package_.id,
        testSupplier.id,
        testUser.id,
        'Please submit your bid by end of month'
      );

      expect(invitation.packageId).toBe(package_.id);
      expect(invitation.supplierId).toBe(testSupplier.id);
      expect(invitation.notes).toBe('Please submit your bid by end of month');
    });
  });

  describe('getBidStatistics', () => {
    it('should return project bid statistics', async () => {
      const bid1 = await service.createBid(
        {
          projectId: testProject.id,
          bidType: 'SUBCONTRACTOR',
          scopeOfWork: 'Work 1',
        },
        testUser.id
      );

      await service.addLineItem(bid1.id, {
        description: 'Item',
        quantity: 10,
        unit: 'units',
        unitPrice: 100,
      });

      await service.submitBid(bid1.id);

      const bid2 = await service.createBid(
        {
          projectId: testProject.id,
          bidType: 'SUPPLIER',
          scopeOfWork: 'Work 2',
        },
        testUser.id
      );

      await service.addLineItem(bid2.id, {
        description: 'Item',
        quantity: 5,
        unit: 'units',
        unitPrice: 200,
      });

      await service.submitBid(bid2.id);
      await service.awardBid(bid2.id);

      const stats = await service.getBidStatistics(testProject.id);

      expect(stats.totalBids).toBe(2);
      expect(stats.submittedCount).toBe(1);
      expect(stats.awardedCount).toBe(1);
      expect(stats.byType.SUBCONTRACTOR).toBe(1);
      expect(stats.byType.SUPPLIER).toBe(1);
      expect(stats.totalAwardedValue).toBe(1000);
    });
  });

  describe('exportBidComparisonToCSV', () => {
    it('should export bid comparison to CSV', async () => {
      const bid = await service.createBid(
        {
          projectId: testProject.id,
          supplierId: testSupplier.id,
          bidType: 'SUBCONTRACTOR',
          scopeOfWork: 'Test',
        },
        testUser.id
      );

      await service.addLineItem(bid.id, {
        description: 'Work',
        quantity: 10,
        unit: 'hours',
        unitPrice: 50,
      });

      await service.submitBid(bid.id);

      const csv = await service.exportBidComparisonToCSV(testProject.id);

      expect(csv).toContain('Bid Number,Supplier,Total');
      expect(csv).toContain('ABC Subcontractors');
      expect(csv).toContain('500');
    });
  });
});
