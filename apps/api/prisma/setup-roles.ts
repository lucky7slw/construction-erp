import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

async function setupRoles() {
  console.log('🔒 Setting up roles and permissions...');

  try {
    // Create permissions
    console.log('Creating permissions...');
    const permissions = [
      // User management
      { name: 'users:create', resource: 'user', action: 'create', description: 'Create new users' },
      { name: 'users:read', resource: 'user', action: 'read', description: 'View users' },
      { name: 'users:update', resource: 'user', action: 'update', description: 'Update users' },
      { name: 'users:delete', resource: 'user', action: 'delete', description: 'Delete users' },
      { name: 'users:manage', resource: 'user', action: 'manage', description: 'Full user management' },

      // Company management
      { name: 'companies:create', resource: 'company', action: 'create', description: 'Create companies' },
      { name: 'companies:read', resource: 'company', action: 'read', description: 'View companies' },
      { name: 'companies:update', resource: 'company', action: 'update', description: 'Update companies' },
      { name: 'companies:delete', resource: 'company', action: 'delete', description: 'Delete companies' },
      { name: 'companies:manage', resource: 'company', action: 'manage', description: 'Full company management' },

      // Project management
      { name: 'projects:create', resource: 'project', action: 'create', description: 'Create projects' },
      { name: 'projects:read', resource: 'project', action: 'read', description: 'View projects' },
      { name: 'projects:update', resource: 'project', action: 'update', description: 'Update projects' },
      { name: 'projects:delete', resource: 'project', action: 'delete', description: 'Delete projects' },
      { name: 'projects:manage', resource: 'project', action: 'manage', description: 'Full project management' },

      // Time tracking
      { name: 'time:create', resource: 'time', action: 'create', description: 'Log time entries' },
      { name: 'time:read', resource: 'time', action: 'read', description: 'View time entries' },
      { name: 'time:update', resource: 'time', action: 'update', description: 'Update time entries' },
      { name: 'time:delete', resource: 'time', action: 'delete', description: 'Delete time entries' },

      // Expense management
      { name: 'expenses:create', resource: 'expense', action: 'create', description: 'Create expenses' },
      { name: 'expenses:read', resource: 'expense', action: 'read', description: 'View expenses' },
      { name: 'expenses:update', resource: 'expense', action: 'update', description: 'Update expenses' },
      { name: 'expenses:delete', resource: 'expense', action: 'delete', description: 'Delete expenses' },

      // Quote management
      { name: 'quotes:create', resource: 'quote', action: 'create', description: 'Create quotes' },
      { name: 'quotes:read', resource: 'quote', action: 'read', description: 'View quotes' },
      { name: 'quotes:update', resource: 'quote', action: 'update', description: 'Update quotes' },
      { name: 'quotes:delete', resource: 'quote', action: 'delete', description: 'Delete quotes' },
      { name: 'quotes:send', resource: 'quote', action: 'send', description: 'Send quotes to customers' },

      // Invoice management
      { name: 'invoices:create', resource: 'invoice', action: 'create', description: 'Create invoices' },
      { name: 'invoices:read', resource: 'invoice', action: 'read', description: 'View invoices' },
      { name: 'invoices:update', resource: 'invoice', action: 'update', description: 'Update invoices' },
      { name: 'invoices:delete', resource: 'invoice', action: 'delete', description: 'Delete invoices' },
      { name: 'invoices:send', resource: 'invoice', action: 'send', description: 'Send invoices to customers' },

      // Customer management
      { name: 'customers:create', resource: 'customer', action: 'create', description: 'Create customers' },
      { name: 'customers:read', resource: 'customer', action: 'read', description: 'View customers' },
      { name: 'customers:update', resource: 'customer', action: 'update', description: 'Update customers' },
      { name: 'customers:delete', resource: 'customer', action: 'delete', description: 'Delete customers' },

      // Supplier management
      { name: 'suppliers:create', resource: 'supplier', action: 'create', description: 'Create suppliers' },
      { name: 'suppliers:read', resource: 'supplier', action: 'read', description: 'View suppliers' },
      { name: 'suppliers:update', resource: 'supplier', action: 'update', description: 'Update suppliers' },
      { name: 'suppliers:delete', resource: 'supplier', action: 'delete', description: 'Delete suppliers' },

      // Reporting
      { name: 'reports:read', resource: 'report', action: 'read', description: 'View reports' },
      { name: 'reports:export', resource: 'report', action: 'export', description: 'Export reports' },

      // System administration
      { name: 'system:manage', resource: 'system', action: 'manage', description: 'System administration' },
      { name: 'audit:read', resource: 'audit', action: 'read', description: 'View audit logs' },
    ];

    const createdPermissions = await Promise.all(
      permissions.map(permission => prisma.permission.create({ data: permission }))
    );
    console.log(`✅ Created ${createdPermissions.length} permissions`);

    // Create super_admin role
    console.log('Creating super_admin role...');
    const superAdminRole = await prisma.role.create({
      data: {
        name: 'super_admin',
        description: 'Full system administrator with all permissions',
        isSystemRole: true,
      },
    });
    console.log('✅ Created super_admin role');

    // Create admin role
    console.log('Creating admin role...');
    const adminRole = await prisma.role.create({
      data: {
        name: 'admin',
        description: 'Company administrator with management permissions',
        isSystemRole: true,
      },
    });
    console.log('✅ Created admin role');

    // Create manager role
    console.log('Creating manager role...');
    const managerRole = await prisma.role.create({
      data: {
        name: 'manager',
        description: 'Project manager with team oversight permissions',
        isSystemRole: true,
      },
    });
    console.log('✅ Created manager role');

    // Create employee role
    console.log('Creating employee role...');
    const employeeRole = await prisma.role.create({
      data: {
        name: 'employee',
        description: 'Employee with basic operational permissions',
        isSystemRole: true,
      },
    });
    console.log('✅ Created employee role');

    // Assign all permissions to super_admin
    console.log('Assigning permissions to super_admin...');
    await Promise.all(
      createdPermissions.map(permission =>
        prisma.rolePermission.create({
          data: {
            roleId: superAdminRole.id,
            permissionId: permission.id,
          },
        })
      )
    );
    console.log('✅ Assigned all permissions to super_admin');

    // Assign permissions to admin (all except system management)
    console.log('Assigning permissions to admin...');
    const adminPermissions = createdPermissions.filter(p => !p.name.startsWith('system:'));
    await Promise.all(
      adminPermissions.map(permission =>
        prisma.rolePermission.create({
          data: {
            roleId: adminRole.id,
            permissionId: permission.id,
          },
        })
      )
    );
    console.log('✅ Assigned permissions to admin');

    // Assign permissions to manager
    console.log('Assigning permissions to manager...');
    const managerPermissionNames = [
      'projects:create', 'projects:read', 'projects:update', 'projects:delete',
      'time:read', 'time:update', 'time:delete',
      'expenses:read', 'expenses:update', 'expenses:delete',
      'quotes:create', 'quotes:read', 'quotes:update', 'quotes:send',
      'invoices:create', 'invoices:read', 'invoices:update', 'invoices:send',
      'customers:read', 'customers:update',
      'suppliers:read', 'suppliers:update',
      'reports:read', 'reports:export',
      'users:read',
    ];
    const managerPermissions = createdPermissions.filter(p => managerPermissionNames.includes(p.name));
    await Promise.all(
      managerPermissions.map(permission =>
        prisma.rolePermission.create({
          data: {
            roleId: managerRole.id,
            permissionId: permission.id,
          },
        })
      )
    );
    console.log('✅ Assigned permissions to manager');

    // Assign permissions to employee
    console.log('Assigning permissions to employee...');
    const employeePermissionNames = [
      'projects:read',
      'time:create', 'time:read', 'time:update',
      'expenses:create', 'expenses:read', 'expenses:update',
      'customers:read',
      'suppliers:read',
    ];
    const employeePermissions = createdPermissions.filter(p => employeePermissionNames.includes(p.name));
    await Promise.all(
      employeePermissions.map(permission =>
        prisma.rolePermission.create({
          data: {
            roleId: employeeRole.id,
            permissionId: permission.id,
          },
        })
      )
    );
    console.log('✅ Assigned permissions to employee');

    // Find the user stephen.walter7@gmail.com
    console.log('Finding user stephen.walter7@gmail.com...');
    const user = await prisma.user.findUnique({
      where: { email: 'stephen.walter7@gmail.com' },
    });

    if (!user) {
      console.error('❌ User stephen.walter7@gmail.com not found!');
      process.exit(1);
    }
    console.log(`✅ Found user: ${user.firstName} ${user.lastName}`);

    // Assign super_admin role to the user
    console.log('Assigning super_admin role to user...');
    await prisma.userRole.create({
      data: {
        userId: user.id,
        roleId: superAdminRole.id,
      },
    });
    console.log('✅ Assigned super_admin role to stephen.walter7@gmail.com');

    console.log('\n🎉 Setup complete!');
    console.log(`User ${user.email} now has super_admin access with all permissions.`);

  } catch (error) {
    console.error('❌ Error during setup:', error);
    throw error;
  }
}

setupRoles()
  .catch((e) => {
    console.error('❌ Setup failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
