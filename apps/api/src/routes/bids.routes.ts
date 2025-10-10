type BidsRoutesOptions = { prisma: PrismaClient; };
import { FastifyPluginAsync } from 'fastify';
import { PrismaClient } from '../generated/prisma';
import { BidsService } from '../services/bids/bids.service';

export const bidsRoutes: FastifyPluginAsync<BidsRoutesOptions> = async (fastify, options) => {
  const { prisma } = options;
  const bidsService = new BidsService(prisma);

  // List bids for a project
  fastify.get('/', async (request, reply) => {
    const { projectId, status, bidType, supplierId } = request.query as {
      projectId: string;
      status?: string;
      bidType?: string;
      supplierId?: string;
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

    const bids = await bidsService.listBids(projectId, {
      status: status as any,
      bidType: bidType as any,
      supplierId,
    });

    return reply.send({ bids });
  });

  // Get single bid
  fastify.get('/bids/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const bid = await bidsService.getBid(id);

    // Verify user has access
    const project = await prisma.project.findFirst({
      where: {
        id: bid.projectId,
        OR: [
          { createdById: (request as any).user.userId },
          { users: { some: { userId: (request as any).user.userId } } },
        ],
      },
    });

    if (!project) {
      return reply.code(404).send({ error: 'Bid not found' });
    }

    return reply.send({ bid });
  });

  // Create bid
  fastify.post('/', async (request, reply) => {
    const data = request.body as {
      projectId: string;
      supplierId?: string;
      bidType: string;
      scopeOfWork: string;
      dueDate?: string;
      validUntil?: string;
      bondRequired?: boolean;
      bondAmount?: number;
      taxPercent?: number;
      notes?: string;
      contactName?: string;
      contactEmail?: string;
      contactPhone?: string;
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

    const bid = await bidsService.createBid(
      {
        ...data,
        bidType: data.bidType as any,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        validUntil: data.validUntil ? new Date(data.validUntil) : undefined,
      },
      (request as any).user.userId
    );

    return reply.code(201).send({ bid });
  });

  // Update bid
  fastify.put('/bids/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const updates = request.body as {
      status?: string;
      dueDate?: string;
      validUntil?: string;
      notes?: string;
      contactName?: string;
      contactEmail?: string;
      contactPhone?: string;
      attachmentUrls?: any;
    };

    // Verify user has access
    const existingBid = await bidsService.getBid(id);
    const project = await prisma.project.findFirst({
      where: {
        id: existingBid.projectId,
        OR: [
          { createdById: (request as any).user.userId },
          { users: { some: { userId: (request as any).user.userId } } },
        ],
      },
    });

    if (!project) {
      return reply.code(404).send({ error: 'Bid not found' });
    }

    const bid = await bidsService.updateBid(id, {
      ...updates,
      status: updates.status as any,
      dueDate: updates.dueDate ? new Date(updates.dueDate) : undefined,
      validUntil: updates.validUntil ? new Date(updates.validUntil) : undefined,
    });

    return reply.send({ bid });
  });

  // Delete bid
  fastify.delete('/bids/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    // Verify user has access
    const existingBid = await bidsService.getBid(id);
    const project = await prisma.project.findFirst({
      where: {
        id: existingBid.projectId,
        OR: [
          { createdById: (request as any).user.userId },
          { users: { some: { userId: (request as any).user.userId } } },
        ],
      },
    });

    if (!project) {
      return reply.code(404).send({ error: 'Bid not found' });
    }

    await bidsService.deleteBid(id);

    return reply.code(204).send();
  });

  // Add line item
  fastify.post('/bids/:id/line-items', async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = request.body as {
      description: string;
      quantity: number;
      unit: string;
      unitPrice: number;
      notes?: string;
      linkedEstimateLineId?: string;
      sortOrder?: number;
    };

    const lineItem = await bidsService.addLineItem(id, data);

    return reply.code(201).send({ lineItem });
  });

  // Update line item
  fastify.put('/bids/line-items/:lineItemId', async (request, reply) => {
    const { lineItemId } = request.params as { lineItemId: string };
    const updates = request.body as any;

    const lineItem = await bidsService.updateLineItem(lineItemId, updates);

    return reply.send({ lineItem });
  });

  // Delete line item
  fastify.delete('/bids/line-items/:lineItemId', async (request, reply) => {
    const { lineItemId } = request.params as { lineItemId: string };

    await bidsService.deleteLineItem(lineItemId);

    return reply.code(204).send();
  });

  // Submit bid
  fastify.post('/bids/:id/submit', async (request, reply) => {
    const { id } = request.params as { id: string };

    const bid = await bidsService.submitBid(id);

    return reply.send({ bid });
  });

  // Award bid
  fastify.post('/bids/:id/award', async (request, reply) => {
    const { id } = request.params as { id: string };

    const bid = await bidsService.awardBid(id);

    return reply.send({ bid });
  });

  // Decline bid
  fastify.post('/bids/:id/decline', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { reason } = request.body as { reason: string };

    const bid = await bidsService.declineBid(id, reason);

    return reply.send({ bid });
  });

  // Create bid package
  fastify.post('/bid-packages', async (request, reply) => {
    const data = request.body as {
      name: string;
      projectId: string;
      description?: string;
      scopeDocument?: string;
      dueDate?: string;
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

    const bidPackage = await bidsService.createBidPackage(
      {
        ...data,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      },
      (request as any).user.userId
    );

    return reply.code(201).send({ bidPackage });
  });

  // Get bid package
  fastify.get('/bid-packages/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const bidPackage = await bidsService.getBidPackage(id);

    // Verify user has access
    const project = await prisma.project.findFirst({
      where: {
        id: bidPackage.projectId,
        OR: [
          { createdById: (request as any).user.userId },
          { users: { some: { userId: (request as any).user.userId } } },
        ],
      },
    });

    if (!project) {
      return reply.code(404).send({ error: 'Bid package not found' });
    }

    return reply.send({ bidPackage });
  });

  // List bid packages
  fastify.get('/bid-packages', async (request, reply) => {
    const { projectId } = request.query as { projectId: string };

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

    const bidPackages = await bidsService.listBidPackages(projectId);

    return reply.send({ bidPackages });
  });

  // Invite supplier to bid package
  fastify.post('/bid-packages/:id/invite', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { supplierId, notes } = request.body as {
      supplierId: string;
      notes?: string;
    };

    const invitation = await bidsService.inviteSupplierToBidPackage(
      id,
      supplierId,
      (request as any).user.userId,
      notes
    );

    return reply.code(201).send({ invitation });
  });

  // Compare bids
  fastify.get('/bids-comparison', async (request, reply) => {
    const { projectId, scopeFilter } = request.query as {
      projectId: string;
      scopeFilter?: string;
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

    const comparison = await bidsService.compareBids(projectId, scopeFilter);

    return reply.send(comparison);
  });

  // Score bid
  fastify.post('/bids/:id/score', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { criteria, scores } = request.body as {
      criteria: {
        priceWeight: number;
        timelineWeight: number;
        experienceWeight: number;
        qualityWeight: number;
      };
      scores: {
        priceScore: number;
        timelineScore: number;
        experienceScore: number;
        qualityScore: number;
      };
    };

    const bid = await bidsService.scoreBid(id, criteria, scores);

    return reply.send({ bid });
  });

  // Get ranked bids
  fastify.get('/bids-ranked', async (request, reply) => {
    const { projectId } = request.query as { projectId: string };

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

    const rankedBids = await bidsService.getRankedBids(projectId);

    return reply.send({ rankedBids });
  });

  // Get bid statistics
  fastify.get('/bids-statistics', async (request, reply) => {
    const { projectId } = request.query as { projectId: string };

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

    const statistics = await bidsService.getBidStatistics(projectId);

    return reply.send(statistics);
  });

  // Export bid comparison to CSV
  fastify.get('/bids-comparison-export', async (request, reply) => {
    const { projectId } = request.query as { projectId: string };

    if (!projectId) {
      return reply.code(400).send({ error: 'projectId is required' });
    }

    const csv = await bidsService.exportBidComparisonToCSV(projectId);

    reply.header('Content-Type', 'text/csv');
    reply.header('Content-Disposition', `attachment; filename=bid-comparison-${projectId}.csv`);

    return reply.send(csv);
  });
};

