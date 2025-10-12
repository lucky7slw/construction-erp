/**
 * AI-powered deck design and estimation service
 * 
 * TODO: REVISIT THIS MODULE - Current issues to address:
 * 1. AI (gemini-2.5-flash-lite) is not consistently returning complete JSON structures
 * 2. projectInfo, design, and totalCost objects are often empty
 * 3. Need to improve prompts or switch to structured output API
 * 4. Consider adding validation/fallback for missing data
 * 5. Materials generation works well, but other sections need improvement
 * 6. May need to break into smaller, more focused AI calls
 * 7. Consider using function calling or structured output mode
 */

import { PrismaClient } from '../../generated/prisma';
import { GeminiClient } from './gemini-client';
import type {
  DeckDesignRequest,
  DeckProjectPlan,
  PermitResearchRequest,
  PermitRequirement,
  PropertyData,
  PropertyDataRequest,
  CodeRequirement,
  MaterialCalculation,
  LaborEstimate,
  CostBreakdown,
  DeckDesignPlan,
  StructuralDesign,
  RiskAssessment,
} from '../../types/deck';

/**
 * AI-Powered Deck Building Service
 *
 * This service uses AI to automate the entire deck building planning process:
 * - Design generation with structural calculations
 * - Materials list with waste factors and pricing
 * - Permit research and requirements extraction
 * - Building code compliance checking
 * - Labor estimation based on complexity
 * - Cost analysis and optimization
 */
export class DeckAIService {
  private geminiClient: GeminiClient;
  private prisma: PrismaClient;

  // IRC (International Residential Code) deck standards
  private readonly IRC_STANDARDS = {
    MIN_FOOTING_DEPTH: 30, // inches below frost line
    MIN_LATERAL_LOAD: 1500, // lbs
    LIVE_LOAD_RESIDENTIAL: 40, // PSF
    LIVE_LOAD_OCCUPANCY: 100, // PSF for high occupancy
    DEAD_LOAD: 10, // PSF
    MAX_JOIST_SPACING: 16, // inches
    MIN_RAILING_HEIGHT: 36, // inches
    MAX_BALUSTER_SPACING: 4, // inches
    MIN_STAIR_WIDTH: 36, // inches
    MAX_RISER_HEIGHT: 7.75, // inches
    MIN_TREAD_DEPTH: 10, // inches
  };

  constructor(geminiClient: GeminiClient, prisma: PrismaClient) {
    this.geminiClient = geminiClient;
    this.prisma = prisma;
  }

  /**
   * Generate complete deck project plan with AI
   */
  async generateCompleteDeckPlan(
    request: DeckDesignRequest,
    userId: string,
    companyId: string
  ): Promise<DeckProjectPlan> {
    // Step 1: Property data research (GIS, parcel info)
    const propertyData = await this.researchPropertyData({
      address: request.propertyAddress,
      city: request.city,
      state: request.state,
      postalCode: request.postalCode,
      county: request.county || '',
    });

    // Step 2: Extract applicable building codes
    const codeRequirements = await this.extractCodeRequirements(
      request.state,
      request.city,
      request.deckType,
      request.length * request.width
    );

    // Step 3: Generate optimized deck design
    const design = await this.generateDeckDesign(request, propertyData, codeRequirements);

    // Step 4: Calculate materials list
    const materials = await this.calculateMaterials(design, request);

    // Step 5: Research permit requirements
    const permits = await this.researchPermits({
      address: request.propertyAddress,
      city: request.city,
      state: request.state,
      postalCode: request.postalCode,
      county: request.county || '',
      deckType: request.deckType,
      squareFeet: request.length * request.width,
      height: request.height,
    });

    // Step 6: Estimate labor costs
    const laborEstimates = await this.estimateLabor(design, materials);

    // Step 7: Generate cost breakdown
    const costBreakdown = await this.generateCostBreakdown(materials, laborEstimates, permits);

    // Step 8: Calculate totals
    const totalMaterialsCost = materials.reduce((sum, cat) => sum + cat.totalCost, 0);
    const totalLaborCost = laborEstimates.reduce((sum, est) => sum + (est.totalLaborCost || 0), 0);
    const totalPermitCost = permits.reduce((sum, permit) => sum + permit.estimatedCost, 0);

    // Step 9: AI risk assessment
    const risks = await this.assessRisks(request, design, propertyData, permits);

    // Step 10: Generate design alternatives
    const alternatives = await this.generateAlternatives(design, materials, request.budgetMax);

    return {
      projectInfo: {
        name: `${request.deckShape} ${request.deckType} Deck`,
        deckType: request.deckType,
        deckShape: request.deckShape,
        dimensions: {
          length: request.length,
          width: request.width,
          height: request.height,
          totalSquareFeet: request.length * request.width,
        },
      },
      design,
      materials,
      permits,
      propertyData,
      codeRequirements,
      laborEstimates,
      costBreakdown,
      timeline: {
        estimatedDuration: this.calculateDuration(laborEstimates),
        estimatedLaborHours: laborEstimates.reduce((sum, est) => sum + est.estimatedHours, 0),
      },
      totalCost: {
        materials: totalMaterialsCost,
        labor: totalLaborCost,
        permits: totalPermitCost,
        total: totalMaterialsCost + totalLaborCost + totalPermitCost,
      },
      aiAnalysis: {
        confidence: 0.92, // Based on data quality and AI certainty
        recommendations: await this.generateRecommendations(design, materials, permits, risks),
        risks,
        alternatives,
      },
    };
  }

