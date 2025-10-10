import { z } from 'zod';
import {
  LeadStatus,
  LeadSource,
  InteractionType,
  FollowUpStatus,
  ApprovalStatus,
} from '../generated/prisma';

// Lead Management Types
export const CreateLeadSchema = z.object({
  companyId: z.string(),
  customerId: z.string().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.nativeEnum(LeadStatus).default('NEW' as LeadStatus),
  source: z.nativeEnum(LeadSource),
  value: z.number().positive().optional(),
  probability: z.number().min(0).max(100).default(50),
  expectedCloseDate: z.coerce.date().optional(),
  contactName: z.string().min(1),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  contactAddress: z.string().optional(),
  assignedToId: z.string().optional(),
});

export type CreateLead = z.infer<typeof CreateLeadSchema>;

export const UpdateLeadSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.nativeEnum(LeadStatus).optional(),
  source: z.nativeEnum(LeadSource).optional(),
  value: z.number().positive().optional(),
  probability: z.number().min(0).max(100).optional(),
  expectedCloseDate: z.coerce.date().optional(),
  contactName: z.string().min(1).optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  contactAddress: z.string().optional(),
  assignedToId: z.string().optional(),
  lostReason: z.string().optional(),
});

export type UpdateLead = z.infer<typeof UpdateLeadSchema>;

export const LeadQualificationSchema = z.object({
  score: z.number().min(0).max(100),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  factors: z.array(z.object({
    name: z.string(),
    weight: z.number(),
    score: z.number(),
    reason: z.string(),
  })),
  recommendations: z.array(z.string()),
});

export type LeadQualification = z.infer<typeof LeadQualificationSchema>;

// Customer Interaction Types
export const CreateInteractionSchema = z.object({
  customerId: z.string(),
  leadId: z.string().optional(),
  type: z.nativeEnum(InteractionType),
  subject: z.string().min(1),
  content: z.string().optional(),
  direction: z.enum(['inbound', 'outbound']).optional(),
  duration: z.number().positive().optional(),
  outcome: z.string().optional(),
  occurredAt: z.coerce.date().optional(),
});

export type CreateInteraction = z.infer<typeof CreateInteractionSchema>;

// Follow-up Task Types
export const CreateFollowUpSchema = z.object({
  leadId: z.string(),
  title: z.string().min(1),
  description: z.string().optional(),
  dueDate: z.coerce.date(),
});

export type CreateFollowUp = z.infer<typeof CreateFollowUpSchema>;

export const UpdateFollowUpSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.nativeEnum(FollowUpStatus).optional(),
  dueDate: z.coerce.date().optional(),
  completedAt: z.coerce.date().optional(),
});

export type UpdateFollowUp = z.infer<typeof UpdateFollowUpSchema>;

// Quote Generation Types
export const QuoteGenerationRequestSchema = z.object({
  companyId: z.string(),
  customerId: z.string(),
  leadId: z.string().optional(),
  projectId: z.string().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  projectType: z.string(),
  scope: z.string(),
  requirements: z.array(z.string()),
  constraints: z.object({
    budget: z.number().positive().optional(),
    timeline: z.string().optional(),
    materials: z.array(z.string()).optional(),
  }).optional(),
  taxRate: z.number().min(0).max(1).default(0),
  profitMargin: z.number().min(0).max(100).default(20),
  validityDays: z.number().positive().default(30),
});

export type QuoteGenerationRequest = z.infer<typeof QuoteGenerationRequestSchema>;

export const QuoteItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().positive(),
  category: z.string().optional(),
});

export type QuoteItem = z.infer<typeof QuoteItemSchema>;

export const GeneratedQuoteSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  items: z.array(QuoteItemSchema),
  subtotal: z.number().positive(),
  taxRate: z.number().min(0).max(1),
  taxAmount: z.number().nonnegative(),
  total: z.number().positive(),
  profitMargin: z.number().min(0).max(100),
  validUntil: z.coerce.date(),
  aiAnalysisData: z.object({
    historicalProjects: z.array(z.object({
      id: z.string(),
      name: z.string(),
      similarity: z.number(),
      budget: z.number(),
      actualCost: z.number(),
    })),
    marketRates: z.record(z.number()),
    confidence: z.number().min(0).max(1),
    reasoning: z.string(),
    assumptions: z.array(z.string()),
    risks: z.array(z.object({
      description: z.string(),
      impact: z.enum(['LOW', 'MEDIUM', 'HIGH']),
      mitigation: z.string(),
    })),
  }),
  generationTime: z.number().positive(),
});

export type GeneratedQuote = z.infer<typeof GeneratedQuoteSchema>;

// Quote Approval Types
export const CreateQuoteApprovalSchema = z.object({
  quoteId: z.string(),
  approverId: z.string(),
  comments: z.string().optional(),
});

export type CreateQuoteApproval = z.infer<typeof CreateQuoteApprovalSchema>;

export const UpdateQuoteApprovalSchema = z.object({
  status: z.nativeEnum(ApprovalStatus),
  comments: z.string().optional(),
});

export type UpdateQuoteApproval = z.infer<typeof UpdateQuoteApprovalSchema>;

// Quote Version Types
export const CreateQuoteVersionSchema = z.object({
  quoteId: z.string(),
  changeReason: z.string().optional(),
});

export type CreateQuoteVersion = z.infer<typeof CreateQuoteVersionSchema>;

// Pipeline Analytics Types
export const PipelineMetricsSchema = z.object({
  totalLeads: z.number(),
  leadsByStatus: z.record(z.number()),
  totalValue: z.number(),
  averageValue: z.number(),
  conversionRate: z.number().min(0).max(100),
  averageCycleTime: z.number(),
  topSources: z.array(z.object({
    source: z.string(),
    count: z.number(),
    conversionRate: z.number(),
  })),
  forecastedRevenue: z.number(),
});

export type PipelineMetrics = z.infer<typeof PipelineMetricsSchema>;

// Error Types
export class CRMServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'CRMServiceError';
  }
}

export class QuoteGenerationError extends CRMServiceError {
  constructor(message: string, details?: unknown) {
    super(message, 'QUOTE_GENERATION_ERROR', details);
  }
}

export class LeadValidationError extends CRMServiceError {
  constructor(message: string, details?: unknown) {
    super(message, 'LEAD_VALIDATION_ERROR', details);
  }
}

export class ApprovalError extends CRMServiceError {
  constructor(message: string, details?: unknown) {
    super(message, 'APPROVAL_ERROR', details);
  }
}