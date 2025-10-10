import { PrismaClient, MeasurementType, TakeoffStatus } from '../../generated/prisma';

// ============================================================================
// INPUT TYPES
// ============================================================================

type TakeoffCreateInput = {
  name: string;
  projectId: string;
  estimateId?: string;
  description?: string;
  drawingReference?: string;
  scale?: number;
  unit?: string;
};

type LayerInput = {
  name: string;
  color?: string;
  isVisible?: boolean;
  sortOrder?: number;
};

type MeasurementInput = {
  layerId?: string;
  measurementType: MeasurementType;
  description: string;
  quantity: number;
  unit: string;
  length?: number;
  width?: number;
  height?: number;
  diameter?: number;
  notes?: string;
  linkedEstimateLineId?: string;
  coordinates?: any;
  sortOrder?: number;
};

type AreaMeasurementInput = {
  description: string;
  length: number;
  width: number;
  unit: string;
  layerId?: string;
  notes?: string;
};

type LinearMeasurementInput = {
  description: string;
  length: number;
  unit: string;
  layerId?: string;
  notes?: string;
};

type VolumeMeasurementInput = {
  description: string;
  length: number;
  width: number;
  height: number;
  unit: string;
  layerId?: string;
  notes?: string;
};

type CountMeasurementInput = {
  description: string;
  quantity: number;
  unit: string;
  layerId?: string;
  notes?: string;
};

// ============================================================================
// SERVICE
// ============================================================================

export class TakeoffsService {
  constructor(private prisma: PrismaClient) {}

  // ========================================
  // TAKEOFF CRUD
  // ========================================

  async createTakeoff(input: TakeoffCreateInput, createdById: string): Promise<any> {
    return this.prisma.takeoff.create({
      data: {
        ...input,
        createdById,
      },
      include: {
        project: true,
        estimate: true,
        layers: true,
        measurements: true,
      },
    });
  }

