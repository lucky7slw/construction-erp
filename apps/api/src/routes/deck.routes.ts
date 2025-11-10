import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { PrismaClient } from '../generated/prisma';
import { DeckAIService } from '../services/ai/deck-ai.service';
import { GeminiClient } from '../services/ai/gemini-client';
import { DeckDesignRequestSchema, type DeckDesignRequest } from '../types/deck';

interface DeckRoutesOptions {
  prisma: PrismaClient;
}

export default async function deckRoutes(fastify: FastifyInstance, options: DeckRoutesOptions) {
  const { prisma } = options;

  // Initialize Gemini client and Deck AI service
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const geminiModel = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

  if (!geminiApiKey) {
    fastify.log.warn('GEMINI_API_KEY not configured - deck AI features will be limited');
  }

  const geminiClient = new GeminiClient(geminiApiKey || '', geminiModel);
  const deckAIService = new DeckAIService(geminiClient, prisma);

  /**
   * POST /api/v1/deck/generate-plan
   * Generate complete deck project plan with AI
   */
  fastify.post<{
    Body: DeckDesignRequest;
  }>(
    '/generate-plan',
    {
      // preHandler: [fastify.authenticate],
      schema: {
        description: 'Generate AI-powered deck project plan',
        tags: ['Deck Builder'],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  projectInfo: { type: 'object' },
                  design: { type: 'object' },
                  materials: { type: 'array' },
                  permits: { type: 'array' },
                  propertyData: { type: 'object' },
                  codeRequirements: { type: 'array' },
                  laborEstimates: { type: 'array' },
                  costBreakdown: { type: 'array' },
                  timeline: { type: 'object' },
                  totalCost: { type: 'object' },
                  aiAnalysis: { type: 'object' },
                },
              },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Body: DeckDesignRequest }>,
      reply: FastifyReply
    ) => {
      try {
        const user = (request as any).user;
        fastify.log.info({ user, userKeys: user ? Object.keys(user) : [] }, 'User object in deck route');
        const userId = user?.userId || user?.id;
        const companyId = user?.companyId;
        if (!userId) {
          return reply.code(401).send({ error: 'User ID not found in token' });
        }

        if (!companyId) {
          return reply.code(403).send({ error: 'User not associated with a company' });
        }

        // Validate request
        const validatedRequest = DeckDesignRequestSchema.parse(request.body);

        // Generate complete plan using AI
        fastify.log.info({ userId, request: validatedRequest }, 'Generating deck project plan');
        const plan = await deckAIService.generateCompleteDeckPlan(
          validatedRequest,
          userId,
          companyId
        );

        fastify.log.info({ userId, companyId, planGenerated: !!plan }, 'About to create deck project');
        // Create deck project in database
        if (!userId) throw new Error(`userId is undefined at Prisma create. user object: ${JSON.stringify((request as any).user)}`);
        const deckProject = await prisma.deckProject.create({
          data: {
            companyId,
            name: plan.projectInfo.name,
            description: `${plan.projectInfo.deckType} deck - ${plan.projectInfo.dimensions.totalSquareFeet} sq ft`,
            status: 'DRAFT',
            deckType: plan.projectInfo.deckType as any,
            deckShape: plan.projectInfo.deckShape as any,
            primaryMaterial: validatedRequest.primaryMaterial || 'PRESSURE_TREATED_LUMBER',
            railingType: validatedRequest.railingType || 'WOOD_BALUSTERS',
            foundationType: 'CONCRETE_FOOTING',
            length: plan.projectInfo.dimensions.length,
            width: plan.projectInfo.dimensions.width,
            height: plan.projectInfo.dimensions.height,
            totalSquareFeet: plan.projectInfo.dimensions.totalSquareFeet,
            propertyAddress: validatedRequest.propertyAddress,
            city: validatedRequest.city,
            state: validatedRequest.state,
            postalCode: validatedRequest.postalCode,
            county: validatedRequest.county || '',
            aiGenerated: true,
            aiConfidence: plan.aiAnalysis.confidence,
            aiRecommendations: plan.aiAnalysis.recommendations,
            aiRiskAssessment: plan.aiAnalysis.risks,
            estimatedMaterialCost: plan.totalCost.materials,
            estimatedLaborCost: plan.totalCost.labor,
            estimatedPermitCost: plan.totalCost.permits,
            estimatedTotalCost: plan.totalCost.total,
            estimatedLaborHours: plan.timeline.estimatedLaborHours,
            estimatedDuration: plan.timeline.estimatedDuration,
            budgetRange: validatedRequest.budgetMin && validatedRequest.budgetMax
              ? `$${validatedRequest.budgetMin}-$${validatedRequest.budgetMax}`
              : undefined,
            mustHaveFeatures: validatedRequest.mustHaveFeatures || [],
            niceToHaveFeatures: validatedRequest.niceToHaveFeatures || [],
            createdById: userId,
          },
        });

        // Create deck design
        await prisma.deckDesign.create({
          data: {
            deckProjectId: deckProject.id,
            version: 1,
            name: plan.design.name,
            description: plan.design.description,
            isActive: true,
            deckingArea: plan.design.deckingArea,
            railingLength: plan.design.railingLength,
            stairCount: plan.design.stairs.length,
            stairWidth: plan.design.stairs[0]?.width,
            stairRise: plan.design.stairs[0]?.rise,
            stairRun: plan.design.stairs[0]?.run,
            joistSpacing: plan.design.structural.joistSpacing,
            beamSize: plan.design.structural.beamSize,
            postSize: plan.design.structural.postSize,
            postCount: plan.design.structural.postCount,
            footingDepth: plan.design.structural.footingDepth,
            footingDiameter: plan.design.structural.footingDiameter,
            footingCount: plan.design.structural.footingCount,
            liveLoad: plan.design.loadRequirements.liveLoad,
            deadLoad: plan.design.loadRequirements.deadLoad,
            snowLoad: plan.design.loadRequirements.snowLoad,
            hasBuiltInSeating: plan.design.features.hasBuiltInSeating,
            hasPrivacyScreen: plan.design.features.hasPrivacyScreen,
            hasLighting: plan.design.features.hasLighting,
            hasPergola: plan.design.features.hasPergola,
            hasGate: plan.design.features.hasGate,
            customFeatures: plan.design.features.customFeatures,
            aiGenerated: true,
            aiConfidence: plan.aiAnalysis.confidence,
            aiReasoning: plan.design.aiReasoning,
          },
        });

        // Create materials
        for (const category of plan.materials) {
          for (const item of category.items) {
            await prisma.deckMaterial.create({
              data: {
                deckProjectId: deckProject.id,
                category: category.category,
                name: item.name,
                description: item.description,
                quantity: item.quantity,
                unit: item.unit,
                unitCost: item.unitCost,
                totalCost: item.totalCost,
                dimensions: item.dimensions,
                wasteFactor: item.wasteFactor,
                quantityWithWaste: item.quantityWithWaste,
                manufacturer: item.manufacturer,
                model: item.model,
                sku: item.sku,
                aiSuggested: item.aiSuggested,
                aiAlternatives: item.alternatives || [],
              },
            });
          }
        }

        // Create permits
        for (const permit of plan.permits) {
          await prisma.deckPermit.create({
            data: {
              deckProjectId: deckProject.id,
              permitType: permit.permitType,
              jurisdictionName: permit.jurisdictionName,
              jurisdictionType: permit.jurisdictionType,
              status: permit.isRequired ? 'REQUIRED' : 'NOT_REQUIRED',
              isRequired: permit.isRequired,
              exemptionReason: permit.exemptionReason,
              requirements: permit.requirements,
              requiredDocuments: permit.requiredDocuments,
              fees: permit.fees,
              estimatedCost: permit.estimatedCost,
              applicationUrl: permit.applicationUrl,
              contactName: permit.contactInfo.contactName,
              contactPhone: permit.contactInfo.phone,
              contactEmail: permit.contactInfo.email,
              officeAddress: permit.contactInfo.officeAddress,
              officeHours: permit.contactInfo.officeHours,
              aiExtracted: true,
              aiConfidence: permit.aiConfidence,
              sourceUrl: permit.sourceUrl,
              lastVerified: permit.lastVerified,
            },
          });
        }

        // Create code requirements
        for (const req of plan.codeRequirements) {
          const validTypes = ['STRUCTURAL', 'SAFETY', 'ACCESSIBILITY', 'ENERGY', 'ENVIRONMENTAL', 'ZONING', 'SETBACK', 'HEIGHT_RESTRICTION', 'LOT_COVERAGE', 'OTHER'];
          const requirementType = validTypes.includes(req.requirementType) ? req.requirementType : 'OTHER';
          await prisma.deckCodeRequirement.create({
            data: {
              deckProjectId: deckProject.id,
              requirementType: requirementType as any,
              codeReference: req.codeReference,
              codeEdition: req.codeEdition,
              jurisdictionCode: req.jurisdictionCode,
              title: req.title,
              description: req.description,
              requirement: req.requirement,
              applies: req.applies,
              compliance: req.compliance,
              minimumValue: req.minimumValue,
              maximumValue: req.maximumValue,
              unit: req.unit,
              priority: req.priority,
              category: req.category,
              aiExtracted: true,
              aiConfidence: req.aiConfidence,
              sourceDocument: req.sourceDocument,
            },
          });
        }

        // Create labor estimates
        for (const labor of plan.laborEstimates) {
          await prisma.deckLaborEstimate.create({
            data: {
              deckProjectId: deckProject.id,
              taskName: labor.taskName,
              description: labor.description,
              skillLevel: labor.skillLevel,
              estimatedHours: labor.estimatedHours,
              crewSize: labor.crewSize,
              totalCrewHours: labor.totalCrewHours,
              hourlyRate: labor.hourlyRate,
              totalLaborCost: labor.totalLaborCost,
              difficultyLevel: labor.difficultyLevel,
              weatherDependency: labor.weatherDependency,
              equipmentRequired: labor.equipmentRequired,
              aiCalculated: true,
              aiConfidence: labor.aiConfidence,
              historicalAverage: labor.historicalAverage,
            },
          });
        }

        // Create cost breakdown
        for (const cost of plan.costBreakdown) {
          await prisma.deckCostBreakdown.create({
            data: {
              deckProjectId: deckProject.id,
              category: cost.category,
              subCategory: cost.subCategory,
              description: cost.description,
              estimatedCost: cost.estimatedCost || 0,
              quantity: cost.quantity,
              unitCost: cost.unitCost,
              unit: cost.unit,
              aiOptimization: cost.aiOptimization || [],
              marketComparison: cost.marketComparison,
            },
          });
        }

        // Create property data if available
        if (plan.propertyData) {
          await prisma.deckPropertyData.create({
            data: {
              deckProjectId: deckProject.id,
              parcelId: plan.propertyData.parcelId,
              propertyAddress: plan.propertyData.propertyAddress,
              legalDescription: plan.propertyData.legalDescription,
              lotSize: plan.propertyData.lotSize,
              lotDimensions: plan.propertyData.lotDimensions,
              zoningCode: plan.propertyData.zoning.zoningCode,
              zoningDescription: plan.propertyData.zoning.zoningDescription,
              landUse: plan.propertyData.zoning.landUse,
              setbackFront: plan.propertyData.restrictions.setbackFront,
              setbackRear: plan.propertyData.restrictions.setbackRear,
              setbackSide: plan.propertyData.restrictions.setbackSide,
              maxLotCoverage: plan.propertyData.restrictions.maxLotCoverage,
              maxHeight: plan.propertyData.restrictions.maxHeight,
              hasHOA: plan.propertyData.hoaInfo?.hasHOA || false,
              hoaName: plan.propertyData.hoaInfo?.hoaName,
              hoaContactName: plan.propertyData.hoaInfo?.contactName,
              hoaContactPhone: plan.propertyData.hoaInfo?.contactPhone,
              hoaContactEmail: plan.propertyData.hoaInfo?.contactEmail,
              hoaApprovalRequired: plan.propertyData.hoaInfo?.approvalRequired || false,
              gisLayerData: plan.propertyData.gisData,
              topographyData: plan.propertyData.gisData.topography,
              floodZone: plan.propertyData.gisData.floodZone,
              wetlands: plan.propertyData.gisData.wetlands,
              plotPlanUrl: plan.propertyData.gisData.plotPlanUrl,
              aerialImageUrl: plan.propertyData.gisData.aerialImageUrl,
              waterService: plan.propertyData.utilities.waterService,
              sewerService: plan.propertyData.utilities.sewerService,
              electricService: plan.propertyData.utilities.electricService,
              gasService: plan.propertyData.utilities.gasService,
              soilType: plan.propertyData.environmental.soilType,
              drainageNotes: plan.propertyData.environmental.drainageNotes,
              treesOnProperty: plan.propertyData.environmental.treesOnProperty,
              protectedTrees: plan.propertyData.environmental.protectedTrees,
              gisDataSource: plan.propertyData.dataSource,
              gisRetrievedAt: plan.propertyData.retrievedAt,
            },
          });
        }

        fastify.log.info({ projectId: deckProject.id }, 'Deck project plan generated successfully');

        return reply.send({
          success: true,
          data: {
            ...plan,
            projectId: deckProject.id,
          },
        });
      } catch (error: any) {
        fastify.log.error({ error }, 'Failed to generate deck project plan');
        return reply.code(500).send({
          success: false,
          error: error.message || 'Failed to generate deck project plan',
        });
      }
    }
  );

  /**
   * GET /api/v1/deck/projects
   * List all deck projects for the company
   */
  fastify.get(
    '/projects',
    {
      // preHandler: [fastify.authenticate],
      schema: {
        description: 'List all deck projects',
        tags: ['Deck Builder'],
        response: {
          200: {
            type: 'object',
            properties: {
              projects: { type: 'array' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const companyId = (request as any).user?.companyId;

        if (!companyId) {
          return reply.code(403).send({ error: 'User not associated with a company' });
        }

        const projects = await prisma.deckProject.findMany({
          where: { companyId },
          include: {
            designs: {
              where: { isActive: true },
            },
            materials: true,
            permits: true,
            propertyData: true,
            codeRequirements: true,
            laborEstimates: true,
            costBreakdown: true,
          },
          orderBy: { createdAt: 'desc' },
        });

        return reply.send({ projects });
      } catch (error: any) {
        fastify.log.error({ error }, 'Failed to list deck projects');
        return reply.code(500).send({ error: error.message });
      }
    }
  );

  /**
   * GET /api/v1/deck/projects/:id
   * Get specific deck project details
   */
  fastify.get<{
    Params: { id: string };
  }>(
    '/projects/:id',
    {
      // preHandler: [fastify.authenticate],
      schema: {
        description: 'Get deck project by ID',
        tags: ['Deck Builder'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
          required: ['id'],
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const companyId = (request as any).user?.companyId;

        if (!companyId) {
          return reply.code(403).send({ error: 'User not associated with a company' });
        }

        const project = await prisma.deckProject.findFirst({
          where: {
            id: request.params.id,
            companyId,
          },
          include: {
            designs: {
              where: { isActive: true },
            },
            materials: true,
            permits: true,
            propertyData: true,
            codeRequirements: true,
            laborEstimates: true,
            costBreakdown: true,
          },
        });

        if (!project) {
          return reply.code(404).send({ error: 'Deck project not found' });
        }

        return reply.send({ project });
      } catch (error: any) {
        fastify.log.error({ error }, 'Failed to get deck project');
        return reply.code(500).send({ error: error.message });
      }
    }
  );
}
