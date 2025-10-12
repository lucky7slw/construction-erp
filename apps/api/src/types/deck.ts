import { z } from 'zod';

// ============================================================================
// DECK DESIGN REQUEST & RESPONSE TYPES
// ============================================================================

export const DeckDesignRequestSchema = z.object({
  // Basic Requirements
  deckType: z.enum([
    'GROUND_LEVEL',
    'ELEVATED',
    'MULTI_LEVEL',
    'ROOFTOP',
    'FLOATING',
    'ATTACHED',
    'WRAPAROUND',
    'POOL',
    'HOT_TUB',
    'CUSTOM',
  ]),
  deckShape: z.enum(['RECTANGLE', 'SQUARE', 'L_SHAPE', 'U_SHAPE', 'OCTAGON', 'HEXAGON', 'CIRCULAR', 'CUSTOM']),
  length: z.number().positive(),
  width: z.number().positive(),
  height: z.number().optional(),

  // Location
  propertyAddress: z.string().min(1),
  city: z.string().min(1),
  state: z.string().length(2),
  postalCode: z.string().min(5),
  county: z.string().optional(),

  // Materials & Preferences
  primaryMaterial: z.enum([
    'PRESSURE_TREATED_LUMBER',
    'CEDAR',
    'REDWOOD',
    'COMPOSITE',
    'PVC',
    'ALUMINUM',
    'STEEL',
    'IPE',
    'MAHOGANY',
    'BAMBOO',
    'CONCRETE',
  ]).optional(),
  railingType: z.enum([
    'WOOD_BALUSTERS',
    'METAL_BALUSTERS',
    'CABLE',
    'GLASS',
    'COMPOSITE',
    'VINYL',
    'ALUMINUM',
    'NONE',
  ]).optional(),

  // Budget & Features
  budgetMin: z.number().optional(),
  budgetMax: z.number().optional(),
  mustHaveFeatures: z.array(z.string()).optional(),
  niceToHaveFeatures: z.array(z.string()).optional(),

  // Additional Context
  soilType: z.string().optional(),
  existingStructure: z.boolean().optional(),
  slopeCondition: z.string().optional(),
});

export type DeckDesignRequest = z.infer<typeof DeckDesignRequestSchema>;

// ============================================================================
// MATERIALS CALCULATION
// ============================================================================

export interface MaterialCalculation {
  category: string; // Decking, Framing, Railing, Fasteners, Concrete
  items: MaterialItem[];
  totalCost: number;
}

export interface MaterialItem {
  name: string;
  description: string;
  quantity: number;
  unit: string;
  dimensions?: string;
  unitCost?: number;
  totalCost?: number;
  wasteFactor: number;
  quantityWithWaste: number;
  manufacturer?: string;
  model?: string;
  sku?: string;
  aiSuggested: boolean;
  alternatives?: MaterialAlternative[];
}

export interface MaterialAlternative {
  name: string;
  unitCost: number;
  totalCost: number;
  pros: string[];
  cons: string[];
  costDifference: number;
}

// ============================================================================
// PERMIT RESEARCH
// ============================================================================

export const PermitResearchRequestSchema = z.object({
  address: z.string(),
  city: z.string(),
  state: z.string(),
  postalCode: z.string(),
  county: z.string(),
  deckType: z.string(),
  squareFeet: z.number(),
  height: z.number().optional(),
});

export type PermitResearchRequest = z.infer<typeof PermitResearchRequestSchema>;

export interface PermitRequirement {
  permitType: string;
  jurisdictionName: string;
  jurisdictionType: 'City' | 'County' | 'State';
  isRequired: boolean;
  exemptionReason?: string;
  requirements: PermitDetail[];
  requiredDocuments: string[];
  fees: PermitFee[];
  estimatedCost: number;
  applicationUrl?: string;
  contactInfo: ContactInfo;
  aiConfidence: number;
  sourceUrl: string;
  lastVerified: Date;
}

export interface PermitDetail {
  requirement: string;
  description: string;
  applies: boolean;
  complianceNote?: string;
}

export interface PermitFee {
  feeType: string;
  amount: number;
  calculation?: string;
}

export interface ContactInfo {
  departmentName?: string;
  contactName?: string;
  phone?: string;
  email?: string;
  officeAddress?: string;
  officeHours?: string;
}

// ============================================================================
// PROPERTY DATA & GIS
// ============================================================================

export interface PropertyDataRequest {
  address: string;
  city: string;
  state: string;
  postalCode: string;
  county: string;
  parcelId?: string;
}

export interface PropertyData {
  parcelId: string;
  propertyAddress: string;
  legalDescription?: string;
  lotSize?: number;
  lotDimensions?: string;
  zoning: ZoningInfo;
  restrictions: PropertyRestrictions;
  hoaInfo?: HOAInfo;
  gisData: GISData;
  utilities: UtilityInfo;
  environmental: EnvironmentalInfo;
  dataSource: string;
  retrievedAt: Date;
}

export interface ZoningInfo {
  zoningCode?: string;
  zoningDescription?: string;
  landUse?: string;
}

export interface PropertyRestrictions {
  setbackFront?: number;
  setbackRear?: number;
  setbackSide?: number;
  maxLotCoverage?: number;
  maxHeight?: number;
}

export interface HOAInfo {
  hasHOA: boolean;
  hoaName?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  approvalRequired: boolean;
}

export interface GISData {
  latitude: number;
  longitude: number;
  topography?: {
    elevation: number;
    slope: number;
  };
  floodZone?: string;
  wetlands: boolean;
  plotPlanUrl?: string;
  aerialImageUrl?: string;
}

