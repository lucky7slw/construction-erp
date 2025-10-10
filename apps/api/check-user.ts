import { PrismaClient } from './src/generated/prisma';

const prisma = new PrismaClient();

async function checkUser() {
  const user = await prisma.user.findUnique({
    where: { email: 'stephen.walter7@gmail.com' },
    include: {
      userRoles: {
        include: {
          role: true
        }
      }
    }
  });

  if (user) {
    console.log('User found:');
    console.log('  Email:', user.email);
    console.log('  Name:', user.firstName, user.lastName);
    console.log('  Active:', user.isActive);
    console.log('  Email Verified:', user.isEmailVerified);
    console.log('  Roles:', user.userRoles.map(ur => ur.role.name));
    console.log('  Has password:', !!user.password);
  } else {
    console.log('User NOT found');
  }
  
  await prisma.$disconnect();
}

checkUser();
