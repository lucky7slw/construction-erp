-- CreateEnum
CREATE TYPE "public"."DeckType" AS ENUM ('GROUND_LEVEL', 'ELEVATED', 'MULTI_LEVEL', 'ROOFTOP', 'FLOATING', 'ATTACHED', 'WRAPAROUND', 'POOL', 'HOT_TUB', 'CUSTOM');

-- CreateEnum
CREATE TYPE "public"."DeckShape" AS ENUM ('RECTANGLE', 'SQUARE', 'L_SHAPE', 'U_SHAPE', 'OCTAGON', 'HEXAGON', 'CIRCULAR', 'CUSTOM');

-- CreateEnum
CREATE TYPE "public"."DeckMaterialType" AS ENUM ('PRESSURE_TREATED_LUMBER', 'CEDAR', 'REDWOOD', 'COMPOSITE', 'PVC', 'ALUMINUM', 'STEEL', 'IPE', 'MAHOGANY', 'BAMBOO', 'CONCRETE');

-- CreateEnum
CREATE TYPE "public"."RailingType" AS ENUM ('WOOD_BALUSTERS', 'METAL_BALUSTERS', 'CABLE', 'GLASS', 'COMPOSITE', 'VINYL', 'ALUMINUM', 'NONE');

-- CreateEnum
CREATE TYPE "public"."FoundationType" AS ENUM ('CONCRETE_FOOTING', 'PRECAST_PIER', 'HELICAL_PIER', 'GROUND_SCREW', 'DECK_BLOCKS', 'SLAB_ON_GRADE');

