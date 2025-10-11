import { FastifyInstance, FastifyPluginOptions, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { AIService } from '../services/ai/ai.service';
import { createAICacheMiddleware } from '../middleware/ai-cache';
import {
  AIServiceError,
  GeminiAPIError,
  PromptError,
} from '../types/ai';
import { ExpenseCategory } from '@prisma/client';

// Request schemas
const CategorizeExpenseSchema = z.object({
  description: z.string().min(1),
  amount: z.number().positive().optional(),
  date: z.string().optional(),
  receiptImage: z.string().optional(), // base64 encoded
  projectId: z.string().optional(),
});

const TimeAllocationSchema = z.object({
  taskDescription: z.string().min(1),
  projectPhase: z.string().optional(),
  teamSize: z.number().positive().optional(),
  projectId: z.string().optional(),
});

const VoiceCommandSchema = z.object({
  transcription: z.string().min(1),
  context: z.record(z.unknown()).optional(),
});

const ImageAnalysisSchema = z.object({
  imageData: z.string().min(1), // base64 encoded
  analysisType: z.enum(['PROGRESS', 'SAFETY', 'QUALITY', 'MATERIALS', 'COMPLIANCE']),
  context: z.string().optional(),
});

// Response schemas for OpenAPI documentation
const ExpenseClassificationResponseSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    data: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          enum: ['MATERIALS', 'EQUIPMENT', 'LABOR', 'TRANSPORTATION', 'PERMITS', 'UTILITIES', 'INSURANCE', 'OTHER']
        },
        confidence: { type: 'number', minimum: 0, maximum: 1 },
        reasoning: { type: 'string' },
        extractedAmount: { type: 'number', nullable: true },
        extractedDescription: { type: 'string', nullable: true },
        extractedDate: { type: 'string', nullable: true },
        extractedSupplier: { type: 'string', nullable: true },
      },
    },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
  },
};

