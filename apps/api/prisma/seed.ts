import { PrismaClient, AuditAction } from '../src/generated/prisma';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Clear existing data
  console.log('🧹 Cleaning existing data...');
  await prisma.auditLog.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.invoiceItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.quoteItem.deleteMany();
  await prisma.quote.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.timeEntry.deleteMany();
  await prisma.task.deleteMany();
  await prisma.projectUser.deleteMany();
  await prisma.project.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.companyUser.deleteMany();
  await prisma.company.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();
  await prisma.permission.deleteMany();

  // Create permissions
  console.log('🔒 Creating permissions...');
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

  // Create roles with hierarchical permissions
  console.log('👑 Creating roles...');

  // Super Admin - Full system access
  const superAdminRole = await prisma.role.create({
    data: {
      name: 'super_admin',
      description: 'Full system administrator with all permissions',
      isSystemRole: true,
    },
  });

  // Admin - Company-level administration
  const adminRole = await prisma.role.create({
    data: {
      name: 'admin',
      description: 'Company administrator with management permissions',
      isSystemRole: true,
    },
  });

  // Manager - Project and team management
  const managerRole = await prisma.role.create({
    data: {
      name: 'manager',
      description: 'Project manager with team oversight permissions',
      isSystemRole: true,
    },
  });

  // Employee - Basic operational permissions
  const employeeRole = await prisma.role.create({
    data: {
      name: 'employee',
      description: 'Employee with basic operational permissions',
      isSystemRole: true,
    },
  });

  // Customer - Limited read access
  const customerRole = await prisma.role.create({
    data: {
      name: 'customer',
      description: 'Customer with limited read access to their projects',
      isSystemRole: true,
    },
  });

  // Assign permissions to roles
  console.log('🔗 Assigning permissions to roles...');

  // Super Admin gets all permissions
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

  // Admin permissions (all except system management)
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

  // Manager permissions
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

  // Employee permissions
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

  // Customer permissions (very limited)
  const customerPermissionNames = ['projects:read', 'quotes:read', 'invoices:read'];
  const customerPermissions = createdPermissions.filter(p => customerPermissionNames.includes(p.name));
  await Promise.all(
    customerPermissions.map(permission =>
      prisma.rolePermission.create({
        data: {
          roleId: customerRole.id,
          permissionId: permission.id,
        },
      })
    )
  );

  // Create Super Admin user
  console.log('👤 Creating super admin user...');
  const hashedPassword = await bcrypt.hash('SuperAdmin123!', 12);

  const superAdminUser = await prisma.user.create({
    data: {
      email: 'admin@erpdev.local',
      password: hashedPassword,
      firstName: 'Super',
      lastName: 'Admin',
      phoneNumber: '+1-555-0001',
      isActive: true,
      isEmailVerified: true,
    },
  });

  // Assign super admin role to the user
  await prisma.userRole.create({
    data: {
      userId: superAdminUser.id,
      roleId: superAdminRole.id,
    },
  });

  // Create sample company
  console.log('🏢 Creating sample company...');
  const company = await prisma.company.create({
    data: {
      name: 'Demo Construction Co.',
      legalName: 'Demo Construction Company LLC',
      registrationNo: 'REG-2024-001',
      vatNumber: 'VAT-123456789',
      address: '123 Main Street',
      city: 'Demo City',
      state: 'Demo State',
      postalCode: '12345',
      country: 'United States',
      phone: '+1-555-0100',
      email: 'info@democonstruction.com',
      website: 'https://democonstruction.com',
      isActive: true,
    },
  });

  // Create admin user for the company
  console.log('👤 Creating company admin user...');
  const adminHashedPassword = await bcrypt.hash('CompanyAdmin123!', 12);

  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@democonstruction.com',
      password: adminHashedPassword,
      firstName: 'John',
      lastName: 'Smith',
      phoneNumber: '+1-555-0101',
      isActive: true,
      isEmailVerified: true,
    },
  });

  // Associate admin with company
  await prisma.companyUser.create({
    data: {
      userId: adminUser.id,
      companyId: company.id,
      isOwner: true,
    },
  });

  // Assign admin role to the company admin
  await prisma.userRole.create({
    data: {
      userId: adminUser.id,
      roleId: adminRole.id,
      companyId: company.id,
    },
  });

  // Create manager user
  console.log('👤 Creating manager user...');
  const managerHashedPassword = await bcrypt.hash('Manager123!', 12);

  const managerUser = await prisma.user.create({
    data: {
      email: 'manager@democonstruction.com',
      password: managerHashedPassword,
      firstName: 'Sarah',
      lastName: 'Johnson',
      phoneNumber: '+1-555-0102',
      isActive: true,
      isEmailVerified: true,
    },
  });

  await prisma.companyUser.create({
    data: {
      userId: managerUser.id,
      companyId: company.id,
      isOwner: false,
    },
  });

  await prisma.userRole.create({
    data: {
      userId: managerUser.id,
      roleId: managerRole.id,
      companyId: company.id,
    },
  });

  // Create employee user
  console.log('👤 Creating employee user...');
  const employeeHashedPassword = await bcrypt.hash('Employee123!', 12);

  const employeeUser = await prisma.user.create({
    data: {
      email: 'employee@democonstruction.com',
      password: employeeHashedPassword,
      firstName: 'Mike',
      lastName: 'Wilson',
      phoneNumber: '+1-555-0103',
      isActive: true,
      isEmailVerified: true,
    },
  });

  await prisma.companyUser.create({
    data: {
      userId: employeeUser.id,
      companyId: company.id,
      isOwner: false,
    },
  });

  await prisma.userRole.create({
    data: {
      userId: employeeUser.id,
      roleId: employeeRole.id,
      companyId: company.id,
    },
  });

  // Create sample customers
  console.log('🤝 Creating sample customers...');
  const customer1 = await prisma.customer.create({
    data: {
      companyId: company.id,
      name: 'ABC Corporation',
      email: 'contact@abccorp.com',
      phone: '+1-555-0200',
      address: '456 Business Ave',
      city: 'Business City',
      state: 'Business State',
      postalCode: '67890',
      country: 'United States',
      contactPerson: 'Alice Brown',
      notes: 'Large commercial client',
      isActive: true,
    },
  });

  const customer2 = await prisma.customer.create({
    data: {
      companyId: company.id,
      name: 'Smith Family Residence',
      email: 'smith.family@email.com',
      phone: '+1-555-0201',
      address: '789 Residential Ln',
      city: 'Suburb City',
      state: 'Residential State',
      postalCode: '54321',
      country: 'United States',
      contactPerson: 'Robert Smith',
      notes: 'Residential remodeling project',
      isActive: true,
    },
  });

  // Create sample suppliers
  console.log('🚚 Creating sample suppliers...');
  const supplier1 = await prisma.supplier.create({
    data: {
      companyId: company.id,
      name: 'Building Materials Plus',
      email: 'orders@buildingmaterialsplus.com',
      phone: '+1-555-0300',
      address: '321 Industrial Blvd',
      city: 'Industrial City',
      state: 'Industrial State',
      postalCode: '98765',
      country: 'United States',
      contactPerson: 'David Lee',
      notes: 'Primary building materials supplier',
      isActive: true,
    },
  });

  // Create sample projects
  console.log('🏗️ Creating sample projects...');
  const project1 = await prisma.project.create({
    data: {
      name: 'ABC Corporation Office Renovation',
      description: 'Complete office renovation including new flooring, lighting, and conference rooms',
      status: 'ACTIVE',
      startDate: new Date('2024-01-15'),
      endDate: new Date('2024-04-15'),
      plannedHours: 1200,
      budget: 150000,
      companyId: company.id,
      customerId: customer1.id,
      createdById: adminUser.id,
    },
  });

  const project2 = await prisma.project.create({
    data: {
      name: 'Smith Family Kitchen Remodel',
      description: 'Complete kitchen remodel with new cabinets, countertops, and appliances',
      status: 'ACTIVE',
      startDate: new Date('2024-02-01'),
      endDate: new Date('2024-03-31'),
      plannedHours: 400,
      budget: 75000,
      companyId: company.id,
      customerId: customer2.id,
      createdById: managerUser.id,
    },
  });

  // Assign users to projects
  await prisma.projectUser.createMany({
    data: [
      { userId: managerUser.id, projectId: project1.id, role: 'manager' },
      { userId: employeeUser.id, projectId: project1.id, role: 'member' },
      { userId: managerUser.id, projectId: project2.id, role: 'manager' },
      { userId: employeeUser.id, projectId: project2.id, role: 'member' },
    ],
  });

  // Create sample time entries
  console.log('⏰ Creating sample time entries...');
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  await prisma.timeEntry.createMany({
    data: [
      {
        description: 'Project planning and initial setup',
        hours: 4.5,
        date: yesterday,
        billable: true,
        hourlyRate: 85,
        userId: managerUser.id,
        projectId: project1.id,
      },
      {
        description: 'Demolition work in main office area',
        hours: 8,
        date: yesterday,
        billable: true,
        hourlyRate: 65,
        userId: employeeUser.id,
        projectId: project1.id,
      },
      {
        description: 'Kitchen cabinet removal',
        hours: 6,
        date: today,
        billable: true,
        hourlyRate: 65,
        userId: employeeUser.id,
        projectId: project2.id,
      },
    ],
  });

  // Create sample expenses
  console.log('💰 Creating sample expenses...');
  await prisma.expense.createMany({
    data: [
      {
        description: 'Flooring materials for office renovation',
        amount: 5500,
        category: 'MATERIALS',
        date: yesterday,
        billable: true,
        userId: managerUser.id,
        projectId: project1.id,
        supplierId: supplier1.id,
      },
      {
        description: 'Equipment rental - floor sander',
        amount: 350,
        category: 'EQUIPMENT',
        date: today,
        billable: true,
        userId: employeeUser.id,
        projectId: project2.id,
      },
    ],
  });

  // Create audit log entry for seeding
  await prisma.auditLog.create({
    data: {
      action: AuditAction.CREATE,
      resource: 'database',
      resourceId: 'seed',
      newValues: {
        action: 'database_seeded',
        timestamp: new Date().toISOString(),
        recordsCreated: {
          users: 4,
          companies: 1,
          customers: 2,
          suppliers: 1,
          projects: 2,
          roles: 5,
          permissions: createdPermissions.length,
        },
      },
      ipAddress: '127.0.0.1',
      userAgent: 'Prisma Seed Script',
      userId: superAdminUser.id,
    },
  });

  console.log('✅ Database seeding completed!');
  console.log('\n📋 Created Users:');
  console.log('  🔐 Super Admin: admin@erpdev.local (password: SuperAdmin123!)');
  console.log('  👑 Company Admin: admin@democonstruction.com (password: CompanyAdmin123!)');
  console.log('  📊 Manager: manager@democonstruction.com (password: Manager123!)');
  console.log('  👷 Employee: employee@democonstruction.com (password: Employee123!)');
  console.log('\n🏢 Created Company: Demo Construction Co.');
  console.log('🤝 Created 2 customers, 1 supplier, 2 projects');
  console.log('⏰ Created sample time entries and expenses');
  console.log(`\n🔒 Created ${createdPermissions.length} permissions and 5 roles`);
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });