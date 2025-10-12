import { GoogleGenerativeAI } from '@google/generative-ai';

export class GeminiClient {
  private genAI: GoogleGenerativeAI;
  private model: string;

  constructor(apiKey: string, model: string = 'gemini-2.0-flash-exp') {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = model;
  }

  async generateContent(prompt: string): Promise<string> {
    const model = this.genAI.getGenerativeModel({ model: this.model });
    const result = await model.generateContent(prompt);
    const response = result.response;
    return response.text();
  }

  async generateStructuredContent(prompt: string, schema?: any): Promise<any> {
    const model = this.genAI.getGenerativeModel({ 
      model: this.model,
      generationConfig: schema ? { responseMimeType: 'application/json' } : undefined
    });
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }
}
