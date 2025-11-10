import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';
import { GeminiClient } from '../../lib/gemini/client';
import { renderPrompt, validatePromptVariables } from '../../prompts/templates';
import {
  AIConfig,
  AIResponse,
  ExpenseClassification,
  ExpenseClassificationSchema,
  TimeEntrySuggestion,
  TimeEntrySuggestionSchema,
  ProjectRiskAssessment,
  ProjectRiskAssessmentSchema,
  VoiceProcessing,
  VoiceProcessingSchema,
  PropertyMarketAnalysis,
  PropertyMarketAnalysisSchema,
  PropertyMarketAnalysisRequest,
  AIServiceError,
  GeminiAPIError,
  PromptError,
} from '../../types/ai';
import {
  AIQuoteGeneration,
  AIQuoteGenerationSchema,
  GenerateQuoteRequest,
} from '../../types/quotes';

export class AIService {
  private geminiClient: GeminiClient;
  private prisma: PrismaClient;
  private redis: Redis;
  private config: AIConfig;

  constructor(
    prisma: PrismaClient,
    redis: Redis,
    config: AIConfig
  ) {
    this.prisma = prisma;
    this.redis = redis;
    this.config = config;
    this.geminiClient = new GeminiClient(config);
  }

  /**
   * Categorize expense from description and optional receipt image
   */
  async categorizeExpense(
    description: string,
    amount?: number,
    date?: string,
    receiptImage?: string,
    userId?: string,
    projectId?: string
  ): Promise<AIResponse<ExpenseClassification>> {
    try {
      // Get project context if available
      let projectContext = '';
      if (projectId) {
        const project = await this.prisma.project.findUnique({
          where: { id: projectId },
          select: { name: true, description: true, status: true }
        });
        if (project) {
          projectContext = `Project: ${project.name}, Status: ${project.status}`;
        }
      }

      const variables = {
        description,
        amount: amount || 'Not specified',
        date: date || 'Not specified',
        context: projectContext,
      };

      // Validate required variables
      const missing = validatePromptVariables('EXPENSE_CATEGORIZATION', variables);
      if (missing.length > 0) {
        throw new PromptError(`Missing required variables: ${missing.join(', ')}`);
      }

      const prompt = renderPrompt('EXPENSE_CATEGORIZATION', variables);

      let response: string;
      if (receiptImage) {
        // Include image analysis if receipt provided
        const imagePrompt = `${prompt}\n\nANALYZE THE RECEIPT IMAGE ABOVE and extract any additional details.`;
        response = await this.geminiClient.analyzeImage(
          receiptImage,
          imagePrompt,
          userId || 'system'
        );
      } else {
        response = await this.geminiClient.generateContent(
          prompt,
          userId || 'system'
        );
      }

      // Parse JSON response
      const cleanResponse = this.extractJsonFromResponse(response);
      const parsed = JSON.parse(cleanResponse);

      // Validate response schema
      const classification = ExpenseClassificationSchema.parse(parsed);

      // Store in context for learning
      if (userId) {
        await this.storeAIContext(userId, 'expense_categorization', {
          input: { description, amount, date },
          output: classification,
          timestamp: new Date(),
        });
      }

      return {
        success: true,
        data: classification,
        confidence: classification.confidence,
      };

    } catch (error) {
      if (error instanceof GeminiAPIError || error instanceof PromptError) {
        throw error;
      }

      throw new AIServiceError(
        'Failed to categorize expense',
        'CATEGORIZATION_ERROR',
        { description, error }
      );
    }
  }

