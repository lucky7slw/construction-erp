import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '../generated/prisma';
import { AutomationOrchestrator } from '../services/ai/automation-orchestrator';
import { GeminiClient } from '../services/ai/gemini-client';

interface AIAutomationOptions {
  prisma: PrismaClient;
}

export default async function aiAutomationRoutes(fastify: FastifyInstance, options: AIAutomationOptions) {
  const { prisma } = options;
  const geminiClient = new GeminiClient(
    process.env.GEMINI_API_KEY || '',
    process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite'
  );
  const orchestrator = new AutomationOrchestrator(prisma, geminiClient);

  // Generate project tasks
  fastify.post<{ Params: { projectId: string } }>(
    '/projects/:projectId/generate-tasks',
    async (request, reply) => {
      const tasks = await orchestrator.generateProjectTasks(request.params.projectId);
      return reply.send({ tasks });
    }
  );

  // Classify RFI
  fastify.post<{ Params: { rfiId: string } }>(
    '/rfis/:rfiId/classify',
    async (request, reply) => {
      const classification = await orchestrator.classifyRFI(request.params.rfiId);
      return reply.send(classification);
    }
  );

  // Process meeting transcript
  fastify.post<{
    Body: { transcript: string; projectId: string };
  }>('/meetings/process', async (request, reply) => {
    const { transcript, projectId } = request.body;
    const analysis = await orchestrator.processMeetingTranscript(transcript, projectId);
    return reply.send(analysis);
  });

  // Classify document
  fastify.post<{ Params: { fileId: string } }>(
    '/files/:fileId/classify',
    async (request, reply) => {
      const classification = await orchestrator.classifyDocument(request.params.fileId);
      return reply.send(classification);
    }
  );

  // Budget health analysis
  fastify.get<{ Params: { projectId: string } }>(
    '/projects/:projectId/budget-health',
    async (request, reply) => {
      const health = await orchestrator.analyzeBudgetHealth(request.params.projectId);
      return reply.send(health);
    }
  );

  // Daily log summary
  fastify.post<{
    Params: { projectId: string };
    Body: { date: string };
  }>('/projects/:projectId/daily-summary', async (request, reply) => {
    const { projectId } = request.params;
    const { date } = request.body;
    const summary = await orchestrator.generateDailyLogSummary(projectId, new Date(date));
    return reply.send(summary);
  });

  // Draft email
  fastify.post<{
    Body: { type: string; recipientRole: string; data: any };
  }>('/emails/draft', async (request, reply) => {
    const email = await orchestrator.draftEmail(request.body as any);
    return reply.send(email);
  });

  // Generate quote
  fastify.post<{ Body: any }>('/quotes/generate', async (request, reply) => {
    const quote = await orchestrator.generateQuote(request.body);
    return reply.send(quote);
  });
}
