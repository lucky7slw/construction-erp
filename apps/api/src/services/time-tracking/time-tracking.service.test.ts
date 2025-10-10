import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { PrismaClient } from '../../generated/prisma';
import { setupTestDatabase, cleanupTestDatabase } from '../../test-helpers/database';
import { TimeTrackingService } from './time-tracking.service';

describe('TimeTrackingService', () => {
  let prisma: PrismaClient;
  let service: TimeTrackingService;
  let testUser: any;
  let testUser2: any;
  let testCompany: any;
  let testProject: any;
  let testTask: any;

  beforeAll(async () => {
    prisma = await setupTestDatabase();
    service = new TimeTrackingService(prisma);

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
        email: 'time@test.com',
        password: 'hashedpassword',
        firstName: 'Time',
        lastName: 'Tracker',
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
        name: 'Time Tracking Project',
        companyId: testCompany.id,
        createdById: testUser.id,
        status: 'ACTIVE',
      },
    });

    testTask = await prisma.task.create({
      data: {
        projectId: testProject.id,
        title: 'Test Task',
        description: 'Task for time tracking',
        assigneeId: testUser.id,
        status: 'IN_PROGRESS',
      },
    });
  });

  afterEach(async () => {
    await prisma.timeEntry.deleteMany({});
  });

  describe('createTimeEntry', () => {
    it('should create time entry with all fields', async () => {
      const entry = await service.createTimeEntry({
        projectId: testProject.id,
        taskId: testTask.id,
        userId: testUser.id,
        description: 'Working on framing',
        hours: 8,
        date: new Date('2025-01-15'),
        billable: true,
      });

      expect(entry.projectId).toBe(testProject.id);
      expect(entry.taskId).toBe(testTask.id);
      expect(entry.userId).toBe(testUser.id);
      expect(entry.description).toBe('Working on framing');
      expect(Number(entry.hours)).toBe(8);
      expect(entry.billable).toBe(true);
    });

    it('should create time entry without task', async () => {
      const entry = await service.createTimeEntry({
        projectId: testProject.id,
        userId: testUser.id,
        description: 'General project work',
        hours: 4,
        date: new Date('2025-01-15'),
      });

      expect(entry.projectId).toBe(testProject.id);
      expect(entry.taskId).toBeNull();
      expect(Number(entry.hours)).toBe(4);
      expect(entry.billable).toBe(true); // Default
    });

    it('should create non-billable time entry', async () => {
      const entry = await service.createTimeEntry({
        projectId: testProject.id,
        userId: testUser.id,
        description: 'Internal meeting',
        hours: 2,
        date: new Date('2025-01-15'),
        billable: false,
      });

      expect(entry.billable).toBe(false);
    });
  });

  describe('listTimeEntries', () => {
    it('should filter by project', async () => {
      const project2 = await prisma.project.create({
        data: {
          name: 'Other Project',
          companyId: testCompany.id,
          createdById: testUser.id,
          status: 'ACTIVE',
        },
      });

      await service.createTimeEntry({
        projectId: testProject.id,
        userId: testUser.id,
        hours: 5,
        date: new Date('2025-01-15'),
      });

      await service.createTimeEntry({
        projectId: project2.id,
        userId: testUser.id,
        hours: 3,
        date: new Date('2025-01-15'),
      });

      const entries = await service.listTimeEntries({
        projectId: testProject.id,
      });

      expect(entries.length).toBe(1);
      expect(entries[0].projectId).toBe(testProject.id);
    });

    it('should filter by user', async () => {
      await service.createTimeEntry({
        projectId: testProject.id,
        userId: testUser.id,
        hours: 5,
        date: new Date('2025-01-15'),
      });

      await service.createTimeEntry({
        projectId: testProject.id,
        userId: testUser2.id,
        hours: 7,
        date: new Date('2025-01-15'),
      });

      const entries = await service.listTimeEntries({
        userId: testUser.id,
      });

      expect(entries.length).toBe(1);
      expect(entries[0].userId).toBe(testUser.id);
    });

    it('should filter by date range', async () => {
      await service.createTimeEntry({
        projectId: testProject.id,
        userId: testUser.id,
        hours: 5,
        date: new Date('2025-01-10'),
      });

      await service.createTimeEntry({
        projectId: testProject.id,
        userId: testUser.id,
        hours: 6,
        date: new Date('2025-01-15'),
      });

      await service.createTimeEntry({
        projectId: testProject.id,
        userId: testUser.id,
        hours: 7,
        date: new Date('2025-01-20'),
      });

      const entries = await service.listTimeEntries({
        startDate: new Date('2025-01-12'),
        endDate: new Date('2025-01-18'),
      });

      expect(entries.length).toBe(1);
      expect(Number(entries[0].hours)).toBe(6);
    });

    it('should filter by billable status', async () => {
      await service.createTimeEntry({
        projectId: testProject.id,
        userId: testUser.id,
        hours: 5,
        date: new Date('2025-01-15'),
        billable: true,
      });

      await service.createTimeEntry({
        projectId: testProject.id,
        userId: testUser.id,
        hours: 2,
        date: new Date('2025-01-15'),
        billable: false,
      });

      const billableEntries = await service.listTimeEntries({
        billable: true,
      });

      expect(billableEntries.length).toBe(1);
      expect(billableEntries[0].billable).toBe(true);
    });
  });

  describe('getTimeByProject', () => {
    it('should calculate project time summary', async () => {
      await service.createTimeEntry({
        projectId: testProject.id,
        taskId: testTask.id,
        userId: testUser.id,
        hours: 8,
        date: new Date('2025-01-15'),
        billable: true,
      });

      await service.createTimeEntry({
        projectId: testProject.id,
        userId: testUser2.id,
        hours: 6,
        date: new Date('2025-01-15'),
        billable: true,
      });

      await service.createTimeEntry({
        projectId: testProject.id,
        userId: testUser.id,
        hours: 2,
        date: new Date('2025-01-15'),
        billable: false,
      });

      const summary = await service.getTimeByProject(testProject.id);

      expect(summary.totalHours).toBe(16);
      expect(summary.billableHours).toBe(14);
      expect(summary.nonBillableHours).toBe(2);
      expect(summary.totalEntries).toBe(3);
      expect(summary.byUser.length).toBe(2);
      expect(summary.byTask.length).toBe(1);
    });

    it('should filter by date range', async () => {
      await service.createTimeEntry({
        projectId: testProject.id,
        userId: testUser.id,
        hours: 5,
        date: new Date('2025-01-10'),
        billable: true,
      });

      await service.createTimeEntry({
        projectId: testProject.id,
        userId: testUser.id,
        hours: 8,
        date: new Date('2025-01-20'),
        billable: true,
      });

      const summary = await service.getTimeByProject(testProject.id, {
        startDate: new Date('2025-01-15'),
        endDate: new Date('2025-01-25'),
      });

      expect(summary.totalHours).toBe(8);
      expect(summary.totalEntries).toBe(1);
    });

    it('should filter billable only', async () => {
      await service.createTimeEntry({
        projectId: testProject.id,
        userId: testUser.id,
        hours: 8,
        date: new Date('2025-01-15'),
        billable: true,
      });

      await service.createTimeEntry({
        projectId: testProject.id,
        userId: testUser.id,
        hours: 2,
        date: new Date('2025-01-15'),
        billable: false,
      });

      const summary = await service.getTimeByProject(testProject.id, {
        billableOnly: true,
      });

      expect(summary.totalHours).toBe(8);
      expect(summary.totalEntries).toBe(1);
    });
  });

  describe('getTimeByUser', () => {
    it('should calculate user time summary', async () => {
      await service.createTimeEntry({
        projectId: testProject.id,
        taskId: testTask.id,
        userId: testUser.id,
        hours: 8,
        date: new Date('2025-01-15'),
        billable: true,
      });

      await service.createTimeEntry({
        projectId: testProject.id,
        userId: testUser.id,
        hours: 4,
        date: new Date('2025-01-16'),
        billable: false,
      });

      const summary = await service.getTimeByUser(testUser.id);

      expect(summary.totalHours).toBe(12);
      expect(summary.billableHours).toBe(8);
      expect(summary.nonBillableHours).toBe(4);
      expect(summary.totalEntries).toBe(2);
      expect(summary.byProject.length).toBe(1);
      expect(summary.byDate.length).toBe(2);
    });

    it('should filter by project', async () => {
      const project2 = await prisma.project.create({
        data: {
          name: 'Other Project',
          companyId: testCompany.id,
          createdById: testUser.id,
          status: 'ACTIVE',
        },
      });

      await service.createTimeEntry({
        projectId: testProject.id,
        userId: testUser.id,
        hours: 8,
        date: new Date('2025-01-15'),
      });

      await service.createTimeEntry({
        projectId: project2.id,
        userId: testUser.id,
        hours: 5,
        date: new Date('2025-01-15'),
      });

      const summary = await service.getTimeByUser(testUser.id, {
        projectId: testProject.id,
      });

      expect(summary.totalHours).toBe(8);
      expect(summary.totalEntries).toBe(1);
    });
  });

  describe('getTimeByTask', () => {
    it('should calculate task time summary', async () => {
      await service.createTimeEntry({
        projectId: testProject.id,
        taskId: testTask.id,
        userId: testUser.id,
        hours: 5,
        date: new Date('2025-01-15'),
      });

      await service.createTimeEntry({
        projectId: testProject.id,
        taskId: testTask.id,
        userId: testUser2.id,
        hours: 3,
        date: new Date('2025-01-16'),
      });

      const summary = await service.getTimeByTask(testTask.id);

      expect(summary.totalHours).toBe(8);
      expect(summary.totalEntries).toBe(2);
      expect(summary.byUser.length).toBe(2);

      const user1Time = summary.byUser.find((u: any) => u.userId === testUser.id);
      expect(user1Time.totalHours).toBe(5);
    });
  });

  describe('getWeeklySummary', () => {
    it('should calculate weekly time summary', async () => {
      const weekStart = new Date('2025-01-13'); // Monday

      await service.createTimeEntry({
        projectId: testProject.id,
        userId: testUser.id,
        hours: 8,
        date: new Date('2025-01-13'), // Monday
        billable: true,
      });

      await service.createTimeEntry({
        projectId: testProject.id,
        userId: testUser.id,
        hours: 7,
        date: new Date('2025-01-14'), // Tuesday
        billable: true,
      });

      await service.createTimeEntry({
        projectId: testProject.id,
        userId: testUser.id,
        hours: 2,
        date: new Date('2025-01-15'), // Wednesday
        billable: false,
      });

      const summary = await service.getWeeklySummary(testUser.id, weekStart);

      expect(summary.totalHours).toBe(17);
      expect(summary.billableHours).toBe(15);
      expect(summary.nonBillableHours).toBe(2);
      expect(summary.totalEntries).toBe(3);
      expect(summary.byDay.length).toBe(3);
    });

    it('should not include entries from other weeks', async () => {
      const weekStart = new Date('2025-01-13');

      await service.createTimeEntry({
        projectId: testProject.id,
        userId: testUser.id,
        hours: 8,
        date: new Date('2025-01-15'),
      });

      await service.createTimeEntry({
        projectId: testProject.id,
        userId: testUser.id,
        hours: 7,
        date: new Date('2025-01-20'), // Next week
      });

      const summary = await service.getWeeklySummary(testUser.id, weekStart);

      expect(summary.totalHours).toBe(8);
      expect(summary.totalEntries).toBe(1);
    });
  });

  describe('exportTimesheet', () => {
    it('should generate CSV export', async () => {
      await service.createTimeEntry({
        projectId: testProject.id,
        taskId: testTask.id,
        userId: testUser.id,
        description: 'Test work',
        hours: 8,
        date: new Date('2025-01-15'),
        billable: true,
      });

      const csv = await service.exportTimesheet({
        projectId: testProject.id,
      });

      expect(csv).toContain('Date,User,Project,Task,Description,Hours,Billable');
      expect(csv).toContain('2025-01-15');
      expect(csv).toContain('Time Tracker');
      expect(csv).toContain('Time Tracking Project');
      expect(csv).toContain('Test Task');
      expect(csv).toContain('Test work');
      expect(csv).toContain('8');
      expect(csv).toContain('Yes');
    });

    it('should filter by date range', async () => {
      await service.createTimeEntry({
        projectId: testProject.id,
        userId: testUser.id,
        hours: 8,
        date: new Date('2025-01-10'),
      });

      await service.createTimeEntry({
        projectId: testProject.id,
        userId: testUser.id,
        hours: 7,
        date: new Date('2025-01-20'),
      });

      const csv = await service.exportTimesheet({
        startDate: new Date('2025-01-15'),
        endDate: new Date('2025-01-25'),
      });

      const lines = csv.split('\n').filter(line => line.trim());
      expect(lines.length).toBe(2); // Header + 1 entry
      expect(csv).toContain('2025-01-20');
      expect(csv).not.toContain('2025-01-10');
    });
  });

  describe('updateTimeEntry', () => {
    it('should update time entry fields', async () => {
      const entry = await service.createTimeEntry({
        projectId: testProject.id,
        userId: testUser.id,
        description: 'Original description',
        hours: 5,
        date: new Date('2025-01-15'),
        billable: true,
      });

      const updated = await service.updateTimeEntry(entry.id, {
        description: 'Updated description',
        hours: 7,
        billable: false,
      });

      expect(updated.description).toBe('Updated description');
      expect(Number(updated.hours)).toBe(7);
      expect(updated.billable).toBe(false);
    });
  });

  describe('deleteTimeEntry', () => {
    it('should delete time entry', async () => {
      const entry = await service.createTimeEntry({
        projectId: testProject.id,
        userId: testUser.id,
        hours: 5,
        date: new Date('2025-01-15'),
      });

      await service.deleteTimeEntry(entry.id);

      const entries = await service.listTimeEntries({
        projectId: testProject.id,
      });

      expect(entries.length).toBe(0);
    });
  });
});
