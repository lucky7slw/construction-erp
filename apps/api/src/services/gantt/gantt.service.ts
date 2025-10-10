import { PrismaClient, TaskStatus, DependencyType } from '../../generated/prisma';
import { WebSocketService } from '../websocket.service';

export type GanttTaskInput = {
  title: string;
  description?: string;
  startDate?: Date;
  dueDate?: Date;
  estimatedHours?: number;
  assigneeId?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  isMilestone?: boolean;
  dependencies?: {
    predecessorId: string;
    type?: DependencyType;
    lagDays?: number;
  }[];
};

export type GanttTask = {
  id: string;
  title: string;
  status: TaskStatus;
  startDate: Date | null;
  dueDate: Date | null;
  progress: number;
  isMilestone: boolean;
  assignee: {
    id: string;
    name: string;
  } | null;
  dependencies: {
    predecessorId: string;
    type: DependencyType;
    lagDays: number;
  }[];
  isOnCriticalPath: boolean;
  slack: number; // Days of float
};

export type ResourceAllocation = {
  userId: string;
  userName: string;
  totalHours: number;
  allocatedHours: number;
  availableHours: number;
  utilizationPercent: number;
  tasks: {
    taskId: string;
    taskTitle: string;
    hours: number;
    startDate: Date | null;
    dueDate: Date | null;
  }[];
};

export type CriticalPathAnalysis = {
  projectId: string;
  criticalPath: string[]; // Task IDs
  projectDuration: number; // Days
  earliestCompletion: Date | null;
  tasks: {
    taskId: string;
    title: string;
    earlyStart: Date | null;
    earlyFinish: Date | null;
    lateStart: Date | null;
    lateFinish: Date | null;
    slack: number;
    isCritical: boolean;
  }[];
};

export class GanttService {
  constructor(
    private prisma: PrismaClient,
    private wsService?: WebSocketService
  ) {}

