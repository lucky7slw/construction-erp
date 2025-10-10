export type ProjectStatus = 'planning' | 'active' | 'on-hold' | 'completed' | 'cancelled';

export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export type Project = {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  priority: Priority;
  startDate: Date;
  endDate?: Date;
  budget: number;
  createdAt: Date;
  updatedAt: Date;
};

export type Task = {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: 'todo' | 'in-progress' | 'review' | 'done';
  priority: Priority;
  assigneeId?: string;
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type User = {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'worker';
  createdAt: Date;
  updatedAt: Date;
};