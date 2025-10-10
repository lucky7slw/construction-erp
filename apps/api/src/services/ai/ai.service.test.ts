import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AIService } from './ai.service';
import { AIConfig } from '../../types/ai';
import { ExpenseCategory } from '@prisma/client';

describe('AIService', () => {
  let aiService: AIService;
  let mockPrisma: any;
  let mockRedis: any;
  let mockGeminiClient: any;
  let mockConfig: AIConfig;

  beforeEach(() => {
    // Create mock instances
    mockPrisma = {
      project: {
        findUnique: vi.fn(),
      },
      timeEntry: {
        findMany: vi.fn(),
      },
    };

    mockRedis = {
      setex: vi.fn(),
      ping: vi.fn(),
      info: vi.fn(),
      dbsize: vi.fn(),
    };

    mockGeminiClient = {
      generateContent: vi.fn(),
      analyzeImage: vi.fn(),
      healthCheck: vi.fn(),
      getRateLimitStatus: vi.fn(),
    };

    mockConfig = {
      geminiApiKey: 'test-api-key',
      model: 'gemini-1.5-flash',
      maxTokens: 4096,
      temperature: 0.7,
      rateLimitPerMinute: 60,
      cacheEnabled: true,
      cacheTtlSeconds: 3600,
    };

    // Create AI service with mocks
    aiService = new AIService(mockPrisma, mockRedis, mockConfig);
    // Manually inject the mocked GeminiClient
    (aiService as any).geminiClient = mockGeminiClient;
  });

  describe('categorizeExpense', () => {
    it('should categorize expense from description with high confidence', async () => {
      // Arrange
      const description = 'Purchased lumber for framing - 2x4 studs';
      const amount = 250.50;
      const date = '2024-01-15';
      const userId = 'user123';

      const mockResponse = JSON.stringify({
        category: 'MATERIALS',
        confidence: 0.95,
        reasoning: 'Lumber is clearly construction materials used for framing',
        extractedAmount: 250.50,
        extractedDescription: 'Lumber for framing - 2x4 studs',
        extractedDate: '2024-01-15',
        extractedSupplier: null,
      });

      mockGeminiClient.generateContent.mockResolvedValue(mockResponse);
      mockRedis.setex.mockResolvedValue('OK');

      // Act
      const result = await aiService.categorizeExpense(
        description,
        amount,
        date,
        undefined,
        userId
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.category).toBe('MATERIALS');
      expect(result.data?.confidence).toBe(0.95);
      expect(result.data?.reasoning.toLowerCase()).toContain('lumber');
      expect(result.confidence).toBe(0.95);

      // Verify AI client was called with proper prompt
      expect(mockGeminiClient.generateContent).toHaveBeenCalledWith(
        expect.stringContaining(description),
        userId
      );

      // Verify context was stored
      expect(mockRedis.setex).toHaveBeenCalledWith(
        expect.stringMatching(/ai_context:user123:expense_categorization:/),
        604800, // 7 days
        expect.stringContaining('MATERIALS')
      );
    });

    it('should categorize expense with receipt image analysis', async () => {
      // Arrange
      const description = 'Tools purchased';
      const receiptImage = 'base64-image-data';
      const userId = 'user123';

      const mockResponse = JSON.stringify({
        category: 'EQUIPMENT',
        confidence: 0.88,
        reasoning: 'Receipt shows tools and equipment purchases',
        extractedAmount: 125.99,
        extractedDescription: 'Hammer drill and bits',
        extractedDate: '2024-01-15',
        extractedSupplier: 'Home Depot',
      });

      mockGeminiClient.analyzeImage.mockResolvedValue(mockResponse);
      mockRedis.setex.mockResolvedValue('OK');

      // Act
      const result = await aiService.categorizeExpense(
        description,
        undefined,
        undefined,
        receiptImage,
        userId
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.category).toBe('EQUIPMENT');
      expect(result.data?.extractedSupplier).toBe('Home Depot');

      // Verify image analysis was called
      expect(mockGeminiClient.analyzeImage).toHaveBeenCalledWith(
        receiptImage,
        expect.stringContaining(description),
        userId
      );
    });

    it('should include project context when projectId is provided', async () => {
      // Arrange
      const description = 'Materials for kitchen renovation';
      const projectId = 'project123';
      const userId = 'user123';

      const mockProject = {
        id: projectId,
        name: 'Kitchen Renovation',
        description: 'Full kitchen remodel',
        status: 'ACTIVE',
      };

      const mockResponse = JSON.stringify({
        category: 'MATERIALS',
        confidence: 0.92,
        reasoning: 'Kitchen renovation materials',
        extractedAmount: null,
        extractedDescription: 'Materials for kitchen renovation',
        extractedDate: null,
        extractedSupplier: null,
      });

      mockPrisma.project.findUnique.mockResolvedValue(mockProject);
      mockGeminiClient.generateContent.mockResolvedValue(mockResponse);
      mockRedis.setex.mockResolvedValue('OK');

      // Act
      const result = await aiService.categorizeExpense(
        description,
        undefined,
        undefined,
        undefined,
        userId,
        projectId
      );

      // Assert
      expect(result.success).toBe(true);
      expect(mockPrisma.project.findUnique).toHaveBeenCalledWith({
        where: { id: projectId },
        select: { name: true, description: true, status: true },
      });

      // Verify prompt includes project context
      expect(mockGeminiClient.generateContent).toHaveBeenCalledWith(
        expect.stringContaining('Kitchen Renovation'),
        userId
      );
    });

    it('should handle invalid JSON response from AI', async () => {
      // Arrange
      const description = 'Test expense';
      const invalidResponse = 'This is not JSON response';

      mockGeminiClient.generateContent.mockResolvedValue(invalidResponse);

      // Act & Assert
      await expect(
        aiService.categorizeExpense(description)
      ).rejects.toThrow('No valid JSON found in AI response');
    });
  });

  describe('suggestTimeAllocation', () => {
    it('should suggest time allocation for construction task', async () => {
      // Arrange
      const taskDescription = 'Install drywall in living room';
      const projectPhase = 'FINISHES';
      const teamSize = 2;
      const userId = 'user123';

      const mockResponse = JSON.stringify({
        suggestedHours: 16.0,
        suggestedDescription: 'Install drywall in living room - includes cutting, hanging, and initial finishing',
        confidence: 0.85,
        reasoning: 'Based on team size and typical drywall installation rates',
        projectPhase: 'FINISHES',
        category: 'Interior work',
      });

      mockGeminiClient.generateContent.mockResolvedValue(mockResponse);
      mockRedis.setex.mockResolvedValue('OK');

      // Act
      const result = await aiService.suggestTimeAllocation(
        taskDescription,
        projectPhase,
        teamSize,
        userId
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.suggestedHours).toBe(16.0);
      expect(result.data?.projectPhase).toBe('FINISHES');
      expect(result.data?.confidence).toBe(0.85);

      // Verify prompt includes task details
      expect(mockGeminiClient.generateContent).toHaveBeenCalledWith(
        expect.stringContaining(taskDescription),
        userId
      );
    });
  });

  describe('healthCheck', () => {
    it('should return health status for all services', async () => {
      // Arrange
      mockGeminiClient.healthCheck.mockResolvedValue(true);
      mockRedis.ping.mockResolvedValue('PONG');

      // Act
      const result = await aiService.healthCheck();

      // Assert
      expect(result.gemini).toBe(true);
      expect(result.redis).toBe(true);
      expect(result.overall).toBe(true);
    });

    it('should handle service failures', async () => {
      // Arrange
      mockGeminiClient.healthCheck.mockResolvedValue(false);
      mockRedis.ping.mockRejectedValue(new Error('Redis unavailable'));

      // Act
      const result = await aiService.healthCheck();

      // Assert
      expect(result.gemini).toBe(false);
      expect(result.redis).toBe(false);
      expect(result.overall).toBe(false);
    });
  });

  describe('getStatistics', () => {
    it('should return AI service statistics', async () => {
      // Arrange
      const userId = 'user123';
      const mockRateLimit = {
        requestCount: 15,
        limit: 60,
        windowStart: Date.now(),
        remaining: 45,
      };

      mockGeminiClient.getRateLimitStatus.mockReturnValue(mockRateLimit);
      mockRedis.info.mockResolvedValue('used_memory_human:2.5M');
      mockRedis.dbsize.mockResolvedValue(1250);

      // Act
      const result = await aiService.getStatistics(userId);

      // Assert
      expect(result.requestCount).toBe(15);
      expect(result.rateLimit).toEqual(mockRateLimit);
      expect(result.cacheStats.totalKeys).toBe(1250);
      expect(result.cacheStats.memoryUsage).toBe('2.5M');
    });
  });
});