  /**
   * Suggest time allocation for tasks
   */
  async suggestTimeAllocation(
    taskDescription: string,
    projectPhase?: string,
    teamSize?: number,
    userId?: string,
    projectId?: string
  ): Promise<AIResponse<TimeEntrySuggestion>> {
    try {
      // Get historical data for similar tasks
      let historicalData = '';
      if (projectId) {
        const similarTasks = await this.prisma.timeEntry.findMany({
          where: {
            projectId,
            description: {
              contains: taskDescription.split(' ')[0], // Simple keyword match
              mode: 'insensitive',
            },
          },
          select: { description: true, hours: true, date: true },
          take: 5,
          orderBy: { date: 'desc' },
        });

        if (similarTasks.length > 0) {
          historicalData = similarTasks
            .map(t => `${t.description}: ${t.hours} hours`)
            .join(', ');
        }
      }

      const variables = {
        taskDescription,
        projectPhase: projectPhase || 'Not specified',
        teamSize: teamSize || 1,
        historicalData,
      };

      const prompt = renderPrompt('TIME_ALLOCATION_SUGGESTION', variables);
      const response = await this.geminiClient.generateContent(
        prompt,
        userId || 'system'
      );

      const cleanResponse = this.extractJsonFromResponse(response);
      const parsed = JSON.parse(cleanResponse);
      const suggestion = TimeEntrySuggestionSchema.parse(parsed);

      // Store in context
      if (userId) {
        await this.storeAIContext(userId, 'time_suggestion', {
          input: { taskDescription, projectPhase, teamSize },
          output: suggestion,
          timestamp: new Date(),
        });
      }

      return {
        success: true,
        data: suggestion,
        confidence: suggestion.confidence,
      };

    } catch (error) {
      throw new AIServiceError(
        'Failed to suggest time allocation',
        'TIME_SUGGESTION_ERROR',
        { taskDescription, error }
      );
    }
  }

  /**
   * Assess project risks and provide recommendations
   */
  async assessProjectRisk(
    projectId: string,
    userId?: string
  ): Promise<AIResponse<ProjectRiskAssessment>> {
    try {
      // Gather comprehensive project data
      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
        include: {
          expenses: {
            select: { amount: true, category: true, date: true },
            orderBy: { date: 'desc' },
            take: 50,
          },
          timeEntries: {
            select: { hours: true, date: true, description: true },
            orderBy: { date: 'desc' },
            take: 50,
          },
          tasks: {
            select: { status: true, dueDate: true, estimatedHours: true, actualHours: true },
          },
        },
      });

      if (!project) {
        throw new AIServiceError('Project not found', 'PROJECT_NOT_FOUND');
      }

      // Calculate metrics
      const totalExpenses = project.expenses.reduce((sum, e) => sum + Number(e.amount), 0);
      const totalHours = project.timeEntries.reduce((sum, t) => sum + Number(t.hours), 0);
      const budgetUsage = project.budget ? (totalExpenses / Number(project.budget)) * 100 : 0;

      const variables = {
        projectData: JSON.stringify({
          name: project.name,
          status: project.status,
          startDate: project.startDate,
          endDate: project.endDate,
          tasksCount: project.tasks.length,
          completedTasks: project.tasks.filter(t => t.status === 'COMPLETED').length,
        }),
        budget: `Budget: ${project.budget || 'Not set'}, Spent: ${totalExpenses}, Usage: ${budgetUsage.toFixed(1)}%`,
        timeline: `Start: ${project.startDate || 'Not set'}, End: ${project.endDate || 'Not set'}`,
        expenses: `Total: ${totalExpenses}, Count: ${project.expenses.length}`,
        timeEntries: `Total Hours: ${totalHours}, Entries: ${project.timeEntries.length}`,
      };

      const prompt = renderPrompt('PROJECT_RISK_ASSESSMENT', variables);
      const response = await this.geminiClient.generateContent(
        prompt,
        userId || 'system'
      );

      const cleanResponse = this.extractJsonFromResponse(response);
      const parsed = JSON.parse(cleanResponse);
      const assessment = ProjectRiskAssessmentSchema.parse(parsed);

      // Store assessment
      if (userId) {
        await this.storeAIContext(userId, 'risk_assessment', {
          projectId,
          assessment,
          timestamp: new Date(),
        });
      }