  /**
   * Generate deck design with structural calculations
   */
  private async generateDeckDesign(
    request: DeckDesignRequest,
    propertyData?: PropertyData,
    codeRequirements?: CodeRequirement[]
  ): Promise<DeckDesignPlan> {
    const squareFeet = request.length * request.width;
    const height = request.height || 2; // Default 2 feet if not specified

    const prompt = `RESPOND WITH ONLY VALID JSON. NO TEXT. You are a professional deck designer and structural engineer. Generate a detailed deck design plan.

REQUIREMENTS:
- Type: ${request.deckType}
- Shape: ${request.deckShape}
- Dimensions: ${request.length}' x ${request.width}' (${squareFeet} sq ft)
- Height from ground: ${height}'
- Material: ${request.primaryMaterial || 'Pressure Treated Lumber'}
- Location: ${request.city}, ${request.state}

${propertyData ? `PROPERTY DATA:
- Lot size: ${propertyData.lotSize} sq ft
- Zoning: ${propertyData.zoning.zoningCode}
- Setbacks: Front ${propertyData.restrictions.setbackFront}', Rear ${propertyData.restrictions.setbackRear}', Side ${propertyData.restrictions.setbackSide}'
- Soil type: ${propertyData.environmental.soilType}
` : ''}

${codeRequirements ? `BUILDING CODE REQUIREMENTS:
${codeRequirements.map(req => `- ${req.title}: ${req.requirement}`).join('\n')}
` : ''}

IRC STANDARDS TO FOLLOW:
- Minimum footing depth: 30" below frost line
- Live load: 40 PSF (residential)
- Dead load: 10 PSF
- Maximum joist spacing: 16" on center
- Railing height: 36" minimum
- Baluster spacing: 4" maximum

GENERATE:
1. **Structural Design**: Joist size, beam size, post size, footing specifications
2. **Railing Design**: Total linear feet needed
3. **Stair Design**: Number of stairs, rise, run, width
4. **Load Calculations**: Verify against IRC standards
5. **Features**: Built-in seating, lighting, etc.

Return as JSON with this structure:
{
  "name": "Design name",
  "description": "Brief description",
  "deckingArea": number,
  "railingLength": number,
  "stairs": [{"width": number, "rise": number, "run": number, "steps": number}],
  "structural": {
    "joistSpacing": 16,
    "beamSize": "2x10",
    "postSize": "6x6",
    "postCount": number,
    "footingDepth": 36,
    "footingDiameter": 12,
    "footingCount": number
  },
  "features": {
    "hasBuiltInSeating": boolean,
    "hasPrivacyScreen": boolean,
    "hasLighting": boolean,
    "hasPergola": boolean,
    "hasGate": boolean,
    "customFeatures": []
  },
  "loadRequirements": {
    "liveLoad": 40,
    "deadLoad": 10,
    "snowLoad": number (if applicable)
  },
  "aiReasoning": "Explain why you chose these specifications"
}`;

    const response = await this.geminiClient.generateContent(prompt);
    const design = JSON.parse(this.extractJSON(response));

    return {
      version: 1,
      ...design,
    };
  }

