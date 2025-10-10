import { prisma } from '../src/lib/database.js';

async function main() {
  console.log('🏗️  Creating comprehensive construction project...\n');

  // Get the company that has existing projects (the one user is part of)
  const company = await prisma.company.findUnique({
    where: { id: 'cmgbq5uri00065swov897ufhq' } // Use the company that has existing projects
  });
  if (!company) {
    throw new Error('No company found. Please create a company first.');
  }

  // Get your user (stephen.walter7@gmail.com)
  const user = await prisma.user.findUnique({
    where: { email: 'stephen.walter7@gmail.com' }
  });
  if (!user) {
    throw new Error('User stephen.walter7@gmail.com not found.');
  }

  // Create a realistic residential construction project
  const project = await prisma.project.create({
    data: {
      name: 'Modern Family Home - 123 Oak Street',
      description: 'New construction of a 3,200 sq ft modern family home with 4 bedrooms, 3.5 bathrooms, and open floor plan. Features include custom kitchen, master suite, attached 2-car garage, and landscaped yard.',
      company: {
        connect: { id: company.id }
      },
      createdBy: {
        connect: { id: user.id }
      },
      status: 'ACTIVE',
      startDate: new Date('2025-01-15'),
      endDate: new Date('2025-09-30'),
      budget: 650000,
      actualCost: 145000, // Partially complete
      actualHours: 1200,
    },
  });

  console.log(`✅ Created project: ${project.name}\n`);

  // Create budget line items
  const budgetLineItems = await prisma.budgetLineItem.createMany({
    data: [
      // LABOR
      {
        projectId: project.id,
        category: 'LABOR',
        name: 'General Contractor Labor',
        description: 'Project management and supervision',
        costCode: 'L-001',
        budgetedAmount: 85000,
        actualAmount: 28000,
        committedAmount: 0,
      },
      {
        projectId: project.id,
        category: 'LABOR',
        name: 'Framing Crew',
        description: 'Structural framing and rough carpentry',
        costCode: 'L-002',
        budgetedAmount: 45000,
        actualAmount: 45000,
        committedAmount: 0,
      },
      {
        projectId: project.id,
        category: 'LABOR',
        name: 'Electrical',
        description: 'Licensed electrician labor',
        costCode: 'L-003',
        budgetedAmount: 28000,
        actualAmount: 12000,
        committedAmount: 16000,
      },
      {
        projectId: project.id,
        category: 'LABOR',
        name: 'Plumbing',
        description: 'Licensed plumber labor',
        costCode: 'L-004',
        budgetedAmount: 24000,
        actualAmount: 8000,
        committedAmount: 16000,
      },
      {
        projectId: project.id,
        category: 'LABOR',
        name: 'HVAC Installation',
        description: 'HVAC system installation labor',
        costCode: 'L-005',
        budgetedAmount: 18000,
        actualAmount: 0,
        committedAmount: 18000,
      },
      {
        projectId: project.id,
        category: 'LABOR',
        name: 'Drywall & Finishing',
        description: 'Drywall installation and finishing',
        costCode: 'L-006',
        budgetedAmount: 22000,
        actualAmount: 0,
        committedAmount: 0,
      },
      {
        projectId: project.id,
        category: 'LABOR',
        name: 'Interior Finishing',
        description: 'Trim, doors, paint, flooring',
        costCode: 'L-007',
        budgetedAmount: 35000,
        actualAmount: 0,
        committedAmount: 0,
      },
      // MATERIALS
      {
        projectId: project.id,
        category: 'MATERIALS',
        name: 'Lumber & Framing Materials',
        description: 'Dimensional lumber, engineered lumber, sheathing',
        costCode: 'M-001',
        budgetedAmount: 62000,
        actualAmount: 62000,
        committedAmount: 0,
      },
      {
        projectId: project.id,
        category: 'MATERIALS',
        name: 'Concrete & Foundation',
        description: 'Ready-mix concrete, rebar, forms',
        costCode: 'M-002',
        budgetedAmount: 28000,
        actualAmount: 28000,
        committedAmount: 0,
      },
      {
        projectId: project.id,
        category: 'MATERIALS',
        name: 'Roofing Materials',
        description: 'Shingles, underlayment, flashing',
        costCode: 'M-003',
        budgetedAmount: 15000,
        actualAmount: 15000,
        committedAmount: 0,
      },
      {
        projectId: project.id,
        category: 'MATERIALS',
        name: 'Windows & Doors',
        description: 'All windows, exterior/interior doors',
        costCode: 'M-004',
        budgetedAmount: 32000,
        actualAmount: 0,
        committedAmount: 32000,
      },
      {
        projectId: project.id,
        category: 'MATERIALS',
        name: 'Electrical Materials',
        description: 'Wiring, fixtures, panel, outlets',
        costCode: 'M-005',
        budgetedAmount: 18000,
        actualAmount: 8000,
        committedAmount: 10000,
      },
      {
        projectId: project.id,
        category: 'MATERIALS',
        name: 'Plumbing Materials',
        description: 'Pipes, fixtures, water heater',
        costCode: 'M-006',
        budgetedAmount: 22000,
        actualAmount: 12000,
        committedAmount: 10000,
      },
      {
        projectId: project.id,
        category: 'MATERIALS',
        name: 'HVAC Equipment',
        description: 'Furnace, AC unit, ductwork',
        costCode: 'M-007',
        budgetedAmount: 24000,
        actualAmount: 0,
        committedAmount: 24000,
      },
      {
        projectId: project.id,
        category: 'MATERIALS',
        name: 'Insulation',
        description: 'Spray foam and batt insulation',
        costCode: 'M-008',
        budgetedAmount: 12000,
        actualAmount: 12000,
        committedAmount: 0,
      },
      {
        projectId: project.id,
        category: 'MATERIALS',
        name: 'Drywall Materials',
        description: 'Drywall sheets, compound, tape',
        costCode: 'M-009',
        budgetedAmount: 14000,
        actualAmount: 0,
        committedAmount: 0,
      },
      {
        projectId: project.id,
        category: 'MATERIALS',
        name: 'Flooring Materials',
        description: 'Hardwood, tile, carpet',
        costCode: 'M-010',
        budgetedAmount: 28000,
        actualAmount: 0,
        committedAmount: 0,
      },
      {
        projectId: project.id,
        category: 'MATERIALS',
        name: 'Kitchen Cabinets & Countertops',
        description: 'Custom kitchen cabinets and quartz countertops',
        costCode: 'M-011',
        budgetedAmount: 38000,
        actualAmount: 0,
        committedAmount: 0,
      },
      {
        projectId: project.id,
        category: 'MATERIALS',
        name: 'Interior Trim & Millwork',
        description: 'Baseboards, crown molding, door casings',
        costCode: 'M-012',
        budgetedAmount: 15000,
        actualAmount: 0,
        committedAmount: 0,
      },
      {
        projectId: project.id,
        category: 'MATERIALS',
        name: 'Paint & Finishes',
        description: 'Interior/exterior paint and stain',
        costCode: 'M-013',
        budgetedAmount: 8000,
        actualAmount: 0,
        committedAmount: 0,
      },
      // EQUIPMENT
      {
        projectId: project.id,
        category: 'EQUIPMENT',
        name: 'Excavation Equipment Rental',
        description: 'Excavator for site prep',
        costCode: 'E-001',
        budgetedAmount: 8000,
        actualAmount: 8000,
        committedAmount: 0,
      },
      {
        projectId: project.id,
        category: 'EQUIPMENT',
        name: 'Crane & Lift Rental',
        description: 'Boom lift and material handling',
        costCode: 'E-002',
        budgetedAmount: 6000,
        actualAmount: 6000,
        committedAmount: 0,
      },
      {
        projectId: project.id,
        category: 'EQUIPMENT',
        name: 'Scaffolding Rental',
        description: 'Scaffolding for exterior work',
        costCode: 'E-003',
        budgetedAmount: 4500,
        actualAmount: 0,
        committedAmount: 0,
      },
      // SUBCONTRACTORS
      {
        projectId: project.id,
        category: 'SUBCONTRACTORS',
        name: 'Foundation Contractor',
        description: 'Excavation and foundation work',
        costCode: 'S-001',
        budgetedAmount: 42000,
        actualAmount: 42000,
        committedAmount: 0,
      },
      {
        projectId: project.id,
        category: 'SUBCONTRACTORS',
        name: 'Roofing Contractor',
        description: 'Complete roof installation',
        costCode: 'S-002',
        budgetedAmount: 18000,
        actualAmount: 18000,
        committedAmount: 0,
      },
      {
        projectId: project.id,
        category: 'SUBCONTRACTORS',
        name: 'Landscaping',
        description: 'Final grading and landscaping',
        costCode: 'S-003',
        budgetedAmount: 15000,
        actualAmount: 0,
        committedAmount: 0,
      },
      // PERMITS
      {
        projectId: project.id,
        category: 'PERMITS',
        name: 'Building Permits',
        description: 'City building permits and inspections',
        costCode: 'P-001',
        budgetedAmount: 4500,
        actualAmount: 4500,
        committedAmount: 0,
      },
      {
        projectId: project.id,
        category: 'PERMITS',
        name: 'Utility Connection Fees',
        description: 'Water, sewer, electric hookup fees',
        costCode: 'P-002',
        budgetedAmount: 3500,
        actualAmount: 3500,
        committedAmount: 0,
      },
      // OVERHEAD
      {
        projectId: project.id,
        category: 'OVERHEAD',
        name: 'Site Utilities & Temporary Power',
        description: 'Temporary power, water, porta-potties',
        costCode: 'O-001',
        budgetedAmount: 6000,
        actualAmount: 3000,
        committedAmount: 0,
      },
      {
        projectId: project.id,
        category: 'OVERHEAD',
        name: 'Insurance & Bonding',
        description: 'Builder\'s risk and performance bonds',
        costCode: 'O-002',
        budgetedAmount: 12000,
        actualAmount: 12000,
        committedAmount: 0,
      },
      {
        projectId: project.id,
        category: 'OVERHEAD',
        name: 'Waste Management',
        description: 'Dumpster rental and disposal',
        costCode: 'O-003',
        budgetedAmount: 4500,
        actualAmount: 2000,
        committedAmount: 0,
      },
      // CONTINGENCY
      {
        projectId: project.id,
        category: 'CONTINGENCY',
        name: 'Project Contingency Fund',
        description: '5% contingency for unforeseen costs',
        costCode: 'C-001',
        budgetedAmount: 32500,
        actualAmount: 0,
        committedAmount: 0,
      },
    ],
  });

  console.log(`✅ Created ${budgetLineItems.count} budget line items\n`);

  // Add user to project (required for API access)
  await prisma.projectUser.create({
    data: {
      userId: user.id,
      projectId: project.id,
      role: 'manager',
    },
  });

  console.log(`✅ Added user to project\n`);

  console.log('📊 Budget Summary:');
  console.log(`   Total Budget: $${project.budget.toLocaleString()}`);
  console.log(`   Actual Cost: $${project.actualCost.toLocaleString()}`);
  console.log(`   Committed: $106,000`);
  console.log(`   Remaining: $${(project.budget - project.actualCost - 106000).toLocaleString()}\n`);

  console.log('🎉 Complete project created successfully!');
  console.log(`\n📍 Project ID: ${project.id}`);
  console.log(`🔗 View at: http://localhost:3000/projects/${project.id}\n`);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
