import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { PrismaClient } from '../../generated/prisma';
import { setupTestDatabase, cleanupTestDatabase } from '../../test-helpers/database';
import { TakeoffsService } from './takeoffs.service';

describe('TakeoffsService', () => {
  let prisma: PrismaClient;
  let service: TakeoffsService;
  let testUser: any;
  let testCompany: any;
  let testProject: any;
  let testEstimate: any;

  beforeAll(async () => {
    prisma = await setupTestDatabase();
    service = new TakeoffsService(prisma);

    // Clean up any existing data
    await cleanupTestDatabase(prisma);

    // Create test company
    testCompany = await prisma.company.create({
      data: {
        name: 'Test Construction Co',
        email: 'test@construction.com',
        phone: '555-0100',
      },
    });

    // Create test user
    testUser = await prisma.user.create({
      data: {
        email: 'takeoffs@test.com',
        password: 'hashedpassword',
        firstName: 'Takeoff',
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

    // Create test project
    testProject = await prisma.project.create({
      data: {
        name: 'Residential Build',
        companyId: testCompany.id,
        createdById: testUser.id,
        status: 'ACTIVE',
      },
    });

    // Create test estimate
    testEstimate = await prisma.estimate.create({
      data: {
        estimateNumber: 'EST-00001',
        name: 'Residential Estimate',
        projectId: testProject.id,
        createdById: testUser.id,
      },
    });
  });

  afterEach(async () => {
    // Clean up takeoffs only, preserve test data for next test
    await prisma.takeoffMeasurement.deleteMany({});
    await prisma.takeoffLayer.deleteMany({});
    await prisma.takeoff.deleteMany({});
  });

  describe('createTakeoff', () => {
    it('should create a basic takeoff', async () => {
      const takeoff = await service.createTakeoff(
        {
          name: 'Foundation Takeoff',
          projectId: testProject.id,
          description: 'Concrete and rebar quantities',
          unit: 'sqft',
        },
        testUser.id
      );

      expect(takeoff.name).toBe('Foundation Takeoff');
      expect(takeoff.projectId).toBe(testProject.id);
      expect(Number(takeoff.totalQuantity)).toBe(0);
      expect(takeoff.status).toBe('DRAFT');
      expect(takeoff.unit).toBe('sqft');
    });

    it('should create takeoff linked to estimate', async () => {
      const takeoff = await service.createTakeoff(
        {
          name: 'Framing Takeoff',
          projectId: testProject.id,
          estimateId: testEstimate.id,
          scale: 0.25,
          drawingReference: 'Sheet A-1',
        },
        testUser.id
      );

      expect(takeoff.estimateId).toBe(testEstimate.id);
      expect(Number(takeoff.scale)).toBe(0.25);
      expect(takeoff.drawingReference).toBe('Sheet A-1');
    });
  });

  describe('layers', () => {
    it('should create layer', async () => {
      const takeoff = await service.createTakeoff(
        {
          name: 'Test Takeoff',
          projectId: testProject.id,
        },
        testUser.id
      );

      const layer = await service.createLayer(takeoff.id, {
        name: 'Foundation',
        color: '#FF0000',
        sortOrder: 1,
      });

      expect(layer.name).toBe('Foundation');
      expect(layer.color).toBe('#FF0000');
      expect(layer.isVisible).toBe(true);
      expect(layer.sortOrder).toBe(1);
    });

    it('should toggle layer visibility', async () => {
      const takeoff = await service.createTakeoff(
        {
          name: 'Test Takeoff',
          projectId: testProject.id,
        },
        testUser.id
      );

      const layer = await service.createLayer(takeoff.id, {
        name: 'Walls',
        color: '#00FF00',
      });

      expect(layer.isVisible).toBe(true);

      const toggled = await service.toggleLayerVisibility(layer.id);
      expect(toggled.isVisible).toBe(false);

      const toggledAgain = await service.toggleLayerVisibility(layer.id);
      expect(toggledAgain.isVisible).toBe(true);
    });

    it('should delete layer', async () => {
      const takeoff = await service.createTakeoff(
        {
          name: 'Test Takeoff',
          projectId: testProject.id,
        },
        testUser.id
      );

      const layer = await service.createLayer(takeoff.id, {
        name: 'Temporary',
        color: '#0000FF',
      });

      await service.deleteLayer(layer.id);

      const updated = await service.getTakeoff(takeoff.id);
      expect(updated.layers.length).toBe(0);
    });
  });

  describe('addAreaMeasurement', () => {
    it('should calculate area from length and width', async () => {
      const takeoff = await service.createTakeoff(
        {
          name: 'Floor Takeoff',
          projectId: testProject.id,
          unit: 'sqft',
        },
        testUser.id
      );

      const measurement = await service.addAreaMeasurement(takeoff.id, {
        description: 'Living room floor',
        length: 20,
        width: 15,
        unit: 'sqft',
      });

      expect(Number(measurement.length)).toBe(20);
      expect(Number(measurement.width)).toBe(15);
      expect(Number(measurement.area)).toBe(300); // 20 * 15
      expect(Number(measurement.quantity)).toBe(300);
      expect(measurement.measurementType).toBe('AREA');
    });

    it('should update takeoff total when area measurement added', async () => {
      const takeoff = await service.createTakeoff(
        {
          name: 'Floor Takeoff',
          projectId: testProject.id,
          unit: 'sqft',
        },
        testUser.id
      );

      await service.addAreaMeasurement(takeoff.id, {
        description: 'Room 1',
        length: 10,
        width: 12,
        unit: 'sqft',
      });

      await service.addAreaMeasurement(takeoff.id, {
        description: 'Room 2',
        length: 8,
        width: 10,
        unit: 'sqft',
      });

      const updated = await service.getTakeoff(takeoff.id);
      expect(Number(updated.totalQuantity)).toBe(200); // 120 + 80
    });
  });

  describe('addLinearMeasurement', () => {
    it('should create linear measurement', async () => {
      const takeoff = await service.createTakeoff(
        {
          name: 'Trim Takeoff',
          projectId: testProject.id,
          unit: 'lf',
        },
        testUser.id
      );

      const measurement = await service.addLinearMeasurement(takeoff.id, {
        description: 'Baseboard',
        length: 48.5,
        unit: 'lf',
      });

      expect(Number(measurement.length)).toBe(48.5);
      expect(Number(measurement.quantity)).toBe(48.5);
      expect(measurement.measurementType).toBe('LINEAR');
    });
  });

  describe('addVolumeMeasurement', () => {
    it('should calculate volume from dimensions', async () => {
      const takeoff = await service.createTakeoff(
        {
          name: 'Concrete Takeoff',
          projectId: testProject.id,
          unit: 'cy',
        },
        testUser.id
      );

      const measurement = await service.addVolumeMeasurement(takeoff.id, {
        description: 'Foundation slab',
        length: 30,
        width: 40,
        height: 0.5,
        unit: 'cy',
      });

      expect(Number(measurement.length)).toBe(30);
      expect(Number(measurement.width)).toBe(40);
      expect(Number(measurement.height)).toBe(0.5);
      expect(Number(measurement.volume)).toBe(600); // 30 * 40 * 0.5
      expect(Number(measurement.quantity)).toBe(600);
      expect(measurement.measurementType).toBe('VOLUME');
    });
  });

  describe('addCountMeasurement', () => {
    it('should create count measurement', async () => {
      const takeoff = await service.createTakeoff(
        {
          name: 'Fixtures Takeoff',
          projectId: testProject.id,
          unit: 'each',
        },
        testUser.id
      );

      const measurement = await service.addCountMeasurement(takeoff.id, {
        description: 'Light fixtures',
        quantity: 12,
        unit: 'each',
      });

      expect(Number(measurement.quantity)).toBe(12);
      expect(measurement.measurementType).toBe('COUNT');
      expect(measurement.unit).toBe('each');
    });
  });

  describe('updateMeasurement', () => {
    it('should update area measurement and recalculate', async () => {
      const takeoff = await service.createTakeoff(
        {
          name: 'Floor Takeoff',
          projectId: testProject.id,
          unit: 'sqft',
        },
        testUser.id
      );

      const measurement = await service.addAreaMeasurement(takeoff.id, {
        description: 'Room',
        length: 10,
        width: 12,
        unit: 'sqft',
      });

      const updated = await service.updateMeasurement(measurement.id, {
        length: 15,
        width: 14,
      });

      expect(Number(updated.length)).toBe(15);
      expect(Number(updated.width)).toBe(14);
      expect(Number(updated.area)).toBe(210); // 15 * 14
      expect(Number(updated.quantity)).toBe(210);
    });

    it('should update description and notes', async () => {
      const takeoff = await service.createTakeoff(
        {
          name: 'Test Takeoff',
          projectId: testProject.id,
        },
        testUser.id
      );

      const measurement = await service.addCountMeasurement(takeoff.id, {
        description: 'Original',
        quantity: 5,
        unit: 'each',
      });

      const updated = await service.updateMeasurement(measurement.id, {
        description: 'Updated description',
        notes: 'Added some notes',
      });

      expect(updated.description).toBe('Updated description');
      expect(updated.notes).toBe('Added some notes');
    });
  });

  describe('deleteMeasurement', () => {
    it('should delete measurement and recalculate totals', async () => {
      const takeoff = await service.createTakeoff(
        {
          name: 'Floor Takeoff',
          projectId: testProject.id,
          unit: 'sqft',
        },
        testUser.id
      );

      const m1 = await service.addAreaMeasurement(takeoff.id, {
        description: 'Room 1',
        length: 10,
        width: 12,
        unit: 'sqft',
      });

      await service.addAreaMeasurement(takeoff.id, {
        description: 'Room 2',
        length: 8,
        width: 10,
        unit: 'sqft',
      });

      let updated = await service.getTakeoff(takeoff.id);
      expect(Number(updated.totalQuantity)).toBe(200); // 120 + 80

      await service.deleteMeasurement(m1.id);

      updated = await service.getTakeoff(takeoff.id);
      expect(Number(updated.totalQuantity)).toBe(80); // Only room 2 remains
      expect(updated.measurements.length).toBe(1);
    });
  });

  describe('linkMeasurementToEstimateLine', () => {
    it('should link measurement to estimate line item', async () => {
      const takeoff = await service.createTakeoff(
        {
          name: 'Test Takeoff',
          projectId: testProject.id,
          estimateId: testEstimate.id,
        },
        testUser.id
      );

      const estimateLine = await prisma.estimateLineItem.create({
        data: {
          estimateId: testEstimate.id,
          category: 'MATERIALS',
          description: 'Flooring material',
          quantity: 300,
          unit: 'sqft',
          unitCost: 5.50,
          subtotal: 1650,
          total: 1650,
        },
      });

      const measurement = await service.addAreaMeasurement(takeoff.id, {
        description: 'Floor area',
        length: 20,
        width: 15,
        unit: 'sqft',
      });

      const linked = await service.linkMeasurementToEstimateLine(
        measurement.id,
        estimateLine.id
      );

      expect(linked.linkedEstimateLineId).toBe(estimateLine.id);
      expect(linked.linkedEstimateLine).toBeTruthy();
    });

    it('should unlink measurement from estimate line', async () => {
      const takeoff = await service.createTakeoff(
        {
          name: 'Test Takeoff',
          projectId: testProject.id,
          estimateId: testEstimate.id,
        },
        testUser.id
      );

      const estimateLine = await prisma.estimateLineItem.create({
        data: {
          estimateId: testEstimate.id,
          category: 'MATERIALS',
          description: 'Test material',
          quantity: 100,
          unit: 'units',
          unitCost: 10,
          subtotal: 1000,
          total: 1000,
        },
      });

      const measurement = await service.addCountMeasurement(takeoff.id, {
        description: 'Items',
        quantity: 100,
        unit: 'units',
      });

      await service.linkMeasurementToEstimateLine(measurement.id, estimateLine.id);

      const unlinked = await service.unlinkMeasurementFromEstimateLine(measurement.id);
      expect(unlinked.linkedEstimateLineId).toBeNull();
    });
  });

  describe('getTakeoffSummary', () => {
    it('should generate summary with measurements by type and layer', async () => {
      const takeoff = await service.createTakeoff(
        {
          name: 'Complete Takeoff',
          projectId: testProject.id,
          unit: 'mixed',
        },
        testUser.id
      );

      const layer1 = await service.createLayer(takeoff.id, {
        name: 'Foundation',
        color: '#FF0000',
      });

      const layer2 = await service.createLayer(takeoff.id, {
        name: 'Framing',
        color: '#00FF00',
      });

      await service.addAreaMeasurement(takeoff.id, {
        description: 'Slab area',
        length: 30,
        width: 40,
        unit: 'sqft',
        layerId: layer1.id,
      });

      await service.addLinearMeasurement(takeoff.id, {
        description: 'Wall plates',
        length: 200,
        unit: 'lf',
        layerId: layer2.id,
      });

      await service.addCountMeasurement(takeoff.id, {
        description: 'Studs',
        quantity: 50,
        unit: 'each',
        layerId: layer2.id,
      });

      const summary = await service.getTakeoffSummary(takeoff.id);

      expect(summary.measurementCount).toBe(3);
      expect(summary.layerCount).toBe(2);
      expect(summary.byType.length).toBe(3); // AREA, LINEAR, COUNT
      expect(summary.byLayer.length).toBe(2); // Foundation, Framing

      const areaType = summary.byType.find((t: any) => t.measurementType === 'AREA');
      expect(areaType.count).toBe(1);
      expect(areaType.totalQuantity).toBe(1200);

      const framingLayer = summary.byLayer.find((l: any) => l.layerName === 'Framing');
      expect(framingLayer.count).toBe(2);
    });
  });

  describe('exportTakeoffToCSV', () => {
    it('should export takeoff measurements to CSV format', async () => {
      const takeoff = await service.createTakeoff(
        {
          name: 'Export Test',
          projectId: testProject.id,
        },
        testUser.id
      );

      const layer = await service.createLayer(takeoff.id, {
        name: 'Test Layer',
        color: '#0000FF',
      });

      await service.addAreaMeasurement(takeoff.id, {
        description: 'Floor',
        length: 10,
        width: 12,
        unit: 'sqft',
        layerId: layer.id,
        notes: 'Main floor',
      });

      const csv = await service.exportTakeoffToCSV(takeoff.id);

      expect(csv).toContain('Layer,Description,Type,Quantity,Unit');
      expect(csv).toContain('Test Layer');
      expect(csv).toContain('Floor');
      expect(csv).toContain('AREA');
      expect(csv).toContain('Main floor');
    });
  });

  describe('duplicateTakeoff', () => {
    it('should duplicate takeoff with all layers and measurements', async () => {
      const original = await service.createTakeoff(
        {
          name: 'Original Takeoff',
          projectId: testProject.id,
          description: 'Original description',
          unit: 'sqft',
        },
        testUser.id
      );

      const layer = await service.createLayer(original.id, {
        name: 'Test Layer',
        color: '#FF00FF',
      });

      await service.addAreaMeasurement(original.id, {
        description: 'Room 1',
        length: 10,
        width: 12,
        unit: 'sqft',
        layerId: layer.id,
      });

      await service.addLinearMeasurement(original.id, {
        description: 'Trim',
        length: 44,
        unit: 'lf',
        layerId: layer.id,
      });

      const duplicate = await service.duplicateTakeoff(
        original.id,
        'Duplicate Takeoff',
        testUser.id
      );

      expect(duplicate.name).toBe('Duplicate Takeoff');
      expect(duplicate.description).toBe('Original description');
      expect(duplicate.layers.length).toBe(1);
      expect(duplicate.measurements.length).toBe(2);
      expect(Number(duplicate.totalQuantity)).toBe(Number(164)); // 120 + 44

      // Verify it's a new record, not the same
      expect(duplicate.id).not.toBe(original.id);
    });
  });

  describe('convertUnits', () => {
    it('should convert measurement from feet to meters', async () => {
      const takeoff = await service.createTakeoff(
        {
          name: 'Unit Conversion Test',
          projectId: testProject.id,
        },
        testUser.id
      );

      const measurement = await service.addLinearMeasurement(takeoff.id, {
        description: 'Wall length',
        length: 30,
        unit: 'ft',
      });

      // Convert feet to meters (1 ft = 0.3048 m)
      const converted = await service.convertUnits(
        measurement.id,
        'm',
        0.3048
      );

      expect(converted.unit).toBe('m');
      expect(Number(converted.length)).toBeCloseTo(9.144, 3); // 30 * 0.3048
      expect(Number(converted.quantity)).toBeCloseTo(9.144, 3);
    });

    it('should convert area measurement with squared factor', async () => {
      const takeoff = await service.createTakeoff(
        {
          name: 'Area Conversion Test',
          projectId: testProject.id,
        },
        testUser.id
      );

      const measurement = await service.addAreaMeasurement(takeoff.id, {
        description: 'Floor area',
        length: 10,
        width: 10,
        unit: 'sqft',
      });

      // Convert sqft to sqm (1 sqft = 0.092903 sqm)
      const converted = await service.convertUnits(
        measurement.id,
        'sqm',
        0.092903
      );

      expect(converted.unit).toBe('sqm');
      // Area should be converted with squared factor
      expect(Number(converted.area)).toBeCloseTo(0.863, 2);
    });
  });

  describe('listTakeoffs', () => {
    it('should list all takeoffs for a project', async () => {
      await service.createTakeoff(
        {
          name: 'Takeoff 1',
          projectId: testProject.id,
        },
        testUser.id
      );

      await service.createTakeoff(
        {
          name: 'Takeoff 2',
          projectId: testProject.id,
        },
        testUser.id
      );

      const list = await service.listTakeoffs(testProject.id);

      expect(list.length).toBe(2);
      expect(list[0].name).toBe('Takeoff 2'); // Most recent first
      expect(list[1].name).toBe('Takeoff 1');
    });

    it('should filter takeoffs by status', async () => {
      const t1 = await service.createTakeoff(
        {
          name: 'Draft Takeoff',
          projectId: testProject.id,
        },
        testUser.id
      );

      const t2 = await service.createTakeoff(
        {
          name: 'Completed Takeoff',
          projectId: testProject.id,
        },
        testUser.id
      );

      await service.updateTakeoff(t2.id, { status: 'COMPLETED' });

      const draftList = await service.listTakeoffs(testProject.id, {
        status: 'DRAFT',
      });

      expect(draftList.length).toBe(1);
      expect(draftList[0].status).toBe('DRAFT');

      const completedList = await service.listTakeoffs(testProject.id, {
        status: 'COMPLETED',
      });

      expect(completedList.length).toBe(1);
      expect(completedList[0].status).toBe('COMPLETED');
    });
  });

  describe('updateTakeoff', () => {
    it('should update takeoff status and properties', async () => {
      const takeoff = await service.createTakeoff(
        {
          name: 'Original Name',
          projectId: testProject.id,
        },
        testUser.id
      );

      const updated = await service.updateTakeoff(takeoff.id, {
        name: 'Updated Name',
        status: 'COMPLETED',
        description: 'Completed takeoff',
      });

      expect(updated.name).toBe('Updated Name');
      expect(updated.status).toBe('COMPLETED');
      expect(updated.description).toBe('Completed takeoff');
    });
  });

  describe('deleteTakeoff', () => {
    it('should delete takeoff and all related data', async () => {
      const takeoff = await service.createTakeoff(
        {
          name: 'To Delete',
          projectId: testProject.id,
        },
        testUser.id
      );

      const layer = await service.createLayer(takeoff.id, {
        name: 'Layer',
        color: '#000000',
      });

      await service.addAreaMeasurement(takeoff.id, {
        description: 'Measurement',
        length: 10,
        width: 10,
        unit: 'sqft',
        layerId: layer.id,
      });

      await service.deleteTakeoff(takeoff.id);

      // Verify deletion
      await expect(service.getTakeoff(takeoff.id)).rejects.toThrow();

      // Verify cascade deletes
      const layers = await prisma.takeoffLayer.findMany({
        where: { takeoffId: takeoff.id },
      });
      expect(layers.length).toBe(0);

      const measurements = await prisma.takeoffMeasurement.findMany({
        where: { takeoffId: takeoff.id },
      });
      expect(measurements.length).toBe(0);
    });
  });
});
