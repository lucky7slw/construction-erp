import { z } from 'zod';

export const ProjectStatusSchema = z.enum(['planning', 'active', 'on-hold', 'completed', 'cancelled']);

export const PrioritySchema = z.enum(['low', 'medium', 'high', 'urgent']);

export const ProjectSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().max(1000),
  status: ProjectStatusSchema,
  priority: PrioritySchema,
  startDate: z.date(),
  endDate: z.date().optional(),
  budget: z.number().positive(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export const CreateProjectSchema = ProjectSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const UpdateProjectSchema = CreateProjectSchema.partial();

export const TaskStatusSchema = z.enum(['todo', 'in-progress', 'review', 'done']);

export const TaskSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  title: z.string().min(1).max(255),
  description: z.string().max(1000),
  status: TaskStatusSchema,
  priority: PrioritySchema,
  assigneeId: z.string().uuid().optional(),
  dueDate: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export const CreateTaskSchema = TaskSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const UpdateTaskSchema = CreateTaskSchema.partial().omit({ projectId: true });

export const UserRoleSchema = z.enum(['admin', 'manager', 'worker']);

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1).max(255),
  role: UserRoleSchema,
  createdAt: z.date(),
  updatedAt: z.date()
});

export const CreateUserSchema = UserSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const UpdateUserSchema = CreateUserSchema.partial().omit({ email: true });