      return {
        success: true,
        data: assessment,
        confidence: assessment.confidence,
      };

    } catch (error) {
      throw new AIServiceError(
        'Failed to assess project risk',
        'RISK_ASSESSMENT_ERROR',
        { projectId, error }
      );
    }
  }

  /**
   * Process voice commands for field updates
   */
  async processVoiceCommand(
    transcription: string,
    userId?: string,
    context?: Record<string, any>
  ): Promise<AIResponse<VoiceProcessing>> {
    try {
      const variables = {
        transcription,
        context: context ? JSON.stringify(context) : '',
      };

      const prompt = renderPrompt('VOICE_PROCESSING', variables);
      const response = await this.geminiClient.generateContent(
        prompt,
        userId || 'system'
      );

      const cleanResponse = this.extractJsonFromResponse(response);
      const parsed = JSON.parse(cleanResponse);
      const processing = VoiceProcessingSchema.parse(parsed);

      return {
        success: true,
        data: processing,
        confidence: processing.confidence,
      };

    } catch (error) {
      throw new AIServiceError(
        'Failed to process voice command',
        'VOICE_PROCESSING_ERROR',
        { transcription, error }
      );
    }
  }

  /**
   * Analyze construction images
   */
  async analyzeConstructionImage(
    imageData: string,
    analysisType: string,
    context?: string,
    userId?: string
  ): Promise<AIResponse<string>> {
    try {
      const variables = {
        imageContext: context || '',
        analysisType,
      };

      const prompt = renderPrompt('IMAGE_ANALYSIS', variables);
      const response = await this.geminiClient.analyzeImage(
        imageData,
        prompt,
        userId || 'system'
      );

      return {
        success: true,
        data: response,
        confidence: 0.8, // Default confidence for image analysis
      };

    } catch (error) {
      throw new AIServiceError(
        'Failed to analyze construction image',
        'IMAGE_ANALYSIS_ERROR',
        { analysisType, error }
      );
    }
  }

  /**
   * Store AI interaction context for learning
   */
  private async storeAIContext(
    userId: string,
    contextType: string,
    data: any
  ): Promise<void> {
    try {
      const key = `ai_context:${userId}:${contextType}:${Date.now()}`;
      await this.redis.setex(
        key,
        86400 * 7, // 7 days
        JSON.stringify(data)
      );
    } catch (error) {
      // Don't fail the main operation if context storage fails
      console.warn('Failed to store AI context:', error);
    }
  }

  /**
   * Extract JSON from AI response that might have extra text
   */
  private extractJsonFromResponse(response: string): string {
    // Try to find JSON in the response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return jsonMatch[0];
    }

    // If no JSON found, throw error
    throw new PromptError('No valid JSON found in AI response', { response });
  }

  /**
   * Generate AI-powered construction quote
   */
  async generateQuote(
    request: GenerateQuoteRequest,
    userId?: string,
    companyId?: string
  ): Promise<AIResponse<AIQuoteGeneration>> {
    try {
      // Get historical projects for context
      let historicalProjectsData = '';
      if (companyId) {
        const historicalProjects = await this.prisma.project.findMany({
          where: {
            companyId,
            status: 'COMPLETED',
          },
          select: {
            id: true,
            name: true,
            description: true,
            budget: true,
            actualCost: true,
          },
          take: 10,
          orderBy: { createdAt: 'desc' },
        });

        if (historicalProjects.length > 0) {
          historicalProjectsData = historicalProjects
            .map((p) => ({
              id: p.id,
              name: p.name,
              description: p.description || '',
              budget: Number(p.budget || 0),
              actualCost: Number(p.actualCost || 0),
              variance: p.budget && p.actualCost
                ? ((Number(p.actualCost) - Number(p.budget)) / Number(p.budget)) * 100
                : 0,
            }))
            .map((p) => `${p.name}: Budget ${p.budget}, Actual ${p.actualCost} (${p.variance.toFixed(1)}% variance)`)
            .join(', ');
        }
      }

      const variables = {
        projectType: request.projectType,
        scope: request.scope,
        requirements: request.requirements,
        constraints: request.constraints || '',
        historicalProjects: historicalProjectsData,
        profitMargin: request.profitMargin || 15,
      };

      const prompt = renderPrompt('QUOTE_GENERATION', variables);
      const response = await this.geminiClient.generateContent(
        prompt,
        userId || 'system'
      );

      const cleanResponse = this.extractJsonFromResponse(response);
      const parsed = JSON.parse(cleanResponse);
      const quote = AIQuoteGenerationSchema.parse(parsed);

      // Store quote generation
      if (userId) {
        await this.storeAIContext(userId, 'quote_generation', {
          request,
          quote,
          timestamp: new Date(),
        });
      }

      return {
        success: true,
        data: quote,
        confidence: quote.confidence,
      };

    } catch (error) {
      throw new AIServiceError(
        'Failed to generate quote',
        'QUOTE_GENERATION_ERROR',
        { request, error }
      );
    }
  }

  /**
   * Analyze property for flip house investment decision
   * Provides comprehensive market analysis including sell vs rent comparison
   */
  async analyzeProperty(
    request: PropertyMarketAnalysisRequest,
    userId?: string
  ): Promise<AIResponse<PropertyMarketAnalysis>> {
    try {
      const variables = {
        address: request.address,
        squareFeet: request.squareFeet.toString(),
        bedrooms: request.bedrooms.toString(),
        bathrooms: request.bathrooms.toString(),
        propertyType: request.propertyType,
        yearBuilt: request.yearBuilt?.toString() || '',
        lotSize: request.lotSize?.toString() || '',
        purchasePrice: request.purchasePrice?.toString() || '',
        renovationBudget: request.renovationBudget?.toString() || '',
      };

      const prompt = renderPrompt('PROPERTY_MARKET_ANALYSIS', variables);
      const response = await this.geminiClient.generateContent(
        prompt,
        userId || 'system'
      );

      const cleanResponse = this.extractJsonFromResponse(response);
      const parsed = JSON.parse(cleanResponse);
      const analysis = PropertyMarketAnalysisSchema.parse(parsed);

      // Store analysis for learning
      if (userId) {
        await this.storeAIContext(userId, 'property_analysis', {
          request,
          analysis,
          timestamp: new Date(),
        });
      }

      return {
        success: true,
        data: analysis,
        confidence: analysis.confidence,
      };

    } catch (error) {
      throw new AIServiceError(
        'Failed to analyze property',
        'PROPERTY_ANALYSIS_ERROR',
        { request, error }
      );
    }
  }

  /**
   * Health check for AI service
   */
  async healthCheck(): Promise<{
    gemini: boolean;
    redis: boolean;
    overall: boolean;
  }> {
    const geminiHealthy = await this.geminiClient.healthCheck();
    let redisHealthy = false;

    try {
      await this.redis.ping();
      redisHealthy = true;
    } catch (error) {
      redisHealthy = false;
    }

    return {
      gemini: geminiHealthy,
      redis: redisHealthy,
      overall: geminiHealthy && redisHealthy,
    };
  }

  /**
   * Get AI service statistics
   */
  async getStatistics(userId?: string): Promise<{
    requestCount: number;
    rateLimit: any;
    cacheStats: any;
  }> {
    const clientId = userId || 'system';
    const rateLimit = this.geminiClient.getRateLimitStatus(clientId);

    // Get cache statistics
    let cacheStats = { totalKeys: 0, memoryUsage: '0B' };
    try {
      const info = await this.redis.info('memory');
      const keyCount = await this.redis.dbsize();
      const memoryMatch = info.match(/used_memory_human:([^\r\n]+)/);
      cacheStats = {
        totalKeys: keyCount,
        memoryUsage: memoryMatch ? memoryMatch[1] : '0B',
      };
    } catch (error) {
      // Ignore cache stats errors
    }

    return {
      requestCount: rateLimit.requestCount,
      rateLimit,
      cacheStats,
    };
  }
}