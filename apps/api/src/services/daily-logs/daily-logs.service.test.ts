import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { PrismaClient } from '../../generated/prisma';
import { setupTestDatabase, cleanupTestDatabase } from '../../test-helpers/database';
import { DailyLogsService } from './daily-logs.service';

describe('DailyLogsService', () => {
  let prisma: PrismaClient;
  let service: DailyLogsService;
  let testUser: any;
  let testCompany: any;
  let testProject: any;

  beforeAll(async () => {
    prisma = await setupTestDatabase();
    service = new DailyLogsService(prisma);

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
        email: 'dailylog@test.com',
        password: 'hashedpassword',
        firstName: 'Daily',
        lastName: 'Logger',
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
        name: 'Daily Log Project',
        companyId: testCompany.id,
        createdById: testUser.id,
        status: 'ACTIVE',
      },
    });
  });

  afterEach(async () => {
    await prisma.safetyIncident.deleteMany({});
    await prisma.equipmentUsage.deleteMany({});
    await prisma.delivery.deleteMany({});
    await prisma.crewAttendance.deleteMany({});
    await prisma.dailyLog.deleteMany({});
  });

  describe('createDailyLog', () => {
    it('should create daily log with weather and notes', async () => {
      const log = await service.createDailyLog(
        {
          projectId: testProject.id,
          date: new Date('2025-01-15'),
          weather: {
            temp: 72,
            conditions: 'Sunny',
            rain: false,
            wind: 'Light breeze',
          },
          workCompleted: 'Foundation poured',
          notes: 'Good progress today',
          photos: ['photo1.jpg', 'photo2.jpg'],
        },
        testUser.id
      );

      expect(log.projectId).toBe(testProject.id);
      expect(log.weather).toEqual({
        temp: 72,
        conditions: 'Sunny',
        rain: false,
        wind: 'Light breeze',
      });
      expect(log.workCompleted).toBe('Foundation poured');
      expect(log.notes).toBe('Good progress today');
      expect(log.photos).toEqual(['photo1.jpg', 'photo2.jpg']);
    });

    it('should create daily log with minimal data', async () => {
      const log = await service.createDailyLog(
        {
          projectId: testProject.id,
          date: new Date('2025-01-16'),
        },
        testUser.id
      );

      expect(log.projectId).toBe(testProject.id);
      expect(log.weather).toEqual({});
      expect(log.photos).toEqual([]);
    });
  });

  describe('getDailyLogByDate', () => {
    it('should retrieve daily log by project and date', async () => {
      await service.createDailyLog(
        {
          projectId: testProject.id,
          date: new Date('2025-01-15'),
          workCompleted: 'Test work',
        },
        testUser.id
      );

      const log = await service.getDailyLogByDate(
        testProject.id,
        new Date('2025-01-15')
      );

      expect(log).toBeTruthy();
      expect(log?.workCompleted).toBe('Test work');
    });

    it('should return null for non-existent date', async () => {
      const log = await service.getDailyLogByDate(
        testProject.id,
        new Date('2025-12-31')
      );

      expect(log).toBeNull();
    });
  });

  describe('addCrewAttendance', () => {
    it('should add crew attendance to daily log', async () => {
      const log = await service.createDailyLog(
        {
          projectId: testProject.id,
          date: new Date('2025-01-15'),
        },
        testUser.id
      );

      const attendance = await service.addCrewAttendance({
        dailyLogId: log.id,
        workerId: testUser.id,
        workerName: 'John Smith',
        hoursWorked: 8,
        trade: 'Carpenter',
        notes: 'Lead framing crew',
      });

      expect(attendance.workerName).toBe('John Smith');
      expect(Number(attendance.hoursWorked)).toBe(8);
      expect(attendance.trade).toBe('Carpenter');
    });
  });

  describe('addDelivery', () => {
    it('should add delivery to daily log', async () => {
      const log = await service.createDailyLog(
        {
          projectId: testProject.id,
          date: new Date('2025-01-15'),
        },
        testUser.id
      );

      const delivery = await service.addDelivery({
        dailyLogId: log.id,
        supplier: 'Lumber Supply Co',
        material: '2x4 Lumber',
        quantity: '500 pieces',
        poNumber: 'PO-123',
        receivedBy: 'John Doe',
        notes: 'On time delivery',
      });

      expect(delivery.supplier).toBe('Lumber Supply Co');
      expect(delivery.material).toBe('2x4 Lumber');
      expect(delivery.quantity).toBe('500 pieces');
      expect(delivery.poNumber).toBe('PO-123');
    });
  });

  describe('addEquipmentUsage', () => {
    it('should add equipment usage to daily log', async () => {
      const log = await service.createDailyLog(
        {
          projectId: testProject.id,
          date: new Date('2025-01-15'),
        },
        testUser.id
      );

      const usage = await service.addEquipmentUsage({
        dailyLogId: log.id,
        equipment: 'Excavator',
        hours: 6,
        operator: 'Mike Johnson',
        notes: 'Digging foundation',
      });

      expect(usage.equipment).toBe('Excavator');
      expect(Number(usage.hours)).toBe(6);
      expect(usage.operator).toBe('Mike Johnson');
    });
  });

  describe('addSafetyIncident', () => {
    it('should add safety incident to daily log', async () => {
      const log = await service.createDailyLog(
        {
          projectId: testProject.id,
          date: new Date('2025-01-15'),
        },
        testUser.id
      );

      const incident = await service.addSafetyIncident({
        dailyLogId: log.id,
        type: 'NEAR_MISS',
        severity: 'MODERATE',
        description: 'Worker almost stepped on nail',
        personInvolved: 'Tom Brown',
        actionTaken: 'Added safety signage, briefed crew',
        photos: ['incident1.jpg'],
        reportedTo: 'Safety Officer',
        followUpRequired: true,
      });

      expect(incident.type).toBe('NEAR_MISS');
      expect(incident.severity).toBe('MODERATE');
      expect(incident.description).toBe('Worker almost stepped on nail');
      expect(incident.followUpRequired).toBe(true);
    });

    it('should handle different incident types', async () => {
      const log = await service.createDailyLog(
        {
          projectId: testProject.id,
          date: new Date('2025-01-15'),
        },
        testUser.id
      );

      const injury = await service.addSafetyIncident({
        dailyLogId: log.id,
        type: 'INJURY',
        severity: 'MINOR',
        description: 'Cut finger',
        actionTaken: 'First aid administered',
      });

      expect(injury.type).toBe('INJURY');
      expect(injury.severity).toBe('MINOR');
    });
  });

  describe('getProjectActivitySummary', () => {
    it('should calculate comprehensive activity summary', async () => {
      const log = await service.createDailyLog(
        {
          projectId: testProject.id,
          date: new Date('2025-01-15'),
        },
        testUser.id
      );

      await service.addCrewAttendance({
        dailyLogId: log.id,
        workerId: testUser.id,
        workerName: 'Worker 1',
        hoursWorked: 8,
        trade: 'Carpenter',
      });

      await service.addCrewAttendance({
        dailyLogId: log.id,
        workerId: testUser.id,
        workerName: 'Worker 2',
        hoursWorked: 6,
        trade: 'Laborer',
      });

      await service.addEquipmentUsage({
        dailyLogId: log.id,
        equipment: 'Excavator',
        hours: 4,
      });

      await service.addDelivery({
        dailyLogId: log.id,
        supplier: 'Test Supplier',
        material: 'Lumber',
        quantity: '100',
        receivedBy: 'Foreman',
      });

      await service.addSafetyIncident({
        dailyLogId: log.id,
        type: 'NEAR_MISS',
        severity: 'MINOR',
        description: 'Test incident',
        actionTaken: 'Addressed',
      });

      const summary = await service.getProjectActivitySummary(testProject.id);

      expect(summary.totalDays).toBe(1);
      expect(summary.totalCrewHours).toBe(14); // 8 + 6
      expect(summary.totalEquipmentHours).toBe(4);
      expect(summary.totalDeliveries).toBe(1);
      expect(summary.totalIncidents).toBe(1);
      expect(summary.incidentsByType.NEAR_MISS).toBe(1);
      expect(summary.incidentsBySeverity.MINOR).toBe(1);
      expect(summary.averageCrewPerDay).toBe(14);
    });

    it('should filter by date range', async () => {
      await service.createDailyLog(
        {
          projectId: testProject.id,
          date: new Date('2025-01-10'),
          workCompleted: 'Early work',
        },
        testUser.id
      );

      await service.createDailyLog(
        {
          projectId: testProject.id,
          date: new Date('2025-01-20'),
          workCompleted: 'Later work',
        },
        testUser.id
      );

      const summary = await service.getProjectActivitySummary(testProject.id, {
        startDate: new Date('2025-01-15'),
        endDate: new Date('2025-01-25'),
      });

      expect(summary.totalDays).toBe(1);
    });
  });

  describe('getCrewProductivity', () => {
    it('should calculate crew productivity metrics', async () => {
      const log1 = await service.createDailyLog(
        {
          projectId: testProject.id,
          date: new Date('2025-01-15'),
        },
        testUser.id
      );

      const log2 = await service.createDailyLog(
        {
          projectId: testProject.id,
          date: new Date('2025-01-16'),
        },
        testUser.id
      );

      await service.addCrewAttendance({
        dailyLogId: log1.id,
        workerId: testUser.id,
        workerName: 'John Smith',
        hoursWorked: 8,
        trade: 'Carpenter',
      });

      await service.addCrewAttendance({
        dailyLogId: log2.id,
        workerId: testUser.id,
        workerName: 'John Smith',
        hoursWorked: 7,
        trade: 'Carpenter',
      });

      await service.addCrewAttendance({
        dailyLogId: log1.id,
        workerId: testUser.id,
        workerName: 'Jane Doe',
        hoursWorked: 8,
        trade: 'Electrician',
      });

      const productivity = await service.getCrewProductivity(testProject.id);

      expect(productivity.length).toBe(2);

      const johnStats = productivity.find(p => p.worker === 'John Smith');
      expect(johnStats?.totalHours).toBe(15); // 8 + 7
      expect(johnStats?.daysWorked).toBe(2);
      expect(johnStats?.averageHoursPerDay).toBe(7.5);
    });
  });

  describe('getSafetyMetrics', () => {
    it('should calculate safety metrics', async () => {
      const log = await service.createDailyLog(
        {
          projectId: testProject.id,
          date: new Date('2025-01-15'),
        },
        testUser.id
      );

      await service.addSafetyIncident({
        dailyLogId: log.id,
        type: 'NEAR_MISS',
        severity: 'MINOR',
        description: 'Incident 1',
        actionTaken: 'Fixed',
        followUpRequired: true,
      });

      await service.addSafetyIncident({
        dailyLogId: log.id,
        type: 'NEAR_MISS',
        severity: 'MODERATE',
        description: 'Incident 2',
        actionTaken: 'Fixed',
        followUpRequired: false,
      });

      await service.addSafetyIncident({
        dailyLogId: log.id,
        type: 'INJURY',
        severity: 'MINOR',
        description: 'Incident 3',
        actionTaken: 'Treated',
        followUpRequired: true,
      });

      const metrics = await service.getSafetyMetrics(testProject.id);

      expect(metrics.totalIncidents).toBe(3);
      expect(metrics.requiresFollowUp).toBe(2);
      expect(metrics.byType.length).toBe(2); // NEAR_MISS and INJURY

      const nearMissStats = metrics.byType.find((t: any) => t.type === 'NEAR_MISS');
      expect(nearMissStats?.count).toBe(2);
      expect(nearMissStats?.minor).toBe(1);
      expect(nearMissStats?.moderate).toBe(1);
    });
  });

  describe('exportDailyLogReport', () => {
    it('should generate CSV export', async () => {
      const log = await service.createDailyLog(
        {
          projectId: testProject.id,
          date: new Date('2025-01-15'),
          weather: { temp: 72, conditions: 'Sunny' },
          workCompleted: 'Foundation work',
          notes: 'Good progress',
        },
        testUser.id
      );

      await service.addCrewAttendance({
        dailyLogId: log.id,
        workerId: testUser.id,
        workerName: 'Worker 1',
        hoursWorked: 8,
        trade: 'Carpenter',
      });

      await service.addEquipmentUsage({
        dailyLogId: log.id,
        equipment: 'Excavator',
        hours: 4,
      });

      await service.addDelivery({
        dailyLogId: log.id,
        supplier: 'Supplier',
        material: 'Lumber',
        quantity: '100',
        receivedBy: 'Foreman',
      });

      const csv = await service.exportDailyLogReport(testProject.id);

      expect(csv).toContain('Date,Weather,Crew Hours,Deliveries,Equipment Hours,Incidents,Work Completed,Notes');
      expect(csv).toContain('2025-01-15');
      expect(csv).toContain('8'); // crew hours
      expect(csv).toContain('4'); // equipment hours
      expect(csv).toContain('1'); // deliveries
      expect(csv).toContain('Foundation work');
    });
  });

  describe('listDailyLogs', () => {
    it('should list daily logs for project', async () => {
      await service.createDailyLog(
        {
          projectId: testProject.id,
          date: new Date('2025-01-15'),
        },
        testUser.id
      );

      await service.createDailyLog(
        {
          projectId: testProject.id,
          date: new Date('2025-01-16'),
        },
        testUser.id
      );

      const logs = await service.listDailyLogs(testProject.id);

      expect(logs.length).toBe(2);
    });

    it('should filter by date range', async () => {
      await service.createDailyLog(
        {
          projectId: testProject.id,
          date: new Date('2025-01-10'),
        },
        testUser.id
      );

      await service.createDailyLog(
        {
          projectId: testProject.id,
          date: new Date('2025-01-15'),
        },
        testUser.id
      );

      await service.createDailyLog(
        {
          projectId: testProject.id,
          date: new Date('2025-01-20'),
        },
        testUser.id
      );

      const logs = await service.listDailyLogs(testProject.id, {
        startDate: new Date('2025-01-12'),
        endDate: new Date('2025-01-18'),
      });

      expect(logs.length).toBe(1);
    });
  });

  describe('updateDailyLog', () => {
    it('should update daily log fields', async () => {
      const log = await service.createDailyLog(
        {
          projectId: testProject.id,
          date: new Date('2025-01-15'),
          workCompleted: 'Original work',
        },
        testUser.id
      );

      const updated = await service.updateDailyLog(log.id, {
        workCompleted: 'Updated work',
        notes: 'Added notes',
      });

      expect(updated.workCompleted).toBe('Updated work');
      expect(updated.notes).toBe('Added notes');
    });
  });

  describe('deleteDailyLog', () => {
    it('should delete daily log and all related data', async () => {
      const log = await service.createDailyLog(
        {
          projectId: testProject.id,
          date: new Date('2025-01-15'),
        },
        testUser.id
      );

      await service.addCrewAttendance({
        dailyLogId: log.id,
        workerId: testUser.id,
        workerName: 'Worker',
        hoursWorked: 8,
        trade: 'Carpenter',
      });

      await service.deleteDailyLog(log.id);

      const logs = await service.listDailyLogs(testProject.id);
      expect(logs.length).toBe(0);
    });
  });
});
