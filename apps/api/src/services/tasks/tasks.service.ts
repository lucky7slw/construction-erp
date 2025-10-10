import { PrismaClient, TaskStatus, TaskPriority, DependencyType } from '../../generated/prisma';

// ============================================================================
// INPUT TYPES
// ============================================================================

type TaskCreateInput = {
  projectId: string;
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  startDate?: Date;
  dueDate?: Date;
  assigneeId?: string;
  estimatedHours?: number;
  isMilestone?: boolean;
};

type TaskChecklistItemInput = {
  taskId: string;
  content: string;
  sortOrder: number;
};

type TaskDependencyInput = {
  predecessorId: string;
  dependentId: string;
  type?: DependencyType;
  lagDays?: number;
};

// ============================================================================
// SERVICE
// ============================================================================

export class TasksService {
  constructor(private prisma: PrismaClient) {}

  // ========================================
  // TASKS
  // ========================================

  async createTask(input: TaskCreateInput): Promise<any> {
    return this.prisma.task.create({
      data: {
        projectId: input.projectId,
        title: input.title,
        description: input.description,
        status: input.status || 'TODO',
        priority: input.priority || 'MEDIUM',
        startDate: input.startDate,
        dueDate: input.dueDate,
        assigneeId: input.assigneeId,
        estimatedHours: input.estimatedHours,
        isMilestone: input.isMilestone || false,
      },
      include: {
        project: true,
        assignee: true,
        checklistItems: true,
      },
    });
  }

  async getTask(taskId: string): Promise<any> {
    return this.prisma.task.findUniqueOrThrow({
      where: { id: taskId },
      include: {
        project: true,
        assignee: true,
        checklistItems: {
          orderBy: { sortOrder: 'asc' },
        },
        dependencies: {
          include: {
            predecessor: true,
          },
        },
        dependents: {
          include: {
            dependent: true,
          },
        },
        timeEntries: {
          include: {
            user: true,
          },
        },
      },
    });
  }

  async listTasks(
    projectId: string,
    filters?: {
      status?: TaskStatus;
      assigneeId?: string;
      priority?: TaskPriority;
      milestonesOnly?: boolean;
    }
  ): Promise<any[]> {
    return this.prisma.task.findMany({
      where: {
        projectId,
        ...(filters?.status && { status: filters.status }),
        ...(filters?.assigneeId && { assigneeId: filters.assigneeId }),
        ...(filters?.priority && { priority: filters.priority }),
        ...(filters?.milestonesOnly && { isMilestone: true }),
      },
      include: {
        assignee: true,
        _count: {
          select: {
            checklistItems: true,
            timeEntries: true,
            dependencies: true,
          },
        },
      },
      orderBy: [
        { isMilestone: 'desc' },
        { priority: 'desc' },
        { dueDate: 'asc' },
      ],
    });
  }

  async updateTask(
    taskId: string,
    updates: Partial<TaskCreateInput> & { progress?: number; completedAt?: Date }
  ): Promise<any> {
    const data: any = { ...updates };

    // If status is COMPLETED, set completedAt
    if (updates.status === 'COMPLETED' && !data.completedAt) {
      data.completedAt = new Date();
      data.progress = 100;
    }

    return this.prisma.task.update({
      where: { id: taskId },
      data,
      include: {
        assignee: true,
        checklistItems: true,
      },
    });
  }

  async deleteTask(taskId: string): Promise<void> {
    await this.prisma.task.delete({
      where: { id: taskId },
    });
  }

  // ========================================
  // CHECKLIST ITEMS
  // ========================================

  async addChecklistItem(input: TaskChecklistItemInput): Promise<any> {
    return this.prisma.taskChecklistItem.create({
      data: {
        taskId: input.taskId,
        content: input.content,
        sortOrder: input.sortOrder,
      },
    });
  }

  async toggleChecklistItem(
    itemId: string,
    completed: boolean,
    completedBy?: string
  ): Promise<any> {
    return this.prisma.taskChecklistItem.update({
      where: { id: itemId },
      data: {
        completed,
        completedAt: completed ? new Date() : null,
        completedBy: completed ? completedBy : null,
      },
    });
  }

  async updateChecklistItem(
    itemId: string,
    updates: { content?: string; sortOrder?: number }
  ): Promise<any> {
    return this.prisma.taskChecklistItem.update({
      where: { id: itemId },
      data: updates,
    });
  }

  async deleteChecklistItem(itemId: string): Promise<void> {
    await this.prisma.taskChecklistItem.delete({
      where: { id: itemId },
    });
  }

  // ========================================
  // TASK DEPENDENCIES
  // ========================================

  async addDependency(input: TaskDependencyInput): Promise<any> {
    return this.prisma.taskDependency.create({
      data: {
        predecessorId: input.predecessorId,
        dependentId: input.dependentId,
        type: input.type || 'FS',
        lagDays: input.lagDays || 0,
      },
      include: {
        predecessor: true,
        dependent: true,
      },
    });
  }

  async removeDependency(dependencyId: string): Promise<void> {
    await this.prisma.taskDependency.delete({
      where: { id: dependencyId },
    });
  }

  // ========================================
  // ANALYTICS
  // ========================================