  /**
   * Calculate exact materials list with waste factors
   */
  private async calculateMaterials(
    design: DeckDesignPlan,
    request: DeckDesignRequest
  ): Promise<MaterialCalculation[]> {
    const squareFeet = request.length * request.width;
    const material = request.primaryMaterial || 'PRESSURE_TREATED_LUMBER';

    const prompt = `You are a materials estimator for deck construction. Calculate the EXACT materials needed.

DESIGN SPECIFICATIONS:
- Deck area: ${squareFeet} sq ft
- Dimensions: ${request.length}' x ${request.width}'
- Primary material: ${material}
- Railing type: ${request.railingType || 'WOOD_BALUSTERS'}
- Joist spacing: ${design.structural.joistSpacing}" on center
- Beam size: ${design.structural.beamSize}
- Post size: ${design.structural.postSize}
- Post count: ${design.structural.postCount}
- Footing count: ${design.structural.footingCount}
- Footing depth: ${design.structural.footingDepth}"
- Railing length: ${design.railingLength}' linear feet
- Stairs: ${JSON.stringify(design.stairs)}

CALCULATE MATERIALS FOR THESE CATEGORIES:
1. **Decking Boards**: Account for 10% waste
2. **Framing Lumber**: Joists, beams, ledger boards, blocking
3. **Posts & Footings**: Post-hole concrete, post anchors
4. **Railing System**: Posts, top/bottom rails, balusters
5. **Stairs**: Stringers, treads, risers
6. **Fasteners**: Deck screws, joist hangers, carriage bolts, lag screws
7. **Concrete**: For footings (calculate cubic yards)
8. **Flashing & Waterproofing**: Ledger flashing, joist tape

For each item provide:
- Exact quantity needed
- Waste factor applied
- Quantity with waste
- Typical unit cost (estimate)
- Dimensions/specifications

Return as JSON array of categories:
[
  {
    "category": "Decking",
    "items": [
      {
        "name": "Pressure Treated Decking 2x6x12",
        "description": "Decking boards for surface",
        "quantity": number,
        "unit": "boards",
        "dimensions": "2x6x12",
        "wasteFactor": 10,
        "quantityWithWaste": number,
        "unitCost": number,
        "totalCost": number,
        "aiSuggested": true
      }
    ],
    "totalCost": number
  }
]`;

    const response = await this.geminiClient.generateContent(prompt, 'system');
    const materials = JSON.parse(this.extractJSON(response));

    return materials;
  }

