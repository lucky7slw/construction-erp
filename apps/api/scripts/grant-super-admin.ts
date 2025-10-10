import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

async function grantSuperAdmin(email: string) {
  try {
    console.log(`🔧 Granting super admin privileges to ${email}...\n`);

    // 1. Find the user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.error(`❌ User with email ${email} not found!`);
      console.log('\nPlease register this email first, then run this script again.');
      process.exit(1);
    }

    console.log(`✅ Found user: ${user.firstName} ${user.lastName}\n`);

    // 2. Get or create super_admin role
    let superAdminRole = await prisma.role.findUnique({
      where: { name: 'super_admin' },
    });

    if (!superAdminRole) {
      console.log('Creating super_admin role...');
      superAdminRole = await prisma.role.create({
        data: {
          name: 'super_admin',
          description: 'Super Administrator with full system access',
          isSystemRole: true,
        },
      });
      console.log('✅ Super admin role created\n');
    } else {
      console.log('✅ Super admin role exists\n');
    }

    // 3. Check if user already has super_admin role
    const existingRole = await prisma.userRole.findFirst({
      where: {
        userId: user.id,
        roleId: superAdminRole.id,
      },
    });

    if (existingRole) {
      console.log('✅ User already has super admin privileges!\n');
    } else {
      // 4. Assign super_admin role to user
      await prisma.userRole.create({
        data: {
          userId: user.id,
          roleId: superAdminRole.id,
        },
      });
      console.log('✅ Super admin role assigned to user!\n');
    }

    // 5. Get all permissions for super_admin role
    const rolePermissions = await prisma.rolePermission.findMany({
      where: { roleId: superAdminRole.id },
      include: { permission: true },
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 SUPER ADMIN PRIVILEGES GRANTED!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`User: ${user.firstName} ${user.lastName}`);
    console.log(`Email: ${user.email}`);
    console.log(`User ID: ${user.id}\n`);
    console.log(`Total Permissions: ${rolePermissions.length}\n`);
    console.log('This user now has full access to:');
    console.log('  ✅ All users and companies');
    console.log('  ✅ All projects and data');
    console.log('  ✅ All RFIs, Submittals, Change Orders, Purchase Orders');
    console.log('  ✅ Team management and photos');
    console.log('  ✅ System administration\n');

    if (rolePermissions.length === 0) {
      console.log('⚠️  WARNING: No permissions assigned to super_admin role!');
      console.log('   Run create-super-admin.ts first to set up permissions.\n');
    }

  } catch (error) {
    console.error('❌ Error granting super admin:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

const email = process.argv[2] || 'stephen.walter7@gmail.com';

grantSuperAdmin(email)
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
