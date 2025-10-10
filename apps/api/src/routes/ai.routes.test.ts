import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { build } from '../test-helpers/app-builder';
import { ExpenseCategory } from '@prisma/client';

describe('AI Routes', () => {
  let app: FastifyInstance;
  let mockAIService: any;
  let authToken: string;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Create mock AI service
    mockAIService = {
      categorizeExpense: vi.fn(),
      suggestTimeAllocation: vi.fn(),
      assessProjectRisk: vi.fn(),
      processVoiceCommand: vi.fn(),
      analyzeConstructionImage: vi.fn(),
      healthCheck: vi.fn(),
      getStatistics: vi.fn(),
    };

    // Build test app with AI routes
    app = build({
      aiService: mockAIService,
    });

    await app.ready();

    // Get auth token for protected routes
    authToken = 'Bearer test-jwt-token';
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /api/v1/ai/categorize-expense', () => {
    it('should categorize expense successfully', async () => {
      // Arrange
      const requestBody = {
        description: 'Lumber purchase for framing',
        amount: 250.50,
        date: '2024-01-15',
        projectId: 'project123',
      };

      const mockResponse = {
        success: true,
        data: {
          category: 'MATERIALS',
          confidence: 0.95,
          reasoning: 'Lumber is clearly construction materials',
          extractedAmount: 250.50,
          extractedDescription: 'Lumber purchase for framing',
          extractedDate: '2024-01-15',
          extractedSupplier: null,
        },
        confidence: 0.95,
      };

      mockAIService.categorizeExpense.mockResolvedValue(mockResponse);

      // Act
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/ai/categorize-expense',
        headers: {
          authorization: authToken,
        },
        payload: requestBody,
      });

      // Assert
      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      expect(result.success).toBe(true);
      expect(result.data.category).toBe('MATERIALS');
      expect(result.data.confidence).toBe(0.95);

      // Verify service was called correctly
      expect(mockAIService.categorizeExpense).toHaveBeenCalledWith(
        requestBody.description,
        requestBody.amount,
        requestBody.date,
        undefined, // receiptImage
        expect.any(String), // userId
        requestBody.projectId
      );
    });

    it('should require authentication', async () => {
      // Act
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/ai/categorize-expense',
        payload: {
          description: 'Test expense',
        },
      });

      // Assert
      expect(response.statusCode).toBe(401);
    });

    it('should validate required fields', async () => {
      // Act
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/ai/categorize-expense',
        headers: {
          authorization: authToken,
        },
        payload: {
          // Missing description
          amount: 100,
        },
      });

      // Assert
      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /api/v1/ai/health', () => {
    it('should return health status', async () => {
      // Arrange
      const mockHealth = {
        gemini: true,
        redis: true,
        overall: true,
      };

      mockAIService.healthCheck.mockResolvedValue(mockHealth);

      // Act
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/ai/health',
      });

      // Assert
      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      expect(result.gemini).toBe(true);
      expect(result.redis).toBe(true);
      expect(result.overall).toBe(true);
    });
  });
});