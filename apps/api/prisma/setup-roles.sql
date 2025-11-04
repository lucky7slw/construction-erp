-- Setup roles and permissions for production database

BEGIN;

-- Create permissions
INSERT INTO permissions (id, name, resource, action, description, "createdAt") VALUES
  (gen_random_uuid(), 'users:create', 'user', 'create', 'Create new users', NOW()),
  (gen_random_uuid(), 'users:read', 'user', 'read', 'View users', NOW()),
  (gen_random_uuid(), 'users:update', 'user', 'update', 'Update users', NOW()),
  (gen_random_uuid(), 'users:delete', 'user', 'delete', 'Delete users', NOW()),
  (gen_random_uuid(), 'users:manage', 'user', 'manage', 'Full user management', NOW()),
  (gen_random_uuid(), 'companies:create', 'company', 'create', 'Create companies', NOW()),
  (gen_random_uuid(), 'companies:read', 'company', 'read', 'View companies', NOW()),
  (gen_random_uuid(), 'companies:update', 'company', 'update', 'Update companies', NOW()),
  (gen_random_uuid(), 'companies:delete', 'company', 'delete', 'Delete companies', NOW()),
  (gen_random_uuid(), 'companies:manage', 'company', 'manage', 'Full company management', NOW()),
  (gen_random_uuid(), 'projects:create', 'project', 'create', 'Create projects', NOW()),
  (gen_random_uuid(), 'projects:read', 'project', 'read', 'View projects', NOW()),
  (gen_random_uuid(), 'projects:update', 'project', 'update', 'Update projects', NOW()),
  (gen_random_uuid(), 'projects:delete', 'project', 'delete', 'Delete projects', NOW()),
  (gen_random_uuid(), 'projects:manage', 'project', 'manage', 'Full project management', NOW()),
  (gen_random_uuid(), 'time:create', 'time', 'create', 'Log time entries', NOW()),
  (gen_random_uuid(), 'time:read', 'time', 'read', 'View time entries', NOW()),
  (gen_random_uuid(), 'time:update', 'time', 'update', 'Update time entries', NOW()),
  (gen_random_uuid(), 'time:delete', 'time', 'delete', 'Delete time entries', NOW()),
  (gen_random_uuid(), 'expenses:create', 'expense', 'create', 'Create expenses', NOW()),
  (gen_random_uuid(), 'expenses:read', 'expense', 'read', 'View expenses', NOW()),
  (gen_random_uuid(), 'expenses:update', 'expense', 'update', 'Update expenses', NOW()),
  (gen_random_uuid(), 'expenses:delete', 'expense', 'delete', 'Delete expenses', NOW()),
  (gen_random_uuid(), 'quotes:create', 'quote', 'create', 'Create quotes', NOW()),
  (gen_random_uuid(), 'quotes:read', 'quote', 'read', 'View quotes', NOW()),
  (gen_random_uuid(), 'quotes:update', 'quote', 'update', 'Update quotes', NOW()),
  (gen_random_uuid(), 'quotes:delete', 'quote', 'delete', 'Delete quotes', NOW()),
  (gen_random_uuid(), 'quotes:send', 'quote', 'send', 'Send quotes to customers', NOW()),
  (gen_random_uuid(), 'invoices:create', 'invoice', 'create', 'Create invoices', NOW()),
  (gen_random_uuid(), 'invoices:read', 'invoice', 'read', 'View invoices', NOW()),
  (gen_random_uuid(), 'invoices:update', 'invoice', 'update', 'Update invoices', NOW()),
  (gen_random_uuid(), 'invoices:delete', 'invoice', 'delete', 'Delete invoices', NOW()),
  (gen_random_uuid(), 'invoices:send', 'invoice', 'send', 'Send invoices to customers', NOW()),
  (gen_random_uuid(), 'customers:create', 'customer', 'create', 'Create customers', NOW()),
  (gen_random_uuid(), 'customers:read', 'customer', 'read', 'View customers', NOW()),
  (gen_random_uuid(), 'customers:update', 'customer', 'update', 'Update customers', NOW()),
  (gen_random_uuid(), 'customers:delete', 'customer', 'delete', 'Delete customers', NOW()),
  (gen_random_uuid(), 'suppliers:create', 'supplier', 'create', 'Create suppliers', NOW()),
  (gen_random_uuid(), 'suppliers:read', 'supplier', 'read', 'View suppliers', NOW()),
  (gen_random_uuid(), 'suppliers:update', 'supplier', 'update', 'Update suppliers', NOW()),
  (gen_random_uuid(), 'suppliers:delete', 'supplier', 'delete', 'Delete suppliers', NOW()),
  (gen_random_uuid(), 'reports:read', 'report', 'read', 'View reports', NOW()),
  (gen_random_uuid(), 'reports:export', 'report', 'export', 'Export reports', NOW()),
  (gen_random_uuid(), 'system:manage', 'system', 'manage', 'System administration', NOW()),
  (gen_random_uuid(), 'audit:read', 'audit', 'read', 'View audit logs', NOW());

-- Create roles
INSERT INTO roles (id, name, description, "isSystemRole", "createdAt", "updatedAt") VALUES
  (gen_random_uuid(), 'super_admin', 'Full system administrator with all permissions', true, NOW(), NOW()),
  (gen_random_uuid(), 'admin', 'Company administrator with management permissions', true, NOW(), NOW()),
  (gen_random_uuid(), 'manager', 'Project manager with team oversight permissions', true, NOW(), NOW()),
  (gen_random_uuid(), 'employee', 'Employee with basic operational permissions', true, NOW(), NOW());

-- Assign all permissions to super_admin role
INSERT INTO role_permissions ("id", "roleId", "permissionId", "createdAt")
SELECT
  gen_random_uuid(),
  (SELECT id FROM roles WHERE name = 'super_admin'),
  p.id,
  NOW()
FROM permissions p;

-- Assign super_admin role to stephen.walter7@gmail.com
INSERT INTO user_roles (id, "userId", "roleId", "createdAt")
SELECT
  gen_random_uuid(),
  u.id,
  r.id,
  NOW()
FROM users u
CROSS JOIN roles r
WHERE u.email = 'stephen.walter7@gmail.com'
  AND r.name = 'super_admin';

COMMIT;

-- Verify the setup
SELECT
  u.email,
  u."firstName",
  u."lastName",
  r.name as role,
  r.description
FROM users u
JOIN user_roles ur ON u.id = ur."userId"
JOIN roles r ON ur."roleId" = r.id
WHERE u.email = 'stephen.walter7@gmail.com';
