import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '../../generated/prisma';
import { TaskChecklistService } from './task-checklist.service';
import { setupTestDatabase, cleanupTestDatabase } from '../../test-helpers/database';
import { createTestCompany, createTestUser, createTestProject } from '../../test-helpers/factories';

describe('TaskChecklistService', () => {
  let prisma: PrismaClient;
  let service: TaskChecklistService;
  let testCompany: any;
  let testUser: any;
  let testProject: any;
  let testTask: any;

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
    testProject = await createTestProject(prisma, {
      name: 'Test Project',
      companyId: testCompany.id,
      createdById: testUser.id,
    });

    // Create a test task
    testTask = await prisma.task.create({
      data: {
        title: 'Install Kitchen Cabinets',
        projectId: testProject.id,
        assigneeId: testUser.id,
        status: 'TODO',
        startDate: new Date(),
        dueDate: new Date(),
      },
    });

    service = new TaskChecklistService(prisma);
  });

  afterEach(async () => {
    await cleanupTestDatabase(prisma);
  });

  describe('addChecklistItem', () => {
    it('should add a checklist item', async () => {
      const item = await service.addChecklistItem(
        {
          taskId: testTask.id,
          content: 'Measure cabinet openings',
        },
        testUser.id
      );

      expect(item.id).toBeDefined();
      expect(item.content).toBe('Measure cabinet openings');
      expect(item.taskId).toBe(testTask.id);
      expect(item.completed).toBe(false);
      expect(item.sortOrder).toBe(0);
    });

    it('should auto-increment sort order', async () => {
      const item1 = await service.addChecklistItem(
        { taskId: testTask.id, content: 'Step 1' },
        testUser.id
      );

      const item2 = await service.addChecklistItem(
        { taskId: testTask.id, content: 'Step 2' },
        testUser.id
      );

      expect(item1.sortOrder).toBe(0);
      expect(item2.sortOrder).toBe(1);
    });

    it('should allow custom sort order', async () => {
      const item = await service.addChecklistItem(
        {
          taskId: testTask.id,
          content: 'Custom position',
          sortOrder: 5,
        },
        testUser.id
      );

      expect(item.sortOrder).toBe(5);
    });

    it('should throw error if task not found', async () => {
      await expect(
        service.addChecklistItem(
          {
            taskId: 'invalid-id',
            content: 'Test',
          },
          testUser.id
        )
      ).rejects.toThrow('Task not found');
    });
  });

  describe('getChecklistItem', () => {
    it('should get checklist item by id', async () => {
      const created = await service.addChecklistItem(
        { taskId: testTask.id, content: 'Test item' },
        testUser.id
      );

      const item = await service.getChecklistItem(created.id);

      expect(item.id).toBe(created.id);
      expect(item.content).toBe('Test item');
      expect(item.task.title).toBe('Install Kitchen Cabinets');
    });

    it('should throw error if item not found', async () => {
      await expect(service.getChecklistItem('invalid-id')).rejects.toThrow(
        'Checklist item not found'
      );
    });
  });

  describe('updateChecklistItem', () => {
    it('should update content', async () => {
      const item = await service.addChecklistItem(
        { taskId: testTask.id, content: 'Old content' },
        testUser.id
      );

      const updated = await service.updateChecklistItem(item.id, {
        content: 'New content',
      });

      expect(updated.content).toBe('New content');
    });

    it('should mark item as completed', async () => {
      const item = await service.addChecklistItem(
        { taskId: testTask.id, content: 'Test' },
        testUser.id
      );

      const completed = await service.updateChecklistItem(
        item.id,
        { completed: true },
        testUser.id
      );

      expect(completed.completed).toBe(true);
      expect(completed.completedAt).toBeDefined();
      expect(completed.completedBy).toBe(testUser.id);
    });

    it('should mark item as incomplete', async () => {
      const item = await service.addChecklistItem(
        { taskId: testTask.id, content: 'Test' },
        testUser.id
      );

      await service.updateChecklistItem(item.id, { completed: true }, testUser.id);

      const incomplete = await service.updateChecklistItem(item.id, {
        completed: false,
      });

      expect(incomplete.completed).toBe(false);
      expect(incomplete.completedAt).toBeNull();
      expect(incomplete.completedBy).toBeNull();
    });

    it('should update sort order', async () => {
      const item = await service.addChecklistItem(
        { taskId: testTask.id, content: 'Test' },
        testUser.id
      );

      const updated = await service.updateChecklistItem(item.id, {
        sortOrder: 10,
      });

      expect(updated.sortOrder).toBe(10);
    });
  });

  describe('deleteChecklistItem', () => {
    it('should delete checklist item', async () => {
      const item = await service.addChecklistItem(
        { taskId: testTask.id, content: 'To delete' },
        testUser.id
      );

      const result = await service.deleteChecklistItem(item.id);

      expect(result.success).toBe(true);

      await expect(service.getChecklistItem(item.id)).rejects.toThrow(
        'Checklist item not found'
      );
    });
  });

  describe('getTaskChecklist', () => {
    it('should get all items for a task ordered by sortOrder', async () => {
      await service.addChecklistItem(
        { taskId: testTask.id, content: 'Step 3', sortOrder: 2 },
        testUser.id
      );
      await service.addChecklistItem(
        { taskId: testTask.id, content: 'Step 1', sortOrder: 0 },
        testUser.id
      );
      await service.addChecklistItem(
        { taskId: testTask.id, content: 'Step 2', sortOrder: 1 },
        testUser.id
      );

      const items = await service.getTaskChecklist(testTask.id);

      expect(items).toHaveLength(3);
      expect(items[0].content).toBe('Step 1');
      expect(items[1].content).toBe('Step 2');
      expect(items[2].content).toBe('Step 3');
    });

    it('should return empty array for task with no items', async () => {
      const items = await service.getTaskChecklist(testTask.id);

      expect(items).toEqual([]);
    });
  });

  describe('toggleChecklistItem', () => {
    it('should toggle item from incomplete to complete', async () => {
      const item = await service.addChecklistItem(
        { taskId: testTask.id, content: 'Test' },
        testUser.id
      );

      const toggled = await service.toggleChecklistItem(item.id, testUser.id);

      expect(toggled.completed).toBe(true);
    });

    it('should toggle item from complete to incomplete', async () => {
      const item = await service.addChecklistItem(
        { taskId: testTask.id, content: 'Test' },
        testUser.id
      );

      await service.toggleChecklistItem(item.id, testUser.id);
      const toggled = await service.toggleChecklistItem(item.id, testUser.id);

      expect(toggled.completed).toBe(false);
    });
  });

  describe('reorderChecklistItems', () => {
    it('should reorder checklist items', async () => {
      const item1 = await service.addChecklistItem(
        { taskId: testTask.id, content: 'A' },
        testUser.id
      );
      const item2 = await service.addChecklistItem(
        { taskId: testTask.id, content: 'B' },
        testUser.id
      );
      const item3 = await service.addChecklistItem(
        { taskId: testTask.id, content: 'C' },
        testUser.id
      );

      // Reorder: C, A, B
      const reordered = await service.reorderChecklistItems(testTask.id, [
        item3.id,
        item1.id,
        item2.id,
      ]);

      expect(reordered[0].content).toBe('C');
      expect(reordered[0].sortOrder).toBe(0);
      expect(reordered[1].content).toBe('A');
      expect(reordered[1].sortOrder).toBe(1);
      expect(reordered[2].content).toBe('B');
      expect(reordered[2].sortOrder).toBe(2);
    });

    it('should throw error if items do not belong to task', async () => {
      const otherTask = await prisma.task.create({
        data: {
          title: 'Other Task',
          projectId: testProject.id,
          assigneeId: testUser.id,
          status: 'TODO',
          startDate: new Date(),
          dueDate: new Date(),
        },
      });

      const item1 = await service.addChecklistItem(
        { taskId: testTask.id, content: 'A' },
        testUser.id
      );
      const item2 = await service.addChecklistItem(
        { taskId: otherTask.id, content: 'B' },
        testUser.id
      );

      await expect(
        service.reorderChecklistItems(testTask.id, [item1.id, item2.id])
      ).rejects.toThrow('Some checklist items not found or do not belong to this task');
    });
  });

  describe('getChecklistProgress', () => {
    it('should calculate progress', async () => {
      const item1 = await service.addChecklistItem(
        { taskId: testTask.id, content: 'A' },
        testUser.id
      );
      await service.addChecklistItem(
        { taskId: testTask.id, content: 'B' },
        testUser.id
      );
      await service.addChecklistItem(
        { taskId: testTask.id, content: 'C' },
        testUser.id
      );

      // Complete one item
      await service.updateChecklistItem(item1.id, { completed: true }, testUser.id);

      const progress = await service.getChecklistProgress(testTask.id);

      expect(progress.total).toBe(3);
      expect(progress.completed).toBe(1);
      expect(progress.remaining).toBe(2);
      expect(progress.percentage).toBe(33); // 1/3 = 33%
    });

    it('should return 0% for empty checklist', async () => {
      const progress = await service.getChecklistProgress(testTask.id);

      expect(progress.total).toBe(0);
      expect(progress.completed).toBe(0);
      expect(progress.remaining).toBe(0);
      expect(progress.percentage).toBe(0);
    });

    it('should return 100% when all items complete', async () => {
      const item1 = await service.addChecklistItem(
        { taskId: testTask.id, content: 'A' },
        testUser.id
      );
      const item2 = await service.addChecklistItem(
        { taskId: testTask.id, content: 'B' },
        testUser.id
      );

      await service.updateChecklistItem(item1.id, { completed: true }, testUser.id);
      await service.updateChecklistItem(item2.id, { completed: true }, testUser.id);

      const progress = await service.getChecklistProgress(testTask.id);

      expect(progress.percentage).toBe(100);
    });
  });

  describe('bulkAddChecklistItems', () => {
    it('should add multiple items at once', async () => {
      const items = await service.bulkAddChecklistItems(
        testTask.id,
        ['Step 1', 'Step 2', 'Step 3'],
        testUser.id
      );

      expect(items).toHaveLength(3);
      expect(items[0].content).toBe('Step 1');
      expect(items[0].sortOrder).toBe(0);
      expect(items[1].content).toBe('Step 2');
      expect(items[1].sortOrder).toBe(1);
      expect(items[2].content).toBe('Step 3');
      expect(items[2].sortOrder).toBe(2);
    });

    it('should append to existing items', async () => {
      await service.addChecklistItem(
        { taskId: testTask.id, content: 'Existing' },
        testUser.id
      );

      const newItems = await service.bulkAddChecklistItems(
        testTask.id,
        ['New 1', 'New 2'],
        testUser.id
      );

      expect(newItems[0].sortOrder).toBe(1);
      expect(newItems[1].sortOrder).toBe(2);
    });

    it('should throw error if task not found', async () => {
      await expect(
        service.bulkAddChecklistItems('invalid-id', ['Test'], testUser.id)
      ).rejects.toThrow('Task not found');
    });
  });

  describe('clearCompletedItems', () => {
    it('should delete all completed items', async () => {
      const item1 = await service.addChecklistItem(
        { taskId: testTask.id, content: 'A' },
        testUser.id
      );
      const item2 = await service.addChecklistItem(
        { taskId: testTask.id, content: 'B' },
        testUser.id
      );
      await service.addChecklistItem(
        { taskId: testTask.id, content: 'C' },
        testUser.id
      );

      // Complete two items
      await service.updateChecklistItem(item1.id, { completed: true }, testUser.id);
      await service.updateChecklistItem(item2.id, { completed: true }, testUser.id);

      const result = await service.clearCompletedItems(testTask.id);

      expect(result.success).toBe(true);
      expect(result.deletedCount).toBe(2);

      const remaining = await service.getTaskChecklist(testTask.id);
      expect(remaining).toHaveLength(1);
      expect(remaining[0].content).toBe('C');
    });

    it('should return 0 count if no completed items', async () => {
      await service.addChecklistItem(
        { taskId: testTask.id, content: 'A' },
        testUser.id
      );

      const result = await service.clearCompletedItems(testTask.id);

      expect(result.deletedCount).toBe(0);
    });
  });

  describe('duplicateChecklist', () => {
    it('should duplicate checklist to another task', async () => {
      const targetTask = await prisma.task.create({
        data: {
          title: 'Install Bathroom Cabinets',
          projectId: testProject.id,
          assigneeId: testUser.id,
          status: 'TODO',
          startDate: new Date(),
          dueDate: new Date(),
        },
      });

      // Create source checklist
      await service.addChecklistItem(
        { taskId: testTask.id, content: 'Measure', sortOrder: 0 },
        testUser.id
      );
      const item2 = await service.addChecklistItem(
        { taskId: testTask.id, content: 'Cut', sortOrder: 1 },
        testUser.id
      );
      await service.addChecklistItem(
        { taskId: testTask.id, content: 'Install', sortOrder: 2 },
        testUser.id
      );

      // Complete one item in source
      await service.updateChecklistItem(item2.id, { completed: true }, testUser.id);

      // Duplicate
      const duplicated = await service.duplicateChecklist(testTask.id, targetTask.id);

      expect(duplicated).toHaveLength(3);
      expect(duplicated[0].content).toBe('Measure');
      expect(duplicated[0].taskId).toBe(targetTask.id);
      expect(duplicated[0].completed).toBe(false); // Reset completion
      expect(duplicated[1].content).toBe('Cut');
      expect(duplicated[1].completed).toBe(false); // Was completed in source, reset here
      expect(duplicated[2].content).toBe('Install');
    });

    it('should return empty array if source has no items', async () => {
      const targetTask = await prisma.task.create({
        data: {
          title: 'Target Task',
          projectId: testProject.id,
          assigneeId: testUser.id,
          status: 'TODO',
          startDate: new Date(),
          dueDate: new Date(),
        },
      });

      const duplicated = await service.duplicateChecklist(testTask.id, targetTask.id);

      expect(duplicated).toEqual([]);
    });

    it('should throw error if source task not found', async () => {
      const targetTask = await prisma.task.create({
        data: {
          title: 'Target Task',
          projectId: testProject.id,
          assigneeId: testUser.id,
          status: 'TODO',
          startDate: new Date(),
          dueDate: new Date(),
        },
      });

      await expect(
        service.duplicateChecklist('invalid-id', targetTask.id)
      ).rejects.toThrow('Source or target task not found');
    });
  });
});