export async function aiRoutes(
  fastify: FastifyInstance,
  options: FastifyPluginOptions & { aiService: AIService }
) {
  const { aiService } = options;

  // Error handler for AI-specific errors
  function handleAIError(error: unknown, reply: FastifyReply) {
    if (error instanceof AIServiceError) {
      const statusCode = error.code === 'PROJECT_NOT_FOUND' ? 404 : 400;
      return reply.status(statusCode).send({
        success: false,
        error: error.message,
        code: error.code,
        details: error.details,
      });
    }

    if (error instanceof GeminiAPIError) {
      return reply.status(503).send({
        success: false,
        error: 'AI service temporarily unavailable',
        code: 'AI_SERVICE_ERROR',
      });
    }

    if (error instanceof PromptError) {
      return reply.status(400).send({
        success: false,
        error: error.message,
        code: 'PROMPT_ERROR',
      });
    }

    // Generic error
    fastify.log.error(error, 'Unexpected AI service error');
    return reply.status(500).send({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    });
  }

  // Cache middleware for AI endpoints
  const aiCache = createAICacheMiddleware({
    ttl: 3600, // 1 hour cache
    keyPrefix: 'ai_cache',
  });

  // Expense categorization endpoint
  fastify.post('/categorize-expense', {
    preHandler: [aiCache],
    schema: {
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          description: { type: 'string', minLength: 1 },
          amount: { type: 'number', minimum: 0 },
          date: { type: 'string' },
          receiptImage: { type: 'string' },
          projectId: { type: 'string' },
        },
        required: ['description'],
      },
      response: {
        200: ExpenseClassificationResponseSchema,
        400: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
            code: { type: 'string' },
          },
        },
      },
      tags: ['AI'],
      summary: 'Categorize construction expense',
      description: 'Automatically categorize expenses using AI analysis of description and optional receipt image',
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = CategorizeExpenseSchema.parse(request.body);
      const userId = (request as any).user?.id;

      const result = await aiService.categorizeExpense(
        body.description,
        body.amount,
        body.date,
        body.receiptImage,
        userId,
        body.projectId
      );

      return reply.send(result);
    } catch (error) {
      return handleAIError(error, reply);
    }
  });

  // Time allocation suggestion endpoint
  fastify.post('/suggest-time', {
    preHandler: [aiCache],
    schema: {
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          taskDescription: { type: 'string', minLength: 1 },
          projectPhase: { type: 'string' },
          teamSize: { type: 'number', minimum: 1 },
          projectId: { type: 'string' },
        },
        required: ['taskDescription'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                suggestedHours: { type: 'number', minimum: 0 },
                suggestedDescription: { type: 'string' },
                confidence: { type: 'number', minimum: 0, maximum: 1 },
                reasoning: { type: 'string' },
                projectPhase: { type: 'string' },
                category: { type: 'string' },
              },
            },
            confidence: { type: 'number', minimum: 0, maximum: 1 },
          },
        },
      },
      tags: ['AI'],
      summary: 'Get time allocation suggestions',
      description: 'AI-powered suggestions for task time allocation based on construction standards and historical data',
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = TimeAllocationSchema.parse(request.body);
      const userId = (request as any).user?.id;

      const result = await aiService.suggestTimeAllocation(
        body.taskDescription,
        body.projectPhase,
        body.teamSize,
        userId,
        body.projectId
      );

      return reply.send(result);
    } catch (error) {
      return handleAIError(error, reply);
    }
  });

  // Project risk assessment endpoint
  fastify.get('/assess-risk/:projectId', {
    preHandler: [aiCache],
    schema: {
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          projectId: { type: 'string' },
        },
        required: ['projectId'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                overallRisk: {
                  type: 'string',
                  enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
                },
                budgetVariance: { type: 'number' },
                scheduleVariance: { type: 'number' },
                risks: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      type: { type: 'string' },
                      description: { type: 'string' },
                      impact: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
                      probability: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
                      mitigation: { type: 'string' },
                    },
                  },
                },
                recommendations: {
                  type: 'array',
                  items: { type: 'string' },
                },
                confidence: { type: 'number', minimum: 0, maximum: 1 },
              },
            },
            confidence: { type: 'number', minimum: 0, maximum: 1 },
          },
        },
        404: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
            code: { type: 'string' },
          },
        },
      },
      tags: ['AI'],
      summary: 'Assess project risks',
      description: 'AI-powered comprehensive project risk assessment with recommendations',
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { projectId } = request.params as { projectId: string };
      const userId = (request as any).user?.id;

      const result = await aiService.assessProjectRisk(projectId, userId);
      return reply.send(result);
    } catch (error) {
      return handleAIError(error, reply);
    }
  });

  // Voice command processing endpoint
  fastify.post('/process-voice', {
    schema: {
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          transcription: { type: 'string', minLength: 1 },
          context: { type: 'object' },
        },
        required: ['transcription'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                transcription: { type: 'string' },
                intent: { type: 'string' },
                entities: { type: 'object' },
                confidence: { type: 'number', minimum: 0, maximum: 1 },
                actionable: { type: 'boolean' },
              },
            },
            confidence: { type: 'number', minimum: 0, maximum: 1 },
          },
        },
      },
      tags: ['AI'],
      summary: 'Process voice commands',
      description: 'Process voice commands for field updates with construction terminology support',
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = VoiceCommandSchema.parse(request.body);
      const userId = (request as any).user?.id;

      const result = await aiService.processVoiceCommand(
        body.transcription,
        userId,
        body.context
      );

      return reply.send(result);
    } catch (error) {
      return handleAIError(error, reply);
    }
  });

  // Image analysis endpoint
  fastify.post('/analyze-image', {
    schema: {
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          imageData: { type: 'string', minLength: 1 },
          analysisType: {
            type: 'string',
            enum: ['PROGRESS', 'SAFETY', 'QUALITY', 'MATERIALS', 'COMPLIANCE']
          },
          context: { type: 'string' },
        },
        required: ['imageData', 'analysisType'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'string' },
            confidence: { type: 'number', minimum: 0, maximum: 1 },
          },
        },
      },
      tags: ['AI'],
      summary: 'Analyze construction images',
      description: 'AI-powered analysis of construction photos for progress, safety, and quality assessment',
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = ImageAnalysisSchema.parse(request.body);
      const userId = (request as any).user?.id;

      const result = await aiService.analyzeConstructionImage(
        body.imageData,
        body.analysisType,
        body.context,
        userId
      );

      return reply.send(result);
    } catch (error) {
      return handleAIError(error, reply);
    }
  });

  // AI service health check
  fastify.get('/health', {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            gemini: { type: 'boolean' },
            redis: { type: 'boolean' },
            overall: { type: 'boolean' },
          },
        },
      },
      tags: ['AI'],
      summary: 'AI service health check',
      description: 'Check the health status of AI service components',
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const health = await aiService.healthCheck();
      return reply.send(health);
    } catch (error) {
      fastify.log.error(error, 'AI health check failed');
      return reply.status(503).send({
        gemini: false,
        redis: false,
        overall: false,
      });
    }
  });

  // AI service statistics
  fastify.get('/stats', {
    schema: {
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            requestCount: { type: 'number' },
            rateLimit: {
              type: 'object',
              properties: {
                requestCount: { type: 'number' },
                limit: { type: 'number' },
                windowStart: { type: 'number' },
                remaining: { type: 'number' },
              },
            },
            cacheStats: {
              type: 'object',
              properties: {
                totalKeys: { type: 'number' },
                memoryUsage: { type: 'string' },
              },
            },
          },
        },
      },
      tags: ['AI'],
      summary: 'AI service statistics',
      description: 'Get AI service usage statistics and performance metrics',
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request as any).user?.id;
      const stats = await aiService.getStatistics(userId);
      return reply.send(stats);
    } catch (error) {
      return handleAIError(error, reply);
    }
  });

  // AI-powered quote generation
  fastify.post('/generate-quote', {
    preHandler: [aiCache],
    schema: {
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          projectType: { type: 'string', minLength: 1 },
          scope: { type: 'string', minLength: 1 },
          requirements: { type: 'string', minLength: 1 },
          constraints: { type: 'string' },
          profitMargin: { type: 'number', minimum: 0, maximum: 100 },
        },
        required: ['projectType', 'scope', 'requirements'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                items: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      description: { type: 'string' },
                      quantity: { type: 'number' },
                      unitPrice: { type: 'number' },
                      category: { type: 'string' },
                    },
                  },
                },
                subtotal: { type: 'number' },
                historicalProjects: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' },
                      similarity: { type: 'number' },
                      budget: { type: 'number' },
                      actualCost: { type: 'number' },
                    },
                  },
                },
                marketRates: { type: 'object' },
                confidence: { type: 'number', minimum: 0, maximum: 1 },
                reasoning: { type: 'string' },
                assumptions: {
                  type: 'array',
                  items: { type: 'string' },
                },
                risks: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      description: { type: 'string' },
                      impact: { type: 'string' },
                      mitigation: { type: 'string' },
                    },
                  },
                },
              },
            },
            confidence: { type: 'number', minimum: 0, maximum: 1 },
          },
        },
      },
      tags: ['AI'],
      summary: 'Generate AI-powered construction quote',
      description: 'Automatically generate detailed construction quotes using AI analysis of project requirements and historical data',
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = request.body as any;
      const userId = (request as any).user?.id;
      const companyId = (request as any).user?.companyId;

      const result = await aiService.generateQuote(
        {
          projectType: body.projectType,
          scope: body.scope,
          requirements: body.requirements,
          constraints: body.constraints,
          profitMargin: body.profitMargin,
        },
        userId,
        companyId
      );

      return reply.send(result);
    } catch (error) {
      return handleAIError(error, reply);
    }
  });
}