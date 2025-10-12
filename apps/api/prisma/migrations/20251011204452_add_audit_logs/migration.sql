-- CreateEnum
CREATE TYPE "public"."IntegrationProvider" AS ENUM ('GOOGLE', 'QUICKBOOKS', 'STRIPE', 'PROCORE', 'BUILDERTREND');

-- AlterTable
ALTER TABLE "public"."expenses" ADD COLUMN     "quickBooksId" TEXT,
ADD COLUMN     "syncedToQuickBooks" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "public"."photo_annotations" (
    "id" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "photo_annotations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."photo_comments" (
    "id" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "photo_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."integrations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "public"."IntegrationProvider" NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "metadata" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integrations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "photo_annotations_fileId_idx" ON "public"."photo_annotations"("fileId");

-- CreateIndex
CREATE INDEX "photo_comments_fileId_idx" ON "public"."photo_comments"("fileId");

-- CreateIndex
CREATE INDEX "integrations_userId_idx" ON "public"."integrations"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "integrations_userId_provider_key" ON "public"."integrations"("userId", "provider");

-- AddForeignKey
ALTER TABLE "public"."photo_annotations" ADD CONSTRAINT "photo_annotations_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "public"."project_files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."photo_annotations" ADD CONSTRAINT "photo_annotations_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."photo_comments" ADD CONSTRAINT "photo_comments_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "public"."project_files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."photo_comments" ADD CONSTRAINT "photo_comments_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."integrations" ADD CONSTRAINT "integrations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
