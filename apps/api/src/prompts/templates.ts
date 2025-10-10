import { PromptTemplate } from '../types/ai';

export const PROMPT_TEMPLATES: Record<string, PromptTemplate> = {
  EXPENSE_CATEGORIZATION: {
    id: 'expense_categorization',
    name: 'Expense Categorization',
    category: 'classification',
    version: '1.0.0',
    description: 'Categorizes construction expenses from receipts and descriptions',
    variables: ['description', 'amount', 'date', 'context'],
    template: `
You are an expert construction accountant. Analyze the following expense and categorize it accurately.

EXPENSE DETAILS:
Description: {{description}}
Amount: {{amount}}
Date: {{date}}
{{#context}}
Project Context: {{context}}
{{/context}}

AVAILABLE CATEGORIES:
- MATERIALS: Construction supplies, lumber, concrete, steel, hardware, paint, etc.
- EQUIPMENT: Tools, machinery, equipment rentals, vehicle costs
- LABOR: Wages, subcontractor payments, benefits
- TRANSPORTATION: Fuel, delivery, shipping, vehicle maintenance
- PERMITS: Building permits, inspection fees, regulatory costs
- UTILITIES: Electricity, water, gas, internet, phone
- INSURANCE: General liability, workers comp, equipment insurance
- OTHER: Office supplies, professional services, miscellaneous

INSTRUCTIONS:
1. Analyze the expense description and context
2. Consider construction industry standards
3. Provide confidence score (0.0-1.0)
4. Extract additional details if available
5. Explain your reasoning

RESPOND WITH VALID JSON:
{
  "category": "CATEGORY_NAME",
  "confidence": 0.95,
  "reasoning": "Clear explanation of why this category was chosen",
  "extractedAmount": 123.45,
  "extractedDescription": "Cleaned description",
  "extractedDate": "2024-01-15",
  "extractedSupplier": "Supplier name if found"
}
`
  },

  TIME_ALLOCATION_SUGGESTION: {
    id: 'time_allocation_suggestion',
    name: 'Time Allocation Suggestion',
    category: 'suggestion',
    version: '1.0.0',
    description: 'Suggests time allocation for construction tasks',
    variables: ['taskDescription', 'projectPhase', 'historicalData', 'teamSize'],
    template: `
You are a construction project manager expert. Analyze the task and suggest appropriate time allocation.

TASK DETAILS:
Description: {{taskDescription}}
Project Phase: {{projectPhase}}
Team Size: {{teamSize}}
{{#historicalData}}
Historical Data: {{historicalData}}
{{/historicalData}}

CONSTRUCTION PHASES:
- PLANNING: Design, permits, scheduling
- SITE_PREP: Excavation, clearing, utilities
- FOUNDATION: Footings, basement, slab
- FRAMING: Structure, walls, roof
- MEP: Mechanical, electrical, plumbing
- FINISHES: Drywall, flooring, painting
- CLEANUP: Final inspection, cleanup

INSTRUCTIONS:
1. Consider task complexity and construction standards
2. Factor in team size and experience
3. Account for potential delays and quality checks
4. Use industry benchmarks and best practices
5. Provide realistic time estimates

RESPOND WITH VALID JSON:
{
  "suggestedHours": 8.5,
  "suggestedDescription": "Enhanced task description",
  "confidence": 0.85,
  "reasoning": "Detailed explanation of time estimate",
  "projectPhase": "FRAMING",
  "category": "Structural work"
}
`
  },

  PROJECT_RISK_ASSESSMENT: {
    id: 'project_risk_assessment',
    name: 'Project Risk Assessment',
    category: 'analytics',
    version: '1.0.0',
    description: 'Analyzes project risks and provides recommendations',
    variables: ['projectData', 'budget', 'timeline', 'expenses', 'timeEntries'],
    template: `
You are a senior construction project manager and risk analyst. Analyze this project and identify risks.

PROJECT DATA:
{{projectData}}

BUDGET ANALYSIS:
Budget: {{budget}}
Current Expenses: {{expenses}}

TIMELINE ANALYSIS:
{{timeline}}

TIME TRACKING:
{{timeEntries}}

RISK CATEGORIES:
- Budget overrun
- Schedule delays
- Resource shortages
- Weather impact
- Quality issues
- Safety concerns
- Regulatory compliance
- Supply chain disruption

INSTRUCTIONS:
1. Calculate budget and schedule variance
2. Identify specific risks based on data patterns
3. Assess probability and impact of each risk
4. Provide actionable mitigation strategies
5. Give overall risk rating

RESPOND WITH VALID JSON:
{
  "overallRisk": "MEDIUM",
  "budgetVariance": 15.5,
  "scheduleVariance": -2.5,
  "risks": [
    {
      "type": "Budget Overrun",
      "description": "Materials costs exceeding estimates",
      "impact": "HIGH",
      "probability": "MEDIUM",
      "mitigation": "Renegotiate supplier contracts, source alternatives"
    }
  ],
  "recommendations": [
    "Implement weekly budget reviews",
    "Secure backup suppliers"
  ],
  "confidence": 0.88
}
`
  },

  VOICE_PROCESSING: {
    id: 'voice_processing',
    name: 'Voice Processing',
    category: 'nlp',
    version: '1.0.0',
    description: 'Processes voice commands for construction field updates',
    variables: ['transcription', 'context'],
    template: `
You are a construction field assistant. Process this voice command and extract actionable information.

VOICE TRANSCRIPTION:
{{transcription}}

{{#context}}
CONTEXT:
{{context}}
{{/context}}

CONSTRUCTION TERMINOLOGY:
- Common materials: rebar, drywall, lumber, concrete, steel
- Tools: hammer drill, circular saw, level, crane
- Measurements: feet, inches, square feet, cubic yards
- Actions: install, pour, frame, finish, inspect

POSSIBLE INTENTS:
- LOG_TIME: Recording work hours
- LOG_EXPENSE: Recording expenses
- UPDATE_TASK: Task status updates
- REPORT_ISSUE: Safety or quality issues
- REQUEST_MATERIALS: Material requests

INSTRUCTIONS:
1. Clean up the transcription for construction context
2. Identify the main intent
3. Extract relevant entities (amounts, dates, materials)
4. Determine if this requires immediate action
5. Handle construction slang and abbreviations

RESPOND WITH VALID JSON:
{
  "transcription": "Cleaned transcription",
  "intent": "LOG_TIME",
  "entities": {
    "hours": 8,
    "task": "framing",
    "date": "today"
  },
  "confidence": 0.92,
  "actionable": true
}
`
  },

  IMAGE_ANALYSIS: {
    id: 'image_analysis',
    name: 'Construction Image Analysis',
    category: 'vision',
    version: '1.0.0',
    description: 'Analyzes construction photos for progress and compliance',
    variables: ['imageContext', 'analysisType'],
    template: `
You are a construction inspector and progress analyst. Analyze this construction image.

{{#imageContext}}
CONTEXT: {{imageContext}}
{{/imageContext}}

ANALYSIS TYPE: {{analysisType}}

ANALYSIS TYPES:
- PROGRESS: Measure completion percentage
- SAFETY: Identify safety violations or hazards
- QUALITY: Check workmanship quality
- MATERIALS: Identify materials and quantities
- COMPLIANCE: Verify code compliance

CONSTRUCTION ELEMENTS TO IDENTIFY:
- Structural: Foundation, framing, roofing
- MEP: Electrical panels, plumbing, HVAC
- Safety: Hard hats, barriers, signage
- Materials: Lumber, concrete, steel, equipment
- Progress: Completion stages

INSTRUCTIONS:
1. Describe what you see in the image
2. Identify construction elements and materials
3. Assess based on the analysis type
4. Note any safety or quality concerns
5. Estimate progress or quantities if applicable

RESPOND WITH DETAILED ANALYSIS focusing on construction-specific details.
`
  },

  QUOTE_GENERATION: {
    id: 'quote_generation',
    name: 'AI-Powered Quote Generation',
    category: 'generation',
    version: '1.0.0',
    description: 'Generates detailed construction quotes with pricing and analysis',
    variables: ['projectType', 'scope', 'requirements', 'constraints', 'historicalProjects', 'profitMargin'],
    template: `
You are an expert construction estimator with 20+ years of experience. Generate a detailed, accurate quote for this construction project.

PROJECT TYPE: {{projectType}}

PROJECT SCOPE:
{{scope}}

REQUIREMENTS:
{{requirements}}

{{#constraints}}
CONSTRAINTS:
{{constraints}}
{{/constraints}}

{{#historicalProjects}}
HISTORICAL PROJECT DATA:
{{historicalProjects}}
{{/historicalProjects}}

PROFIT MARGIN TARGET: {{profitMargin}}%

CONSTRUCTION PRICING GUIDELINES:
- Materials: Include 10-15% waste factor
- Labor: Use local market rates (typically $45-$85/hour for skilled trades)
- Equipment: Factor in rental costs and depreciation
- Overhead: 10-15% of direct costs
- Profit Margin: Apply specified percentage to total costs

QUOTE ITEM CATEGORIES:
- Materials: All physical materials needed
- Labor: Broken down by trade (carpentry, electrical, plumbing, etc.)
- Equipment: Tools, machinery, and rental costs
- Permits & Fees: Building permits, inspection fees
- Contingency: 5-10% buffer for unforeseen issues

MARKET RATE BENCHMARKS (2024):
- Carpentry: $45-65/hour
- Electrical: $65-95/hour
- Plumbing: $60-85/hour
- HVAC: $70-100/hour
- Drywall: $40-60/hour
- Painting: $35-55/hour
- Flooring: $40-65/hour
- Cabinetry installation: $50-75/hour

MATERIAL COST BENCHMARKS:
- Standard cabinets: $100-300/linear foot
- Granite countertops: $50-200/sq ft
- Hardwood flooring: $8-25/sq ft
- Tile: $5-50/sq ft
- Paint: $30-60/gallon
- Lumber (2x4): $5-12 per 8ft piece

INSTRUCTIONS:
1. Analyze the project scope and requirements thoroughly
2. Break down the work into specific, itemized tasks
3. Research historical project data for similar work
4. Calculate materials, labor, and equipment costs for each item
5. Apply appropriate market rates for your region
6. Include waste factors and contingencies
7. Calculate subtotal, then apply profit margin
8. Identify potential risks and assumptions
9. Provide confidence score based on data availability
10. Explain your reasoning for major cost items

RESPOND WITH VALID JSON in this EXACT format:
{
  "items": [
    {
      "description": "Detailed description of work item",
      "quantity": 1.0,
      "unitPrice": 100.00,
      "category": "Materials|Labor|Equipment|Permits|Contingency"
    }
  ],
  "subtotal": 0.00,
  "historicalProjects": [
    {
      "id": "project_id",
      "name": "Project name",
      "similarity": 0.85,
      "budget": 100000,
      "actualCost": 95000
    }
  ],
  "marketRates": {
    "carpentry": 55,
    "electrical": 75,
    "plumbing": 70
  },
  "confidence": 0.88,
  "reasoning": "Detailed explanation of how costs were calculated, considering historical data and market rates",
  "assumptions": [
    "Assumption 1",
    "Assumption 2"
  ],
  "risks": [
    {
      "description": "Risk description",
      "impact": "LOW|MEDIUM|HIGH",
      "mitigation": "How to mitigate this risk"
    }
  ]
}

CRITICAL: Ensure all numbers are valid decimals. DO NOT use placeholder values. Calculate real estimates based on the project scope.
`
  }
};

