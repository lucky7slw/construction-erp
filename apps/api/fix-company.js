const { PrismaClient } = require('./src/generated/prisma');

const prisma = new PrismaClient();

async function fix() {
  try {
    // Check if company exists
    const company = await prisma.company.findUnique({
      where: { id: 'cmgbq5uri00065swov897ufhq' }
    });

    console.log('Company exists:', !!company);

    if (!company) {
      // Create the missing company
      const newCompany = await prisma.company.create({
        data: {
          id: 'cmgbq5uri00065swov897ufhq',
          name: 'HHHomes',
          email: 'stephen.walter7@gmail.com',
          isActive: true,
        }
      });
      console.log('Created company:', newCompany.id, newCompany.name);
    } else {
      console.log('Company already exists:', company.id, company.name);
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fix();
