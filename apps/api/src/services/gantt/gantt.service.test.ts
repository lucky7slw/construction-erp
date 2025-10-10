import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '../../generated/prisma';
import { GanttService } from './gantt.service';
import { setupTestDatabase, cleanupTestDatabase } from '../../test-helpers/database';
import { createTestCompany, createTestUser, createTestProject } from '../../test-helpers/factories';

describe('GanttService', () => {
  let prisma: PrismaClient;
  let service: GanttService;
  let testCompany: any;
  let testUser: any;
  let testProject: any;

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

    service = new GanttService(prisma);
  });

  afterEach(async () => {
    await cleanupTestDatabase(prisma);
  });

  describe('createTask', () => {
    it('should create a task with basic details', async () => {
      const task = await service.createTask(
        testProject.id,
        {
          title: 'Foundation Work',
          description: 'Pour concrete foundation',
          startDate: new Date('2025-10-01'),
          dueDate: new Date('2025-10-05'),
          estimatedHours: 40,
          assigneeId: testUser.id,
        },
        testUser.id
      );

      expect(task.id).toBeDefined();
      expect(task.title).toBe('Foundation Work');
      expect(task.assignee?.id).toBe(testUser.id);
      expect(Number(task.estimatedHours)).toBe(40);
    });

    it('should create a milestone task', async () => {
      const task = await service.createTask(
        testProject.id,
        {
          title: 'Foundation Complete',
          isMilestone: true,
          dueDate: new Date('2025-10-05'),
        },
        testUser.id
      );

      expect(task.isMilestone).toBe(true);
    });

    it('should create task with dependencies', async () => {
      const task1 = await service.createTask(
        testProject.id,
        {
          title: 'Task 1',
          startDate: new Date('2025-10-01'),
          dueDate: new Date('2025-10-03'),
        },
        testUser.id
      );

      const task2 = await service.createTask(
        testProject.id,
        {
          title: 'Task 2',
          dependencies: [
            {
              predecessorId: task1.id,
              type: 'FS',
              lagDays: 1,
            },
          ],
        },
        testUser.id
      );

      expect(task2.dependencies).toHaveLength(1);
      expect(task2.dependencies[0].predecessorId).toBe(task1.id);
      expect(task2.dependencies[0].lagDays).toBe(1);
    });
  });

  describe('updateTask', () => {
    it('should update task details', async () => {
      const task = await service.createTask(
        testProject.id,
        {
          title: 'Original Title',
          status: 'TODO',
          progress: 0,
        },
        testUser.id
      );

      const updated = await service.updateTask(task.id, {
        title: 'Updated Title',
        status: 'IN_PROGRESS',
        progress: 50,
      });

      expect(updated.title).toBe('Updated Title');
      expect(updated.status).toBe('IN_PROGRESS');
      expect(updated.progress).toBe(50);
    });

    it('should set completedAt when status changes to COMPLETED', async () => {
      const task = await service.createTask(
        testProject.id,
        {
          title: 'Task',
          status: 'IN_PROGRESS',
        },
        testUser.id
      );

      const completed = await service.updateTask(task.id, {
        status: 'COMPLETED',
        progress: 100,
      });

      expect(completed.status).toBe('COMPLETED');
      expect(completed.completedAt).toBeDefined();
    });
  });

  describe('addDependency', () => {
    it('should add a finish-to-start dependency', async () => {
      const task1 = await service.createTask(
        testProject.id,
        { title: 'Task 1' },
        testUser.id
      );
      const task2 = await service.createTask(
        testProject.id,
        { title: 'Task 2' },
        testUser.id
      );

      const dep = await service.addDependency(task2.id, task1.id, 'FS', 0);

      expect(dep.dependentId).toBe(task2.id);
      expect(dep.predecessorId).toBe(task1.id);
      expect(dep.type).toBe('FS');
    });

    it('should add dependency with lag days', async () => {
      const task1 = await service.createTask(
        testProject.id,
        { title: 'Task 1' },
        testUser.id
      );
      const task2 = await service.createTask(
        testProject.id,
        { title: 'Task 2' },
        testUser.id
      );

      const dep = await service.addDependency(task2.id, task1.id, 'FS', 3);

      expect(dep.lagDays).toBe(3);
    });

    it('should throw error for circular dependency', async () => {
      const task1 = await service.createTask(
        testProject.id,
        { title: 'Task 1' },
        testUser.id
      );
      const task2 = await service.createTask(
        testProject.id,
        { title: 'Task 2' },
        testUser.id
      );

      // Create dependency: task2 depends on task1
      await service.addDependency(task2.id, task1.id);

      // Try to create reverse dependency (would be circular)
      await expect(service.addDependency(task1.id, task2.id)).rejects.toThrow(
        'circular dependency'
      );
    });
  });

  describe('removeDependency', () => {
    it('should remove a dependency', async () => {
      const task1 = await service.createTask(
        testProject.id,
        { title: 'Task 1' },
        testUser.id
      );
      const task2 = await service.createTask(
        testProject.id,
        { title: 'Task 2' },
        testUser.id
      );

      const dep = await service.addDependency(task2.id, task1.id);
      const result = await service.removeDependency(dep.id);

      expect(result.success).toBe(true);

      const updated = await service.getTask(task2.id);
      expect(updated.dependencies).toHaveLength(0);
    });
  });

  describe('getProjectGantt', () => {
    it('should return all tasks with dependency info', async () => {
      await service.createTask(
        testProject.id,
        {
          title: 'Task 1',
          startDate: new Date('2025-10-01'),
          dueDate: new Date('2025-10-05'),
        },
        testUser.id
      );

      await service.createTask(
        testProject.id,
        {
          title: 'Task 2',
          startDate: new Date('2025-10-06'),
          dueDate: new Date('2025-10-10'),
        },
        testUser.id
      );

      const gantt = await service.getProjectGantt(testProject.id);

      expect(gantt).toHaveLength(2);
      expect(gantt[0].title).toBe('Task 1');
      expect(gantt[1].title).toBe('Task 2');
    });

    it('should include critical path information', async () => {
      const task1 = await service.createTask(
        testProject.id,
        {
          title: 'Task 1',
          startDate: new Date('2025-10-01'),
          dueDate: new Date('2025-10-05'),
        },
        testUser.id
      );

      const task2 = await service.createTask(
        testProject.id,
        {
          title: 'Task 2',
          startDate: new Date('2025-10-06'),
          dueDate: new Date('2025-10-10'),
          dependencies: [{ predecessorId: task1.id }],
        },
        testUser.id
      );

      const gantt = await service.getProjectGantt(testProject.id);

      // Both tasks should be on critical path (no parallel tasks)
      const criticalTasks = gantt.filter((t) => t.isOnCriticalPath);
      expect(criticalTasks.length).toBeGreaterThan(0);
    });
  });

  describe('calculateCriticalPath', () => {
    it('should calculate critical path for simple linear tasks', async () => {
      const task1 = await service.createTask(
        testProject.id,
        {
          title: 'Task 1',
          startDate: new Date('2025-10-01'),
          dueDate: new Date('2025-10-05'),
        },
        testUser.id
      );

      const task2 = await service.createTask(
        testProject.id,
        {
          title: 'Task 2',
          startDate: new Date('2025-10-06'),
          dueDate: new Date('2025-10-10'),
          dependencies: [{ predecessorId: task1.id }],
        },
        testUser.id
      );

      const analysis = await service.calculateCriticalPath(testProject.id);

      expect(analysis.criticalPath).toContain(task1.id);
      expect(analysis.criticalPath).toContain(task2.id);
      expect(analysis.projectDuration).toBeGreaterThan(0);
      expect(analysis.earliestCompletion).toBeDefined();
    });

    it('should identify slack in parallel tasks', async () => {
      const task1 = await service.createTask(
        testProject.id,
        {
          title: 'Task 1',
          startDate: new Date('2025-10-01'),
          dueDate: new Date('2025-10-10'), // 10 days
        },
        testUser.id
      );

      const task2 = await service.createTask(
        testProject.id,
        {
          title: 'Task 2',
          startDate: new Date('2025-10-01'),
          dueDate: new Date('2025-10-05'), // 5 days (shorter)
        },
        testUser.id
      );

      const task3 = await service.createTask(
        testProject.id,
        {
          title: 'Task 3',
          startDate: new Date('2025-10-11'),
          dueDate: new Date('2025-10-15'),
          dependencies: [
            { predecessorId: task1.id },
            { predecessorId: task2.id },
          ],
        },
        testUser.id
      );

      const analysis = await service.calculateCriticalPath(testProject.id);

      // Task 1 should be on critical path, Task 2 should have slack
      const task1Analysis = analysis.tasks.find((t) => t.taskId === task1.id);
      const task2Analysis = analysis.tasks.find((t) => t.taskId === task2.id);

      expect(task1Analysis?.isCritical).toBe(true);
      expect(task2Analysis?.slack).toBeGreaterThan(0);
    });

    it('should handle empty project', async () => {
      const analysis = await service.calculateCriticalPath(testProject.id);

      expect(analysis.criticalPath).toHaveLength(0);
      expect(analysis.projectDuration).toBe(0);
      expect(analysis.earliestCompletion).toBeNull();
    });
  });

  describe('getResourceAllocation', () => {
    it('should calculate resource allocation per user', async () => {
      await service.createTask(
        testProject.id,
        {
          title: 'Task 1',
          assigneeId: testUser.id,
          estimatedHours: 20,
          startDate: new Date('2025-10-01'),
          dueDate: new Date('2025-10-05'),
        },
        testUser.id
      );

      await service.createTask(
        testProject.id,
        {
          title: 'Task 2',
          assigneeId: testUser.id,
          estimatedHours: 30,
          startDate: new Date('2025-10-06'),
          dueDate: new Date('2025-10-10'),
        },
        testUser.id
      );

      const allocation = await service.getResourceAllocation(
        testProject.id,
        new Date('2025-10-01'),
        new Date('2025-10-31')
      );

      expect(allocation).toHaveLength(1);
      expect(allocation[0].userId).toBe(testUser.id);
      expect(allocation[0].allocatedHours).toBe(50);
      expect(allocation[0].tasks).toHaveLength(2);
    });

    it('should calculate utilization percentage', async () => {
      await service.createTask(
        testProject.id,
        {
          title: 'Task 1',
          assigneeId: testUser.id,
          estimatedHours: 80, // 10 days * 8 hours
          startDate: new Date('2025-10-01'),
          dueDate: new Date('2025-10-14'),
        },
        testUser.id
      );

      const allocation = await service.getResourceAllocation(
        testProject.id,
        new Date('2025-10-01'),
        new Date('2025-10-14')
      );

      expect(allocation[0].utilizationPercent).toBeGreaterThan(0);
      expect(allocation[0].availableHours).toBeDefined();
    });

    it('should handle multiple users', async () => {
      const user2 = await createTestUser(prisma, {
        email: `test2-${Date.now()}@test.com`,
        firstName: 'User',
        lastName: 'Two',
        companyId: testCompany.id,
      });

      await service.createTask(
        testProject.id,
        {
          title: 'Task 1',
          assigneeId: testUser.id,
          estimatedHours: 20,
        },
        testUser.id
      );

      await service.createTask(
        testProject.id,
        {
          title: 'Task 2',
          assigneeId: user2.id,
          estimatedHours: 40,
        },
        testUser.id
      );

      const allocation = await service.getResourceAllocation(testProject.id);

      expect(allocation).toHaveLength(2);
      expect(allocation.map((a) => a.userId)).toContain(testUser.id);
      expect(allocation.map((a) => a.userId)).toContain(user2.id);
    });
  });

  describe('autoSchedule', () => {
    it('should auto-schedule tasks based on dependencies', async () => {
      const projectStart = new Date('2025-10-01');

      const task1 = await service.createTask(
        testProject.id,
        {
          title: 'Task 1',
          estimatedHours: 40, // 5 days
        },
        testUser.id
      );

      const task2 = await service.createTask(
        testProject.id,
        {
          title: 'Task 2',
          estimatedHours: 24, // 3 days
          dependencies: [{ predecessorId: task1.id }],
        },
        testUser.id
      );

      const result = await service.autoSchedule(testProject.id, projectStart);

      expect(result.scheduled).toBe(2);

      const updated1 = await service.getTask(task1.id);
      const updated2 = await service.getTask(task2.id);

      expect(updated1.startDate).toBeDefined();
      expect(updated1.dueDate).toBeDefined();
      expect(updated2.startDate).toBeDefined();
      expect(updated2.dueDate).toBeDefined();

      // Task 2 should start after Task 1 ends
      if (updated1.dueDate && updated2.startDate) {
        expect(new Date(updated2.startDate).getTime()).toBeGreaterThanOrEqual(
          new Date(updated1.dueDate).getTime()
        );
      }
    });

    it('should handle lag days in dependencies', async () => {
      const projectStart = new Date('2025-10-01');

      const task1 = await service.createTask(
        testProject.id,
        {
          title: 'Task 1',
          estimatedHours: 40,
        },
        testUser.id
      );

      const task2 = await service.createTask(
        testProject.id,
        {
          title: 'Task 2',
          estimatedHours: 24,
          dependencies: [
            {
              predecessorId: task1.id,
              lagDays: 3, // 3-day lag
            },
          ],
        },
        testUser.id
      );

      await service.autoSchedule(testProject.id, projectStart);

      const updated1 = await service.getTask(task1.id);
      const updated2 = await service.getTask(task2.id);

      if (updated1.dueDate && updated2.startDate) {
        const daysDiff = Math.floor(
          (new Date(updated2.startDate).getTime() -
            new Date(updated1.dueDate).getTime()) /
            (1000 * 60 * 60 * 24)
        );
        expect(daysDiff).toBe(3);
      }
    });

    it('should return 0 for empty project', async () => {
      const result = await service.autoSchedule(
        testProject.id,
        new Date('2025-10-01')
      );

      expect(result.scheduled).toBe(0);
    });
  });

  describe('complex scenarios', () => {
    it('should handle complex dependency chains', async () => {
      const task1 = await service.createTask(
        testProject.id,
        {
          title: 'Foundation',
          startDate: new Date('2025-10-01'),
          dueDate: new Date('2025-10-10'),
        },
        testUser.id
      );

      const task2 = await service.createTask(
        testProject.id,
        {
          title: 'Framing',
          startDate: new Date('2025-10-11'),
          dueDate: new Date('2025-10-20'),
          dependencies: [{ predecessorId: task1.id }],
        },
        testUser.id
      );

      const task3 = await service.createTask(
        testProject.id,
        {
          title: 'Electrical',
          startDate: new Date('2025-10-21'),
          dueDate: new Date('2025-10-25'),
          dependencies: [{ predecessorId: task2.id }],
        },
        testUser.id
      );

      const task4 = await service.createTask(
        testProject.id,
        {
          title: 'Plumbing',
          startDate: new Date('2025-10-21'),
          dueDate: new Date('2025-10-25'),
          dependencies: [{ predecessorId: task2.id }],
        },
        testUser.id
      );

      const task5 = await service.createTask(
        testProject.id,
        {
          title: 'Drywall',
          startDate: new Date('2025-10-26'),
          dueDate: new Date('2025-10-30'),
          dependencies: [
            { predecessorId: task3.id },
            { predecessorId: task4.id },
          ],
        },
        testUser.id
      );

      const analysis = await service.calculateCriticalPath(testProject.id);

      expect(analysis.criticalPath.length).toBeGreaterThan(0);
      expect(analysis.tasks).toHaveLength(5);
    });
  });
});
