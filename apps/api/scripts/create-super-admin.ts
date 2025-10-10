import { PrismaClient } from '../src/generated/prisma';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createSuperAdmin() {
  try {
    console.log('🔧 Creating super admin user and role...\n');

    // 1. Create or get super_admin role
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
      console.log('✅ Super admin role already exists\n');
    }

    // 2. Create or get all permissions
    const permissionDefs = [
      { resource: 'user', action: 'create' },
      { resource: 'user', action: 'read' },
      { resource: 'user', action: 'update' },
      { resource: 'user', action: 'delete' },
      { resource: 'user', action: 'manage' },
      { resource: 'company', action: 'create' },
      { resource: 'company', action: 'read' },
      { resource: 'company', action: 'update' },
      { resource: 'company', action: 'delete' },
      { resource: 'company', action: 'manage' },
      { resource: 'project', action: 'create' },
      { resource: 'project', action: 'read' },
      { resource: 'project', action: 'update' },
      { resource: 'project', action: 'delete' },
      { resource: 'project', action: 'manage' },
      { resource: 'rfi', action: 'create' },
      { resource: 'rfi', action: 'read' },
      { resource: 'rfi', action: 'update' },
      { resource: 'rfi', action: 'delete' },
      { resource: 'submittal', action: 'create' },
      { resource: 'submittal', action: 'read' },
      { resource: 'submittal', action: 'update' },
      { resource: 'submittal', action: 'delete' },
      { resource: 'change_order', action: 'create' },
      { resource: 'change_order', action: 'read' },
      { resource: 'change_order', action: 'update' },
      { resource: 'change_order', action: 'delete' },
      { resource: 'purchase_order', action: 'create' },
      { resource: 'purchase_order', action: 'read' },
      { resource: 'purchase_order', action: 'update' },
      { resource: 'purchase_order', action: 'delete' },
      { resource: 'team', action: 'manage' },
      { resource: 'photo', action: 'manage' },
      { resource: 'system', action: 'admin' },
    ];

    console.log('Creating/fetching permissions...');
    const permissions = [];
    for (const { resource, action } of permissionDefs) {
      let permission = await prisma.permission.findUnique({
        where: {
          resource_action: { resource, action },
        },
      });

      if (!permission) {
        permission = await prisma.permission.create({
          data: {
            name: `${resource}:${action}`,
            resource,
            action,
            description: `Permission to ${action} ${resource}`,
          },
        });
      }
      permissions.push(permission);
    }
    console.log(`✅ ${permissions.length} permissions ready\n`);

    // 3. Assign all permissions to super_admin role
    console.log('Assigning permissions to super_admin role...');
    for (const permission of permissions) {
      const exists = await prisma.rolePermission.findFirst({
        where: {
          roleId: superAdminRole.id,
          permissionId: permission.id,
        },
      });

      if (!exists) {
        await prisma.rolePermission.create({
          data: {
            roleId: superAdminRole.id,
            permissionId: permission.id,
          },
        });
      }
    }
    console.log('✅ All permissions assigned to super_admin role\n');

    // 4. Create or update super admin user
    const email = 'admin@hhhomes.com';
    const password = 'Admin123!'; // Change this after first login!

    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.log('Creating super admin user...');
      const hashedPassword = await bcrypt.hash(password, 10);

      user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          firstName: 'Super',
          lastName: 'Admin',
          isActive: true,
          isEmailVerified: true,
        },
      });
      console.log('✅ Super admin user created\n');
    } else {
      console.log('✅ Super admin user already exists\n');
    }

    // 5. Assign super_admin role to user
    const existingRole = await prisma.userRole.findFirst({
      where: {
        userId: user.id,
        roleId: superAdminRole.id,
      },
    });

    if (!existingRole) {
      await prisma.userRole.create({
        data: {
          userId: user.id,
          roleId: superAdminRole.id,
        },
      });
      console.log('✅ Super admin role assigned to user\n');
    } else {
      console.log('✅ User already has super admin role\n');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 SUPER ADMIN SETUP COMPLETE!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('Login credentials:');
    console.log(`  Email:    ${email}`);
    console.log(`  Password: ${password}`);
    console.log('\n⚠️  IMPORTANT: Change the password after first login!\n');
    console.log('This user has full access to:');
    console.log('  - All users and companies');
    console.log('  - All projects and data');
    console.log('  - All RFIs, Submittals, Change Orders, Purchase Orders');
    console.log('  - Team management and photos');
    console.log('  - System administration\n');

  } catch (error) {
    console.error('❌ Error creating super admin:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createSuperAdmin()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
