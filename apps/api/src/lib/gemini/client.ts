import { GoogleGenerativeAI, GenerativeModel, GenerationConfig } from '@google/generative-ai';
import { AIConfig, GeminiAPIError } from '../../types/ai';

export class GeminiClient {
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;
  private config: AIConfig;
  private requestCount: Map<string, number> = new Map();
  private rateLimitWindow: Map<string, number> = new Map();

  constructor(config: AIConfig) {
    this.config = config;
    this.genAI = new GoogleGenerativeAI(config.geminiApiKey);
    this.model = this.genAI.getGenerativeModel({
      model: config.model,
      generationConfig: {
        maxOutputTokens: config.maxTokens,
        temperature: config.temperature,
      }
    });
  }

  /**
   * Check rate limiting for a user/client
   */
  private checkRateLimit(clientId: string): boolean {
    const now = Date.now();
    const windowStart = this.rateLimitWindow.get(clientId) || 0;
    const currentCount = this.requestCount.get(clientId) || 0;

    // Reset window if 1 minute has passed
    if (now - windowStart >= 60000) {
      this.rateLimitWindow.set(clientId, now);
      this.requestCount.set(clientId, 0);
      return true;
    }

    // Check if within rate limit
    return currentCount < this.config.rateLimitPerMinute;
  }

  /**
   * Increment rate limit counter
   */
  private incrementRateLimit(clientId: string): void {
    const currentCount = this.requestCount.get(clientId) || 0;
    this.requestCount.set(clientId, currentCount + 1);
  }

  /**
   * Generate content with error handling and rate limiting
   */
  async generateContent(
    prompt: string,
    clientId: string = 'default',
    options?: {
      maxRetries?: number;
      retryDelay?: number;
    }
  ): Promise<string> {
    // Check rate limiting
    if (!this.checkRateLimit(clientId)) {
      throw new GeminiAPIError(
        'Rate limit exceeded. Please wait before making another request.',
        { clientId, rateLimit: this.config.rateLimitPerMinute }
      );
    }

    const maxRetries = options?.maxRetries || 3;
    const retryDelay = options?.retryDelay || 1000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.incrementRateLimit(clientId);

        const result = await this.model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        if (!text) {
          throw new GeminiAPIError('Empty response from Gemini API');
        }

        return text;
      } catch (error) {
        const isLastAttempt = attempt === maxRetries;

        if (error instanceof GeminiAPIError) {
          throw error;
        }

        if (isLastAttempt) {
          throw new GeminiAPIError(
            `Failed to generate content after ${maxRetries} attempts`,
            { originalError: error, attempt }
          );
        }

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
      }
    }

    throw new GeminiAPIError('Unexpected error in generateContent');
  }

  /**
   * Analyze image with text prompt
   */
  async analyzeImage(
    imageData: string,
    prompt: string,
    clientId: string = 'default',
    mimeType: string = 'image/jpeg'
  ): Promise<string> {
    if (!this.checkRateLimit(clientId)) {
      throw new GeminiAPIError(
        'Rate limit exceeded. Please wait before making another request.',
        { clientId, rateLimit: this.config.rateLimitPerMinute }
      );
    }

    try {
      this.incrementRateLimit(clientId);

      const imagePart = {
        inlineData: {
          data: imageData,
          mimeType,
        },
      };

      const result = await this.model.generateContent([prompt, imagePart]);
      const response = await result.response;
      const text = response.text();

      if (!text) {
        throw new GeminiAPIError('Empty response from Gemini API for image analysis');
      }

      return text;
    } catch (error) {
      throw new GeminiAPIError(
        'Failed to analyze image',
        { originalError: error, mimeType }
      );
    }
  }

  /**
   * Get current rate limit status
   */
  getRateLimitStatus(clientId: string): {
    requestCount: number;
    limit: number;
    windowStart: number;
    remaining: number;
  } {
    const requestCount = this.requestCount.get(clientId) || 0;
    const windowStart = this.rateLimitWindow.get(clientId) || Date.now();
    const remaining = Math.max(0, this.config.rateLimitPerMinute - requestCount);

    return {
      requestCount,
      limit: this.config.rateLimitPerMinute,
      windowStart,
      remaining,
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<AIConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // Recreate model if necessary
    if (newConfig.model || newConfig.maxTokens || newConfig.temperature) {
      this.model = this.genAI.getGenerativeModel({
        model: this.config.model,
        generationConfig: {
          maxOutputTokens: this.config.maxTokens,
          temperature: this.config.temperature,
        }
      });
    }
  }

  /**
   * Health check for Gemini API
   */
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.generateContent(
        'Respond with "OK" to confirm the API is working.',
        'health-check'
      );
      return result.trim().toLowerCase() === 'ok';
    } catch (error) {
      console.error('Gemini health check failed:', error);
      return false;
    }
  }
}