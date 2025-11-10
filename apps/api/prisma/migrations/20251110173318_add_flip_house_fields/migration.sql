-- CreateEnum
CREATE TYPE "ProjectType" AS ENUM ('NEW_CONSTRUCTION', 'RENOVATION', 'FLIP_HOUSE', 'COMMERCIAL', 'MAINTENANCE', 'OTHER');

-- CreateEnum
CREATE TYPE "PropertyType" AS ENUM ('SINGLE_FAMILY', 'CONDO', 'TOWNHOUSE', 'MULTI_FAMILY', 'LAND', 'COMMERCIAL', 'OTHER');

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "projectType" "ProjectType",
ADD COLUMN     "propertyType" "PropertyType",
ADD COLUMN     "purchasePrice" DECIMAL(12,2),
ADD COLUMN     "renovationBudget" DECIMAL(12,2),
ADD COLUMN     "squareFeet" INTEGER,
ADD COLUMN     "bedrooms" INTEGER,
ADD COLUMN     "bathrooms" DECIMAL(3,1),
ADD COLUMN     "lotSize" DECIMAL(10,2),
ADD COLUMN     "yearBuilt" INTEGER,
ADD COLUMN     "acquisitionDate" TIMESTAMP(3),
ADD COLUMN     "targetSaleDate" TIMESTAMP(3),
ADD COLUMN     "estimatedARV" DECIMAL(12,2),
ADD COLUMN     "estimatedRent" DECIMAL(10,2),
ADD COLUMN     "streetAddress" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "state" TEXT,
ADD COLUMN     "zipCode" TEXT,
ADD COLUMN     "aiAnalysisData" JSONB,
ADD COLUMN     "aiAnalysisDate" TIMESTAMP(3);