  async getTaskProgress(taskId: string): Promise<any> {
    const task = await this.prisma.task.findUniqueOrThrow({
      where: { id: taskId },
      include: {
        checklistItems: true,
        timeEntries: true,
      },
    });

    const totalChecklistItems = task.checklistItems.length;
    const completedChecklistItems = task.checklistItems.filter(i => i.completed).length;
    const checklistProgress = totalChecklistItems > 0
      ? (completedChecklistItems / totalChecklistItems) * 100
      : 0;

    const totalTimeSpent = task.timeEntries.reduce(
      (sum, entry) => sum + Number(entry.hours),
      0
    );

    const estimatedHours = Number(task.estimatedHours) || 0;
    const timeProgress = estimatedHours > 0
      ? (totalTimeSpent / estimatedHours) * 100
      : 0;

    return {
      taskId: task.id,
      title: task.title,
      status: task.status,
      overallProgress: task.progress,
      checklistProgress: Math.round(checklistProgress),
      totalChecklistItems,
      completedChecklistItems,
      estimatedHours,
      actualHours: totalTimeSpent,
      timeProgress: Math.round(timeProgress),
      isOverBudget: totalTimeSpent > estimatedHours,
    };
  }

  async getProjectTaskSummary(projectId: string): Promise<any> {
    const tasks = await this.prisma.task.findMany({
      where: { projectId },
      include: {
        timeEntries: true,
        checklistItems: true,
      },
    });

    const byStatus = tasks.reduce((acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byPriority = tasks.reduce((acc, task) => {
      acc[task.priority] = (acc[task.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalEstimatedHours = tasks.reduce(
      (sum, task) => sum + Number(task.estimatedHours || 0),
      0
    );

    const totalActualHours = tasks.reduce(
      (sum, task) => sum + task.timeEntries.reduce(
        (entrySum, entry) => entrySum + Number(entry.hours),
        0
      ),
      0
    );

    const completedTasks = tasks.filter(t => t.status === 'COMPLETED').length;
    const totalTasks = tasks.length;
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    const milestones = tasks.filter(t => t.isMilestone);
    const completedMilestones = milestones.filter(t => t.status === 'COMPLETED').length;

    return {
      totalTasks,
      completedTasks,
      completionRate: Math.round(completionRate),
      byStatus,
      byPriority,
      totalEstimatedHours,
      totalActualHours,
      hoursVariance: totalActualHours - totalEstimatedHours,
      totalMilestones: milestones.length,
      completedMilestones,
    };
  }

  async getOverdueTasks(projectId: string): Promise<any[]> {
    const now = new Date();

    return this.prisma.task.findMany({
      where: {
        projectId,
        status: {
          not: 'COMPLETED',
        },
        dueDate: {
          lt: now,
        },
      },
      include: {
        assignee: true,
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  async getTasksByAssignee(projectId: string): Promise<any[]> {
    const tasks = await this.prisma.task.findMany({
      where: { projectId },
      include: {
        assignee: true,
        timeEntries: true,
      },
    });

    const byAssignee = tasks.reduce((acc, task) => {
      const assigneeName = task.assignee
        ? `${task.assignee.firstName} ${task.assignee.lastName}`
        : 'Unassigned';

      if (!acc[assigneeName]) {
        acc[assigneeName] = {
          assignee: assigneeName,
          assigneeId: task.assigneeId,
          totalTasks: 0,
          completedTasks: 0,
          inProgressTasks: 0,
          todoTasks: 0,
          overdueTasks: 0,
          totalHours: 0,
        };
      }

      acc[assigneeName].totalTasks++;

      if (task.status === 'COMPLETED') acc[assigneeName].completedTasks++;
      if (task.status === 'IN_PROGRESS') acc[assigneeName].inProgressTasks++;
      if (task.status === 'TODO') acc[assigneeName].todoTasks++;

      if (task.dueDate && task.dueDate < new Date() && task.status !== 'COMPLETED') {
        acc[assigneeName].overdueTasks++;
      }

      acc[assigneeName].totalHours += task.timeEntries.reduce(
        (sum, entry) => sum + Number(entry.hours),
        0
      );

      return acc;
    }, {} as Record<string, any>);

    return Object.values(byAssignee).sort((a, b) => b.totalTasks - a.totalTasks);
  }

  async getCriticalPath(projectId: string): Promise<any[]> {
    const tasks = await this.prisma.task.findMany({
      where: { projectId },
      include: {
        dependencies: {
          include: {
            predecessor: true,
          },
        },
        dependents: {
          include: {
            dependent: true,
          },
        },
      },
    });

    // Simple critical path: tasks with dependencies that are on the longest path
    const tasksWithDependencies = tasks.filter(
      t => t.dependencies.length > 0 || t.dependents.length > 0
    );

    return tasksWithDependencies.map(task => ({
      id: task.id,
      title: task.title,
      status: task.status,
      dueDate: task.dueDate,
      estimatedHours: Number(task.estimatedHours || 0),
      dependsOn: task.dependencies.map(d => ({
        id: d.predecessor.id,
        title: d.predecessor.title,
        type: d.type,
      })),
      blockedBy: task.dependents.map(d => ({
        id: d.dependent.id,
        title: d.dependent.title,
        type: d.type,
      })),
    }));
  }
}
