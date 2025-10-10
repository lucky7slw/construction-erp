import { prisma } from '../src/lib/database.js';

async function main() {
  const projectId = 'cmgf5q0ku00005s7gtpyt5j4z';

  console.log(`Checking ProjectUser records for project: ${projectId}\n`);

  const projectUsers = await prisma.projectUser.findMany({
    where: { projectId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  console.log('ProjectUser records:');
  console.log(JSON.stringify(projectUsers, null, 2));

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      name: true,
      createdById: true,
      companyId: true,
    },
  });

  console.log('\nProject details:');
  console.log(JSON.stringify(project, null, 2));
}

main()
  .finally(() => prisma.$disconnect());
