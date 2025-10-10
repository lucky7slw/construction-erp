import { PrismaClient } from './src/generated/prisma';

const prisma = new PrismaClient();

async function unlockAccount(email: string) {
  const user = await prisma.user.update({
    where: { email },
    data: {
      isActive: true,
      isEmailVerified: true,
      passwordResetToken: null,
      passwordResetExpires: null,
      emailVerifyToken: null,
    },
  });

  console.log('✅ Account unlocked!');
  console.log('  Email:', user.email);
  console.log('  Active:', user.isActive);
  console.log('  Verified:', user.isEmailVerified);
  
  await prisma.$disconnect();
}

unlockAccount('stephen.walter7@gmail.com');
