import { z } from 'zod';

export const QuoteItemSchema = z.object({
  description: z.string(),
  quantity: z.number().positive(),
  unitPrice: z.number().positive(),
  category: z.enum(['Materials', 'Labor', 'Equipment', 'Permits', 'Contingency']),
});

export type QuoteItem = z.infer<typeof QuoteItemSchema>;

export const HistoricalProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  similarity: z.number().min(0).max(1),
  budget: z.number(),
  actualCost: z.number(),
});

export type HistoricalProject = z.infer<typeof HistoricalProjectSchema>;

export const MarketRatesSchema = z.object({
  carpentry: z.number().optional(),
  electrical: z.number().optional(),
  plumbing: z.number().optional(),
  hvac: z.number().optional(),
  drywall: z.number().optional(),
  painting: z.number().optional(),
  flooring: z.number().optional(),
  cabinetry: z.number().optional(),
});

export type MarketRates = z.infer<typeof MarketRatesSchema>;

export const RiskSchema = z.object({
  description: z.string(),
  impact: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  mitigation: z.string(),
});

export type Risk = z.infer<typeof RiskSchema>;

export const AIQuoteGenerationSchema = z.object({
  items: z.array(QuoteItemSchema),
  subtotal: z.number(),
  historicalProjects: z.array(HistoricalProjectSchema),
  marketRates: MarketRatesSchema,
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  assumptions: z.array(z.string()),
  risks: z.array(RiskSchema),
});

export type AIQuoteGeneration = z.infer<typeof AIQuoteGenerationSchema>;

export interface GenerateQuoteRequest {
  projectType: string;
  scope: string;
  requirements: string;
  constraints?: string;
  profitMargin?: number;
}
