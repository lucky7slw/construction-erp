import { prisma } from '../src/lib/database.js';

async function main() {
  const projects = await prisma.project.findMany({
    select: {
      id: true,
      name: true,
      companyId: true,
      status: true,
    },
  });

  console.log('Projects in database:');
  console.log(JSON.stringify(projects, null, 2));
}

main()
  .finally(() => prisma.$disconnect());
