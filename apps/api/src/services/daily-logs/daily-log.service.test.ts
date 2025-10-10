import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '../../generated/prisma';
import { DailyLogService } from './daily-log.service';
import { setupTestDatabase, cleanupTestDatabase } from '../../test-helpers/database';
import { createTestCompany, createTestUser, createTestProject } from '../../test-helpers/factories';

describe('DailyLogService', () => {
  let prisma: PrismaClient;
  let service: DailyLogService;
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

    service = new DailyLogService(prisma);
  });

  afterEach(async () => {
    await cleanupTestDatabase(prisma);
  });

  describe('createDailyLog', () => {
    it('should create a basic daily log', async () => {
      const date = new Date('2025-10-01');

      const log = await service.createDailyLog(
        {
          projectId: testProject.id,
          date,
          weather: {
            temp: 72,
            conditions: 'Sunny',
            rain: false,
            wind: 'Light breeze',
          },
          workCompleted: 'Framing completed on second floor',
          notes: 'All going well',
        },
        testUser.id
      );

      expect(log).toBeDefined();
      expect(log.projectId).toBe(testProject.id);
      expect(log.date).toEqual(date);
      expect(log.weather).toEqual({
        temp: 72,
        conditions: 'Sunny',
        rain: false,
        wind: 'Light breeze',
      });
      expect(log.workCompleted).toBe('Framing completed on second floor');
      expect(log.createdById).toBe(testUser.id);
    });

    it('should create daily log with crew attendance', async () => {
      const date = new Date('2025-10-01');

      const log = await service.createDailyLog(
        {
          projectId: testProject.id,
          date,
          crew: [
            {
              workerId: 'worker-1',
              workerName: 'John Smith',
              hoursWorked: 8,
              trade: 'Carpenter',
            },
            {
              workerId: 'worker-2',
              workerName: 'Jane Doe',
              hoursWorked: 8,
              trade: 'Electrician',
              notes: 'Left early for medical appointment',
            },
          ],
        },
        testUser.id
      );

      expect(log.crewPresent).toHaveLength(2);
      expect(log.crewPresent[0].workerName).toBe('John Smith');
      expect(Number(log.crewPresent[0].hoursWorked)).toBe(8);
      expect(log.crewPresent[0].trade).toBe('Carpenter');
      expect(log.crewPresent[1].notes).toBe('Left early for medical appointment');
    });

    it('should create daily log with deliveries', async () => {
      const date = new Date('2025-10-01');

      const log = await service.createDailyLog(
        {
          projectId: testProject.id,
          date,
          deliveries: [
            {
              supplier: 'ABC Lumber',
              material: '2x4 Studs',
              quantity: '200 units',
              poNumber: 'PO-2025-001',
              receivedBy: 'John Smith',
            },
            {
              supplier: 'XYZ Electrical',
              material: 'Romex Wire',
              quantity: '500 feet',
              receivedBy: 'Jane Doe',
              notes: 'Partial delivery - rest coming tomorrow',
            },
          ],
        },
        testUser.id
      );

      expect(log.deliveries).toHaveLength(2);
      expect(log.deliveries[0].supplier).toBe('ABC Lumber');
      expect(log.deliveries[0].material).toBe('2x4 Studs');
      expect(log.deliveries[0].poNumber).toBe('PO-2025-001');
      expect(log.deliveries[1].notes).toBe('Partial delivery - rest coming tomorrow');
    });

    it('should create daily log with equipment usage', async () => {
      const date = new Date('2025-10-01');

      const log = await service.createDailyLog(
        {
          projectId: testProject.id,
          date,
          equipment: [
            {
              equipment: 'Excavator',
              hours: 6,
              operator: 'Bob Johnson',
            },
            {
              equipment: 'Generator',
              hours: 10,
              notes: 'Running all day for power tools',
            },
          ],
        },
        testUser.id
      );

      expect(log.equipmentUsed).toHaveLength(2);
      expect(log.equipmentUsed[0].equipment).toBe('Excavator');
      expect(Number(log.equipmentUsed[0].hours)).toBe(6);
      expect(log.equipmentUsed[0].operator).toBe('Bob Johnson');
    });

    it('should create daily log with safety incidents', async () => {
      const date = new Date('2025-10-01');

      const log = await service.createDailyLog(
        {
          projectId: testProject.id,
          date,
          incidents: [
            {
              type: 'NEAR_MISS',
              severity: 'MODERATE',
              description: 'Worker nearly struck by falling tool',
              personInvolved: 'Tom Brown',
              actionTaken: 'Tool belts now mandatory, safety briefing conducted',
              reportedTo: 'Safety Manager',
              followUpRequired: true,
            },
          ],
        },
        testUser.id
      );

      expect(log.incidents).toHaveLength(1);
      expect(log.incidents[0].type).toBe('NEAR_MISS');
      expect(log.incidents[0].severity).toBe('MODERATE');
      expect(log.incidents[0].personInvolved).toBe('Tom Brown');
      expect(log.incidents[0].followUpRequired).toBe(true);
    });

    it('should create comprehensive daily log with all data', async () => {
      const date = new Date('2025-10-01');

      const log = await service.createDailyLog(
        {
          projectId: testProject.id,
          date,
          weather: {
            temp: 68,
            conditions: 'Partly cloudy',
            rain: false,
          },
          workCompleted: 'Foundation poured, framing started',
          notes: 'Good progress today',
          photos: ['photo1.jpg', 'photo2.jpg'],
          crew: [
            {
              workerId: 'w1',
              workerName: 'Worker 1',
              hoursWorked: 8,
              trade: 'Laborer',
            },
          ],
          deliveries: [
            {
              supplier: 'Concrete Co',
              material: 'Ready-mix concrete',
              quantity: '10 yards',
              receivedBy: 'Foreman',
            },
          ],
          equipment: [
            {
              equipment: 'Mixer',
              hours: 4,
            },
          ],
        },
        testUser.id
      );

      expect(log.crewPresent).toHaveLength(1);
      expect(log.deliveries).toHaveLength(1);
      expect(log.equipmentUsed).toHaveLength(1);
      expect(log.photos).toEqual(['photo1.jpg', 'photo2.jpg']);
    });

    it('should prevent duplicate logs for same project and date', async () => {
      const date = new Date('2025-10-01');

      await service.createDailyLog(
        {
          projectId: testProject.id,
          date,
          workCompleted: 'First log',
        },
        testUser.id
      );

      await expect(
        service.createDailyLog(
          {
            projectId: testProject.id,
            date,
            workCompleted: 'Duplicate log',
          },
          testUser.id
        )
      ).rejects.toThrow('Daily log already exists for this date');
    });

    it('should throw error for non-existent project', async () => {
      await expect(
        service.createDailyLog(
          {
            projectId: 'non-existent-project',
            date: new Date(),
          },
          testUser.id
        )
      ).rejects.toThrow('Project not found');
    });
  });

  describe('getDailyLog', () => {
    it('should retrieve daily log with all related data', async () => {
      const created = await service.createDailyLog(
        {
          projectId: testProject.id,
          date: new Date('2025-10-01'),
          workCompleted: 'Test work',
          crew: [
            {
              workerId: 'w1',
              workerName: 'Worker 1',
              hoursWorked: 8,
              trade: 'Carpenter',
            },
          ],
        },
        testUser.id
      );

      const retrieved = await service.getDailyLog(created.id);

      expect(retrieved.id).toBe(created.id);
      expect(retrieved.workCompleted).toBe('Test work');
      expect(retrieved.crewPresent).toHaveLength(1);
      expect(retrieved.createdBy.firstName).toBeDefined();
      expect(retrieved.project.name).toBeDefined();
    });

    it('should throw error for non-existent log', async () => {
      await expect(
        service.getDailyLog('non-existent-id')
      ).rejects.toThrow('Daily log not found');
    });
  });

  describe('updateDailyLog', () => {
    it('should update daily log fields', async () => {
      const created = await service.createDailyLog(
        {
          projectId: testProject.id,
          date: new Date('2025-10-01'),
          workCompleted: 'Original work',
          notes: 'Original notes',
        },
        testUser.id
      );

      const updated = await service.updateDailyLog(created.id, {
        workCompleted: 'Updated work',
        notes: 'Updated notes',
        photos: ['new-photo.jpg'],
      });

      expect(updated.workCompleted).toBe('Updated work');
      expect(updated.notes).toBe('Updated notes');
      expect(updated.photos).toEqual(['new-photo.jpg']);
    });

    it('should update weather information', async () => {
      const created = await service.createDailyLog(
        {
          projectId: testProject.id,
          date: new Date('2025-10-01'),
          weather: {
            temp: 70,
            conditions: 'Sunny',
          },
        },
        testUser.id
      );

      const updated = await service.updateDailyLog(created.id, {
        weather: {
          temp: 75,
          conditions: 'Partly cloudy',
          rain: false,
        },
      });

      expect(updated.weather).toEqual({
        temp: 75,
        conditions: 'Partly cloudy',
        rain: false,
      });
    });
  });

  describe('getProjectDailyLogs', () => {
    it('should retrieve all logs for a project', async () => {
      await service.createDailyLog(
        {
          projectId: testProject.id,
          date: new Date('2025-10-01'),
          workCompleted: 'Day 1',
        },
        testUser.id
      );

      await service.createDailyLog(
        {
          projectId: testProject.id,
          date: new Date('2025-10-02'),
          workCompleted: 'Day 2',
        },
        testUser.id
      );

      const logs = await service.getProjectDailyLogs(testProject.id);

      expect(logs).toHaveLength(2);
      expect(logs[0].date.getTime()).toBeGreaterThan(logs[1].date.getTime()); // Ordered desc
    });

    it('should filter logs by date range', async () => {
      await service.createDailyLog(
        {
          projectId: testProject.id,
          date: new Date('2025-10-01'),
          workCompleted: 'Day 1',
        },
        testUser.id
      );

      await service.createDailyLog(
        {
          projectId: testProject.id,
          date: new Date('2025-10-05'),
          workCompleted: 'Day 2',
        },
        testUser.id
      );

      await service.createDailyLog(
        {
          projectId: testProject.id,
          date: new Date('2025-10-10'),
          workCompleted: 'Day 3',
        },
        testUser.id
      );

      const logs = await service.getProjectDailyLogs(testProject.id, {
        startDate: new Date('2025-10-03'),
        endDate: new Date('2025-10-08'),
      });

      expect(logs).toHaveLength(1);
      expect(logs[0].workCompleted).toBe('Day 2');
    });

    it('should limit number of logs returned', async () => {
      for (let i = 1; i <= 5; i++) {
        await service.createDailyLog(
          {
            projectId: testProject.id,
            date: new Date(`2025-10-0${i}`),
            workCompleted: `Day ${i}`,
          },
          testUser.id
        );
      }

      const logs = await service.getProjectDailyLogs(testProject.id, {
        limit: 3,
      });

      expect(logs).toHaveLength(3);
    });
  });

  describe('deleteDailyLog', () => {
    it('should delete daily log and all related data', async () => {
      const created = await service.createDailyLog(
        {
          projectId: testProject.id,
          date: new Date('2025-10-01'),
          workCompleted: 'Test',
          crew: [
            {
              workerId: 'w1',
              workerName: 'Worker 1',
              hoursWorked: 8,
              trade: 'Laborer',
            },
          ],
        },
        testUser.id
      );

      const result = await service.deleteDailyLog(created.id);

      expect(result.success).toBe(true);

      await expect(
        service.getDailyLog(created.id)
      ).rejects.toThrow('Daily log not found');

      // Verify crew was cascade deleted
      const crew = await prisma.crewAttendance.findMany({
        where: { dailyLogId: created.id },
      });
      expect(crew).toHaveLength(0);
    });
  });

  describe('crew management', () => {
    it('should add crew member to existing log', async () => {
      const log = await service.createDailyLog(
        {
          projectId: testProject.id,
          date: new Date('2025-10-01'),
          workCompleted: 'Test',
        },
        testUser.id
      );

      const crew = await service.addCrewMember(log.id, {
        workerId: 'w1',
        workerName: 'New Worker',
        hoursWorked: 4,
        trade: 'Plumber',
      });

      expect(crew.workerName).toBe('New Worker');
      expect(Number(crew.hoursWorked)).toBe(4);

      const updated = await service.getDailyLog(log.id);
      expect(updated.crewPresent).toHaveLength(1);
    });

    it('should remove crew member', async () => {
      const log = await service.createDailyLog(
        {
          projectId: testProject.id,
          date: new Date('2025-10-01'),
          crew: [
            {
              workerId: 'w1',
              workerName: 'Worker 1',
              hoursWorked: 8,
              trade: 'Carpenter',
            },
          ],
        },
        testUser.id
      );

      await service.removeCrewMember(log.crewPresent[0].id);

      const updated = await service.getDailyLog(log.id);
      expect(updated.crewPresent).toHaveLength(0);
    });
  });

  describe('delivery management', () => {
    it('should add delivery to existing log', async () => {
      const log = await service.createDailyLog(
        {
          projectId: testProject.id,
          date: new Date('2025-10-01'),
          workCompleted: 'Test',
        },
        testUser.id
      );

      const delivery = await service.addDelivery(log.id, {
        supplier: 'Test Supplier',
        material: 'Test Material',
        quantity: '100 units',
        receivedBy: 'Foreman',
      });

      expect(delivery.supplier).toBe('Test Supplier');

      const updated = await service.getDailyLog(log.id);
      expect(updated.deliveries).toHaveLength(1);
    });

    it('should remove delivery', async () => {
      const log = await service.createDailyLog(
        {
          projectId: testProject.id,
          date: new Date('2025-10-01'),
          deliveries: [
            {
              supplier: 'Test',
              material: 'Test',
              quantity: '1',
              receivedBy: 'Test',
            },
          ],
        },
        testUser.id
      );

      await service.removeDelivery(log.deliveries[0].id);

      const updated = await service.getDailyLog(log.id);
      expect(updated.deliveries).toHaveLength(0);
    });
  });

  describe('equipment management', () => {
    it('should add equipment to existing log', async () => {
      const log = await service.createDailyLog(
        {
          projectId: testProject.id,
          date: new Date('2025-10-01'),
          workCompleted: 'Test',
        },
        testUser.id
      );

      const equipment = await service.addEquipment(log.id, {
        equipment: 'Crane',
        hours: 6,
        operator: 'Bob',
      });

      expect(equipment.equipment).toBe('Crane');

      const updated = await service.getDailyLog(log.id);
      expect(updated.equipmentUsed).toHaveLength(1);
    });

    it('should remove equipment', async () => {
      const log = await service.createDailyLog(
        {
          projectId: testProject.id,
          date: new Date('2025-10-01'),
          equipment: [
            {
              equipment: 'Test',
              hours: 1,
            },
          ],
        },
        testUser.id
      );

      await service.removeEquipment(log.equipmentUsed[0].id);

      const updated = await service.getDailyLog(log.id);
      expect(updated.equipmentUsed).toHaveLength(0);
    });
  });

  describe('incident management', () => {
    it('should add incident to existing log', async () => {
      const log = await service.createDailyLog(
        {
          projectId: testProject.id,
          date: new Date('2025-10-01'),
          workCompleted: 'Test',
        },
        testUser.id
      );

      const incident = await service.addIncident(log.id, {
        type: 'INJURY',
        severity: 'MINOR',
        description: 'Cut finger',
        actionTaken: 'First aid applied',
      });

      expect(incident.type).toBe('INJURY');
      expect(incident.severity).toBe('MINOR');

      const updated = await service.getDailyLog(log.id);
      expect(updated.incidents).toHaveLength(1);
    });

    it('should remove incident', async () => {
      const log = await service.createDailyLog(
        {
          projectId: testProject.id,
          date: new Date('2025-10-01'),
          incidents: [
            {
              type: 'NEAR_MISS',
              severity: 'MINOR',
              description: 'Test',
              actionTaken: 'Test',
            },
          ],
        },
        testUser.id
      );

      await service.removeIncident(log.incidents[0].id);

      const updated = await service.getDailyLog(log.id);
      expect(updated.incidents).toHaveLength(0);
    });
  });

  describe('getProjectSummary', () => {
    it('should calculate summary statistics', async () => {
      // Day 1
      await service.createDailyLog(
        {
          projectId: testProject.id,
          date: new Date('2025-10-01'),
          workCompleted: 'Day 1',
          crew: [
            {
              workerId: 'w1',
              workerName: 'Worker 1',
              hoursWorked: 8,
              trade: 'Carpenter',
            },
            {
              workerId: 'w2',
              workerName: 'Worker 2',
              hoursWorked: 6,
              trade: 'Electrician',
            },
          ],
          deliveries: [
            {
              supplier: 'ABC',
              material: 'Wood',
              quantity: '100',
              receivedBy: 'Foreman',
            },
          ],
          equipment: [
            {
              equipment: 'Saw',
              hours: 4,
            },
          ],
          incidents: [
            {
              type: 'NEAR_MISS',
              severity: 'MINOR',
              description: 'Test',
              actionTaken: 'Test',
            },
          ],
        },
        testUser.id
      );

      // Day 2
      await service.createDailyLog(
        {
          projectId: testProject.id,
          date: new Date('2025-10-02'),
          workCompleted: 'Day 2',
          crew: [
            {
              workerId: 'w1',
              workerName: 'Worker 1',
              hoursWorked: 8,
              trade: 'Carpenter',
            },
          ],
          equipment: [
            {
              equipment: 'Drill',
              hours: 2,
            },
          ],
        },
        testUser.id
      );

      const summary = await service.getProjectSummary(
        testProject.id,
        new Date('2025-10-01'),
        new Date('2025-10-02')
      );

      expect(summary.totalDays).toBe(2);
      expect(summary.totalCrewHours).toBe(22); // 8 + 6 + 8
      expect(summary.totalDeliveries).toBe(1);
      expect(summary.totalEquipmentHours).toBe(6); // 4 + 2
      expect(summary.totalIncidents).toBe(1);
      expect(summary.incidentsByType.NEAR_MISS).toBe(1);
      expect(summary.incidentsBySeverity.MINOR).toBe(1);
      expect(summary.crewByTrade.Carpenter).toBe(16); // 8 + 8
      expect(summary.crewByTrade.Electrician).toBe(6);
    });
  });
});
