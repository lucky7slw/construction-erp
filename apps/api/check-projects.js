const { PrismaClient } = require('./src/generated/prisma');
const prisma = new PrismaClient();

prisma.project.findMany()
  .then(projects => {
    console.log(`Total projects: ${projects.length}`);
    projects.forEach(p => {
      console.log(`- ${p.name} (ID: ${p.id}, Status: ${p.status})`);
    });
  })
  .finally(() => prisma.$disconnect());