/**
 * Get a prompt template by ID
 */
export function getPromptTemplate(id: string): PromptTemplate | undefined {
  return PROMPT_TEMPLATES[id];
}

/**
 * Render a prompt template with variables
 */
export function renderPrompt(templateId: string, variables: Record<string, any>): string {
  const template = getPromptTemplate(templateId);
  if (!template) {
    throw new Error(`Prompt template not found: ${templateId}`);
  }

  let rendered = template.template;

  // Simple template variable replacement
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    rendered = rendered.replace(regex, String(value || ''));
  }

  // Handle conditional blocks {{#variable}}...{{/variable}}
  rendered = rendered.replace(/{{#(\w+)}}(.*?){{\/\1}}/gs, (match, varName, content) => {
    const value = variables[varName];
    return value ? content : '';
  });

  // Clean up any remaining template markers
  rendered = rendered.replace(/{{.*?}}/g, '');

  return rendered.trim();
}

/**
 * Validate that all required variables are provided
 */
export function validatePromptVariables(templateId: string, variables: Record<string, any>): string[] {
  const template = getPromptTemplate(templateId);
  if (!template) {
    throw new Error(`Prompt template not found: ${templateId}`);
  }

  const missing: string[] = [];
  for (const variable of template.variables) {
    if (!(variable in variables)) {
      missing.push(variable);
    }
  }

  return missing;
}

/**
 * Get all available templates
 */
export function getAllTemplates(): PromptTemplate[] {
  return Object.values(PROMPT_TEMPLATES);
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: string): PromptTemplate[] {
  return Object.values(PROMPT_TEMPLATES).filter(t => t.category === category);
}