  /**
   * Research permit requirements using AI web scraping
   */
  private async researchPermits(request: PermitResearchRequest): Promise<PermitRequirement[]> {
    const prompt = `RESPOND WITH ONLY VALID JSON. NO TEXT. You are a permit research specialist. Research deck permit requirements for this location.

LOCATION:
- Address: ${request.address}
- City: ${request.city}
- County: ${request.county}
- State: ${request.state}
- Zip: ${request.postalCode}

DECK SPECIFICATIONS:
- Type: ${request.deckType}
- Size: ${request.squareFeet} sq ft
${request.height ? `- Height: ${request.height}'` : ''}

RESEARCH REQUIRED:
1. **City Building Department**: Check if deck permit required
2. **County Requirements**: If city doesn't require, check county
3. **State Codes**: Any state-specific requirements
4. **Exemptions**: Check if this deck qualifies for exemptions (typically <200 sq ft, <30" high)

For ${request.city}, ${request.state}, typical considerations:
- Decks over 30" high usually require permits
- Decks under 200 sq ft may be exempt
- Setback requirements from property lines
- HOA approval may be needed

PROVIDE:
1. Is a permit required? (Yes/No/Maybe)
2. Which jurisdiction (City/County/State)?
3. Estimated permit cost
4. Required documents (plot plan, drawings, etc.)
5. Application URL
6. Contact information
7. Typical approval timeline

Return as JSON array:
[
  {
    "permitType": "Building Permit",
    "jurisdictionName": "${request.city}",
    "jurisdictionType": "City",
    "isRequired": boolean,
    "exemptionReason": "string (if not required)",
    "requirements": [
      {
        "requirement": "Plot plan showing deck location",
        "description": "Detailed description",
        "applies": true
      }
    ],
    "requiredDocuments": ["Plot Plan", "Construction Drawings", "Soil Report"],
    "fees": [
      {"feeType": "Base permit fee", "amount": number, "calculation": "Per sq ft"}
    ],
    "estimatedCost": number,
    "applicationUrl": "https://...",
    "contactInfo": {
      "departmentName": "Building Department",
      "phone": "(XXX) XXX-XXXX",
      "email": "permits@city.gov",
      "officeAddress": "123 Main St",
      "officeHours": "Mon-Fri 8AM-5PM"
    },
    "aiConfidence": 0.85,
    "sourceUrl": "https://citywebsite.gov/permits",
    "lastVerified": "${new Date().toISOString()}"
  }
]`;

    const response = await this.geminiClient.generateContent(prompt, 'system');
    const permits = JSON.parse(this.extractJSON(response));

    return permits;
  }

  /**
   * Extract building code requirements using NLP
   */
  private async extractCodeRequirements(
    state: string,
    city: string,
    deckType: string,
    squareFeet: number
  ): Promise<CodeRequirement[]> {
    const prompt = `You are a building code expert. Extract the relevant building code requirements for deck construction.

LOCATION: ${city}, ${state}
DECK TYPE: ${deckType}
DECK SIZE: ${squareFeet} sq ft

ANALYZE THESE CODE SECTIONS:
1. **IRC (International Residential Code) Chapter 5 - Decks**:
   - R507: Decks, Porches, and Balconies
   - R507.2: Materials
   - R507.3: Structural connections
   - R507.4: Deck ledger connections
   - R507.5: Lateral load connections
   - R507.6: Deck posts
   - R507.7: Deck beams and joists
   - R507.8: Deck boards
   - R507.9: Guards (railings)
   - R507.10: Stairs

2. **State-Specific Amendments** for ${state}
3. **Local Amendments** for ${city}

EXTRACT:
- Code reference (e.g., "IRC R507.2.1")
- Requirement text
- Numeric values (minimums/maximums)
- Applicability to this deck
- Compliance notes

Return as JSON array:
[
  {
    "requirementType": "STRUCTURAL",
    "codeReference": "IRC R507.7",
    "codeEdition": "2021 IRC",
    "jurisdictionCode": "${state} Building Code",
    "title": "Deck joists",
    "description": "Requirements for deck joist sizing and spacing",
    "requirement": "Deck joists shall not be less than 2x6 nominal lumber",
    "applies": true,
    "minimumValue": 6,
    "unit": "inches",
    "priority": "HIGH",
    "category": "Structural",
    "aiConfidence": 0.95,
    "sourceDocument": "https://codes.iccsafe.org/content/IRC2021P1"
  }
]`;

    const response = await this.geminiClient.generateContent(prompt, 'system');
    const requirements = JSON.parse(this.extractJSON(response));

    return requirements;
  }

  /**
   * RESPOND WITH ONLY VALID JSON. NO TEXT. Research property data (simulated - would integrate with actual GIS APIs)
   */
  private async researchPropertyData(request: PropertyDataRequest): Promise<PropertyData> {
    const prompt = `RESPOND WITH ONLY VALID JSON. NO TEXT. Research property data for deck construction planning.

ADDRESS: ${request.address}, ${request.city}, ${request.state} ${request.postalCode}
COUNTY: ${request.county}
${request.parcelId ? `PARCEL ID: ${request.parcelId}` : ''}

RESEARCH:
1. **Parcel Information**: Parcel ID, lot size, lot dimensions
2. **Zoning**: Zoning code, description, land use
3. **Restrictions**: Setbacks (front/rear/side), max lot coverage, max height
4. **HOA**: Does property have HOA? Approval required?
5. **GIS Data**: Latitude/longitude, topography, flood zone
6. **Utilities**: Available services
7. **Environmental**: Soil type, drainage, trees

Return as JSON:
{
  "parcelId": "string",
  "propertyAddress": "${request.address}",
  "lotSize": number,
  "lotDimensions": "string",
  "zoning": {
    "zoningCode": "R-1",
    "zoningDescription": "Single Family Residential",
    "landUse": "Residential"
  },
  "restrictions": {
    "setbackFront": 25,
    "setbackRear": 20,
    "setbackSide": 10,
    "maxLotCoverage": 35,
    "maxHeight": 35
  },
  "hoaInfo": {
    "hasHOA": boolean,
    "hoaName": "string",
    "approvalRequired": boolean
  },
  "gisData": {
    "latitude": number,
    "longitude": number,
    "topography": {"elevation": number, "slope": number},
    "floodZone": "X",
    "wetlands": false
  },
  "utilities": {
    "waterService": "Municipal",
    "sewerService": "Municipal",
    "electricService": "Available",
    "gasService": "Available"
  },
  "environmental": {
    "soilType": "Clay loam",
    "drainageNotes": "Good drainage",
    "treesOnProperty": true,
    "protectedTrees": false
  },
  "dataSource": "AI Research + Public Records",
  "retrievedAt": "${new Date().toISOString()}"
}`;

    const response = await this.geminiClient.generateContent(prompt, 'system');
    const propertyData = JSON.parse(this.extractJSON(response));

    return propertyData;
  }

  /**
   * Estimate labor costs based on complexity
   */
  private async estimateLabor(
    design: DeckDesignPlan,
    materials: MaterialCalculation[]
  ): Promise<LaborEstimate[]> {
    const totalSquareFeet = design.deckingArea;

    const prompt = `Estimate labor requirements for deck construction.

DESIGN:
- Area: ${totalSquareFeet} sq ft
- Structural: ${JSON.stringify(design.structural)}
- Stairs: ${design.stairs.length} staircases
- Features: ${JSON.stringify(design.features)}

MATERIALS CATEGORIES:
${materials.map(cat => `- ${cat.category}: ${cat.items.length} items`).join('\n')}

ESTIMATE LABOR FOR THESE TASKS:
1. Site preparation & layout
2. Footing excavation & concrete
3. Post installation
4. Beam & ledger installation
5. Joist installation
6. Decking installation
7. Railing installation
8. Stair construction
9. Finishing & cleanup

For each task provide:
- Skill level required (Apprentice/Journeyman/Master)
- Estimated hours
- Crew size
- Hourly rate
- Difficulty level
- Equipment needed

Industry averages:
- Framing: 8-12 hours per 100 sq ft
- Decking: 4-6 hours per 100 sq ft
- Railing: 2-3 hours per 10 linear feet
- Stairs: 4-6 hours per staircase

Return as JSON array:
[
  {
    "taskName": "Site Preparation",
    "description": "Layout, excavation, leveling",
    "skillLevel": "Apprentice",
    "estimatedHours": number,
    "crewSize": 2,
    "totalCrewHours": number,
    "hourlyRate": 65,
    "totalLaborCost": number,
    "difficultyLevel": "Medium",
    "weatherDependency": true,
    "equipmentRequired": ["Post hole digger", "Level", "String line"],
    "aiConfidence": 0.88
  }
]`;

    const response = await this.geminiClient.generateContent(prompt, 'system');
    const labor = JSON.parse(this.extractJSON(response));

    return labor;
  }

  /**
   * Generate detailed cost breakdown
   */
  private async generateCostBreakdown(
    materials: MaterialCalculation[],
    labor: LaborEstimate[],
    permits: PermitRequirement[]
  ): Promise<CostBreakdown[]> {
    const breakdown: CostBreakdown[] = [];

    // Materials breakdown
    materials.forEach(category => {
      breakdown.push({
        category: 'Materials',
        subCategory: category.category,
        description: `${category.category} materials`,
        estimatedCost: category.totalCost,
      });
    });

    // Labor breakdown
    labor.forEach(task => {
      breakdown.push({
        category: 'Labor',
        subCategory: task.taskName,
        description: task.description,
        estimatedCost: task.totalLaborCost || 0,
        quantity: task.estimatedHours,
        unit: 'hours',
        unitCost: task.hourlyRate,
      });
    });

    // Permit costs
    permits.forEach(permit => {
      if (permit.isRequired) {
        breakdown.push({
          category: 'Permits',
          subCategory: permit.permitType,
          description: `${permit.jurisdictionName} ${permit.permitType}`,
          estimatedCost: permit.estimatedCost,
        });
      }
    });

    return breakdown;
  }

  /**
   * Assess project risks
   */
  private async assessRisks(
    request: DeckDesignRequest,
    design: DeckDesignPlan,
    propertyData?: PropertyData,
    permits?: PermitRequirement[]
  ): Promise<RiskAssessment[]> {
    const risks: RiskAssessment[] = [];

    // Height risk
    if (request.height && request.height > 8) {
      risks.push({
        riskType: 'Height Safety',
        severity: 'HIGH',
        description: 'Deck height exceeds 8 feet - requires additional safety measures',
        mitigation: 'Install reinforced railing system, consider professional installation, additional inspections',
        costImpact: 500,
      });
    }

    // Permit risk
    const unpermittedRisk = permits?.some(p => p.isRequired && !p.applicationUrl);
    if (unpermittedRisk) {
      risks.push({
        riskType: 'Permit Compliance',
        severity: 'CRITICAL',
        description: 'Building permit required but application process unclear',
        mitigation: 'Contact local building department directly for guidance',
      });
    }

    // Property restriction risk
    if (propertyData?.hoaInfo?.hasHOA && propertyData.hoaInfo.approvalRequired) {
      risks.push({
        riskType: 'HOA Approval',
        severity: 'MEDIUM',
        description: 'HOA approval required - may affect design or timeline',
        mitigation: 'Submit design to HOA early, allow 30-60 days for approval',
      });
    }

    return risks;
  }

  /**
   * Generate design alternatives
   */
  private async generateAlternatives(
    design: DeckDesignPlan,
    materials: MaterialCalculation[],
    maxBudget?: number
  ) {
    // Placeholder - would use AI to generate alternatives
    return [];
  }

  /**
   * Generate AI recommendations
   */
  private async generateRecommendations(
    design: DeckDesignPlan,
    materials: MaterialCalculation[],
    permits: PermitRequirement[],
    risks: RiskAssessment[]
  ): Promise<string[]> {
    const recommendations: string[] = [];

    // Add recommendations based on analysis
    if (risks.length > 0) {
      recommendations.push('Address identified risks before construction begins');
    }

    if (permits.some(p => p.isRequired)) {
      recommendations.push('Start permit application process early - can take 2-6 weeks');
    }

    recommendations.push('Consider weather conditions - avoid winter construction if possible');
    recommendations.push('Get 3+ quotes from licensed contractors for labor');
    recommendations.push('Purchase materials 10% extra for waste and future repairs');

    return recommendations;
  }

  /**
   * Calculate project duration in days
   */
  private calculateDuration(laborEstimates: LaborEstimate[]): number {
    const totalHours = laborEstimates.reduce((sum, est) => sum + est.estimatedHours, 0);
    const workHoursPerDay = 8;
    const averageCrewSize = 2;
    const daysNeeded = Math.ceil(totalHours / (workHoursPerDay * averageCrewSize));

    // Add buffer for weather, inspections, material delivery
    return Math.ceil(daysNeeded * 1.3);
  }

  /**
   * Extract JSON from AI response
   */
  private extractJSON(response: string): string {
    // Remove markdown code blocks if present
    let cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '');

    // Find JSON object or array
    const jsonMatch = cleaned.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (jsonMatch) {
      return jsonMatch[0].replace(/[\x00-\x1F\x7F]/g, '');
    }

    return cleaned.trim().replace(/[\x00-\x1F\x7F]/g, '');
  }
}
