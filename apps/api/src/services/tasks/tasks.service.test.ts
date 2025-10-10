import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { PrismaClient } from '../../generated/prisma';
import { setupTestDatabase, cleanupTestDatabase } from '../../test-helpers/database';
import { TasksService } from './tasks.service';

describe('TasksService', () => {
  let prisma: PrismaClient;
  let service: TasksService;
  let testUser: any;
  let testUser2: any;
  let testCompany: any;
  let testProject: any;

  beforeAll(async () => {
    prisma = await setupTestDatabase();
    service = new TasksService(prisma);

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
        email: 'task@test.com',
        password: 'hashedpassword',
        firstName: 'Task',
        lastName: 'Manager',
      },
    });

    testUser2 = await prisma.user.create({
      data: {
        email: 'worker@test.com',
        password: 'hashedpassword',
        firstName: 'Worker',
        lastName: 'Two',
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
        name: 'Task Management Project',
        companyId: testCompany.id,
        createdById: testUser.id,
        status: 'ACTIVE',
      },
    });
  });

  afterEach(async () => {
    await prisma.taskChecklistItem.deleteMany({});
    await prisma.taskDependency.deleteMany({});
    await prisma.task.deleteMany({});
  });

  describe('createTask', () => {
    it('should create task with all fields', async () => {
      const task = await service.createTask({
        projectId: testProject.id,
        title: 'Install Foundation',
        description: 'Pour concrete foundation',
        status: 'TODO',
        priority: 'HIGH',
        startDate: new Date('2025-01-15'),
        dueDate: new Date('2025-01-20'),
        assigneeId: testUser.id,
        estimatedHours: 40,
        isMilestone: true,
      });

      expect(task.title).toBe('Install Foundation');
      expect(task.status).toBe('TODO');
      expect(task.priority).toBe('HIGH');
      expect(task.assigneeId).toBe(testUser.id);
      expect(Number(task.estimatedHours)).toBe(40);
      expect(task.isMilestone).toBe(true);
    });

    it('should create task with defaults', async () => {
      const task = await service.createTask({
        projectId: testProject.id,
        title: 'Simple Task',
      });

      expect(task.status).toBe('TODO');
      expect(task.priority).toBe('MEDIUM');
      expect(task.isMilestone).toBe(false);
    });
  });

  describe('updateTask', () => {
    it('should update task fields', async () => {
      const task = await service.createTask({
        projectId: testProject.id,
        title: 'Original Title',
        status: 'TODO',
      });

      const updated = await service.updateTask(task.id, {
        title: 'Updated Title',
        status: 'IN_PROGRESS',
        progress: 50,
      });

      expect(updated.title).toBe('Updated Title');
      expect(updated.status).toBe('IN_PROGRESS');
      expect(updated.progress).toBe(50);
    });

    it('should auto-complete when status is COMPLETED', async () => {
      const task = await service.createTask({
        projectId: testProject.id,
        title: 'Task to Complete',
        status: 'IN_PROGRESS',
      });

      const completed = await service.updateTask(task.id, {
        status: 'COMPLETED',
      });

      expect(completed.status).toBe('COMPLETED');
      expect(completed.progress).toBe(100);
      expect(completed.completedAt).toBeTruthy();
    });
  });

  describe('listTasks', () => {
    it('should filter by status', async () => {
      await service.createTask({
        projectId: testProject.id,
        title: 'TODO Task',
        status: 'TODO',
      });

      await service.createTask({
        projectId: testProject.id,
        title: 'In Progress Task',
        status: 'IN_PROGRESS',
      });

      const todoTasks = await service.listTasks(testProject.id, {
        status: 'TODO',
      });

      expect(todoTasks.length).toBe(1);
      expect(todoTasks[0].status).toBe('TODO');
    });

    it('should filter by assignee', async () => {
      await service.createTask({
        projectId: testProject.id,
        title: 'User 1 Task',
        assigneeId: testUser.id,
      });

      await service.createTask({
        projectId: testProject.id,
        title: 'User 2 Task',
        assigneeId: testUser2.id,
      });

      const user1Tasks = await service.listTasks(testProject.id, {
        assigneeId: testUser.id,
      });

      expect(user1Tasks.length).toBe(1);
      expect(user1Tasks[0].assigneeId).toBe(testUser.id);
    });

    it('should filter milestones only', async () => {
      await service.createTask({
        projectId: testProject.id,
        title: 'Regular Task',
        isMilestone: false,
      });

      await service.createTask({
        projectId: testProject.id,
        title: 'Milestone Task',
        isMilestone: true,
      });

      const milestones = await service.listTasks(testProject.id, {
        milestonesOnly: true,
      });

      expect(milestones.length).toBe(1);
      expect(milestones[0].isMilestone).toBe(true);
    });
  });

  describe('addChecklistItem', () => {
    it('should add checklist item to task', async () => {
      const task = await service.createTask({
        projectId: testProject.id,
        title: 'Task with Checklist',
      });

      const item = await service.addChecklistItem({
        taskId: task.id,
        content: 'Order materials',
        sortOrder: 1,
      });

      expect(item.content).toBe('Order materials');
      expect(item.sortOrder).toBe(1);
      expect(item.completed).toBe(false);
    });
  });

  describe('toggleChecklistItem', () => {
    it('should toggle checklist item completion', async () => {
      const task = await service.createTask({
        projectId: testProject.id,
        title: 'Task',
      });

      const item = await service.addChecklistItem({
        taskId: task.id,
        content: 'Check item',
        sortOrder: 1,
      });

      const completed = await service.toggleChecklistItem(item.id, true, testUser.id);

      expect(completed.completed).toBe(true);
      expect(completed.completedAt).toBeTruthy();
      expect(completed.completedBy).toBe(testUser.id);

      const uncompleted = await service.toggleChecklistItem(item.id, false);

      expect(uncompleted.completed).toBe(false);
      expect(uncompleted.completedAt).toBeNull();
      expect(uncompleted.completedBy).toBeNull();
    });
  });

  describe('addDependency', () => {
    it('should add task dependency', async () => {
      const task1 = await service.createTask({
        projectId: testProject.id,
        title: 'Foundation',
      });

      const task2 = await service.createTask({
        projectId: testProject.id,
        title: 'Framing',
      });

      const dependency = await service.addDependency({
        predecessorId: task1.id,
        dependentId: task2.id,
        type: 'FS',
        lagDays: 2,
      });

      expect(dependency.predecessorId).toBe(task1.id);
      expect(dependency.dependentId).toBe(task2.id);
      expect(dependency.type).toBe('FS');
      expect(dependency.lagDays).toBe(2);
    });
  });

  describe('getTaskProgress', () => {
    it('should calculate task progress', async () => {
      const task = await service.createTask({
        projectId: testProject.id,
        title: 'Task with Progress',
        estimatedHours: 10,
      });

      await service.updateTask(task.id, {
        progress: 60,
      });

      await service.addChecklistItem({
        taskId: task.id,
        content: 'Item 1',
        sortOrder: 1,
      });

      const item2 = await service.addChecklistItem({
        taskId: task.id,
        content: 'Item 2',
        sortOrder: 2,
      });

      await service.toggleChecklistItem(item2.id, true);

      await prisma.timeEntry.create({
        data: {
          projectId: testProject.id,
          taskId: task.id,
          userId: testUser.id,
          hours: 5,
          date: new Date('2025-01-15'),
        },
      });

      const progress = await service.getTaskProgress(task.id);

      expect(progress.overallProgress).toBe(60);
      expect(progress.checklistProgress).toBe(50); // 1 of 2 complete
      expect(progress.estimatedHours).toBe(10);
      expect(progress.actualHours).toBe(5);
      expect(progress.timeProgress).toBe(50); // 5 of 10 hours
      expect(progress.isOverBudget).toBe(false);
    });
  });

  describe('getProjectTaskSummary', () => {
    it('should calculate project task summary', async () => {
      await service.createTask({
        projectId: testProject.id,
        title: 'Task 1',
        status: 'TODO',
        priority: 'HIGH',
        estimatedHours: 10,
      });

      const task2 = await service.createTask({
        projectId: testProject.id,
        title: 'Task 2',
        status: 'COMPLETED',
        priority: 'MEDIUM',
        estimatedHours: 8,
        isMilestone: true,
      });

      await prisma.timeEntry.create({
        data: {
          projectId: testProject.id,
          taskId: task2.id,
          userId: testUser.id,
          hours: 9,
          date: new Date('2025-01-15'),
        },
      });

      const summary = await service.getProjectTaskSummary(testProject.id);

      expect(summary.totalTasks).toBe(2);
      expect(summary.completedTasks).toBe(1);
      expect(summary.completionRate).toBe(50);
      expect(summary.byStatus.TODO).toBe(1);
      expect(summary.byStatus.COMPLETED).toBe(1);
      expect(summary.byPriority.HIGH).toBe(1);
      expect(summary.byPriority.MEDIUM).toBe(1);
      expect(summary.totalEstimatedHours).toBe(18);
      expect(summary.totalActualHours).toBe(9);
      expect(summary.hoursVariance).toBe(-9); // 9 - 18
      expect(summary.totalMilestones).toBe(1);
      expect(summary.completedMilestones).toBe(1);
    });
  });

  describe('getOverdueTasks', () => {
    it('should find overdue tasks', async () => {
      await service.createTask({
        projectId: testProject.id,
        title: 'Overdue Task',
        status: 'IN_PROGRESS',
        dueDate: new Date('2025-01-01'),
      });

      await service.createTask({
        projectId: testProject.id,
        title: 'Future Task',
        status: 'TODO',
        dueDate: new Date('2025-12-31'),
      });

      await service.createTask({
        projectId: testProject.id,
        title: 'Completed Overdue',
        status: 'COMPLETED',
        dueDate: new Date('2025-01-01'),
      });

      const overdue = await service.getOverdueTasks(testProject.id);

      expect(overdue.length).toBe(1);
      expect(overdue[0].title).toBe('Overdue Task');
    });
  });

  describe('getTasksByAssignee', () => {
    it('should group tasks by assignee', async () => {
      await service.createTask({
        projectId: testProject.id,
        title: 'User 1 Task 1',
        assigneeId: testUser.id,
        status: 'COMPLETED',
      });

      const task2 = await service.createTask({
        projectId: testProject.id,
        title: 'User 1 Task 2',
        assigneeId: testUser.id,
        status: 'IN_PROGRESS',
      });

      await service.createTask({
        projectId: testProject.id,
        title: 'User 2 Task',
        assigneeId: testUser2.id,
        status: 'TODO',
      });

      await service.createTask({
        projectId: testProject.id,
        title: 'Unassigned Task',
        status: 'TODO',
      });

      await prisma.timeEntry.create({
        data: {
          projectId: testProject.id,
          taskId: task2.id,
          userId: testUser.id,
          hours: 5,
          date: new Date('2025-01-15'),
        },
      });

      const byAssignee = await service.getTasksByAssignee(testProject.id);

      expect(byAssignee.length).toBe(3); // User 1, User 2, Unassigned

      const user1Stats = byAssignee.find(a => a.assigneeId === testUser.id);
      expect(user1Stats?.totalTasks).toBe(2);
      expect(user1Stats?.completedTasks).toBe(1);
      expect(user1Stats?.inProgressTasks).toBe(1);
      expect(user1Stats?.totalHours).toBe(5);
    });
  });

  describe('getCriticalPath', () => {
    it('should identify critical path tasks', async () => {
      const task1 = await service.createTask({
        projectId: testProject.id,
        title: 'Foundation',
      });

      const task2 = await service.createTask({
        projectId: testProject.id,
        title: 'Framing',
      });

      const task3 = await service.createTask({
        projectId: testProject.id,
        title: 'Roofing',
      });

      await service.addDependency({
        predecessorId: task1.id,
        dependentId: task2.id,
      });

      await service.addDependency({
        predecessorId: task2.id,
        dependentId: task3.id,
      });

      const criticalPath = await service.getCriticalPath(testProject.id);

      expect(criticalPath.length).toBe(3);
      expect(criticalPath.find(t => t.id === task2.id)?.dependsOn.length).toBe(1);
      expect(criticalPath.find(t => t.id === task2.id)?.blockedBy.length).toBe(1);
    });
  });

  describe('deleteTask', () => {
    it('should delete task and cascade', async () => {
      const task = await service.createTask({
        projectId: testProject.id,
        title: 'Task to Delete',
      });

      await service.addChecklistItem({
        taskId: task.id,
        content: 'Item',
        sortOrder: 1,
      });

      await service.deleteTask(task.id);

      const tasks = await service.listTasks(testProject.id);
      expect(tasks.length).toBe(0);
    });
  });
});
