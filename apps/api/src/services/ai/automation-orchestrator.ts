/**
 * AI Automation Orchestrator
 * Central service for AI-powered automation across all ERP modules
 */

import { PrismaClient } from '../../generated/prisma';
import { GeminiClient } from './gemini-client';

export class AutomationOrchestrator {
  constructor(
    private prisma: PrismaClient,
    private geminiClient: GeminiClient
  ) {}

  /**
   * Auto-generate project tasks from description
   */
  async generateProjectTasks(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { customer: true },
    });

    if (!project) throw new Error('Project not found');

    const prompt = `Generate a comprehensive task list for this construction project:
Project: ${project.name}
Description: ${project.description || 'N/A'}
Budget: $${project.budget || 'Not set'}

Return JSON array of tasks with: title, description, estimatedHours, priority (LOW/MEDIUM/HIGH/CRITICAL), dependencies (array of task indices)`;

    const response = await this.geminiClient.generateContent(prompt);
    const tasks = JSON.parse(this.extractJSON(response));

    // Create tasks in database
    for (const task of tasks) {
      await this.prisma.task.create({
        data: {
          projectId,
          title: task.title,
          description: task.description,
          status: 'TODO',
          priority: task.priority,
          estimatedHours: task.estimatedHours,
        },
      });
    }

    return tasks;
  }

  /**
   * Auto-classify and route RFIs
   */
  async classifyRFI(rfiId: string) {
    const rfi = await this.prisma.rFI.findUnique({
      where: { id: rfiId },
      include: { project: true },
    });

    if (!rfi) throw new Error('RFI not found');

    const prompt = `Classify this RFI and suggest routing:
Question: ${rfi.question}
Project: ${rfi.project.name}

Return JSON: { category: string, urgency: "LOW"|"MEDIUM"|"HIGH"|"CRITICAL", suggestedAssignee: string, estimatedResponseTime: number (hours), relatedDocuments: string[] }`;

    const response = await this.geminiClient.generateContent(prompt);
    const classification = JSON.parse(this.extractJSON(response));

    await this.prisma.rFI.update({
      where: { id: rfiId },
      data: {
        priority: classification.urgency,
        // Add custom fields for AI suggestions
      },
    });

    return classification;
  }

  /**
   * Auto-generate meeting notes and action items
   */
  async processMeetingTranscript(transcript: string, projectId: string) {
    const prompt = `Analyze this meeting transcript and extract:
${transcript}

Return JSON: {
  summary: string,
  keyDecisions: string[],
  actionItems: [{ task: string, assignee: string, dueDate: string, priority: string }],
  risks: string[],
  nextSteps: string[]
}`;

    const response = await this.geminiClient.generateContent(prompt);
    const analysis = JSON.parse(this.extractJSON(response));

    // Create tasks from action items
    for (const item of analysis.actionItems) {
      await this.prisma.task.create({
        data: {
          projectId,
          title: item.task,
          description: `From meeting: ${analysis.summary.substring(0, 100)}`,
          status: 'TODO',
          priority: item.priority,
          dueDate: new Date(item.dueDate),
        },
      });
    }

    return analysis;
  }

  /**
   * Smart document classification and filing
   */
  async classifyDocument(fileId: string) {
    const file = await this.prisma.projectFile.findUnique({
      where: { id: fileId },
    });

    if (!file) throw new Error('File not found');

    const prompt = `Classify this document:
Filename: ${file.filename}
Description: ${file.description || 'N/A'}

Return JSON: { category: "CONTRACT"|"PERMIT"|"PHOTO"|"INVOICE"|"DRAWING"|"REPORT"|"OTHER", suggestedTags: string[], extractedData: object }`;

    const response = await this.geminiClient.generateContent(prompt);
    const classification = JSON.parse(this.extractJSON(response));

    await this.prisma.projectFile.update({
      where: { id: fileId },
      data: {
        category: classification.category,
        tags: classification.suggestedTags,
      },
    });

    return classification;
  }

  /**
   * Predictive budget alerts
   */
  async analyzeBudgetHealth(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        expenses: true,
        changeOrders: true,
        purchaseOrders: true,
      },
    });

    if (!project) throw new Error('Project not found');

    const totalSpent = Number(project.actualCost);
    const budget = Number(project.budget || 0);
    const remaining = budget - totalSpent;

    const prompt = `Analyze project budget health:
Budget: $${budget}
Spent: $${totalSpent}
Remaining: $${remaining}
Expenses: ${project.expenses.length}
Change Orders: ${project.changeOrders.length}

Return JSON: { healthScore: number (0-100), risks: string[], recommendations: string[], projectedOverrun: number, confidenceLevel: number }`;

    const response = await this.geminiClient.generateContent(prompt);
    return JSON.parse(this.extractJSON(response));
  }

  /**
   * Auto-generate daily log summaries
   */
  async generateDailyLogSummary(projectId: string, date: Date) {
    const logs = await this.prisma.dailyLog.findMany({
      where: {
        projectId,
        date: {
          gte: new Date(date.setHours(0, 0, 0, 0)),
          lt: new Date(date.setHours(23, 59, 59, 999)),
        },
      },
    });

    const prompt = `Summarize today's construction activities:
${logs.map(l => `- ${l.notes}`).join('\n')}

Return JSON: { summary: string, highlights: string[], concerns: string[], productivity: number (0-100), weatherImpact: string }`;

    const response = await this.geminiClient.generateContent(prompt);
    return JSON.parse(this.extractJSON(response));
  }

  /**
   * Smart email drafting
   */
  async draftEmail(context: {
    type: 'RFI_RESPONSE' | 'CHANGE_ORDER' | 'STATUS_UPDATE' | 'INVOICE';
    recipientRole: string;
    data: any;
  }) {
    const prompt = `Draft a professional construction email:
Type: ${context.type}
Recipient: ${context.recipientRole}
Context: ${JSON.stringify(context.data)}

Return JSON: { subject: string, body: string, tone: string, urgency: string }`;

    const response = await this.geminiClient.generateContent(prompt);
    return JSON.parse(this.extractJSON(response));
  }

  /**
   * Photo analysis and tagging
   */
  async analyzeConstructionPhoto(fileId: string, imageData: string) {
    const prompt = `Analyze this construction site photo and extract:
- What work is being done
- Quality issues or concerns
- Safety hazards
- Progress indicators
- Suggested tags

Return JSON: { description: string, workType: string, qualityIssues: string[], safetyHazards: string[], tags: string[], progressEstimate: number }`;

    const response = await this.geminiClient.generateContent(prompt);
    const analysis = JSON.parse(this.extractJSON(response));

    await this.prisma.projectFile.update({
      where: { id: fileId },
      data: {
        description: analysis.description,
        tags: analysis.tags,
      },
    });

    return analysis;
  }

  /**
   * Automated quote generation
   */
  async generateQuote(projectData: any) {
    const prompt = `Generate a detailed construction quote:
${JSON.stringify(projectData)}

Return JSON: { lineItems: [{ description, quantity, unit, unitPrice, total }], subtotal, tax, total, terms: string, validUntil: string }`;

    const response = await this.geminiClient.generateContent(prompt);
    return JSON.parse(this.extractJSON(response));
  }

  private extractJSON(response: string): string {
    const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    const jsonMatch = cleaned.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    return jsonMatch ? jsonMatch[0].replace(/[\x00-\x1F\x7F]/g, '') : cleaned.trim();
  }
}