  async getTakeoff(takeoffId: string): Promise<any> {
    return this.prisma.takeoff.findUniqueOrThrow({
      where: { id: takeoffId },
      include: {
        project: true,
        estimate: true,
        layers: {
          orderBy: { sortOrder: 'asc' },
          include: {
            measurements: {
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
        measurements: {
          orderBy: { sortOrder: 'asc' },
          include: {
            layer: true,
            linkedEstimateLine: true,
          },
        },
      },
    });
  }

  async listTakeoffs(projectId: string, filters?: { status?: TakeoffStatus; estimateId?: string }): Promise<any[]> {
    return this.prisma.takeoff.findMany({
      where: {
        projectId,
        ...(filters?.status && { status: filters.status }),
        ...(filters?.estimateId && { estimateId: filters.estimateId }),
      },
      include: {
        project: true,
        estimate: true,
        layers: true,
        _count: {
          select: { measurements: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateTakeoff(
    takeoffId: string,
    updates: Partial<{
      name: string;
      description: string;
      status: TakeoffStatus;
      drawingReference: string;
      scale: number;
      unit: string;
    }>
  ): Promise<any> {
    return this.prisma.takeoff.update({
      where: { id: takeoffId },
      data: updates,
      include: {
        layers: true,
        measurements: true,
      },
    });
  }

  async deleteTakeoff(takeoffId: string): Promise<void> {
    await this.prisma.takeoff.delete({
      where: { id: takeoffId },
    });
  }

  // ========================================
  // LAYERS
  // ========================================

  async createLayer(takeoffId: string, input: LayerInput): Promise<any> {
    return this.prisma.takeoffLayer.create({
      data: {
        takeoffId,
        ...input,
      },
    });
  }

  async updateLayer(
    layerId: string,
    updates: Partial<LayerInput>
  ): Promise<any> {
    return this.prisma.takeoffLayer.update({
      where: { id: layerId },
      data: updates,
    });
  }

  async deleteLayer(layerId: string): Promise<void> {
    await this.prisma.takeoffLayer.delete({
      where: { id: layerId },
    });
  }

  async toggleLayerVisibility(layerId: string): Promise<any> {
    const layer = await this.prisma.takeoffLayer.findUniqueOrThrow({
      where: { id: layerId },
    });

    return this.prisma.takeoffLayer.update({
      where: { id: layerId },
      data: { isVisible: !layer.isVisible },
    });
  }

  // ========================================
  // MEASUREMENTS
  // ========================================

  async addMeasurement(takeoffId: string, input: MeasurementInput): Promise<any> {
    // Calculate derived values based on measurement type
    let area: number | undefined;
    let volume: number | undefined;

    if (input.measurementType === 'AREA' && input.length && input.width) {
      area = input.length * input.width;
    }

    if (input.measurementType === 'VOLUME' && input.length && input.width && input.height) {
      volume = input.length * input.width * input.height;
    }

    const measurement = await this.prisma.takeoffMeasurement.create({
      data: {
        takeoffId,
        ...input,
        area,
        volume,
      },
      include: {
        layer: true,
        linkedEstimateLine: true,
      },
    });

    // Recalculate takeoff totals
    await this.recalculateTakeoffTotals(takeoffId);

    return measurement;
  }

  async addAreaMeasurement(takeoffId: string, input: AreaMeasurementInput): Promise<any> {
    const area = input.length * input.width;
    const quantity = area;

    return this.addMeasurement(takeoffId, {
      measurementType: 'AREA',
      description: input.description,
      quantity,
      unit: input.unit,
      length: input.length,
      width: input.width,
      area,
      layerId: input.layerId,
      notes: input.notes,
    });
  }

  async addLinearMeasurement(takeoffId: string, input: LinearMeasurementInput): Promise<any> {
    return this.addMeasurement(takeoffId, {
      measurementType: 'LINEAR',
      description: input.description,
      quantity: input.length,
      unit: input.unit,
      length: input.length,
      layerId: input.layerId,
      notes: input.notes,
    });
  }

  async addVolumeMeasurement(takeoffId: string, input: VolumeMeasurementInput): Promise<any> {
    const volume = input.length * input.width * input.height;
    const quantity = volume;

    return this.addMeasurement(takeoffId, {
      measurementType: 'VOLUME',
      description: input.description,
      quantity,
      unit: input.unit,
      length: input.length,
      width: input.width,
      height: input.height,
      volume,
      layerId: input.layerId,
      notes: input.notes,
    });
  }

  async addCountMeasurement(takeoffId: string, input: CountMeasurementInput): Promise<any> {
    return this.addMeasurement(takeoffId, {
      measurementType: 'COUNT',
      description: input.description,
      quantity: input.quantity,
      unit: input.unit,
      layerId: input.layerId,
      notes: input.notes,
    });
  }

  async updateMeasurement(
    measurementId: string,
    updates: Partial<MeasurementInput>
  ): Promise<any> {
    const measurement = await this.prisma.takeoffMeasurement.findUniqueOrThrow({
      where: { id: measurementId },
    });

    // Recalculate derived values if dimensions changed
    let area = measurement.area ? Number(measurement.area) : undefined;
    let volume = measurement.volume ? Number(measurement.volume) : undefined;

    const length = updates.length ?? Number(measurement.length);
    const width = updates.width ?? Number(measurement.width);
    const height = updates.height ?? Number(measurement.height);

    if (measurement.measurementType === 'AREA' && length && width) {
      area = length * width;
      updates.quantity = area;
    }

    if (measurement.measurementType === 'VOLUME' && length && width && height) {
      volume = length * width * height;
      updates.quantity = volume;
    }

    if (measurement.measurementType === 'LINEAR' && updates.length) {
      updates.quantity = updates.length;
    }

    const updated = await this.prisma.takeoffMeasurement.update({
      where: { id: measurementId },
      data: {
        ...updates,
        ...(area !== undefined && { area }),
        ...(volume !== undefined && { volume }),
      },
      include: {
        layer: true,
        linkedEstimateLine: true,
      },
    });

    // Recalculate takeoff totals
    await this.recalculateTakeoffTotals(measurement.takeoffId);

    return updated;
  }

  async deleteMeasurement(measurementId: string): Promise<void> {
    const measurement = await this.prisma.takeoffMeasurement.findUniqueOrThrow({
      where: { id: measurementId },
    });

    await this.prisma.takeoffMeasurement.delete({
      where: { id: measurementId },
    });

    // Recalculate takeoff totals
    await this.recalculateTakeoffTotals(measurement.takeoffId);
  }

  async linkMeasurementToEstimateLine(
    measurementId: string,
    estimateLineId: string
  ): Promise<any> {
    return this.prisma.takeoffMeasurement.update({
      where: { id: measurementId },
      data: { linkedEstimateLineId: estimateLineId },
      include: {
        linkedEstimateLine: true,
      },
    });
  }

  async unlinkMeasurementFromEstimateLine(measurementId: string): Promise<any> {
    return this.prisma.takeoffMeasurement.update({
      where: { id: measurementId },
      data: { linkedEstimateLineId: null },
    });
  }

  // ========================================
  // CALCULATIONS & HELPERS
  // ========================================

  private async recalculateTakeoffTotals(takeoffId: string): Promise<void> {
    const takeoff = await this.prisma.takeoff.findUniqueOrThrow({
      where: { id: takeoffId },
      include: {
        measurements: true,
      },
    });

    // Sum all measurement quantities
    const totalQuantity = takeoff.measurements.reduce(
      (sum, m) => sum + Number(m.quantity),
      0
    );

    await this.prisma.takeoff.update({
      where: { id: takeoffId },
      data: { totalQuantity },
    });
  }

  async getTakeoffSummary(takeoffId: string): Promise<any> {
    const takeoff = await this.getTakeoff(takeoffId);

    // Group measurements by type and layer
    const byType: Record<string, any> = {};
    const byLayer: Record<string, any> = {};

    for (const measurement of takeoff.measurements) {
      // By type
      const type = measurement.measurementType;
      if (!byType[type]) {
        byType[type] = {
          measurementType: type,
          count: 0,
          totalQuantity: 0,
          unit: measurement.unit,
        };
      }
      byType[type].count++;
      byType[type].totalQuantity += Number(measurement.quantity);

      // By layer
      if (measurement.layerId) {
        const layerName = measurement.layer?.name || 'Unknown';
        if (!byLayer[layerName]) {
          byLayer[layerName] = {
            layerName,
            count: 0,
            measurements: [],
          };
        }
        byLayer[layerName].count++;
        byLayer[layerName].measurements.push({
          description: measurement.description,
          quantity: Number(measurement.quantity),
          unit: measurement.unit,
          type: measurement.measurementType,
        });
      }
    }

    return {
      takeoffId: takeoff.id,
      name: takeoff.name,
      totalQuantity: Number(takeoff.totalQuantity),
      unit: takeoff.unit,
      measurementCount: takeoff.measurements.length,
      layerCount: takeoff.layers.length,
      byType: Object.values(byType),
      byLayer: Object.values(byLayer),
    };
  }

  async exportTakeoffToCSV(takeoffId: string): Promise<string> {
    const takeoff = await this.getTakeoff(takeoffId);

    let csv = 'Layer,Description,Type,Quantity,Unit,Length,Width,Height,Area,Volume,Notes\n';

    for (const measurement of takeoff.measurements) {
      const layerName = measurement.layer?.name || 'No Layer';
      const row = [
        layerName,
        measurement.description,
        measurement.measurementType,
        measurement.quantity,
        measurement.unit,
        measurement.length || '',
        measurement.width || '',
        measurement.height || '',
        measurement.area || '',
        measurement.volume || '',
        measurement.notes || '',
      ];
      csv += row.map(v => `"${v}"`).join(',') + '\n';
    }

    return csv;
  }

  async duplicateTakeoff(takeoffId: string, newName: string, createdById: string): Promise<any> {
    const original = await this.getTakeoff(takeoffId);

    // Create new takeoff
    const newTakeoff = await this.createTakeoff(
      {
        name: newName,
        projectId: original.projectId,
        estimateId: original.estimateId,
        description: original.description,
        drawingReference: original.drawingReference,
        scale: original.scale ? Number(original.scale) : undefined,
        unit: original.unit,
      },
      createdById
    );

    // Duplicate layers
    const layerMapping: Record<string, string> = {};
    for (const layer of original.layers) {
      const newLayer = await this.createLayer(newTakeoff.id, {
        name: layer.name,
        color: layer.color,
        isVisible: layer.isVisible,
        sortOrder: layer.sortOrder,
      });
      layerMapping[layer.id] = newLayer.id;
    }

    // Duplicate measurements
    for (const measurement of original.measurements) {
      await this.addMeasurement(newTakeoff.id, {
        layerId: measurement.layerId ? layerMapping[measurement.layerId] : undefined,
        measurementType: measurement.measurementType,
        description: measurement.description,
        quantity: Number(measurement.quantity),
        unit: measurement.unit,
        length: measurement.length ? Number(measurement.length) : undefined,
        width: measurement.width ? Number(measurement.width) : undefined,
        height: measurement.height ? Number(measurement.height) : undefined,
        diameter: measurement.diameter ? Number(measurement.diameter) : undefined,
        notes: measurement.notes || undefined,
        coordinates: measurement.coordinates,
        sortOrder: measurement.sortOrder,
      });
    }

    return this.getTakeoff(newTakeoff.id);
  }

  async convertUnits(
    measurementId: string,
    targetUnit: string,
    conversionFactor: number
  ): Promise<any> {
    const measurement = await this.prisma.takeoffMeasurement.findUniqueOrThrow({
      where: { id: measurementId },
    });

    const newQuantity = Number(measurement.quantity) * conversionFactor;
    const newLength = measurement.length ? Number(measurement.length) * conversionFactor : undefined;
    const newWidth = measurement.width ? Number(measurement.width) * conversionFactor : undefined;
    const newHeight = measurement.height ? Number(measurement.height) * conversionFactor : undefined;
    const newArea = measurement.area ? Number(measurement.area) * (conversionFactor ** 2) : undefined;
    const newVolume = measurement.volume ? Number(measurement.volume) * (conversionFactor ** 3) : undefined;

    const updated = await this.prisma.takeoffMeasurement.update({
      where: { id: measurementId },
      data: {
        quantity: newQuantity,
        unit: targetUnit,
        ...(newLength !== undefined && { length: newLength }),
        ...(newWidth !== undefined && { width: newWidth }),
        ...(newHeight !== undefined && { height: newHeight }),
        ...(newArea !== undefined && { area: newArea }),
        ...(newVolume !== undefined && { volume: newVolume }),
      },
    });

    // Recalculate takeoff totals
    await this.recalculateTakeoffTotals(measurement.takeoffId);

    return updated;
  }
}