  async createTask(projectId: string, input: GanttTaskInput, createdById: string) {
    // Verify project exists
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { companyId: true },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    // Create task
    const task = await this.prisma.task.create({
      data: {
        project: {
          connect: { id: projectId },
        },
        title: input.title,
        description: input.description,
        startDate: input.startDate,
        dueDate: input.dueDate,
        estimatedHours: input.estimatedHours,
        assignee: input.assigneeId
          ? {
              connect: { id: input.assigneeId },
            }
          : undefined,
        priority: input.priority || 'MEDIUM',
        isMilestone: input.isMilestone || false,
      },
      include: {
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Create dependencies if provided
    if (input.dependencies && input.dependencies.length > 0) {
      await this.prisma.taskDependency.createMany({
        data: input.dependencies.map((dep) => ({
          predecessorId: dep.predecessorId,
          dependentId: task.id,
          type: dep.type || 'FS',
          lagDays: dep.lagDays || 0,
        })),
      });
    }

    // Emit WebSocket event
    if (this.wsService) {
      this.wsService.broadcastToCompany(project.companyId, 'gantt:task:created', {
        taskId: task.id,
        projectId,
        title: task.title,
        assignee: task.assignee,
        timestamp: new Date(),
      });
    }

    return this.getTask(task.id);
  }

  async getTask(id: string) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: {
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        dependencies: {
          include: {
            predecessor: {
              select: {
                id: true,
                title: true,
                dueDate: true,
              },
            },
          },
        },
        dependents: {
          include: {
            dependent: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
        checklistItems: true,
        project: {
          select: {
            id: true,
            companyId: true,
          },
        },
      },
    });

    if (!task) {
      throw new Error('Task not found');
    }

    return task;
  }

  async updateTask(
    id: string,
    updates: {
      title?: string;
      description?: string;
      status?: TaskStatus;
      startDate?: Date;
      dueDate?: Date;
      progress?: number;
      assigneeId?: string;
    }
  ) {
    const existing = await this.getTask(id);

    const updated = await this.prisma.task.update({
      where: { id },
      data: {
        title: updates.title,
        description: updates.description,
        status: updates.status,
        startDate: updates.startDate,
        dueDate: updates.dueDate,
        progress: updates.progress,
        assignee: updates.assigneeId
          ? {
              connect: { id: updates.assigneeId },
            }
          : undefined,
        completedAt: updates.status === 'COMPLETED' ? new Date() : undefined,
      },
      include: {
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Emit WebSocket event
    if (this.wsService) {
      this.wsService.broadcastToCompany(
        existing.project.companyId,
        'gantt:task:updated',
        {
          taskId: updated.id,
          projectId: existing.project.id,
          changes: updates,
          timestamp: new Date(),
        }
      );
    }

    return this.getTask(id);
  }

  async addDependency(
    dependentId: string,
    predecessorId: string,
    type: DependencyType = 'FS',
    lagDays: number = 0
  ) {
    // Verify both tasks exist
    const [dependent, predecessor] = await Promise.all([
      this.getTask(dependentId),
      this.getTask(predecessorId),
    ]);

    // Check for circular dependencies
    const hasCircular = await this.checkCircularDependency(dependentId, predecessorId);
    if (hasCircular) {
      throw new Error('Cannot create dependency: would create circular dependency');
    }

    const dependency = await this.prisma.taskDependency.create({
      data: {
        dependent: {
          connect: { id: dependentId },
        },
        predecessor: {
          connect: { id: predecessorId },
        },
        type,
        lagDays,
      },
    });

    // Emit WebSocket event
    if (this.wsService) {
      this.wsService.broadcastToCompany(
        dependent.project.companyId,
        'gantt:dependency:added',
        {
          dependencyId: dependency.id,
          dependentId,
          predecessorId,
          type,
          timestamp: new Date(),
        }
      );
    }

    return dependency;
  }

  private async checkCircularDependency(
    dependentId: string,
    predecessorId: string
  ): Promise<boolean> {
    // Check if predecessorId already depends on dependentId (directly or indirectly)
    // If yes, adding dependentId -> predecessorId would create a cycle
    const visited = new Set<string>();
    const queue = [predecessorId];

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (current === dependentId) {
        return true; // Found a path from predecessor back to dependent
      }

      if (visited.has(current)) {
        continue;
      }

      visited.add(current);

      // Get all tasks that current depends on (predecessors)
      const deps = await this.prisma.taskDependency.findMany({
        where: { dependentId: current },
        select: { predecessorId: true },
      });

      for (const dep of deps) {
        queue.push(dep.predecessorId);
      }
    }

    return false;
  }

  async removeDependency(id: string) {
    const dependency = await this.prisma.taskDependency.findUnique({
      where: { id },
      include: {
        dependent: {
          include: {
            project: {
              select: {
                companyId: true,
              },
            },
          },
        },
      },
    });

    if (!dependency) {
      throw new Error('Dependency not found');
    }

    await this.prisma.taskDependency.delete({
      where: { id },
    });

    // Emit WebSocket event
    if (this.wsService) {
      this.wsService.broadcastToCompany(
        dependency.dependent.project.companyId,
        'gantt:dependency:removed',
        {
          dependencyId: id,
          timestamp: new Date(),
        }
      );
    }

    return { success: true };
  }

  async getProjectGantt(projectId: string): Promise<GanttTask[]> {
    const tasks = await this.prisma.task.findMany({
      where: { projectId },
      include: {
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        dependencies: true,
      },
      orderBy: [{ startDate: 'asc' }, { createdAt: 'asc' }],
    });

    // Calculate critical path
    const criticalPath = await this.calculateCriticalPath(projectId);
    const criticalTaskIds = new Set(criticalPath.criticalPath);
    const slackMap = new Map(
      criticalPath.tasks.map((t) => [t.taskId, t.slack])
    );

    return tasks.map((task) => ({
      id: task.id,
      title: task.title,
      status: task.status,
      startDate: task.startDate,
      dueDate: task.dueDate,
      progress: task.progress,
      isMilestone: task.isMilestone,
      assignee: task.assignee
        ? {
            id: task.assignee.id,
            name: `${task.assignee.firstName} ${task.assignee.lastName}`,
          }
        : null,
      dependencies: task.dependencies.map((dep) => ({
        predecessorId: dep.predecessorId,
        type: dep.type,
        lagDays: dep.lagDays,
      })),
      isOnCriticalPath: criticalTaskIds.has(task.id),
      slack: slackMap.get(task.id) || 0,
    }));
  }

  async calculateCriticalPath(projectId: string): Promise<CriticalPathAnalysis> {
    const tasks = await this.prisma.task.findMany({
      where: { projectId },
      include: {
        dependencies: true,
        dependents: true,
      },
    });

    if (tasks.length === 0) {
      return {
        projectId,
        criticalPath: [],
        projectDuration: 0,
        earliestCompletion: null,
        tasks: [],
      };
    }

    // Calculate early start/finish (forward pass)
    const earlyStart = new Map<string, Date>();
    const earlyFinish = new Map<string, Date>();

    const getTaskDuration = (task: any): number => {
      if (!task.startDate || !task.dueDate) return 0;
      return Math.ceil(
        (new Date(task.dueDate).getTime() - new Date(task.startDate).getTime()) /
          (1000 * 60 * 60 * 24)
      );
    };

    // Find tasks with no predecessors (start tasks)
    const startTasks = tasks.filter((t) => t.dependencies.length === 0);
    const projectStart = new Date(
      Math.min(
        ...tasks
          .filter((t) => t.startDate)
          .map((t) => new Date(t.startDate!).getTime())
      )
    );

    // Forward pass
    const processed = new Set<string>();
    const queue = [...startTasks];

    while (queue.length > 0) {
      const task = queue.shift()!;

      if (processed.has(task.id)) continue;

      // Check if all predecessors are processed
      const allPredsProcessed = task.dependencies.every((dep) =>
        processed.has(dep.predecessorId)
      );

      if (!allPredsProcessed) {
        queue.push(task); // Re-queue
        continue;
      }

      // Calculate early start
      let es = projectStart;
      for (const dep of task.dependencies) {
        const predFinish = earlyFinish.get(dep.predecessorId)!;
        const lagMs = dep.lagDays * 24 * 60 * 60 * 1000;
        const potentialStart = new Date(predFinish.getTime() + lagMs);
        if (potentialStart > es) {
          es = potentialStart;
        }
      }

      earlyStart.set(task.id, es);

      const duration = getTaskDuration(task);
      const ef = new Date(es.getTime() + duration * 24 * 60 * 60 * 1000);
      earlyFinish.set(task.id, ef);

      processed.add(task.id);

      // Add dependents to queue
      for (const dep of task.dependents) {
        queue.push(tasks.find((t) => t.id === dep.dependentId)!);
      }
    }

    // Calculate project completion
    const earliestCompletion = new Date(
      Math.max(...Array.from(earlyFinish.values()).map((d) => d.getTime()))
    );

    // Calculate late start/finish (backward pass)
    const lateStart = new Map<string, Date>();
    const lateFinish = new Map<string, Date>();

    // Find end tasks (no dependents)
    const endTasks = tasks.filter((t) => t.dependents.length === 0);

    // Set late finish for end tasks
    for (const task of endTasks) {
      lateFinish.set(task.id, earliestCompletion);
      const duration = getTaskDuration(task);
      const ls = new Date(earliestCompletion.getTime() - duration * 24 * 60 * 60 * 1000);
      lateStart.set(task.id, ls);
    }

    // Backward pass
    processed.clear();
    const backQueue = [...endTasks];

    while (backQueue.length > 0) {
      const task = backQueue.shift()!;

      if (processed.has(task.id)) continue;

      // Check if all dependents are processed
      const allDepsProcessed = task.dependents.every((dep) =>
        processed.has(dep.dependentId)
      );

      if (!allDepsProcessed) {
        backQueue.push(task);
        continue;
      }

      // Calculate late finish
      let lf = earliestCompletion;
      if (task.dependents.length > 0) {
        lf = new Date(
          Math.min(
            ...task.dependents.map((dep) => {
              const depStart = lateStart.get(dep.dependentId)!;
              const lagMs = dep.lagDays * 24 * 60 * 60 * 1000;
              return depStart.getTime() - lagMs;
            })
          )
        );
      }

      lateFinish.set(task.id, lf);

      const duration = getTaskDuration(task);
      const ls = new Date(lf.getTime() - duration * 24 * 60 * 60 * 1000);
      lateStart.set(task.id, ls);

      processed.add(task.id);

      // Add predecessors to queue
      for (const dep of task.dependencies) {
        backQueue.push(tasks.find((t) => t.id === dep.predecessorId)!);
      }
    }

    // Calculate slack and identify critical path
    const criticalPath: string[] = [];
    const taskAnalysis = tasks.map((task) => {
      const es = earlyStart.get(task.id) || projectStart;
      const ef = earlyFinish.get(task.id) || projectStart;
      const ls = lateStart.get(task.id) || projectStart;
      const lf = lateFinish.get(task.id) || projectStart;

      const slack = Math.floor((ls.getTime() - es.getTime()) / (1000 * 60 * 60 * 24));
      const isCritical = slack === 0;

      if (isCritical) {
        criticalPath.push(task.id);
      }

      return {
        taskId: task.id,
        title: task.title,
        earlyStart: es,
        earlyFinish: ef,
        lateStart: ls,
        lateFinish: lf,
        slack,
        isCritical,
      };
    });

    const projectDuration = Math.ceil(
      (earliestCompletion.getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      projectId,
      criticalPath,
      projectDuration,
      earliestCompletion,
      tasks: taskAnalysis,
    };
  }

  async getResourceAllocation(
    projectId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<ResourceAllocation[]> {
    const where: any = { projectId };

    if (startDate || endDate) {
      where.OR = [];
      if (startDate) {
        where.OR.push({
          dueDate: {
            gte: startDate,
          },
        });
      }
      if (endDate) {
        where.OR.push({
          startDate: {
            lte: endDate,
          },
        });
      }
    }

    const tasks = await this.prisma.task.findMany({
      where,
      include: {
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Group by assignee
    const byUser = new Map<string, any[]>();

    for (const task of tasks) {
      if (!task.assignee) continue;

      const userId = task.assignee.id;
      if (!byUser.has(userId)) {
        byUser.set(userId, []);
      }
      byUser.get(userId)!.push(task);
    }

    // Calculate allocation for each user
    const allocations: ResourceAllocation[] = [];

    for (const [userId, userTasks] of byUser.entries()) {
      const user = userTasks[0].assignee;
      const userName = `${user.firstName} ${user.lastName}`;

      const allocatedHours = userTasks.reduce(
        (sum, task) => sum + Number(task.estimatedHours || 0),
        0
      );

      // Assume 40 hours per week, 8 hours per day
      // Calculate working days in period
      const periodStart = startDate || new Date();
      const periodEnd = endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const workingDays = this.calculateWorkingDays(periodStart, periodEnd);
      const totalHours = workingDays * 8;

      const availableHours = Math.max(0, totalHours - allocatedHours);
      const utilizationPercent =
        totalHours > 0 ? Math.round((allocatedHours / totalHours) * 100) : 0;

      allocations.push({
        userId,
        userName,
        totalHours,
        allocatedHours,
        availableHours,
        utilizationPercent,
        tasks: userTasks.map((task) => ({
          taskId: task.id,
          taskTitle: task.title,
          hours: Number(task.estimatedHours || 0),
          startDate: task.startDate,
          dueDate: task.dueDate,
        })),
      });
    }

    return allocations.sort((a, b) => b.utilizationPercent - a.utilizationPercent);
  }

  private calculateWorkingDays(startDate: Date, endDate: Date): number {
    let count = 0;
    const current = new Date(startDate);

    while (current <= endDate) {
      const day = current.getDay();
      if (day !== 0 && day !== 6) {
        // Not Sunday or Saturday
        count++;
      }
      current.setDate(current.getDate() + 1);
    }

    return count;
  }

  async autoSchedule(projectId: string, projectStart: Date) {
    const tasks = await this.prisma.task.findMany({
      where: { projectId },
      include: {
        dependencies: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    if (tasks.length === 0) {
      return { scheduled: 0 };
    }

    // Topological sort to get task order
    const scheduled = new Map<string, { start: Date; end: Date }>();
    const queue = tasks.filter((t) => t.dependencies.length === 0);
    const processed = new Set<string>();

    while (queue.length > 0) {
      const task = queue.shift()!;

      if (processed.has(task.id)) continue;

      // Calculate start date based on predecessors
      let taskStart = projectStart;

      for (const dep of task.dependencies) {
        const predSchedule = scheduled.get(dep.predecessorId);
        if (!predSchedule) continue; // Skip if predecessor not scheduled yet

        let potentialStart = predSchedule.end;

        // Add lag
        if (dep.lagDays !== 0) {
          potentialStart = new Date(
            potentialStart.getTime() + dep.lagDays * 24 * 60 * 60 * 1000
          );
        }

        if (potentialStart > taskStart) {
          taskStart = potentialStart;
        }
      }

      // Calculate end date (assume 5 days if estimated hours provided, else 1 day)
      const estimatedDays = task.estimatedHours
        ? Math.ceil(Number(task.estimatedHours) / 8)
        : 1;
      const taskEnd = new Date(
        taskStart.getTime() + estimatedDays * 24 * 60 * 60 * 1000
      );

      scheduled.set(task.id, { start: taskStart, end: taskEnd });

      // Update task in database
      await this.prisma.task.update({
        where: { id: task.id },
        data: {
          startDate: taskStart,
          dueDate: taskEnd,
        },
      });

      processed.add(task.id);

      // Add dependents to queue
      const dependents = tasks.filter((t) =>
        t.dependencies.some((d) => d.predecessorId === task.id)
      );
      queue.push(...dependents);
    }

    return { scheduled: processed.size };
  }
}
