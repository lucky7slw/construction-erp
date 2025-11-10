-- CreateTable
CREATE TABLE "project_settings" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "defaultMarkupPercent" DECIMAL(5,2),
    "defaultTaxRate" DECIMAL(5,4),
    "billableHourlyRate" DECIMAL(8,2),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "workingHoursPerDay" DECIMAL(4,2) NOT NULL DEFAULT 8,
    "workingDaysPerWeek" INTEGER NOT NULL DEFAULT 5,
    "weekStartDay" TEXT NOT NULL DEFAULT 'Monday',
    "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "budgetAlertEnabled" BOOLEAN NOT NULL DEFAULT true,
    "budgetAlertThreshold" DECIMAL(5,2) NOT NULL DEFAULT 80,
    "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "defaultTaskPriority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "autoAssignTasks" BOOLEAN NOT NULL DEFAULT false,
    "requireTaskApproval" BOOLEAN NOT NULL DEFAULT false,
    "requireDocumentApproval" BOOLEAN NOT NULL DEFAULT false,
    "maxFileUploadSizeMB" INTEGER NOT NULL DEFAULT 50,
    "allowedFileTypes" JSONB,
    "quickBooksSync" BOOLEAN NOT NULL DEFAULT false,
    "googleCalendarSync" BOOLEAN NOT NULL DEFAULT false,
    "dateFormat" TEXT NOT NULL DEFAULT 'MM/DD/YYYY',
    "numberFormat" TEXT NOT NULL DEFAULT 'en-US',
    "showCostToClient" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "project_settings_projectId_key" ON "project_settings"("projectId");

-- AddForeignKey
ALTER TABLE "project_settings" ADD CONSTRAINT "project_settings_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
