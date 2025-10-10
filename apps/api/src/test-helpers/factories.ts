import { PrismaClient, Company, User, Customer, Project } from '../generated/prisma';
import bcrypt from 'bcryptjs';

type CompanyInput = Partial<Omit<Company, 'id' | 'createdAt' | 'updatedAt'>> & {
  name: string;
};

type UserInput = Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>> & {
  email: string;
  firstName: string;
  lastName: string;
  companyId?: string;
  password?: string;
};

type CustomerInput = Partial<Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>> & {
  companyId: string;
  name: string;
};

type ProjectInput = Partial<Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'actualHours' | 'actualCost'>> & {
  name: string;
  companyId: string;
  createdById: string;
};

export const createTestCompany = async (
  prisma: PrismaClient,
  data: CompanyInput
): Promise<Company> => {
  return prisma.company.create({
    data: {
      name: data.name,
      legalName: data.legalName || null,
      registrationNo: data.registrationNo || null,
      vatNumber: data.vatNumber || null,
      address: data.address || null,
      city: data.city || null,
      state: data.state || null,
      postalCode: data.postalCode || null,
      country: data.country || null,
      phone: data.phone || null,
      email: data.email || null,
      website: data.website || null,
      logo: data.logo || null,
      isActive: data.isActive !== undefined ? data.isActive : true,
    },
  });
};

export const createTestUser = async (
  prisma: PrismaClient,
  data: UserInput
): Promise<User> => {
  const hashedPassword = await bcrypt.hash(data.password || 'password123', 10);

  const user = await prisma.user.create({
    data: {
      email: data.email,
      password: hashedPassword,
      firstName: data.firstName,
      lastName: data.lastName,
      phoneNumber: data.phoneNumber || null,
      isActive: data.isActive !== undefined ? data.isActive : true,
      isEmailVerified: data.isEmailVerified !== undefined ? data.isEmailVerified : false,
    },
  });

  // Link user to company if provided
  if (data.companyId) {
    await prisma.companyUser.create({
      data: {
        userId: user.id,
        companyId: data.companyId,
        isOwner: false,
      },
    });
  }

  return user;
};

export const createTestCustomer = async (
  prisma: PrismaClient,
  data: CustomerInput
): Promise<Customer> => {
  return prisma.customer.create({
    data: {
      companyId: data.companyId,
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      address: data.address || null,
      city: data.city || null,
      state: data.state || null,
      postalCode: data.postalCode || null,
      country: data.country || null,
      contactPerson: data.contactPerson || null,
      notes: data.notes || null,
      isActive: data.isActive !== undefined ? data.isActive : true,
    },
  });
};

export const createTestProject = async (
  prisma: PrismaClient,
  data: ProjectInput
): Promise<Project> => {
  return prisma.project.create({
    data: {
      name: data.name,
      description: data.description || null,
      status: data.status || 'DRAFT',
      startDate: data.startDate || null,
      endDate: data.endDate || null,
      plannedHours: data.plannedHours || null,
      budget: data.budget || null,
      companyId: data.companyId,
      customerId: data.customerId || null,
      createdById: data.createdById,
    },
  });
};