import { PrismaClient } from './src/generated/prisma';

const prisma = new PrismaClient();

async function fixUserRoles() {
  console.log('🔧 Fixing user roles for stephen.walter7@gmail.com...\n');
  
  const user = await prisma.user.findUnique({
    where: { email: 'stephen.walter7@gmail.com' },
    include: {
      userRoles: {
        include: { role: true }
      },
      companies: true
    }
  });

  if (!user) {
    console.log('❌ User not found');
    return;
  }

  console.log('User:', user.firstName, user.lastName);
  console.log('Companies:', user.companies.length);
  console.log('Current roles:', user.userRoles.length);
  
  // Get the user's company
  const company = user.companies[0];
  
  if (!company) {
    console.log('❌ User has no company!');
    return;
  }

  console.log('Company ID:', company.companyId, '\n');

  // Delete all existing user roles
  await prisma.userRole.deleteMany({
    where: { userId: user.id }
  });
  console.log('✅ Deleted old user roles\n');

  // Get super_admin role
  const superAdminRole = await prisma.role.findUnique({
    where: { name: 'super_admin' }
  });

  if (!superAdminRole) {
    console.log('❌ Super admin role not found!');
    return;
  }

  // Create new user role with companyId
  const newUserRole = await prisma.userRole.create({
    data: {
      userId: user.id,
      roleId: superAdminRole.id,
      companyId: company.companyId, // Include company ID
    }
  });

  console.log('✅ Created new super_admin role with company ID');
  console.log('  User ID:', newUserRole.userId);
  console.log('  Role ID:', newUserRole.roleId);
  console.log('  Company ID:', newUserRole.companyId);
  console.log('\n🎉 User roles fixed! Try logging in again.');

  await prisma.$disconnect();
}

fixUserRoles();
