import { PrismaClient } from '../src/generated/prisma';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function addSuperAdmin() {
  try {
    const email = 'Stephen.walter7@gmail.com';
    const password = 'SuperAdmin123!'; // You should change this after first login

    console.log(`Creating super admin account for ${email}...`);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      console.log('User already exists. Ensuring super admin role...');

      // Get super_admin role
      const superAdminRole = await prisma.role.findUnique({
        where: { name: 'super_admin' },
      });

      if (!superAdminRole) {
        console.error('Super admin role not found in database!');
        process.exit(1);
      }

      // Check if user already has super admin role
      const existingUserRole = await prisma.userRole.findFirst({
        where: {
          userId: existingUser.id,
          roleId: superAdminRole.id,
        },
      });

      if (!existingUserRole) {
        // Add super admin role
        await prisma.userRole.create({
          data: {
            userId: existingUser.id,
            roleId: superAdminRole.id,
          },
        });
        console.log('✅ Super admin role added to existing user');
      } else {
        console.log('✅ User already has super admin role');
      }

      console.log('\nUser Details:');
      console.log(`Email: ${existingUser.email}`);
      console.log(`Name: ${existingUser.firstName} ${existingUser.lastName}`);
      console.log('Role: Super Admin');

      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Get super_admin role
    const superAdminRole = await prisma.role.findUnique({
      where: { name: 'super_admin' },
    });

    if (!superAdminRole) {
      console.error('Super admin role not found in database!');
      console.error('Please run: pnpm prisma migrate reset --force');
      process.exit(1);
    }

    // Create user
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        firstName: 'Stephen',
        lastName: 'Walter',
        isActive: true,
        isEmailVerified: true,
      },
    });

    console.log(`✅ User created: ${user.email}`);

    // Assign super admin role
    await prisma.userRole.create({
      data: {
        userId: user.id,
        roleId: superAdminRole.id,
      },
    });

    console.log('✅ Super admin role assigned');

    console.log('\n🎉 Super Admin Account Created Successfully!');
    console.log('\nLogin Credentials:');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log('\n⚠️  IMPORTANT: Please change your password after first login!');

  } catch (error) {
    console.error('Error creating super admin:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

addSuperAdmin()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
