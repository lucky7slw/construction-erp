type TakeoffsRoutesOptions = { prisma: PrismaClient; };
import { FastifyPluginAsync } from 'fastify';
import { PrismaClient } from '../generated/prisma';
import { TakeoffsService } from '../services/takeoffs/takeoffs.service';

export const takeoffsRoutes: FastifyPluginAsync<TakeoffsRoutesOptions> = async (fastify, options) => {
  const { prisma } = options;
  const takeoffsService = new TakeoffsService(prisma);

  // List takeoffs for a project
  fastify.get('/', async (request, reply) => {
    const { projectId, status, estimateId } = request.query as {
      projectId: string;
      status?: string;
      estimateId?: string;
    };

    if (!projectId) {
      return reply.code(400).send({ error: 'projectId is required' });
    }

    // Verify user has access to project
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { createdById: (request as any).user.userId },
          { users: { some: { userId: (request as any).user.userId } } },
        ],
      },
    });

    if (!project) {
      return reply.code(404).send({ error: 'Project not found' });
    }

    const takeoffs = await takeoffsService.listTakeoffs(projectId, {
      status: status as any,
      estimateId,
    });

    return reply.send({ takeoffs });
  });

  // Get single takeoff
  fastify.get('/takeoffs/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const takeoff = await takeoffsService.getTakeoff(id);

    // Verify user has access
    const project = await prisma.project.findFirst({
      where: {
        id: takeoff.projectId,
        OR: [
          { createdById: (request as any).user.userId },
          { users: { some: { userId: (request as any).user.userId } } },
        ],
      },
    });

    if (!project) {
      return reply.code(404).send({ error: 'Takeoff not found' });
    }

    return reply.send({ takeoff });
  });

  // Create takeoff
  fastify.post('/', async (request, reply) => {
    const data = request.body as {
      name: string;
      projectId: string;
      estimateId?: string;
      description?: string;
      drawingReference?: string;
      scale?: number;
      unit?: string;
    };

    // Verify user has access to project
    const project = await prisma.project.findFirst({
      where: {
        id: data.projectId,
        OR: [
          { createdById: (request as any).user.userId },
          { users: { some: { userId: (request as any).user.userId } } },
        ],
      },
    });

    if (!project) {
      return reply.code(404).send({ error: 'Project not found' });
    }

    const takeoff = await takeoffsService.createTakeoff(
      data,
      (request as any).user.userId
    );

    return reply.code(201).send({ takeoff });
  });

  // Update takeoff
  fastify.put('/takeoffs/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const updates = request.body as {
      name?: string;
      description?: string;
      status?: string;
      drawingReference?: string;
      scale?: number;
      unit?: string;
    };

    // Verify user has access
    const existingTakeoff = await takeoffsService.getTakeoff(id);
    const project = await prisma.project.findFirst({
      where: {
        id: existingTakeoff.projectId,
        OR: [
          { createdById: (request as any).user.userId },
          { users: { some: { userId: (request as any).user.userId } } },
        ],
      },
    });

    if (!project) {
      return reply.code(404).send({ error: 'Takeoff not found' });
    }

    const takeoff = await takeoffsService.updateTakeoff(id, updates as any);

    return reply.send({ takeoff });
  });

  // Delete takeoff
  fastify.delete('/takeoffs/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    // Verify user has access
    const existingTakeoff = await takeoffsService.getTakeoff(id);
    const project = await prisma.project.findFirst({
      where: {
        id: existingTakeoff.projectId,
        OR: [
          { createdById: (request as any).user.userId },
          { users: { some: { userId: (request as any).user.userId } } },
        ],
      },
    });

    if (!project) {
      return reply.code(404).send({ error: 'Takeoff not found' });
    }

    await takeoffsService.deleteTakeoff(id);

    return reply.code(204).send();
  });

  // Create layer
  fastify.post('/takeoffs/:id/layers', async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = request.body as {
      name: string;
      color?: string;
      isVisible?: boolean;
      sortOrder?: number;
    };

    // Verify user has access
    const existingTakeoff = await takeoffsService.getTakeoff(id);
    const project = await prisma.project.findFirst({
      where: {
        id: existingTakeoff.projectId,
        OR: [
          { createdById: (request as any).user.userId },
          { users: { some: { userId: (request as any).user.userId } } },
        ],
      },
    });

    if (!project) {
      return reply.code(404).send({ error: 'Takeoff not found' });
    }

    const layer = await takeoffsService.createLayer(id, data);

    return reply.code(201).send({ layer });
  });

  // Update layer
  fastify.put('/takeoffs/layers/:layerId', async (request, reply) => {
    const { layerId } = request.params as { layerId: string };
    const updates = request.body as {
      name?: string;
      color?: string;
      isVisible?: boolean;
      sortOrder?: number;
    };

    const layer = await takeoffsService.updateLayer(layerId, updates);

    return reply.send({ layer });
  });

  // Delete layer
  fastify.delete('/takeoffs/layers/:layerId', async (request, reply) => {
    const { layerId } = request.params as { layerId: string };

    await takeoffsService.deleteLayer(layerId);

    return reply.code(204).send();
  });

  // Toggle layer visibility
  fastify.post('/takeoffs/layers/:layerId/toggle', async (request, reply) => {
    const { layerId } = request.params as { layerId: string };

    const layer = await takeoffsService.toggleLayerVisibility(layerId);

    return reply.send({ layer });
  });

  // Add measurement
  fastify.post('/takeoffs/:id/measurements', async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = request.body as any;

    // Verify user has access
    const existingTakeoff = await takeoffsService.getTakeoff(id);
    const project = await prisma.project.findFirst({
      where: {
        id: existingTakeoff.projectId,
        OR: [
          { createdById: (request as any).user.userId },
          { users: { some: { userId: (request as any).user.userId } } },
        ],
      },
    });

    if (!project) {
      return reply.code(404).send({ error: 'Takeoff not found' });
    }

    const measurement = await takeoffsService.addMeasurement(id, data);

    return reply.code(201).send({ measurement });
  });

  // Add area measurement
  fastify.post('/takeoffs/:id/measurements/area', async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = request.body as {
      description: string;
      length: number;
      width: number;
      unit: string;
      layerId?: string;
      notes?: string;
    };

    // Verify user has access
    const existingTakeoff = await takeoffsService.getTakeoff(id);
    const project = await prisma.project.findFirst({
      where: {
        id: existingTakeoff.projectId,
        OR: [
          { createdById: (request as any).user.userId },
          { users: { some: { userId: (request as any).user.userId } } },
        ],
      },
    });

    if (!project) {
      return reply.code(404).send({ error: 'Takeoff not found' });
    }

    const measurement = await takeoffsService.addAreaMeasurement(id, data);

    return reply.code(201).send({ measurement });
  });

  // Add linear measurement
  fastify.post('/takeoffs/:id/measurements/linear', async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = request.body as {
      description: string;
      length: number;
      unit: string;
      layerId?: string;
      notes?: string;
    };

    const measurement = await takeoffsService.addLinearMeasurement(id, data);

    return reply.code(201).send({ measurement });
  });

  // Add volume measurement
  fastify.post('/takeoffs/:id/measurements/volume', async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = request.body as {
      description: string;
      length: number;
      width: number;
      height: number;
      unit: string;
      layerId?: string;
      notes?: string;
    };

    const measurement = await takeoffsService.addVolumeMeasurement(id, data);

    return reply.code(201).send({ measurement });
  });

  // Add count measurement
  fastify.post('/takeoffs/:id/measurements/count', async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = request.body as {
      description: string;
      quantity: number;
      unit: string;
      layerId?: string;
      notes?: string;
    };

    const measurement = await takeoffsService.addCountMeasurement(id, data);

    return reply.code(201).send({ measurement });
  });

  // Update measurement
  fastify.put('/takeoffs/measurements/:measurementId', async (request, reply) => {
    const { measurementId } = request.params as { measurementId: string };
    const updates = request.body as any;

    const measurement = await takeoffsService.updateMeasurement(measurementId, updates);

    return reply.send({ measurement });
  });

  // Delete measurement
  fastify.delete('/takeoffs/measurements/:measurementId', async (request, reply) => {
    const { measurementId } = request.params as { measurementId: string };

    await takeoffsService.deleteMeasurement(measurementId);

    return reply.code(204).send();
  });

  // Link measurement to estimate line
  fastify.post('/takeoffs/measurements/:measurementId/link', async (request, reply) => {
    const { measurementId } = request.params as { measurementId: string };
    const { estimateLineId } = request.body as { estimateLineId: string };

    const measurement = await takeoffsService.linkMeasurementToEstimateLine(
      measurementId,
      estimateLineId
    );

    return reply.send({ measurement });
  });

  // Unlink measurement from estimate line
  fastify.post('/takeoffs/measurements/:measurementId/unlink', async (request, reply) => {
    const { measurementId } = request.params as { measurementId: string };

    const measurement = await takeoffsService.unlinkMeasurementFromEstimateLine(measurementId);

    return reply.send({ measurement });
  });

  // Get takeoff summary
  fastify.get('/takeoffs/:id/summary', async (request, reply) => {
    const { id } = request.params as { id: string };

    const summary = await takeoffsService.getTakeoffSummary(id);

    return reply.send(summary);
  });

  // Export takeoff to CSV
  fastify.get('/takeoffs/:id/export', async (request, reply) => {
    const { id } = request.params as { id: string };

    const csv = await takeoffsService.exportTakeoffToCSV(id);

    reply.header('Content-Type', 'text/csv');
    reply.header('Content-Disposition', `attachment; filename=takeoff-${id}.csv`);

    return reply.send(csv);
  });

  // Duplicate takeoff
  fastify.post('/takeoffs/:id/duplicate', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { name } = request.body as { name: string };

    const takeoff = await takeoffsService.duplicateTakeoff(
      id,
      name,
      (request as any).user.userId
    );

    return reply.code(201).send({ takeoff });
  });

  // Convert measurement units
  fastify.post('/takeoffs/measurements/:measurementId/convert', async (request, reply) => {
    const { measurementId } = request.params as { measurementId: string };
    const { targetUnit, conversionFactor } = request.body as {
      targetUnit: string;
      conversionFactor: number;
    };

    const measurement = await takeoffsService.convertUnits(
      measurementId,
      targetUnit,
      conversionFactor
    );

    return reply.send({ measurement });
  });
};

