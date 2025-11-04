import { PrismaClient } from '../src/generated/prisma';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function updatePassword() {
  try {
    const email = 'stephen.walter7@gmail.com';
    const newPassword = 'Piranha87$';

    console.log(`Updating password for ${email}...`);

    // Find the user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.error(`❌ User ${email} not found`);
      process.exit(1);
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the password
    await prisma.user.update({
      where: { email },
      data: { password: hashedPassword },
    });

    console.log('✅ Password updated successfully');
    console.log(`Email: ${email}`);
    console.log(`New password: ${newPassword}`);

  } catch (error) {
    console.error('❌ Error updating password:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

updatePassword()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
