import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

async function grantAdminRole(email: string) {
  try {
    // Find the user
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        userRoles: {
          include: { role: true },
        },
        companies: true,
      },
    });

    if (!user) {
      console.error(`User with email ${email} not found`);
      process.exit(1);
    }

    console.log(`Found user: ${user.firstName} ${user.lastName} (${user.email})`);

    // Find or create ADMIN role
    let adminRole = await prisma.role.findUnique({
      where: { name: 'ADMIN' },
    });

    if (!adminRole) {
      console.log('ADMIN role not found, creating it...');
      adminRole = await prisma.role.create({
        data: {
          name: 'ADMIN',
          description: 'Administrator with full access',
          isSystemRole: true,
        },
      });
      console.log('ADMIN role created');
    }

    // Check if user already has admin role
    const existingAdminRole = user.userRoles.find(
      (ur) => ur.roleId === adminRole!.id
    );

    if (existingAdminRole) {
      console.log('User already has ADMIN role');
      return;
    }

    // Grant admin role (company-scoped if user has companies)
    if (user.companies.length > 0) {
      for (const companyUser of user.companies) {
        await prisma.userRole.create({
          data: {
            userId: user.id,
            roleId: adminRole.id,
            companyId: companyUser.companyId,
          },
        });
        console.log(`✓ Granted ADMIN role for company ${companyUser.companyId}`);
      }
    } else {
      // Grant global admin role if no companies
      await prisma.userRole.create({
        data: {
          userId: user.id,
          roleId: adminRole.id,
        },
      });
      console.log('✓ Granted global ADMIN role');
    }

    console.log('✓ Admin privileges granted successfully!');
  } catch (error) {
    console.error('Error granting admin role:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Get email from command line arguments
const email = process.argv[2];

if (!email) {
  console.error('Usage: tsx scripts/grant-admin.ts <email>');
  process.exit(1);
}

grantAdminRole(email);