export interface UtilityInfo {
  waterService?: string;
  sewerService?: string;
  electricService?: string;
  gasService?: string;
}

export interface EnvironmentalInfo {
  soilType?: string;
  drainageNotes?: string;
  treesOnProperty?: boolean;
  protectedTrees?: boolean;
}

// ============================================================================
// CODE REQUIREMENTS EXTRACTION
// ============================================================================

export interface CodeRequirement {
  requirementType: 'STRUCTURAL' | 'SAFETY' | 'ACCESSIBILITY' | 'ENERGY' | 'ENVIRONMENTAL' | 'ZONING' | 'SETBACK' | 'HEIGHT_RESTRICTION' | 'LOT_COVERAGE' | 'OTHER';
  codeReference: string;
  codeEdition: string;
  jurisdictionCode?: string;
  title: string;
  description: string;
  requirement: string;
  applies: boolean;
  compliance?: string;
  minimumValue?: number;
  maximumValue?: number;
  unit?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  category?: string;
  aiConfidence: number;
  sourceDocument: string;
}

// ============================================================================
// LABOR ESTIMATION
// ============================================================================

export interface LaborEstimate {
  taskName: string;
  description: string;
  skillLevel: 'Apprentice' | 'Journeyman' | 'Master';
  estimatedHours: number;
  crewSize: number;
  totalCrewHours: number;
  hourlyRate?: number;
  totalLaborCost?: number;
  difficultyLevel: 'Easy' | 'Medium' | 'Hard' | 'Expert';
  weatherDependency: boolean;
  equipmentRequired: string[];
  aiConfidence: number;
  historicalAverage?: number;
}

// ============================================================================
// COST BREAKDOWN
// ============================================================================

export interface CostBreakdown {
  category: string;
  subCategory?: string;
  description: string;
  estimatedCost: number;
  quantity?: number;
  unitCost?: number;
  unit?: string;
  aiOptimization?: OptimizationSuggestion[];
  marketComparison?: MarketComparison;
}

export interface OptimizationSuggestion {
  suggestion: string;
  potentialSavings: number;
  tradeoff: string;
}

export interface MarketComparison {
  averagePrice: number;
  lowPrice: number;
  highPrice: number;
  percentile: number;
  dataPoints: number;
}

// ============================================================================
// COMPLETE DECK PROJECT RESPONSE
// ============================================================================

export interface DeckProjectPlan {
  projectInfo: {
    name: string;
    deckType: string;
    deckShape: string;
    dimensions: {
      length: number;
      width: number;
      height?: number;
      totalSquareFeet: number;
    };
  };
  design: DeckDesignPlan;
  materials: MaterialCalculation[];
  permits: PermitRequirement[];
  propertyData?: PropertyData;
  codeRequirements: CodeRequirement[];
  laborEstimates: LaborEstimate[];
  costBreakdown: CostBreakdown[];
  timeline: {
    estimatedDuration: number; // days
    estimatedLaborHours: number;
    plannedStartDate?: Date;
    plannedCompletionDate?: Date;
  };
  totalCost: {
    materials: number;
    labor: number;
    permits: number;
    total: number;
  };
  aiAnalysis: {
    confidence: number;
    recommendations: string[];
    risks: RiskAssessment[];
    alternatives: DesignAlternative[];
  };
}

export interface DeckDesignPlan {
  version: number;
  name: string;
  description: string;
  deckingArea: number;
  railingLength?: number;
  stairs: StairDesign[];
  structural: StructuralDesign;
  features: DeckFeatures;
  loadRequirements: LoadRequirements;
  aiReasoning: string;
}

export interface StairDesign {
  width: number;
  rise: number;
  run: number;
  steps: number;
}

export interface StructuralDesign {
  joistSpacing: number;
  beamSize: string;
  postSize: string;
  postCount: number;
  footingDepth: number;
  footingDiameter: number;
  footingCount: number;
}

export interface DeckFeatures {
  hasBuiltInSeating: boolean;
  hasPrivacyScreen: boolean;
  hasLighting: boolean;
  hasPergola: boolean;
  hasGate: boolean;
  customFeatures: string[];
}

export interface LoadRequirements {
  liveLoad: number; // PSF
  deadLoad: number; // PSF
  snowLoad?: number; // PSF
}

export interface RiskAssessment {
  riskType: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  mitigation: string;
  costImpact?: number;
}

export interface DesignAlternative {
  name: string;
  description: string;
  costDifference: number;
  pros: string[];
  cons: string[];
  recommendationScore: number;
}

// ============================================================================
// AI PROMPT VARIABLES
// ============================================================================

export interface DeckDesignPromptVariables {
  deckType: string;
  shape: string;
  length: number;
  width: number;
  height?: number;
  squareFeet: number;
  location: {
    address: string;
    city: string;
    state: string;
    county: string;
  };
  material?: string;
  railing?: string;
  budget?: {
    min?: number;
    max?: number;
  };
  features: {
    mustHave: string[];
    niceToHave: string[];
  };
  propertyData?: any;
  buildingCodes?: any;
}

export interface MaterialsPromptVariables {
  design: DeckDesignPlan;
  material: string;
  railing: string;
  dimensions: {
    length: number;
    width: number;
    height?: number;
    squareFeet: number;
  };
  wasteFactor: number;
}

export interface PermitPromptVariables {
  location: {
    address: string;
    city: string;
    state: string;
    county: string;
    postalCode: string;
  };
  deckType: string;
  dimensions: {
    squareFeet: number;
    height?: number;
  };
  municipalWebsite?: string;
  countyWebsite?: string;
}
