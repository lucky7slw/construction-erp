-- CreateEnum
CREATE TYPE "public"."ProjectStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "public"."DependencyType" AS ENUM ('FS', 'SS', 'FF', 'SF');

-- CreateEnum
CREATE TYPE "public"."ExpenseCategory" AS ENUM ('MATERIALS', 'EQUIPMENT', 'LABOR', 'TRANSPORTATION', 'PERMITS', 'UTILITIES', 'INSURANCE', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."QuoteStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "public"."InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PAID', 'PARTIALLY_PAID', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."PaymentMethod" AS ENUM ('CASH', 'CHECK', 'BANK_TRANSFER', 'CREDIT_CARD', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'CONVERTED', 'LOST');

-- CreateEnum
CREATE TYPE "public"."LeadSource" AS ENUM ('WEBSITE', 'REFERRAL', 'COLD_CALL', 'SOCIAL_MEDIA', 'TRADE_SHOW', 'ADVERTISEMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."InteractionType" AS ENUM ('CALL', 'EMAIL', 'MEETING', 'NOTE', 'TASK', 'SMS');

-- CreateEnum
CREATE TYPE "public"."FollowUpStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "public"."ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'PASSWORD_CHANGE', 'PERMISSION_CHANGE');

-- CreateEnum
CREATE TYPE "public"."FileCategory" AS ENUM ('CONTRACT', 'PERMIT', 'PHOTO', 'INVOICE', 'DRAWING', 'REPORT', 'SELECTION', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."IncidentType" AS ENUM ('INJURY', 'NEAR_MISS', 'PROPERTY_DAMAGE', 'SAFETY_VIOLATION');

-- CreateEnum
CREATE TYPE "public"."IncidentSeverity" AS ENUM ('MINOR', 'MODERATE', 'SERIOUS', 'CRITICAL');

-- CreateEnum
CREATE TYPE "public"."POStatus" AS ENUM ('DRAFT', 'SENT', 'ACKNOWLEDGED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'INVOICED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."ChangeOrderStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'IMPLEMENTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."BudgetCategory" AS ENUM ('LABOR', 'MATERIALS', 'EQUIPMENT', 'SUBCONTRACTORS', 'PERMITS', 'OVERHEAD', 'CONTINGENCY', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."EstimateStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED', 'CONVERTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "public"."EstimateLineCategory" AS ENUM ('LABOR', 'MATERIALS', 'EQUIPMENT', 'SUBCONTRACTORS', 'PERMITS', 'OVERHEAD', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."MeasurementType" AS ENUM ('LINEAR', 'AREA', 'VOLUME', 'COUNT', 'WEIGHT');

-- CreateEnum
CREATE TYPE "public"."TakeoffStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'COMPLETED', 'APPROVED');

-- CreateEnum
CREATE TYPE "public"."BidStatus" AS ENUM ('INVITED', 'DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'AWARDED', 'DECLINED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "public"."BidType" AS ENUM ('SUBCONTRACTOR', 'SUPPLIER', 'EQUIPMENT');

-- CreateEnum
CREATE TYPE "public"."SelectionStatus" AS ENUM ('PENDING', 'SELECTED', 'APPROVED', 'ORDERED', 'INSTALLED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."SelectionCategory" AS ENUM ('FLOORING', 'CABINETS', 'COUNTERTOPS', 'APPLIANCES', 'FIXTURES', 'HARDWARE', 'LIGHTING', 'PAINT', 'TILE', 'TRIM', 'DOORS', 'WINDOWS', 'ROOFING', 'SIDING', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."MoodBoardStatus" AS ENUM ('DRAFT', 'SHARED', 'APPROVED', 'REJECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "public"."MoodBoardItemType" AS ENUM ('IMAGE', 'COLOR', 'MATERIAL', 'PRODUCT', 'INSPIRATION', 'NOTE');

-- CreateEnum
CREATE TYPE "public"."RFIStatus" AS ENUM ('DRAFT', 'OPEN', 'ANSWERED', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."RFIPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "public"."SubmittalStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'APPROVED_WITH_COMMENTS', 'REJECTED', 'RESUBMIT_REQUIRED');

-- CreateEnum
CREATE TYPE "public"."SubmittalType" AS ENUM ('SHOP_DRAWING', 'PRODUCT_DATA', 'SAMPLE', 'MOCK_UP', 'TEST_REPORT', 'CERTIFICATION', 'WARRANTY', 'OTHER');

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerifyToken" TEXT,
    "passwordResetToken" TEXT,
    "passwordResetExpires" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isSystemRole" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."permissions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."role_permissions" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_roles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "companyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."refresh_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legalName" TEXT,
    "registrationNo" TEXT,
    "vatNumber" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "country" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "logo" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."company_users" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "isOwner" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."customers" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "country" TEXT,
    "contactPerson" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."suppliers" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "country" TEXT,
    "contactPerson" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."projects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "public"."ProjectStatus" NOT NULL DEFAULT 'DRAFT',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "plannedHours" DECIMAL(10,2),
    "actualHours" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "budget" DECIMAL(12,2),
    "actualCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "companyId" TEXT NOT NULL,
    "customerId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."project_users" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tasks" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "public"."TaskStatus" NOT NULL DEFAULT 'TODO',
    "priority" "public"."TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "startDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "progress" INTEGER NOT NULL DEFAULT 0,
    "isMilestone" BOOLEAN NOT NULL DEFAULT false,
    "projectId" TEXT NOT NULL,
    "assigneeId" TEXT,
    "estimatedHours" DECIMAL(6,2),
    "actualHours" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."task_dependencies" (
    "id" TEXT NOT NULL,
    "predecessorId" TEXT NOT NULL,
    "dependentId" TEXT NOT NULL,
    "type" "public"."DependencyType" NOT NULL DEFAULT 'FS',
    "lagDays" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_dependencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."time_entries" (
    "id" TEXT NOT NULL,
    "description" TEXT,
    "hours" DECIMAL(6,2) NOT NULL,
    "date" DATE NOT NULL,
    "billable" BOOLEAN NOT NULL DEFAULT true,
    "hourlyRate" DECIMAL(8,2),
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "taskId" TEXT,
    "gpsLatitude" DECIMAL(10,8),
    "gpsLongitude" DECIMAL(11,8),
    "gpsAccuracy" DECIMAL(6,2),
    "aiSuggested" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "time_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."expenses" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "category" "public"."ExpenseCategory" NOT NULL,
    "date" DATE NOT NULL,
    "receipt" TEXT,
    "billable" BOOLEAN NOT NULL DEFAULT false,
    "reimbursable" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT NOT NULL,
    "projectId" TEXT,
    "supplierId" TEXT,
    "aiCategorized" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."quotes" (
    "id" TEXT NOT NULL,
    "quoteNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "public"."QuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "subtotal" DECIMAL(12,2) NOT NULL,
    "taxRate" DECIMAL(5,4) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,
    "validUntil" TIMESTAMP(3),
    "notes" TEXT,
    "companyId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "projectId" TEXT,
    "leadId" TEXT,
    "createdById" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "aiAnalysisData" JSONB,
    "profitMargin" DECIMAL(5,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."quote_items" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(10,3) NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "quoteId" TEXT NOT NULL,
    "category" TEXT,

    CONSTRAINT "quote_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."invoices" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "public"."InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "subtotal" DECIMAL(12,2) NOT NULL,
    "taxRate" DECIMAL(5,4) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,
    "paidAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "companyId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "projectId" TEXT,
    "quoteId" TEXT,
    "createdById" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."invoice_items" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(10,3) NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "invoiceId" TEXT NOT NULL,

    CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."payments" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "method" "public"."PaymentMethod" NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "invoiceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."leads" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "customerId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "public"."LeadStatus" NOT NULL DEFAULT 'NEW',
    "source" "public"."LeadSource" NOT NULL,
    "value" DECIMAL(12,2),
    "probability" INTEGER NOT NULL DEFAULT 50,
    "expectedCloseDate" TIMESTAMP(3),
    "contactName" TEXT NOT NULL,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "contactAddress" TEXT,
    "qualificationScore" INTEGER,
    "assignedToId" TEXT,
    "createdById" TEXT NOT NULL,
    "convertedAt" TIMESTAMP(3),
    "lostReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."customer_interactions" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "leadId" TEXT,
    "type" "public"."InteractionType" NOT NULL,
    "subject" TEXT NOT NULL,
    "content" TEXT,
    "direction" TEXT,
    "duration" INTEGER,
    "outcome" TEXT,
    "createdById" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."follow_up_tasks" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "public"."FollowUpStatus" NOT NULL DEFAULT 'PENDING',
    "dueDate" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "follow_up_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."quote_versions" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "taxRate" DECIMAL(5,4) NOT NULL,
    "taxAmount" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "items" JSONB NOT NULL,
    "notes" TEXT,
    "changeReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quote_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."quote_approvals" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "approverId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "status" "public"."ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "comments" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quote_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."audit_logs" (
    "id" TEXT NOT NULL,
    "action" "public"."AuditAction" NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT,
    "oldValues" JSONB,
    "newValues" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."task_checklist_items" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "completedBy" TEXT,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."project_files" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "category" "public"."FileCategory" NOT NULL DEFAULT 'OTHER',
    "filename" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "location" TEXT,
    "takenAt" TIMESTAMP(3),
    "uploadedBy" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."daily_logs" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "weather" JSONB,
    "workCompleted" TEXT,
    "notes" TEXT,
    "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."crew_attendance" (
    "id" TEXT NOT NULL,
    "dailyLogId" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "workerName" TEXT NOT NULL,
    "hoursWorked" DECIMAL(5,2) NOT NULL,
    "trade" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crew_attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."deliveries" (
    "id" TEXT NOT NULL,
    "dailyLogId" TEXT NOT NULL,
    "supplier" TEXT NOT NULL,
    "material" TEXT NOT NULL,
    "quantity" TEXT NOT NULL,
    "poNumber" TEXT,
    "receivedBy" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."equipment_usage" (
    "id" TEXT NOT NULL,
    "dailyLogId" TEXT NOT NULL,
    "equipment" TEXT NOT NULL,
    "hours" DECIMAL(5,2) NOT NULL,
    "operator" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "equipment_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."safety_incidents" (
    "id" TEXT NOT NULL,
    "dailyLogId" TEXT NOT NULL,
    "type" "public"."IncidentType" NOT NULL,
    "severity" "public"."IncidentSeverity" NOT NULL,
    "description" TEXT NOT NULL,
    "personInvolved" TEXT,
    "actionTaken" TEXT NOT NULL,
    "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "reportedTo" TEXT,
    "followUpRequired" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "safety_incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."purchase_orders" (
    "id" TEXT NOT NULL,
    "poNumber" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "status" "public"."POStatus" NOT NULL DEFAULT 'DRAFT',
    "subtotal" DECIMAL(12,2) NOT NULL,
    "tax" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "deliveryDate" TIMESTAMP(3),
    "deliveryAddress" TEXT,
    "notes" TEXT,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."purchase_order_items" (
    "id" TEXT NOT NULL,
    "poId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unit" TEXT NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "receivedQty" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "taskId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."change_orders" (
    "id" TEXT NOT NULL,
    "coNumber" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "costImpact" DECIMAL(12,2) NOT NULL,
    "timeImpact" INTEGER NOT NULL,
    "status" "public"."ChangeOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "requestedBy" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "attachments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "change_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."change_order_items" (
    "id" TEXT NOT NULL,
    "coId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unit" TEXT NOT NULL,
    "unitCost" DECIMAL(10,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "change_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."budget_line_items" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "category" "public"."BudgetCategory" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "costCode" TEXT,
    "budgetedAmount" DECIMAL(12,2) NOT NULL,
    "actualAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "committedAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "budget_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."cost_transactions" (
    "id" TEXT NOT NULL,
    "budgetLineId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "transactionType" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "description" TEXT NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cost_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."estimates" (
    "id" TEXT NOT NULL,
    "estimateNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "public"."EstimateStatus" NOT NULL DEFAULT 'DRAFT',
    "description" TEXT,
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "overheadPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "overheadAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "profitPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "profitAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "validUntil" TIMESTAMP(3),
    "notes" TEXT,
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "aiConfidenceScore" DECIMAL(3,2),
    "aiAnalysisData" JSONB,
    "convertedToQuoteId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "estimates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."estimate_line_items" (
    "id" TEXT NOT NULL,
    "estimateId" TEXT NOT NULL,
    "category" "public"."EstimateLineCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(10,3) NOT NULL,
    "unit" TEXT NOT NULL,
    "unitCost" DECIMAL(10,2) NOT NULL,
    "laborHours" DECIMAL(6,2),
    "laborRate" DECIMAL(8,2),
    "materialCost" DECIMAL(10,2),
    "equipmentCost" DECIMAL(10,2),
    "subtotal" DECIMAL(12,2) NOT NULL,
    "markup" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "linkedTakeoffId" TEXT,
    "aiSuggested" BOOLEAN NOT NULL DEFAULT false,
    "aiConfidence" DECIMAL(3,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "estimate_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."estimate_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "lineItems" JSONB NOT NULL,
    "defaultMarkup" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "useCount" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "estimate_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."cost_database_items" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "category" "public"."EstimateLineCategory" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "unit" TEXT NOT NULL,
    "currentCost" DECIMAL(10,2) NOT NULL,
    "averageCost" DECIMAL(10,2) NOT NULL,
    "lowestCost" DECIMAL(10,2) NOT NULL,
    "highestCost" DECIMAL(10,2) NOT NULL,
    "supplierName" TEXT,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "priceHistory" JSONB,
    "aiPredictedCost" DECIMAL(10,2),
    "aiTrendDirection" TEXT,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cost_database_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."estimate_assemblies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "components" JSONB NOT NULL,
    "totalCost" DECIMAL(12,2) NOT NULL,
    "totalLaborHours" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "useCount" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "estimate_assemblies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."takeoffs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "estimateId" TEXT,
    "status" "public"."TakeoffStatus" NOT NULL DEFAULT 'DRAFT',
    "description" TEXT,
    "drawingReference" TEXT,
    "scale" DECIMAL(10,6),
    "totalQuantity" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL DEFAULT 'units',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "takeoffs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."takeoff_layers" (
    "id" TEXT NOT NULL,
    "takeoffId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#3B82F6',
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "takeoff_layers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."takeoff_measurements" (
    "id" TEXT NOT NULL,
    "takeoffId" TEXT NOT NULL,
    "layerId" TEXT,
    "measurementType" "public"."MeasurementType" NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "unit" TEXT NOT NULL,
    "length" DECIMAL(10,3),
    "width" DECIMAL(10,3),
    "height" DECIMAL(10,3),
    "diameter" DECIMAL(10,3),
    "area" DECIMAL(12,3),
    "volume" DECIMAL(12,3),
    "coordinates" JSONB,
    "notes" TEXT,
    "linkedEstimateLineId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "takeoff_measurements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."bids" (
    "id" TEXT NOT NULL,
    "bidNumber" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "supplierId" TEXT,
    "bidType" "public"."BidType" NOT NULL,
    "status" "public"."BidStatus" NOT NULL DEFAULT 'DRAFT',
    "scopeOfWork" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3),
    "submittedDate" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "bondRequired" BOOLEAN NOT NULL DEFAULT false,
    "bondAmount" DECIMAL(12,2),
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "attachmentUrls" JSONB,
    "comparisonScore" DECIMAL(3,2),
    "awardedDate" TIMESTAMP(3),
    "declinedReason" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bids_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."bid_line_items" (
    "id" TEXT NOT NULL,
    "bidId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(10,3) NOT NULL,
    "unit" TEXT NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "linkedEstimateLineId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bid_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."bid_packages" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "description" TEXT,
    "scopeDocument" TEXT,
    "dueDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bid_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."bid_package_invitations" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "invitedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentByUserId" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bid_package_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."selections" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "customerId" TEXT,
    "category" "public"."SelectionCategory" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "public"."SelectionStatus" NOT NULL DEFAULT 'PENDING',
    "manufacturer" TEXT,
    "model" TEXT,
    "sku" TEXT,
    "color" TEXT,
    "finish" TEXT,
    "quantity" DECIMAL(10,2) NOT NULL DEFAULT 1,
    "unit" TEXT NOT NULL DEFAULT 'units',
    "unitPrice" DECIMAL(10,2),
    "totalPrice" DECIMAL(12,2),
    "budgetAmount" DECIMAL(12,2),
    "variance" DECIMAL(12,2),
    "vendorName" TEXT,
    "vendorContact" TEXT,
    "leadTime" INTEGER,
    "dueDate" TIMESTAMP(3),
    "selectedDate" TIMESTAMP(3),
    "approvedDate" TIMESTAMP(3),
    "orderedDate" TIMESTAMP(3),
    "installedDate" TIMESTAMP(3),
    "notes" TEXT,
    "imageUrls" JSONB,
    "specSheetUrl" TEXT,
    "approvedByUserId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "selections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."selection_options" (
    "id" TEXT NOT NULL,
    "selectionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "manufacturer" TEXT,
    "model" TEXT,
    "sku" TEXT,
    "color" TEXT,
    "finish" TEXT,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "imageUrls" JSONB,
    "specSheetUrl" TEXT,
    "isRecommended" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "selection_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."selection_changes" (
    "id" TEXT NOT NULL,
    "selectionId" TEXT NOT NULL,
    "changedByUserId" TEXT NOT NULL,
    "changeType" TEXT NOT NULL,
    "previousValue" JSONB,
    "newValue" JSONB,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "selection_changes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."mood_boards" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "customerId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "room" TEXT,
    "style" TEXT,
    "status" "public"."MoodBoardStatus" NOT NULL DEFAULT 'DRAFT',
    "colorPalette" JSONB,
    "sharedDate" TIMESTAMP(3),
    "approvedDate" TIMESTAMP(3),
    "approvedByUserId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mood_boards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."mood_board_items" (
    "id" TEXT NOT NULL,
    "moodBoardId" TEXT NOT NULL,
    "type" "public"."MoodBoardItemType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "colorHex" TEXT,
    "manufacturer" TEXT,
    "model" TEXT,
    "sku" TEXT,
    "price" DECIMAL(10,2),
    "sourceUrl" TEXT,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mood_board_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."mood_board_comments" (
    "id" TEXT NOT NULL,
    "moodBoardId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "itemId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mood_board_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."rfis" (
    "id" TEXT NOT NULL,
    "rfiNumber" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "status" "public"."RFIStatus" NOT NULL DEFAULT 'DRAFT',
    "priority" "public"."RFIPriority" NOT NULL DEFAULT 'MEDIUM',
    "discipline" TEXT,
    "drawingReference" TEXT,
    "specReference" TEXT,
    "costImpact" DECIMAL(12,2),
    "scheduleImpact" INTEGER,
    "submittedBy" TEXT NOT NULL,
    "submittedDate" TIMESTAMP(3),
    "assignedTo" TEXT,
    "dueDate" TIMESTAMP(3),
    "answer" TEXT,
    "answeredBy" TEXT,
    "answeredDate" TIMESTAMP(3),
    "attachments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rfis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."submittals" (
    "id" TEXT NOT NULL,
    "submittalNumber" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "public"."SubmittalType" NOT NULL,
    "status" "public"."SubmittalStatus" NOT NULL DEFAULT 'DRAFT',
    "specSection" TEXT,
    "drawingReference" TEXT,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "submittedBy" TEXT NOT NULL,
    "submittedDate" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "reviewedDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "requiredOnSite" TIMESTAMP(3),
    "manufacturer" TEXT,
    "model" TEXT,
    "comments" TEXT,
    "attachments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "submittals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "public"."roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_name_key" ON "public"."permissions"("name");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_resource_action_key" ON "public"."permissions"("resource", "action");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_roleId_permissionId_key" ON "public"."role_permissions"("roleId", "permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_userId_roleId_companyId_key" ON "public"."user_roles"("userId", "roleId", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "public"."refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "public"."refresh_tokens"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "company_users_userId_companyId_key" ON "public"."company_users"("userId", "companyId");

-- CreateIndex
CREATE INDEX "projects_companyId_idx" ON "public"."projects"("companyId");

-- CreateIndex
CREATE INDEX "projects_customerId_idx" ON "public"."projects"("customerId");

-- CreateIndex
CREATE INDEX "projects_status_idx" ON "public"."projects"("status");

-- CreateIndex
CREATE UNIQUE INDEX "project_users_userId_projectId_key" ON "public"."project_users"("userId", "projectId");

-- CreateIndex
CREATE INDEX "tasks_projectId_idx" ON "public"."tasks"("projectId");

-- CreateIndex
CREATE INDEX "tasks_assigneeId_idx" ON "public"."tasks"("assigneeId");

-- CreateIndex
CREATE INDEX "tasks_status_idx" ON "public"."tasks"("status");

-- CreateIndex
CREATE INDEX "tasks_startDate_idx" ON "public"."tasks"("startDate");

-- CreateIndex
CREATE INDEX "tasks_dueDate_idx" ON "public"."tasks"("dueDate");

-- CreateIndex
CREATE INDEX "task_dependencies_predecessorId_idx" ON "public"."task_dependencies"("predecessorId");

-- CreateIndex
CREATE INDEX "task_dependencies_dependentId_idx" ON "public"."task_dependencies"("dependentId");

-- CreateIndex
CREATE UNIQUE INDEX "task_dependencies_predecessorId_dependentId_key" ON "public"."task_dependencies"("predecessorId", "dependentId");

-- CreateIndex
CREATE INDEX "time_entries_userId_idx" ON "public"."time_entries"("userId");

-- CreateIndex
CREATE INDEX "time_entries_projectId_idx" ON "public"."time_entries"("projectId");

-- CreateIndex
CREATE INDEX "time_entries_date_idx" ON "public"."time_entries"("date");

-- CreateIndex
CREATE INDEX "expenses_userId_idx" ON "public"."expenses"("userId");

-- CreateIndex
CREATE INDEX "expenses_projectId_idx" ON "public"."expenses"("projectId");

-- CreateIndex
CREATE INDEX "expenses_date_idx" ON "public"."expenses"("date");

-- CreateIndex
CREATE UNIQUE INDEX "quotes_quoteNumber_key" ON "public"."quotes"("quoteNumber");

-- CreateIndex
CREATE INDEX "quotes_companyId_idx" ON "public"."quotes"("companyId");

-- CreateIndex
CREATE INDEX "quotes_customerId_idx" ON "public"."quotes"("customerId");

-- CreateIndex
CREATE INDEX "quotes_leadId_idx" ON "public"."quotes"("leadId");

-- CreateIndex
CREATE INDEX "quotes_status_idx" ON "public"."quotes"("status");

-- CreateIndex
CREATE INDEX "quote_items_quoteId_idx" ON "public"."quote_items"("quoteId");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoiceNumber_key" ON "public"."invoices"("invoiceNumber");

-- CreateIndex
CREATE INDEX "invoices_companyId_idx" ON "public"."invoices"("companyId");

-- CreateIndex
CREATE INDEX "invoices_customerId_idx" ON "public"."invoices"("customerId");

-- CreateIndex
CREATE INDEX "invoices_status_idx" ON "public"."invoices"("status");

-- CreateIndex
CREATE INDEX "invoices_dueDate_idx" ON "public"."invoices"("dueDate");

-- CreateIndex
CREATE INDEX "invoice_items_invoiceId_idx" ON "public"."invoice_items"("invoiceId");

-- CreateIndex
CREATE INDEX "payments_invoiceId_idx" ON "public"."payments"("invoiceId");

-- CreateIndex
CREATE INDEX "leads_companyId_idx" ON "public"."leads"("companyId");

-- CreateIndex
CREATE INDEX "leads_customerId_idx" ON "public"."leads"("customerId");

-- CreateIndex
CREATE INDEX "leads_assignedToId_idx" ON "public"."leads"("assignedToId");

-- CreateIndex
CREATE INDEX "leads_status_idx" ON "public"."leads"("status");

-- CreateIndex
CREATE INDEX "leads_expectedCloseDate_idx" ON "public"."leads"("expectedCloseDate");

-- CreateIndex
CREATE INDEX "customer_interactions_customerId_idx" ON "public"."customer_interactions"("customerId");

-- CreateIndex
CREATE INDEX "customer_interactions_leadId_idx" ON "public"."customer_interactions"("leadId");

-- CreateIndex
CREATE INDEX "customer_interactions_occurredAt_idx" ON "public"."customer_interactions"("occurredAt");

-- CreateIndex
CREATE INDEX "follow_up_tasks_leadId_idx" ON "public"."follow_up_tasks"("leadId");

-- CreateIndex
CREATE INDEX "follow_up_tasks_dueDate_idx" ON "public"."follow_up_tasks"("dueDate");

-- CreateIndex
CREATE INDEX "follow_up_tasks_status_idx" ON "public"."follow_up_tasks"("status");

-- CreateIndex
CREATE INDEX "quote_versions_quoteId_idx" ON "public"."quote_versions"("quoteId");

-- CreateIndex
CREATE UNIQUE INDEX "quote_versions_quoteId_version_key" ON "public"."quote_versions"("quoteId", "version");

-- CreateIndex
CREATE INDEX "quote_approvals_quoteId_idx" ON "public"."quote_approvals"("quoteId");

-- CreateIndex
CREATE INDEX "quote_approvals_approverId_idx" ON "public"."quote_approvals"("approverId");

-- CreateIndex
CREATE INDEX "quote_approvals_status_idx" ON "public"."quote_approvals"("status");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "public"."audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_resource_idx" ON "public"."audit_logs"("resource");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "public"."audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "task_checklist_items_taskId_idx" ON "public"."task_checklist_items"("taskId");

-- CreateIndex
CREATE INDEX "project_files_projectId_idx" ON "public"."project_files"("projectId");

-- CreateIndex
CREATE INDEX "project_files_category_idx" ON "public"."project_files"("category");

-- CreateIndex
CREATE INDEX "project_files_uploadedBy_idx" ON "public"."project_files"("uploadedBy");

-- CreateIndex
CREATE INDEX "daily_logs_projectId_idx" ON "public"."daily_logs"("projectId");

-- CreateIndex
CREATE INDEX "daily_logs_date_idx" ON "public"."daily_logs"("date");

-- CreateIndex
CREATE UNIQUE INDEX "daily_logs_projectId_date_key" ON "public"."daily_logs"("projectId", "date");

-- CreateIndex
CREATE INDEX "crew_attendance_dailyLogId_idx" ON "public"."crew_attendance"("dailyLogId");

-- CreateIndex
CREATE INDEX "deliveries_dailyLogId_idx" ON "public"."deliveries"("dailyLogId");

-- CreateIndex
CREATE INDEX "equipment_usage_dailyLogId_idx" ON "public"."equipment_usage"("dailyLogId");

-- CreateIndex
CREATE INDEX "safety_incidents_dailyLogId_idx" ON "public"."safety_incidents"("dailyLogId");

-- CreateIndex
CREATE INDEX "safety_incidents_type_idx" ON "public"."safety_incidents"("type");

-- CreateIndex
CREATE INDEX "safety_incidents_severity_idx" ON "public"."safety_incidents"("severity");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_poNumber_key" ON "public"."purchase_orders"("poNumber");

-- CreateIndex
CREATE INDEX "purchase_orders_projectId_idx" ON "public"."purchase_orders"("projectId");

-- CreateIndex
CREATE INDEX "purchase_orders_supplierId_idx" ON "public"."purchase_orders"("supplierId");

-- CreateIndex
CREATE INDEX "purchase_orders_status_idx" ON "public"."purchase_orders"("status");

-- CreateIndex
CREATE INDEX "purchase_order_items_poId_idx" ON "public"."purchase_order_items"("poId");

-- CreateIndex
CREATE UNIQUE INDEX "change_orders_coNumber_key" ON "public"."change_orders"("coNumber");

-- CreateIndex
CREATE INDEX "change_orders_projectId_idx" ON "public"."change_orders"("projectId");

-- CreateIndex
CREATE INDEX "change_orders_status_idx" ON "public"."change_orders"("status");

-- CreateIndex
CREATE INDEX "change_order_items_coId_idx" ON "public"."change_order_items"("coId");

-- CreateIndex
CREATE INDEX "budget_line_items_projectId_idx" ON "public"."budget_line_items"("projectId");

-- CreateIndex
CREATE INDEX "budget_line_items_category_idx" ON "public"."budget_line_items"("category");

-- CreateIndex
CREATE INDEX "budget_line_items_costCode_idx" ON "public"."budget_line_items"("costCode");

-- CreateIndex
CREATE INDEX "cost_transactions_budgetLineId_idx" ON "public"."cost_transactions"("budgetLineId");

-- CreateIndex
CREATE INDEX "cost_transactions_projectId_idx" ON "public"."cost_transactions"("projectId");

-- CreateIndex
CREATE INDEX "cost_transactions_transactionDate_idx" ON "public"."cost_transactions"("transactionDate");

-- CreateIndex
CREATE INDEX "cost_transactions_referenceType_referenceId_idx" ON "public"."cost_transactions"("referenceType", "referenceId");

-- CreateIndex
CREATE UNIQUE INDEX "estimates_estimateNumber_key" ON "public"."estimates"("estimateNumber");

-- CreateIndex
CREATE INDEX "estimates_projectId_idx" ON "public"."estimates"("projectId");

-- CreateIndex
CREATE INDEX "estimates_status_idx" ON "public"."estimates"("status");

-- CreateIndex
CREATE INDEX "estimates_createdById_idx" ON "public"."estimates"("createdById");

-- CreateIndex
CREATE INDEX "estimate_line_items_estimateId_idx" ON "public"."estimate_line_items"("estimateId");

-- CreateIndex
CREATE INDEX "estimate_line_items_category_idx" ON "public"."estimate_line_items"("category");

-- CreateIndex
CREATE INDEX "estimate_templates_companyId_idx" ON "public"."estimate_templates"("companyId");

-- CreateIndex
CREATE INDEX "estimate_templates_category_idx" ON "public"."estimate_templates"("category");

-- CreateIndex
CREATE INDEX "cost_database_items_companyId_idx" ON "public"."cost_database_items"("companyId");

-- CreateIndex
CREATE INDEX "cost_database_items_category_idx" ON "public"."cost_database_items"("category");

-- CreateIndex
CREATE INDEX "estimate_assemblies_companyId_idx" ON "public"."estimate_assemblies"("companyId");

-- CreateIndex
CREATE INDEX "estimate_assemblies_category_idx" ON "public"."estimate_assemblies"("category");

-- CreateIndex
CREATE INDEX "takeoffs_projectId_idx" ON "public"."takeoffs"("projectId");

-- CreateIndex
CREATE INDEX "takeoffs_estimateId_idx" ON "public"."takeoffs"("estimateId");

-- CreateIndex
CREATE INDEX "takeoffs_status_idx" ON "public"."takeoffs"("status");

-- CreateIndex
CREATE INDEX "takeoff_layers_takeoffId_idx" ON "public"."takeoff_layers"("takeoffId");

-- CreateIndex
CREATE INDEX "takeoff_measurements_takeoffId_idx" ON "public"."takeoff_measurements"("takeoffId");

-- CreateIndex
CREATE INDEX "takeoff_measurements_layerId_idx" ON "public"."takeoff_measurements"("layerId");

-- CreateIndex
CREATE INDEX "takeoff_measurements_measurementType_idx" ON "public"."takeoff_measurements"("measurementType");

-- CreateIndex
CREATE UNIQUE INDEX "bids_bidNumber_key" ON "public"."bids"("bidNumber");

-- CreateIndex
CREATE INDEX "bids_projectId_idx" ON "public"."bids"("projectId");

-- CreateIndex
CREATE INDEX "bids_supplierId_idx" ON "public"."bids"("supplierId");

-- CreateIndex
CREATE INDEX "bids_status_idx" ON "public"."bids"("status");

-- CreateIndex
CREATE INDEX "bids_bidType_idx" ON "public"."bids"("bidType");

-- CreateIndex
CREATE INDEX "bid_line_items_bidId_idx" ON "public"."bid_line_items"("bidId");

-- CreateIndex
CREATE INDEX "bid_packages_projectId_idx" ON "public"."bid_packages"("projectId");

-- CreateIndex
CREATE INDEX "bid_package_invitations_packageId_idx" ON "public"."bid_package_invitations"("packageId");

-- CreateIndex
CREATE INDEX "bid_package_invitations_supplierId_idx" ON "public"."bid_package_invitations"("supplierId");

-- CreateIndex
CREATE INDEX "selections_projectId_idx" ON "public"."selections"("projectId");

-- CreateIndex
CREATE INDEX "selections_customerId_idx" ON "public"."selections"("customerId");

-- CreateIndex
CREATE INDEX "selections_category_idx" ON "public"."selections"("category");

-- CreateIndex
CREATE INDEX "selections_status_idx" ON "public"."selections"("status");

-- CreateIndex
CREATE INDEX "selection_options_selectionId_idx" ON "public"."selection_options"("selectionId");

-- CreateIndex
CREATE INDEX "selection_changes_selectionId_idx" ON "public"."selection_changes"("selectionId");

-- CreateIndex
CREATE INDEX "mood_boards_projectId_idx" ON "public"."mood_boards"("projectId");

-- CreateIndex
CREATE INDEX "mood_boards_customerId_idx" ON "public"."mood_boards"("customerId");

-- CreateIndex
CREATE INDEX "mood_boards_status_idx" ON "public"."mood_boards"("status");

-- CreateIndex
CREATE INDEX "mood_board_items_moodBoardId_idx" ON "public"."mood_board_items"("moodBoardId");

-- CreateIndex
CREATE INDEX "mood_board_comments_moodBoardId_idx" ON "public"."mood_board_comments"("moodBoardId");

-- CreateIndex
CREATE INDEX "mood_board_comments_userId_idx" ON "public"."mood_board_comments"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "rfis_rfiNumber_key" ON "public"."rfis"("rfiNumber");

-- CreateIndex
CREATE INDEX "rfis_projectId_idx" ON "public"."rfis"("projectId");

-- CreateIndex
CREATE INDEX "rfis_status_idx" ON "public"."rfis"("status");

-- CreateIndex
CREATE INDEX "rfis_priority_idx" ON "public"."rfis"("priority");

-- CreateIndex
CREATE INDEX "rfis_submittedDate_idx" ON "public"."rfis"("submittedDate");

-- CreateIndex
CREATE UNIQUE INDEX "submittals_submittalNumber_key" ON "public"."submittals"("submittalNumber");

-- CreateIndex
CREATE INDEX "submittals_projectId_idx" ON "public"."submittals"("projectId");

-- CreateIndex
CREATE INDEX "submittals_status_idx" ON "public"."submittals"("status");

-- CreateIndex
CREATE INDEX "submittals_type_idx" ON "public"."submittals"("type");

-- CreateIndex
CREATE INDEX "submittals_submittedDate_idx" ON "public"."submittals"("submittedDate");

-- AddForeignKey
ALTER TABLE "public"."role_permissions" ADD CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "public"."roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."role_permissions" ADD CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "public"."permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_roles" ADD CONSTRAINT "user_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_roles" ADD CONSTRAINT "user_roles_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "public"."roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_roles" ADD CONSTRAINT "user_roles_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."company_users" ADD CONSTRAINT "company_users_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."company_users" ADD CONSTRAINT "company_users_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."customers" ADD CONSTRAINT "customers_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."suppliers" ADD CONSTRAINT "suppliers_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."projects" ADD CONSTRAINT "projects_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."projects" ADD CONSTRAINT "projects_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."projects" ADD CONSTRAINT "projects_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."project_users" ADD CONSTRAINT "project_users_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."project_users" ADD CONSTRAINT "project_users_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tasks" ADD CONSTRAINT "tasks_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tasks" ADD CONSTRAINT "tasks_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."task_dependencies" ADD CONSTRAINT "task_dependencies_predecessorId_fkey" FOREIGN KEY ("predecessorId") REFERENCES "public"."tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."task_dependencies" ADD CONSTRAINT "task_dependencies_dependentId_fkey" FOREIGN KEY ("dependentId") REFERENCES "public"."tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."time_entries" ADD CONSTRAINT "time_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."time_entries" ADD CONSTRAINT "time_entries_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."time_entries" ADD CONSTRAINT "time_entries_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "public"."tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."expenses" ADD CONSTRAINT "expenses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."expenses" ADD CONSTRAINT "expenses_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."expenses" ADD CONSTRAINT "expenses_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "public"."suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quotes" ADD CONSTRAINT "quotes_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quotes" ADD CONSTRAINT "quotes_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quotes" ADD CONSTRAINT "quotes_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quotes" ADD CONSTRAINT "quotes_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "public"."leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quotes" ADD CONSTRAINT "quotes_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quote_items" ADD CONSTRAINT "quote_items_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "public"."quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."invoices" ADD CONSTRAINT "invoices_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."invoices" ADD CONSTRAINT "invoices_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."invoices" ADD CONSTRAINT "invoices_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."invoices" ADD CONSTRAINT "invoices_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "public"."quotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."invoices" ADD CONSTRAINT "invoices_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."invoice_items" ADD CONSTRAINT "invoice_items_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "public"."invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payments" ADD CONSTRAINT "payments_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "public"."invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."leads" ADD CONSTRAINT "leads_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."leads" ADD CONSTRAINT "leads_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."leads" ADD CONSTRAINT "leads_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."leads" ADD CONSTRAINT "leads_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."customer_interactions" ADD CONSTRAINT "customer_interactions_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."customer_interactions" ADD CONSTRAINT "customer_interactions_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "public"."leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."customer_interactions" ADD CONSTRAINT "customer_interactions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."follow_up_tasks" ADD CONSTRAINT "follow_up_tasks_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "public"."leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quote_versions" ADD CONSTRAINT "quote_versions_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "public"."quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quote_approvals" ADD CONSTRAINT "quote_approvals_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "public"."quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quote_approvals" ADD CONSTRAINT "quote_approvals_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quote_approvals" ADD CONSTRAINT "quote_approvals_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."task_checklist_items" ADD CONSTRAINT "task_checklist_items_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "public"."tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."project_files" ADD CONSTRAINT "project_files_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."project_files" ADD CONSTRAINT "project_files_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."daily_logs" ADD CONSTRAINT "daily_logs_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."daily_logs" ADD CONSTRAINT "daily_logs_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."crew_attendance" ADD CONSTRAINT "crew_attendance_dailyLogId_fkey" FOREIGN KEY ("dailyLogId") REFERENCES "public"."daily_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."deliveries" ADD CONSTRAINT "deliveries_dailyLogId_fkey" FOREIGN KEY ("dailyLogId") REFERENCES "public"."daily_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."equipment_usage" ADD CONSTRAINT "equipment_usage_dailyLogId_fkey" FOREIGN KEY ("dailyLogId") REFERENCES "public"."daily_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."safety_incidents" ADD CONSTRAINT "safety_incidents_dailyLogId_fkey" FOREIGN KEY ("dailyLogId") REFERENCES "public"."daily_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."purchase_orders" ADD CONSTRAINT "purchase_orders_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."purchase_orders" ADD CONSTRAINT "purchase_orders_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "public"."suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."purchase_orders" ADD CONSTRAINT "purchase_orders_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."purchase_orders" ADD CONSTRAINT "purchase_orders_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."purchase_order_items" ADD CONSTRAINT "purchase_order_items_poId_fkey" FOREIGN KEY ("poId") REFERENCES "public"."purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."purchase_order_items" ADD CONSTRAINT "purchase_order_items_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "public"."tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."change_orders" ADD CONSTRAINT "change_orders_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."change_orders" ADD CONSTRAINT "change_orders_requestedBy_fkey" FOREIGN KEY ("requestedBy") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."change_orders" ADD CONSTRAINT "change_orders_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."change_order_items" ADD CONSTRAINT "change_order_items_coId_fkey" FOREIGN KEY ("coId") REFERENCES "public"."change_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."budget_line_items" ADD CONSTRAINT "budget_line_items_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."cost_transactions" ADD CONSTRAINT "cost_transactions_budgetLineId_fkey" FOREIGN KEY ("budgetLineId") REFERENCES "public"."budget_line_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."cost_transactions" ADD CONSTRAINT "cost_transactions_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."cost_transactions" ADD CONSTRAINT "cost_transactions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."estimates" ADD CONSTRAINT "estimates_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."estimates" ADD CONSTRAINT "estimates_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."estimate_line_items" ADD CONSTRAINT "estimate_line_items_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "public"."estimates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."estimate_templates" ADD CONSTRAINT "estimate_templates_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."estimate_templates" ADD CONSTRAINT "estimate_templates_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."cost_database_items" ADD CONSTRAINT "cost_database_items_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."estimate_assemblies" ADD CONSTRAINT "estimate_assemblies_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."estimate_assemblies" ADD CONSTRAINT "estimate_assemblies_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."takeoffs" ADD CONSTRAINT "takeoffs_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."takeoffs" ADD CONSTRAINT "takeoffs_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "public"."estimates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."takeoffs" ADD CONSTRAINT "takeoffs_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."takeoff_layers" ADD CONSTRAINT "takeoff_layers_takeoffId_fkey" FOREIGN KEY ("takeoffId") REFERENCES "public"."takeoffs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."takeoff_measurements" ADD CONSTRAINT "takeoff_measurements_takeoffId_fkey" FOREIGN KEY ("takeoffId") REFERENCES "public"."takeoffs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."takeoff_measurements" ADD CONSTRAINT "takeoff_measurements_layerId_fkey" FOREIGN KEY ("layerId") REFERENCES "public"."takeoff_layers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."takeoff_measurements" ADD CONSTRAINT "takeoff_measurements_linkedEstimateLineId_fkey" FOREIGN KEY ("linkedEstimateLineId") REFERENCES "public"."estimate_line_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."bids" ADD CONSTRAINT "bids_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."bids" ADD CONSTRAINT "bids_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "public"."suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."bids" ADD CONSTRAINT "bids_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."bid_line_items" ADD CONSTRAINT "bid_line_items_bidId_fkey" FOREIGN KEY ("bidId") REFERENCES "public"."bids"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."bid_line_items" ADD CONSTRAINT "bid_line_items_linkedEstimateLineId_fkey" FOREIGN KEY ("linkedEstimateLineId") REFERENCES "public"."estimate_line_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."bid_packages" ADD CONSTRAINT "bid_packages_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."bid_packages" ADD CONSTRAINT "bid_packages_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."bid_package_invitations" ADD CONSTRAINT "bid_package_invitations_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "public"."bid_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."bid_package_invitations" ADD CONSTRAINT "bid_package_invitations_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "public"."suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."bid_package_invitations" ADD CONSTRAINT "bid_package_invitations_sentByUserId_fkey" FOREIGN KEY ("sentByUserId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."selections" ADD CONSTRAINT "selections_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."selections" ADD CONSTRAINT "selections_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."selections" ADD CONSTRAINT "selections_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."selections" ADD CONSTRAINT "selections_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."selection_options" ADD CONSTRAINT "selection_options_selectionId_fkey" FOREIGN KEY ("selectionId") REFERENCES "public"."selections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."selection_changes" ADD CONSTRAINT "selection_changes_selectionId_fkey" FOREIGN KEY ("selectionId") REFERENCES "public"."selections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."selection_changes" ADD CONSTRAINT "selection_changes_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."mood_boards" ADD CONSTRAINT "mood_boards_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."mood_boards" ADD CONSTRAINT "mood_boards_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."mood_boards" ADD CONSTRAINT "mood_boards_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."mood_boards" ADD CONSTRAINT "mood_boards_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."mood_board_items" ADD CONSTRAINT "mood_board_items_moodBoardId_fkey" FOREIGN KEY ("moodBoardId") REFERENCES "public"."mood_boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."mood_board_comments" ADD CONSTRAINT "mood_board_comments_moodBoardId_fkey" FOREIGN KEY ("moodBoardId") REFERENCES "public"."mood_boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."mood_board_comments" ADD CONSTRAINT "mood_board_comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."rfis" ADD CONSTRAINT "rfis_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."submittals" ADD CONSTRAINT "submittals_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
