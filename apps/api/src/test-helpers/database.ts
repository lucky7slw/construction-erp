import { PrismaClient } from '../generated/prisma';
import { execSync } from 'child_process';

let prisma: PrismaClient | null = null;

export const setupTestDatabase = async (): Promise<PrismaClient> => {
  if (!prisma) {
    prisma = new PrismaClient({
      datasourceUrl: process.env.DATABASE_URL,
    });

    await prisma.$connect();
  }

  return prisma;
};

export const cleanupTestDatabase = async (prisma: PrismaClient): Promise<void> => {
  // Clean up all test data in reverse order of dependencies

  // Purchase order-related tables (must be before projects)
  try {
    await prisma.purchaseOrderItem.deleteMany({});
    await prisma.purchaseOrder.deleteMany({});
  } catch (error: any) {
    if (!error.code || error.code !== 'P2021') {
      throw error;
    }
  }

  // Mood board-related tables (must be before customers and users)
  try {
    await prisma.moodBoardComment.deleteMany({});
    await prisma.moodBoardItem.deleteMany({});
    await prisma.moodBoard.deleteMany({});
  } catch (error: any) {
    if (!error.code || error.code !== 'P2021') {
      throw error;
    }
  }

  // Selection-related tables (must be before customers and users)
  try {
    await prisma.selectionChange.deleteMany({});
    await prisma.selectionOption.deleteMany({});
    await prisma.selection.deleteMany({});
  } catch (error: any) {
    if (!error.code || error.code !== 'P2021') {
      throw error;
    }
  }

  // Bid-related tables (must be before estimates and suppliers)
  try {
    await prisma.bidLineItem.deleteMany({});
    await prisma.bid.deleteMany({});
    await prisma.bidPackageInvitation.deleteMany({});
    await prisma.bidPackage.deleteMany({});
  } catch (error: any) {
    if (!error.code || error.code !== 'P2021') {
      throw error;
    }
  }

  // Takeoff-related tables (must be before estimates)
  try {
    await prisma.takeoffMeasurement.deleteMany({});
    await prisma.takeoffLayer.deleteMany({});
    await prisma.takeoff.deleteMany({});
  } catch (error: any) {
    // Tables may not exist yet if migrations haven't been run
    if (!error.code || error.code !== 'P2021') {
      throw error;
    }
  }

  // Estimate-related tables (must be before users)
  await prisma.estimateLineItem.deleteMany({});
  await prisma.estimate.deleteMany({});
  await prisma.estimateTemplate.deleteMany({});
  await prisma.estimateAssembly.deleteMany({});
  await prisma.costDatabaseItem.deleteMany({});

  // Budget-related tables
  await prisma.costTransaction.deleteMany({});
  await prisma.budgetLineItem.deleteMany({});

  // Change orders and POs
  await prisma.changeOrderItem.deleteMany({});
  await prisma.changeOrder.deleteMany({});
  await prisma.purchaseOrderItem.deleteMany({});
  await prisma.purchaseOrder.deleteMany({});

  // Daily logs and related
  await prisma.safetyIncident.deleteMany({});
  await prisma.equipmentUsage.deleteMany({});
  await prisma.delivery.deleteMany({});
  await prisma.crewAttendance.deleteMany({});
  await prisma.dailyLog.deleteMany({});

  // Project files and checklists
  await prisma.projectFile.deleteMany({});
  await prisma.taskChecklistItem.deleteMany({});

  // Skip QuoteApproval and QuoteVersion for now (tables may not exist in all migrations)
  // await prisma.quoteApproval.deleteMany({});
  // await prisma.quoteVersion.deleteMany({});
  await prisma.quoteItem.deleteMany({});
  await prisma.quote.deleteMany({});

  await prisma.followUpTask.deleteMany({});
  await prisma.customerInteraction.deleteMany({});
  await prisma.lead.deleteMany({});

  await prisma.payment.deleteMany({});
  await prisma.invoiceItem.deleteMany({});
  await prisma.invoice.deleteMany({});

  await prisma.timeEntry.deleteMany({});
  await prisma.expense.deleteMany({});
  await prisma.taskDependency.deleteMany({});
  await prisma.task.deleteMany({});

  await prisma.projectUser.deleteMany({});
  await prisma.project.deleteMany({});

  await prisma.customer.deleteMany({});
  await prisma.supplier.deleteMany({});

  await prisma.auditLog.deleteMany({});
  await prisma.refreshToken.deleteMany({});
  await prisma.userRole.deleteMany({});
  await prisma.companyUser.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.company.deleteMany({});

  await prisma.rolePermission.deleteMany({});
  await prisma.role.deleteMany({});
  await prisma.permission.deleteMany({});
};

export const truncateAllTables = async (prisma: PrismaClient): Promise<void> => {
  await cleanupTestDatabase(prisma);
};