-- CreateEnum
CREATE TYPE "public"."DeckProjectStatus" AS ENUM ('PLANNING', 'DESIGN_REVIEW', 'PERMIT_RESEARCH', 'PERMIT_PENDING', 'PERMIT_APPROVED', 'IN_CONSTRUCTION', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."PermitStatus" AS ENUM ('NOT_REQUIRED', 'RESEARCHING', 'REQUIRED', 'APPLICATION_READY', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "public"."CodeRequirementType" AS ENUM ('STRUCTURAL', 'SAFETY', 'ACCESSIBILITY', 'ENERGY', 'ENVIRONMENTAL', 'ZONING', 'SETBACK', 'HEIGHT_RESTRICTION', 'LOT_COVERAGE', 'OTHER');

-- CreateTable
CREATE TABLE "public"."deck_projects" (
    "id" TEXT NOT NULL,
    "projectId" TEXT,
    "companyId" TEXT NOT NULL,
    "customerId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "public"."DeckProjectStatus" NOT NULL DEFAULT 'PLANNING',
    "deckType" "public"."DeckType" NOT NULL,
    "deckShape" "public"."DeckShape" NOT NULL,
    "primaryMaterial" "public"."DeckMaterialType" NOT NULL,
    "railingType" "public"."RailingType" NOT NULL,
    "foundationType" "public"."FoundationType" NOT NULL,
    "length" DECIMAL(10,2) NOT NULL,
    "width" DECIMAL(10,2) NOT NULL,
    "height" DECIMAL(10,2),
    "totalSquareFeet" DECIMAL(10,2) NOT NULL,
    "propertyAddress" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "county" TEXT NOT NULL,
    "parcelId" TEXT,
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "aiGenerated" BOOLEAN NOT NULL DEFAULT true,
    "aiConfidence" DECIMAL(3,2),
    "aiRecommendations" JSONB,
    "aiRiskAssessment" JSONB,
    "estimatedMaterialCost" DECIMAL(12,2),
    "estimatedLaborCost" DECIMAL(12,2),
    "estimatedPermitCost" DECIMAL(10,2),
    "estimatedTotalCost" DECIMAL(12,2),
    "actualMaterialCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "actualLaborCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "actualPermitCost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "actualTotalCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "estimatedLaborHours" DECIMAL(8,2),
    "estimatedDuration" INTEGER,
    "plannedStartDate" TIMESTAMP(3),
    "plannedCompletionDate" TIMESTAMP(3),
    "actualStartDate" TIMESTAMP(3),
    "actualCompletionDate" TIMESTAMP(3),
    "budgetRange" TEXT,
    "mustHaveFeatures" JSONB,
    "niceToHaveFeatures" JSONB,
    "stylePreferences" JSONB,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deck_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."deck_designs" (
    "id" TEXT NOT NULL,
    "deckProjectId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deckingArea" DECIMAL(10,2) NOT NULL,
    "railingLength" DECIMAL(10,2),
    "stairCount" INTEGER NOT NULL DEFAULT 0,
    "stairWidth" DECIMAL(6,2),
    "stairRise" DECIMAL(6,2),
    "stairRun" DECIMAL(6,2),
    "joistSpacing" DECIMAL(4,1) NOT NULL DEFAULT 16,
    "beamSize" TEXT,
    "postSize" TEXT,
    "postCount" INTEGER,
    "footingDepth" DECIMAL(6,2),
    "footingDiameter" DECIMAL(6,2),
    "footingCount" INTEGER,
    "liveLoad" DECIMAL(6,2) NOT NULL DEFAULT 40,
    "deadLoad" DECIMAL(6,2) NOT NULL DEFAULT 10,
    "snowLoad" DECIMAL(6,2),
    "hasBuiltInSeating" BOOLEAN NOT NULL DEFAULT false,
    "hasPrivacyScreen" BOOLEAN NOT NULL DEFAULT false,
    "hasLighting" BOOLEAN NOT NULL DEFAULT false,
    "hasPergola" BOOLEAN NOT NULL DEFAULT false,
    "hasGate" BOOLEAN NOT NULL DEFAULT false,
    "customFeatures" JSONB,
    "cadData" JSONB,
    "threeDModel" TEXT,
    "drawingPdf" TEXT,
    "aiGenerated" BOOLEAN NOT NULL DEFAULT true,
    "aiConfidence" DECIMAL(3,2),
    "aiReasoning" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deck_designs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."deck_materials" (
    "id" TEXT NOT NULL,
    "deckProjectId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "manufacturer" TEXT,
    "model" TEXT,
    "sku" TEXT,
    "quantity" DECIMAL(10,3) NOT NULL,
    "unit" TEXT NOT NULL,
    "unitCost" DECIMAL(10,2),
    "totalCost" DECIMAL(12,2),
    "priceSource" TEXT,
    "priceDate" TIMESTAMP(3),
    "dimensions" TEXT,
    "grade" TEXT,
    "treatment" TEXT,
    "color" TEXT,
    "finish" TEXT,
    "wasteFactor" DECIMAL(5,2) NOT NULL DEFAULT 10,
    "quantityWithWaste" DECIMAL(10,3),
    "aiSuggested" BOOLEAN NOT NULL DEFAULT false,
    "aiAlternatives" JSONB,
    "aiCostComparison" JSONB,
    "supplierName" TEXT,
    "supplierSku" TEXT,
    "leadTime" INTEGER,
    "inStock" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deck_materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."deck_permits" (
    "id" TEXT NOT NULL,
    "deckProjectId" TEXT NOT NULL,
    "permitType" TEXT NOT NULL,
    "jurisdictionName" TEXT NOT NULL,
    "jurisdictionType" TEXT NOT NULL,
    "status" "public"."PermitStatus" NOT NULL DEFAULT 'RESEARCHING',
    "permitNumber" TEXT,
    "description" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "exemptionReason" TEXT,
    "requirements" JSONB,
    "requiredDocuments" JSONB,
    "fees" JSONB,
    "estimatedCost" DECIMAL(10,2),
    "actualCost" DECIMAL(10,2),
    "applicationUrl" TEXT,
    "applicationPdfUrl" TEXT,
    "submittedDate" TIMESTAMP(3),
    "approvedDate" TIMESTAMP(3),
    "expirationDate" TIMESTAMP(3),
    "inspectionsRequired" JSONB,
    "inspectionSchedule" JSONB,
    "contactName" TEXT,
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "officeAddress" TEXT,
    "officeHours" TEXT,
    "aiExtracted" BOOLEAN NOT NULL DEFAULT false,
    "aiConfidence" DECIMAL(3,2),
    "sourceUrl" TEXT,
    "lastVerified" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deck_permits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."deck_property_data" (
    "id" TEXT NOT NULL,
    "deckProjectId" TEXT NOT NULL,
    "parcelId" TEXT NOT NULL,
    "propertyAddress" TEXT NOT NULL,
    "legalDescription" TEXT,
    "lotSize" DECIMAL(12,2),
    "lotDimensions" TEXT,
    "zoningCode" TEXT,
    "zoningDescription" TEXT,
    "landUse" TEXT,
    "setbackFront" DECIMAL(6,2),
    "setbackRear" DECIMAL(6,2),
    "setbackSide" DECIMAL(6,2),
    "maxLotCoverage" DECIMAL(5,2),
    "maxHeight" DECIMAL(6,2),
    "hasHOA" BOOLEAN NOT NULL DEFAULT false,
    "hoaName" TEXT,
    "hoaContactName" TEXT,
    "hoaContactPhone" TEXT,
    "hoaContactEmail" TEXT,
    "hoaApprovalRequired" BOOLEAN NOT NULL DEFAULT false,
    "gisLayerData" JSONB,
    "topographyData" JSONB,
    "floodZone" TEXT,
    "wetlands" BOOLEAN NOT NULL DEFAULT false,
    "plotPlanUrl" TEXT,
    "surveyUrl" TEXT,
    "aerialImageUrl" TEXT,
    "waterService" TEXT,
    "sewerService" TEXT,
    "electricService" TEXT,
    "gasService" TEXT,
    "soilType" TEXT,
    "drainageNotes" TEXT,
    "treesOnProperty" BOOLEAN,
    "protectedTrees" BOOLEAN,
    "gisDataSource" TEXT,
    "gisRetrievedAt" TIMESTAMP(3),
    "dataVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deck_property_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."deck_code_requirements" (
    "id" TEXT NOT NULL,
    "deckProjectId" TEXT NOT NULL,
    "requirementType" "public"."CodeRequirementType" NOT NULL,
    "codeReference" TEXT NOT NULL,
    "codeEdition" TEXT,
    "jurisdictionCode" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "requirement" TEXT NOT NULL,
    "applies" BOOLEAN NOT NULL DEFAULT true,
    "compliance" TEXT,
    "minimumValue" DECIMAL(10,3),
    "maximumValue" DECIMAL(10,3),
    "unit" TEXT,
    "aiExtracted" BOOLEAN NOT NULL DEFAULT true,
    "aiConfidence" DECIMAL(3,2),
    "sourceDocument" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deck_code_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."deck_labor_estimates" (
    "id" TEXT NOT NULL,
    "deckProjectId" TEXT NOT NULL,
    "taskName" TEXT NOT NULL,
    "description" TEXT,
    "skillLevel" TEXT NOT NULL,
    "estimatedHours" DECIMAL(8,2) NOT NULL,
    "crewSize" INTEGER NOT NULL DEFAULT 1,
    "totalCrewHours" DECIMAL(8,2) NOT NULL,
    "hourlyRate" DECIMAL(8,2),
    "totalLaborCost" DECIMAL(12,2),
    "difficultyLevel" TEXT,
    "weatherDependency" BOOLEAN NOT NULL DEFAULT true,
    "equipmentRequired" JSONB,
    "aiCalculated" BOOLEAN NOT NULL DEFAULT true,
    "aiConfidence" DECIMAL(3,2),
    "aiReasoning" TEXT,
    "historicalAverage" DECIMAL(8,2),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deck_labor_estimates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."deck_cost_breakdown" (
    "id" TEXT NOT NULL,
    "deckProjectId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subCategory" TEXT,
    "description" TEXT NOT NULL,
    "estimatedCost" DECIMAL(12,2) NOT NULL,
    "actualCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "variance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "variancePercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "quantity" DECIMAL(10,3),
    "unitCost" DECIMAL(10,2),
    "unit" TEXT,
    "aiOptimization" JSONB,
    "aiAlternatives" JSONB,
    "marketComparison" JSONB,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deck_cost_breakdown_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "deck_projects_companyId_idx" ON "public"."deck_projects"("companyId");

-- CreateIndex
CREATE INDEX "deck_projects_projectId_idx" ON "public"."deck_projects"("projectId");

-- CreateIndex
CREATE INDEX "deck_projects_customerId_idx" ON "public"."deck_projects"("customerId");

-- CreateIndex
CREATE INDEX "deck_projects_status_idx" ON "public"."deck_projects"("status");

-- CreateIndex
CREATE INDEX "deck_projects_state_city_postalCode_idx" ON "public"."deck_projects"("state", "city", "postalCode");

-- CreateIndex
CREATE INDEX "deck_projects_county_idx" ON "public"."deck_projects"("county");

-- CreateIndex
CREATE INDEX "deck_designs_deckProjectId_idx" ON "public"."deck_designs"("deckProjectId");

-- CreateIndex
CREATE INDEX "deck_designs_isActive_idx" ON "public"."deck_designs"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "deck_designs_deckProjectId_version_key" ON "public"."deck_designs"("deckProjectId", "version");

-- CreateIndex
CREATE INDEX "deck_materials_deckProjectId_idx" ON "public"."deck_materials"("deckProjectId");

-- CreateIndex
CREATE INDEX "deck_materials_category_idx" ON "public"."deck_materials"("category");

-- CreateIndex
CREATE INDEX "deck_permits_deckProjectId_idx" ON "public"."deck_permits"("deckProjectId");

-- CreateIndex
CREATE INDEX "deck_permits_status_idx" ON "public"."deck_permits"("status");

-- CreateIndex
CREATE INDEX "deck_permits_jurisdictionName_idx" ON "public"."deck_permits"("jurisdictionName");

-- CreateIndex
CREATE UNIQUE INDEX "deck_property_data_deckProjectId_key" ON "public"."deck_property_data"("deckProjectId");

-- CreateIndex
CREATE INDEX "deck_property_data_parcelId_idx" ON "public"."deck_property_data"("parcelId");

-- CreateIndex
CREATE INDEX "deck_code_requirements_deckProjectId_idx" ON "public"."deck_code_requirements"("deckProjectId");

-- CreateIndex
CREATE INDEX "deck_code_requirements_requirementType_idx" ON "public"."deck_code_requirements"("requirementType");

-- CreateIndex
CREATE INDEX "deck_code_requirements_codeReference_idx" ON "public"."deck_code_requirements"("codeReference");

-- CreateIndex
CREATE INDEX "deck_labor_estimates_deckProjectId_idx" ON "public"."deck_labor_estimates"("deckProjectId");

-- CreateIndex
CREATE INDEX "deck_cost_breakdown_deckProjectId_idx" ON "public"."deck_cost_breakdown"("deckProjectId");

-- CreateIndex
CREATE INDEX "deck_cost_breakdown_category_idx" ON "public"."deck_cost_breakdown"("category");

-- AddForeignKey
ALTER TABLE "public"."deck_projects" ADD CONSTRAINT "deck_projects_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."deck_projects" ADD CONSTRAINT "deck_projects_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."deck_projects" ADD CONSTRAINT "deck_projects_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."deck_designs" ADD CONSTRAINT "deck_designs_deckProjectId_fkey" FOREIGN KEY ("deckProjectId") REFERENCES "public"."deck_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."deck_materials" ADD CONSTRAINT "deck_materials_deckProjectId_fkey" FOREIGN KEY ("deckProjectId") REFERENCES "public"."deck_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."deck_permits" ADD CONSTRAINT "deck_permits_deckProjectId_fkey" FOREIGN KEY ("deckProjectId") REFERENCES "public"."deck_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."deck_property_data" ADD CONSTRAINT "deck_property_data_deckProjectId_fkey" FOREIGN KEY ("deckProjectId") REFERENCES "public"."deck_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."deck_code_requirements" ADD CONSTRAINT "deck_code_requirements_deckProjectId_fkey" FOREIGN KEY ("deckProjectId") REFERENCES "public"."deck_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."deck_labor_estimates" ADD CONSTRAINT "deck_labor_estimates_deckProjectId_fkey" FOREIGN KEY ("deckProjectId") REFERENCES "public"."deck_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."deck_cost_breakdown" ADD CONSTRAINT "deck_cost_breakdown_deckProjectId_fkey" FOREIGN KEY ("deckProjectId") REFERENCES "public"."deck_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
