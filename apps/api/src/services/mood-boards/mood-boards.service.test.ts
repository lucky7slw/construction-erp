import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { PrismaClient } from '../../generated/prisma';
import { setupTestDatabase, cleanupTestDatabase } from '../../test-helpers/database';
import { MoodBoardsService } from './mood-boards.service';

describe('MoodBoardsService', () => {
  let prisma: PrismaClient;
  let service: MoodBoardsService;
  let testUser: any;
  let testCompany: any;
  let testProject: any;
  let testCustomer: any;

  beforeAll(async () => {
    prisma = await setupTestDatabase();
    service = new MoodBoardsService(prisma);

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
        email: 'moodboards@test.com',
        password: 'hashedpassword',
        firstName: 'Mood',
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
        name: 'Design Project',
        companyId: testCompany.id,
        createdById: testUser.id,
        status: 'ACTIVE',
      },
    });

    testCustomer = await prisma.customer.create({
      data: {
        name: 'Design Client',
        companyId: testCompany.id,
        email: 'client@design.com',
        phone: '555-0400',
      },
    });
  });

  afterEach(async () => {
    await prisma.moodBoardComment.deleteMany({});
    await prisma.moodBoardItem.deleteMany({});
    await prisma.moodBoard.deleteMany({});
  });

  describe('createMoodBoard', () => {
    it('should create mood board with project', async () => {
      const board = await service.createMoodBoard(
        {
          projectId: testProject.id,
          customerId: testCustomer.id,
          name: 'Living Room Design',
          description: 'Modern coastal living room',
          room: 'Living Room',
          style: 'Modern Coastal',
          colorPalette: ['#FFFFFF', '#87CEEB', '#D2B48C'],
        },
        testUser.id
      );

      expect(board.name).toBe('Living Room Design');
      expect(board.room).toBe('Living Room');
      expect(board.style).toBe('Modern Coastal');
      expect(board.status).toBe('DRAFT');
    });

    it('should create board without customer', async () => {
      const board = await service.createMoodBoard(
        {
          projectId: testProject.id,
          name: 'Inspiration Board',
        },
        testUser.id
      );

      expect(board.customerId).toBeNull();
    });
  });

  describe('addItem', () => {
    it('should add image item to board', async () => {
      const board = await service.createMoodBoard(
        {
          projectId: testProject.id,
          name: 'Kitchen Design',
        },
        testUser.id
      );

      const item = await service.addItem(board.id, {
        type: 'IMAGE',
        title: 'Inspiration Photo',
        description: 'Modern kitchen with island',
        imageUrl: 'https://example.com/kitchen.jpg',
        sourceUrl: 'https://pinterest.com/pin/123',
        sortOrder: 1,
      });

      expect(item.type).toBe('IMAGE');
      expect(item.title).toBe('Inspiration Photo');
      expect(item.imageUrl).toBe('https://example.com/kitchen.jpg');
    });

    it('should add color item with hex code', async () => {
      const board = await service.createMoodBoard(
        {
          projectId: testProject.id,
          name: 'Color Palette',
        },
        testUser.id
      );

      const item = await service.addItem(board.id, {
        type: 'COLOR',
        title: 'Wall Color',
        colorHex: '#F5F5DC',
        notes: 'Warm beige for main walls',
      });

      expect(item.type).toBe('COLOR');
      expect(item.colorHex).toBe('#F5F5DC');
    });

    it('should add product item with pricing', async () => {
      const board = await service.createMoodBoard(
        {
          projectId: testProject.id,
          name: 'Fixtures',
        },
        testUser.id
      );

      const item = await service.addItem(board.id, {
        type: 'PRODUCT',
        title: 'Pendant Light',
        manufacturer: 'Lighting Co',
        model: 'PL-500',
        sku: 'LC-PL500-BLK',
        price: 249.99,
        sourceUrl: 'https://lightingco.com/pl500',
      });

      expect(item.type).toBe('PRODUCT');
      expect(Number(item.price)).toBe(249.99);
      expect(item.manufacturer).toBe('Lighting Co');
    });
  });

  describe('reorderItems', () => {
    it('should reorder items based on array', async () => {
      const board = await service.createMoodBoard(
        {
          projectId: testProject.id,
          name: 'Design Board',
        },
        testUser.id
      );

      const item1 = await service.addItem(board.id, {
        type: 'IMAGE',
        title: 'First',
        sortOrder: 0,
      });

      const item2 = await service.addItem(board.id, {
        type: 'IMAGE',
        title: 'Second',
        sortOrder: 1,
      });

      const item3 = await service.addItem(board.id, {
        type: 'IMAGE',
        title: 'Third',
        sortOrder: 2,
      });

      await service.reorderItems([item3.id, item1.id, item2.id]);

      const updated = await service.getMoodBoard(board.id);
      expect(updated.items[0].title).toBe('Third');
      expect(updated.items[1].title).toBe('First');
      expect(updated.items[2].title).toBe('Second');
    });
  });

  describe('addComment', () => {
    it('should add comment to board', async () => {
      const board = await service.createMoodBoard(
        {
          projectId: testProject.id,
          name: 'Review Board',
        },
        testUser.id
      );

      const comment = await service.addComment(board.id, testUser.id, {
        comment: 'Love this color scheme!',
      });

      expect(comment.comment).toBe('Love this color scheme!');
      expect(comment.user.id).toBe(testUser.id);
    });

    it('should add comment on specific item', async () => {
      const board = await service.createMoodBoard(
        {
          projectId: testProject.id,
          name: 'Design Board',
        },
        testUser.id
      );

      const item = await service.addItem(board.id, {
        type: 'PRODUCT',
        title: 'Sofa',
      });

      const comment = await service.addComment(board.id, testUser.id, {
        comment: 'This sofa is perfect!',
        itemId: item.id,
      });

      expect(comment.itemId).toBe(item.id);
    });
  });

  describe('shareMoodBoard', () => {
    it('should share board with customer', async () => {
      const board = await service.createMoodBoard(
        {
          projectId: testProject.id,
          customerId: testCustomer.id,
          name: 'Client Review',
        },
        testUser.id
      );

      const shared = await service.shareMoodBoard(board.id);

      expect(shared.status).toBe('SHARED');
      expect(shared.sharedDate).toBeTruthy();
    });
  });

  describe('approveMoodBoard', () => {
    it('should approve board and set approver', async () => {
      const board = await service.createMoodBoard(
        {
          projectId: testProject.id,
          name: 'Final Design',
        },
        testUser.id
      );

      await service.shareMoodBoard(board.id);
      const approved = await service.approveMoodBoard(board.id, testUser.id);

      expect(approved.status).toBe('APPROVED');
      expect(approved.approvedByUserId).toBe(testUser.id);
      expect(approved.approvedDate).toBeTruthy();
    });
  });

  describe('rejectMoodBoard', () => {
    it('should reject board', async () => {
      const board = await service.createMoodBoard(
        {
          projectId: testProject.id,
          name: 'Rejected Design',
        },
        testUser.id
      );

      const rejected = await service.rejectMoodBoard(board.id);

      expect(rejected.status).toBe('REJECTED');
    });
  });

  describe('archiveMoodBoard', () => {
    it('should archive board', async () => {
      const board = await service.createMoodBoard(
        {
          projectId: testProject.id,
          name: 'Old Design',
        },
        testUser.id
      );

      const archived = await service.archiveMoodBoard(board.id);

      expect(archived.status).toBe('ARCHIVED');
    });
  });

  describe('getMoodBoardsSummary', () => {
    it('should provide comprehensive summary', async () => {
      const board1 = await service.createMoodBoard(
        {
          projectId: testProject.id,
          name: 'Board 1',
          room: 'Kitchen',
        },
        testUser.id
      );

      await service.addItem(board1.id, {
        type: 'IMAGE',
        title: 'Item 1',
      });

      await service.addItem(board1.id, {
        type: 'COLOR',
        title: 'Item 2',
      });

      await service.addComment(board1.id, testUser.id, {
        comment: 'Nice!',
      });

      const board2 = await service.createMoodBoard(
        {
          projectId: testProject.id,
          name: 'Board 2',
          room: 'Kitchen',
        },
        testUser.id
      );

      await service.shareMoodBoard(board2.id);

      const summary = await service.getMoodBoardsSummary(testProject.id);

      expect(summary.totalBoards).toBe(2);
      expect(summary.totalItems).toBe(2);
      expect(summary.totalComments).toBe(1);
      expect(summary.byStatus.DRAFT).toBe(1);
      expect(summary.byStatus.SHARED).toBe(1);
      expect(summary.byRoom.Kitchen).toBe(2);
    });
  });

  describe('getPendingApprovals', () => {
    it('should find boards awaiting approval', async () => {
      const board1 = await service.createMoodBoard(
        {
          projectId: testProject.id,
          customerId: testCustomer.id,
          name: 'Pending 1',
        },
        testUser.id
      );

      await service.shareMoodBoard(board1.id);

      const board2 = await service.createMoodBoard(
        {
          projectId: testProject.id,
          name: 'Draft Board',
        },
        testUser.id
      );

      const pending = await service.getPendingApprovals(testProject.id);

      expect(pending.length).toBe(1);
      expect(pending[0].name).toBe('Pending 1');
      expect(pending[0].status).toBe('SHARED');
    });
  });

  describe('duplicateMoodBoard', () => {
    it('should create copy with all items', async () => {
      const original = await service.createMoodBoard(
        {
          projectId: testProject.id,
          name: 'Original Board',
          description: 'Test description',
          room: 'Bedroom',
        },
        testUser.id
      );

      await service.addItem(original.id, {
        type: 'IMAGE',
        title: 'Item 1',
        imageUrl: 'https://example.com/1.jpg',
      });

      await service.addItem(original.id, {
        type: 'COLOR',
        title: 'Item 2',
        colorHex: '#FFFFFF',
      });

      const duplicate = await service.duplicateMoodBoard(original.id, testUser.id);

      expect(duplicate.name).toBe('Original Board (Copy)');
      expect(duplicate.room).toBe('Bedroom');
      expect(duplicate.items.length).toBe(2);
      expect(duplicate.items[0].title).toBe('Item 1');
      expect(duplicate.items[1].title).toBe('Item 2');
    });
  });

  describe('getItemsByType', () => {
    it('should group items by type', async () => {
      const board = await service.createMoodBoard(
        {
          projectId: testProject.id,
          name: 'Mixed Board',
        },
        testUser.id
      );

      await service.addItem(board.id, {
        type: 'IMAGE',
        title: 'Image 1',
      });

      await service.addItem(board.id, {
        type: 'IMAGE',
        title: 'Image 2',
      });

      await service.addItem(board.id, {
        type: 'COLOR',
        title: 'Color 1',
      });

      await service.addItem(board.id, {
        type: 'PRODUCT',
        title: 'Product 1',
      });

      const byType = await service.getItemsByType(board.id);

      expect(byType.IMAGE.length).toBe(2);
      expect(byType.COLOR.length).toBe(1);
      expect(byType.PRODUCT.length).toBe(1);
    });
  });

  describe('getColorPalette', () => {
    it('should extract unique colors from board', async () => {
      const board = await service.createMoodBoard(
        {
          projectId: testProject.id,
          name: 'Color Board',
        },
        testUser.id
      );

      await service.addItem(board.id, {
        type: 'COLOR',
        title: 'White',
        colorHex: '#FFFFFF',
      });

      await service.addItem(board.id, {
        type: 'COLOR',
        title: 'Blue',
        colorHex: '#0000FF',
      });

      await service.addItem(board.id, {
        type: 'COLOR',
        title: 'White Again',
        colorHex: '#FFFFFF',
      });

      await service.addItem(board.id, {
        type: 'IMAGE',
        title: 'Not a color',
      });

      const colors = await service.getColorPalette(board.id);

      expect(colors.length).toBe(2);
      expect(colors).toContain('#FFFFFF');
      expect(colors).toContain('#0000FF');
    });
  });

  describe('listMoodBoards', () => {
    it('should filter by status', async () => {
      const b1 = await service.createMoodBoard(
        { projectId: testProject.id, name: 'Draft' },
        testUser.id
      );

      const b2 = await service.createMoodBoard(
        { projectId: testProject.id, name: 'Shared' },
        testUser.id
      );

      await service.shareMoodBoard(b2.id);

      const drafts = await service.listMoodBoards(testProject.id, {
        status: 'DRAFT',
      });

      expect(drafts.length).toBe(1);
      expect(drafts[0].status).toBe('DRAFT');
    });

    it('should filter by room', async () => {
      await service.createMoodBoard(
        { projectId: testProject.id, name: 'Kitchen', room: 'Kitchen' },
        testUser.id
      );

      await service.createMoodBoard(
        { projectId: testProject.id, name: 'Bedroom', room: 'Bedroom' },
        testUser.id
      );

      const kitchenBoards = await service.listMoodBoards(testProject.id, {
        room: 'Kitchen',
      });

      expect(kitchenBoards.length).toBe(1);
      expect(kitchenBoards[0].room).toBe('Kitchen');
    });
  });
});
