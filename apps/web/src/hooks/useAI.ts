import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

// Types
export interface ExpenseClassification {
  category: 'MATERIALS' | 'EQUIPMENT' | 'LABOR' | 'TRANSPORTATION' | 'PERMITS' | 'UTILITIES' | 'INSURANCE' | 'OTHER';
  confidence: number;
  reasoning: string;
  extractedAmount?: number | null;
  extractedDescription?: string | null;
  extractedDate?: string | null;
  extractedSupplier?: string | null;
}

export interface TimeEntrySuggestion {
  suggestedHours: number;
  suggestedDescription: string;
  confidence: number;
  reasoning: string;
  projectPhase?: string;
  category?: string;
}

export interface ProjectRiskAssessment {
  overallRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  budgetVariance: number;
  scheduleVariance: number;
  risks: Array<{
    type: string;
    description: string;
    impact: 'LOW' | 'MEDIUM' | 'HIGH';
    probability: 'LOW' | 'MEDIUM' | 'HIGH';
    mitigation: string;
  }>;
  recommendations: string[];
  confidence: number;
}

export interface VoiceProcessing {
  transcription: string;
  intent: string;
  entities: Record<string, unknown>;
  confidence: number;
  actionable: boolean;
}

export interface AIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  confidence?: number;
  reasoning?: string;
}

export interface AIHealthStatus {
  gemini: boolean;
  redis: boolean;
  overall: boolean;
}

export interface AIStatistics {
  requestCount: number;
  rateLimit: {
    requestCount: number;
    limit: number;
    windowStart: number;
    remaining: number;
  };
  cacheStats: {
    totalKeys: number;
    memoryUsage: string;
  };
}

// Expense categorization hook
export function useCategorizeExpense() {
  return useMutation<
    AIResponse<ExpenseClassification>,
    Error,
    {
      description: string;
      amount?: number;
      date?: string;
      receiptImage?: string;
      projectId?: string;
    }
  >({
    mutationFn: async (data) => {
      const response = await apiClient.post('/ai/categorize-expense', data);
      return response.data;
    },
  });
}

// Time allocation suggestion hook
export function useSuggestTimeAllocation() {
  return useMutation<
    AIResponse<TimeEntrySuggestion>,
    Error,
    {
      taskDescription: string;
      projectPhase?: string;
      teamSize?: number;
      projectId?: string;
    }
  >({
    mutationFn: async (data) => {
      const response = await apiClient.post('/ai/suggest-time', data);
      return response.data;
    },
  });
}

// Project risk assessment hook
export function useProjectRiskAssessment(projectId?: string, enabled = false) {
  return useQuery<AIResponse<ProjectRiskAssessment>, Error>({
    queryKey: ['ai', 'risk-assessment', projectId],
    queryFn: async () => {
      const response = await apiClient.get(`/ai/assess-risk/${projectId}`);
      return response.data;
    },
    enabled: enabled && !!projectId,
  });
}

// Voice command processing hook
export function useProcessVoiceCommand() {
  return useMutation<
    AIResponse<VoiceProcessing>,
    Error,
    {
      transcription: string;
      context?: Record<string, unknown>;
    }
  >({
    mutationFn: async (data) => {
      const response = await apiClient.post('/ai/process-voice', data);
      return response.data;
    },
  });
}

// Construction image analysis hook
export function useAnalyzeConstructionImage() {
  return useMutation<
    AIResponse<string>,
    Error,
    {
      imageData: string;
      analysisType: 'PROGRESS' | 'SAFETY' | 'QUALITY' | 'MATERIALS' | 'COMPLIANCE';
      context?: string;
    }
  >({
    mutationFn: async (data) => {
      const response = await apiClient.post('/ai/analyze-image', data);
      return response.data;
    },
  });
}

// AI service health check hook
export function useAIHealthCheck(enabled = true) {
  return useQuery<AIHealthStatus, Error>({
    queryKey: ['ai', 'health'],
    queryFn: async () => {
      const response = await apiClient.get('/ai/health');
      return response.data;
    },
    enabled,
    refetchInterval: 60000, // Check every minute
  });
}

// AI service statistics hook
export function useAIStatistics(enabled = false) {
  return useQuery<AIStatistics, Error>({
    queryKey: ['ai', 'statistics'],
    queryFn: async () => {
      const response = await apiClient.get('/ai/stats');
      return response.data;
    },
    enabled,
  });
}

// Helper function to convert image to base64
export async function imageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data:image/...;base64, prefix
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
}

// Helper function to get risk color
export function getRiskColor(risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'): string {
  const colors = {
    LOW: 'text-green-600 bg-green-100',
    MEDIUM: 'text-yellow-600 bg-yellow-100',
    HIGH: 'text-orange-600 bg-orange-100',
    CRITICAL: 'text-red-600 bg-red-100',
  };
  return colors[risk];
}

// Helper function to format confidence percentage
export function formatConfidence(confidence: number): string {
  return `${(confidence * 100).toFixed(0)}%`;
}
