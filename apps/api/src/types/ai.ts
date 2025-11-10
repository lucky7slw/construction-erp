import { z } from 'zod';
import { ExpenseCategory } from '@prisma/client';

// AI Service Types
export const AIResponseSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
  reasoning: z.string().optional(),
});

export type AIResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  confidence?: number;
  reasoning?: string;
};

// Expense Classification Types
export const ExpenseClassificationSchema = z.object({
  category: z.enum(['MATERIALS', 'EQUIPMENT', 'LABOR', 'TRANSPORTATION', 'PERMITS', 'UTILITIES', 'INSURANCE', 'OTHER']),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  extractedAmount: z.number().nullable().optional(),
  extractedDescription: z.string().nullable().optional(),
  extractedDate: z.string().nullable().optional(),
  extractedSupplier: z.string().nullable().optional(),
});

export type ExpenseClassification = z.infer<typeof ExpenseClassificationSchema>;

// Time Entry Suggestion Types
export const TimeEntrySuggestionSchema = z.object({
  suggestedHours: z.number().positive(),
  suggestedDescription: z.string(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  projectPhase: z.string().optional(),
  category: z.string().optional(),
});

export type TimeEntrySuggestion = z.infer<typeof TimeEntrySuggestionSchema>;

// Project Analytics Types
export const ProjectRiskAssessmentSchema = z.object({
  overallRisk: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  budgetVariance: z.number(),
  scheduleVariance: z.number(),
  risks: z.array(z.object({
    type: z.string(),
    description: z.string(),
    impact: z.enum(['LOW', 'MEDIUM', 'HIGH']),
    probability: z.enum(['LOW', 'MEDIUM', 'HIGH']),
    mitigation: z.string(),
  })),
  recommendations: z.array(z.string()),
  confidence: z.number().min(0).max(1),
});

export type ProjectRiskAssessment = z.infer<typeof ProjectRiskAssessmentSchema>;

// Context Management Types
export const AIContextSchema = z.object({
  userId: z.string(),
  companyId: z.string(),
  projectId: z.string().optional(),
  context: z.record(z.unknown()),
  createdAt: z.date(),
  expiresAt: z.date(),
});

export type AIContext = z.infer<typeof AIContextSchema>;

// Voice Processing Types
export const VoiceProcessingSchema = z.object({
  transcription: z.string(),
  intent: z.string(),
  entities: z.record(z.unknown()),
  confidence: z.number().min(0).max(1),
  actionable: z.boolean(),
});

export type VoiceProcessing = z.infer<typeof VoiceProcessingSchema>;

// Prompt Template Types
export const PromptTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  template: z.string(),
  variables: z.array(z.string()),
  category: z.string(),
  version: z.string(),
  description: z.string().optional(),
});

export type PromptTemplate = z.infer<typeof PromptTemplateSchema>;

// AI Service Configuration
export const AIConfigSchema = z.object({
  geminiApiKey: z.string(),
  model: z.string().default('gemini-1.5-flash'),
  maxTokens: z.number().default(4096),
  temperature: z.number().min(0).max(2).default(0.7),
  rateLimitPerMinute: z.number().default(60),
  cacheEnabled: z.boolean().default(true),
  cacheTtlSeconds: z.number().default(3600),
});

export type AIConfig = z.infer<typeof AIConfigSchema>;

// Error Types
export class AIServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AIServiceError';
  }
}

export class GeminiAPIError extends AIServiceError {
  constructor(message: string, details?: unknown) {
    super(message, 'GEMINI_API_ERROR', details);
  }
}

export class PromptError extends AIServiceError {
  constructor(message: string, details?: unknown) {
    super(message, 'PROMPT_ERROR', details);
  }
}

export class CacheError extends AIServiceError {
  constructor(message: string, details?: unknown) {
    super(message, 'CACHE_ERROR', details);
  }
}

// Property Market Analysis Types
export const PropertyMarketAnalysisRequestSchema = z.object({
  address: z.string().min(1),
  squareFeet: z.number().positive(),
  bedrooms: z.number().int().positive(),
  bathrooms: z.number().positive(),
  propertyType: z.enum(['SINGLE_FAMILY', 'CONDO', 'TOWNHOUSE', 'MULTI_FAMILY', 'LAND', 'COMMERCIAL', 'OTHER']),
  yearBuilt: z.number().int().optional(),
  lotSize: z.number().positive().optional(),
  purchasePrice: z.number().positive().optional(),
  renovationBudget: z.number().positive().optional(),
});

export type PropertyMarketAnalysisRequest = z.infer<typeof PropertyMarketAnalysisRequestSchema>;

export const PropertyMarketAnalysisSchema = z.object({
  // Sale Analysis
  estimatedMarketValue: z.number(),
  estimatedARV: z.number(), // After Repair Value
  saleRecommendation: z.enum(['STRONG_BUY', 'BUY', 'HOLD', 'SELL', 'AVOID']),
  salePriceRange: z.object({
    low: z.number(),
    mid: z.number(),
    high: z.number(),
  }),
  daysOnMarket: z.number(),
  marketTrend: z.enum(['RISING', 'STABLE', 'DECLINING']),

  // Rental Analysis
  estimatedMonthlyRent: z.number(),
  rentalYield: z.number(), // Annual percentage
  rentPriceRange: z.object({
    low: z.number(),
    mid: z.number(),
    high: z.number(),
  }),
  occupancyRate: z.number(), // Percentage
  rentalDemand: z.enum(['HIGH', 'MEDIUM', 'LOW']),

  // Comparative Analysis
  sellVsRentRecommendation: z.enum(['SELL', 'RENT', 'NEUTRAL']),
  sellVsRentReasoning: z.string(),

  // ROI Calculations
  projectedSaleROI: z.number(), // Percentage
  projectedRentalROI: z.number(), // Percentage including cash flow
  breakEvenMonths: z.number().optional(), // For rental

  // Market Insights
  neighborhoodScore: z.number().min(1).max(10),
  comparableProperties: z.array(z.object({
    address: z.string(),
    price: z.number(),
    squareFeet: z.number(),
    bedrooms: z.number(),
    bathrooms: z.number(),
    daysOnMarket: z.number(),
  })).max(5),
  marketInsights: z.array(z.string()),
  risks: z.array(z.string()),
  opportunities: z.array(z.string()),

  confidence: z.number().min(0).max(1),
  dataSource: z.string(),
  analysisDate: z.string(),
});

export type PropertyMarketAnalysis = z.infer<typeof PropertyMarketAnalysisSchema>;