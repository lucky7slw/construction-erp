type MoodBoardsRoutesOptions = { prisma: PrismaClient; };
import { FastifyPluginAsync } from 'fastify';
import { PrismaClient } from '../generated/prisma';
import { MoodBoardsService } from '../services/mood-boards/mood-boards.service';

export const moodBoardsRoutes: FastifyPluginAsync<MoodBoardsRoutesOptions> = async (fastify, options) => {
  const { prisma } = options;
  const moodBoardsService = new MoodBoardsService(prisma);

  // List mood boards
  fastify.get('/', async (request, reply) => {
    const { projectId, status, customerId, room } = request.query as any;
    if (!projectId) return reply.code(400).send({ error: 'projectId required' });
    const moodBoards = await moodBoardsService.listMoodBoards(projectId, { status, customerId, room });
    return reply.send({ moodBoards });
  });

  // Get mood board
  fastify.get('/mood-boards/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const moodBoard = await moodBoardsService.getMoodBoard(id);
    return reply.send({ moodBoard });
  });

  // Create mood board
  fastify.post('/', async (request, reply) => {
    const data = request.body as any;
    const moodBoard = await moodBoardsService.createMoodBoard(data, (request as any).user.userId);
    return reply.code(201).send({ moodBoard });
  });

  // Update mood board
  fastify.put('/mood-boards/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const updates = request.body as any;
    const moodBoard = await moodBoardsService.updateMoodBoard(id, updates);
    return reply.send({ moodBoard });
  });

  // Delete mood board
  fastify.delete('/mood-boards/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    await moodBoardsService.deleteMoodBoard(id);
    return reply.code(204).send();
  });

  // Add item
  fastify.post('/mood-boards/:id/items', async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = request.body as any;
    const item = await moodBoardsService.addItem(id, data);
    return reply.code(201).send({ item });
  });

  // Update item
  fastify.put('/mood-boards/items/:itemId', async (request, reply) => {
    const { itemId } = request.params as { itemId: string };
    const updates = request.body as any;
    const item = await moodBoardsService.updateItem(itemId, updates);
    return reply.send({ item });
  });

  // Delete item
  fastify.delete('/mood-boards/items/:itemId', async (request, reply) => {
    const { itemId } = request.params as { itemId: string };
    await moodBoardsService.deleteItem(itemId);
    return reply.code(204).send();
  });

  // Reorder items
  fastify.post('/mood-boards/:id/reorder', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { itemIds } = request.body as { itemIds: string[] };
    await moodBoardsService.reorderItems(itemIds);
    return reply.send({ success: true });
  });

  // Add comment
  fastify.post('/mood-boards/:id/comments', async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = request.body as any;
    const comment = await moodBoardsService.addComment(id, (request as any).user.userId, data);
    return reply.code(201).send({ comment });
  });

  // Delete comment
  fastify.delete('/mood-boards/comments/:commentId', async (request, reply) => {
    const { commentId } = request.params as { commentId: string };
    await moodBoardsService.deleteComment(commentId);
    return reply.code(204).send();
  });

  // Share mood board
  fastify.post('/mood-boards/:id/share', async (request, reply) => {
    const { id } = request.params as { id: string };
    const moodBoard = await moodBoardsService.shareMoodBoard(id);
    return reply.send({ moodBoard });
  });

  // Approve mood board
  fastify.post('/mood-boards/:id/approve', async (request, reply) => {
    const { id } = request.params as { id: string };
    const moodBoard = await moodBoardsService.approveMoodBoard(id, (request as any).user.userId);
    return reply.send({ moodBoard });
  });

  // Reject mood board
  fastify.post('/mood-boards/:id/reject', async (request, reply) => {
    const { id } = request.params as { id: string };
    const moodBoard = await moodBoardsService.rejectMoodBoard(id);
    return reply.send({ moodBoard });
  });

  // Archive mood board
  fastify.post('/mood-boards/:id/archive', async (request, reply) => {
    const { id } = request.params as { id: string };
    const moodBoard = await moodBoardsService.archiveMoodBoard(id);
    return reply.send({ moodBoard });
  });

  // Get summary
  fastify.get('/mood-boards-summary', async (request, reply) => {
    const { projectId } = request.query as { projectId: string };
    if (!projectId) return reply.code(400).send({ error: 'projectId required' });
    const summary = await moodBoardsService.getMoodBoardsSummary(projectId);
    return reply.send(summary);
  });

  // Get pending approvals
  fastify.get('/mood-boards-pending', async (request, reply) => {
    const { projectId } = request.query as { projectId: string };
    if (!projectId) return reply.code(400).send({ error: 'projectId required' });
    const pending = await moodBoardsService.getPendingApprovals(projectId);
    return reply.send({ pending });
  });

  // Duplicate mood board
  fastify.post('/mood-boards/:id/duplicate', async (request, reply) => {
    const { id } = request.params as { id: string };
    const moodBoard = await moodBoardsService.duplicateMoodBoard(id, (request as any).user.userId);
    return reply.code(201).send({ moodBoard });
  });

  // Get items by type
  fastify.get('/mood-boards/:id/items-by-type', async (request, reply) => {
    const { id } = request.params as { id: string };
    const itemsByType = await moodBoardsService.getItemsByType(id);
    return reply.send({ itemsByType });
  });

  // Get color palette
  fastify.get('/mood-boards/:id/color-palette', async (request, reply) => {
    const { id } = request.params as { id: string };
    const colors = await moodBoardsService.getColorPalette(id);
    return reply.send({ colors });
  });
};

