import { PrismaClient } from '../../generated/prisma';

// ============================================================================
// INPUT TYPES
// ============================================================================

type TimeEntryCreateInput = {
  projectId: string;
  taskId?: string;
  userId: string;
  description?: string;
  hours: number;
  date: Date;
  billable?: boolean;
};

// ============================================================================
// SERVICE
// ============================================================================

export class TimeTrackingService {
  constructor(private prisma: PrismaClient) {}

  // ========================================
  // TIME ENTRIES
  // ========================================

  async createTimeEntry(input: TimeEntryCreateInput): Promise<any> {
    return this.prisma.timeEntry.create({
      data: {
        projectId: input.projectId,
        taskId: input.taskId,
        userId: input.userId,
        description: input.description,
        hours: input.hours,
        date: input.date,
        billable: input.billable ?? true,
      },
      include: {
        project: true,
        task: true,
        user: true,
      },
    });
  }

  async getTimeEntry(entryId: string): Promise<any> {
    return this.prisma.timeEntry.findUniqueOrThrow({
      where: { id: entryId },
      include: {
        project: true,
        task: true,
        user: true,
      },
    });
  }

  async listTimeEntries(filters: {
    projectId?: string;
    taskId?: string;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
    billable?: boolean;
  }): Promise<any[]> {
    return this.prisma.timeEntry.findMany({
      where: {
        ...(filters.projectId && { projectId: filters.projectId }),
        ...(filters.taskId && { taskId: filters.taskId }),
        ...(filters.userId && { userId: filters.userId }),
        ...(filters.billable !== undefined && { billable: filters.billable }),
        ...(filters.startDate || filters.endDate ? {
          date: {
            ...(filters.startDate && { gte: filters.startDate }),
            ...(filters.endDate && { lte: filters.endDate }),
          },
        } : {}),
      },
      include: {
        project: true,
        task: true,
        user: true,
      },
      orderBy: { date: 'desc' },
    });
  }

  async updateTimeEntry(
    entryId: string,
    updates: Partial<TimeEntryCreateInput>
  ): Promise<any> {
    return this.prisma.timeEntry.update({
      where: { id: entryId },
      data: updates,
      include: {
        project: true,
        task: true,
        user: true,
      },
    });
  }

  async deleteTimeEntry(entryId: string): Promise<void> {
    await this.prisma.timeEntry.delete({
      where: { id: entryId },
    });
  }

  // ========================================
  // ANALYTICS
  // ========================================

  async getTimeByProject(
    projectId: string,
    filters?: {
      startDate?: Date;
      endDate?: Date;
      billableOnly?: boolean;
    }
  ): Promise<any> {
    const entries = await this.prisma.timeEntry.findMany({
      where: {
        projectId,
        ...(filters?.billableOnly && { billable: true }),
        ...(filters?.startDate || filters?.endDate ? {
          date: {
            ...(filters.startDate && { gte: filters.startDate }),
            ...(filters.endDate && { lte: filters.endDate }),
          },
        } : {}),
      },
      include: {
        user: true,
        task: true,
      },
    });

    const totalHours = entries.reduce((sum, entry) => sum + Number(entry.hours), 0);
    const billableHours = entries
      .filter((e) => e.billable)
      .reduce((sum, entry) => sum + Number(entry.hours), 0);
    const nonBillableHours = totalHours - billableHours;

    const byUser = entries.reduce((acc, entry) => {
      const userName = `${entry.user.firstName} ${entry.user.lastName}`;
      if (!acc[userName]) {
        acc[userName] = {
          user: userName,
          userId: entry.userId,
          totalHours: 0,
          billableHours: 0,
          entries: 0,
        };
      }

      acc[userName].totalHours += Number(entry.hours);
      if (entry.billable) {
        acc[userName].billableHours += Number(entry.hours);
      }
      acc[userName].entries++;

      return acc;
    }, {} as Record<string, any>);

    const byTask = entries
      .filter((e) => e.task)
      .reduce((acc, entry) => {
        const taskTitle = entry.task!.title;
        if (!acc[taskTitle]) {
          acc[taskTitle] = {
            task: taskTitle,
            taskId: entry.taskId,
            totalHours: 0,
            entries: 0,
          };
        }

        acc[taskTitle].totalHours += Number(entry.hours);
        acc[taskTitle].entries++;

        return acc;
      }, {} as Record<string, any>);

    return {
      totalHours,
      billableHours,
      nonBillableHours,
      totalEntries: entries.length,
      byUser: Object.values(byUser).sort((a, b) => b.totalHours - a.totalHours),
      byTask: Object.values(byTask).sort((a, b) => b.totalHours - a.totalHours),
    };
  }

  async getTimeByUser(
    userId: string,
    filters?: {
      projectId?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<any> {
    const entries = await this.prisma.timeEntry.findMany({
      where: {
        userId,
        ...(filters?.projectId && { projectId: filters.projectId }),
        ...(filters?.startDate || filters?.endDate ? {
          date: {
            ...(filters.startDate && { gte: filters.startDate }),
            ...(filters.endDate && { lte: filters.endDate }),
          },
        } : {}),
      },
      include: {
        project: true,
        task: true,
      },
    });

    const totalHours = entries.reduce((sum, entry) => sum + Number(entry.hours), 0);
    const billableHours = entries
      .filter((e) => e.billable)
      .reduce((sum, entry) => sum + Number(entry.hours), 0);

    const byProject = entries.reduce((acc, entry) => {
      if (!entry.project) return acc;

      const projectName = entry.project.name;
      if (!acc[projectName]) {
        acc[projectName] = {
          project: projectName,
          projectId: entry.projectId,
          totalHours: 0,
          billableHours: 0,
          entries: 0,
        };
      }

      acc[projectName].totalHours += Number(entry.hours);
      if (entry.billable) {
        acc[projectName].billableHours += Number(entry.hours);
      }
      acc[projectName].entries++;

      return acc;
    }, {} as Record<string, any>);

    const byDate = entries.reduce((acc, entry) => {
      const dateKey = entry.date.toISOString().split('T')[0];
      if (!acc[dateKey]) {
        acc[dateKey] = {
          date: dateKey,
          totalHours: 0,
          billableHours: 0,
          entries: 0,
        };
      }

      acc[dateKey].totalHours += Number(entry.hours);
      if (entry.billable) {
        acc[dateKey].billableHours += Number(entry.hours);
      }
      acc[dateKey].entries++;

      return acc;
    }, {} as Record<string, any>);

    return {
      totalHours,
      billableHours,
      nonBillableHours: totalHours - billableHours,
      totalEntries: entries.length,
      byProject: Object.values(byProject).sort((a, b) => b.totalHours - a.totalHours),
      byDate: Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date)),
    };
  }

  async getTimeByTask(taskId: string): Promise<any> {
    const entries = await this.prisma.timeEntry.findMany({
      where: { taskId },
      include: {
        user: true,
      },
      orderBy: { date: 'desc' },
    });

    const totalHours = entries.reduce((sum, entry) => sum + Number(entry.hours), 0);

    const byUser = entries.reduce((acc, entry) => {
      const userName = `${entry.user.firstName} ${entry.user.lastName}`;
      if (!acc[userName]) {
        acc[userName] = {
          user: userName,
          userId: entry.userId,
          totalHours: 0,
          entries: 0,
        };
      }

      acc[userName].totalHours += Number(entry.hours);
      acc[userName].entries++;

      return acc;
    }, {} as Record<string, any>);

    return {
      totalHours,
      totalEntries: entries.length,
      byUser: Object.values(byUser).sort((a, b) => b.totalHours - a.totalHours),
      entries,
    };
  }

  async getWeeklySummary(
    userId: string,
    weekStartDate: Date
  ): Promise<any> {
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekEndDate.getDate() + 6);

    const entries = await this.prisma.timeEntry.findMany({
      where: {
        userId,
        date: {
          gte: weekStartDate,
          lte: weekEndDate,
        },
      },
      include: {
        project: true,
        task: true,
      },
      orderBy: { date: 'asc' },
    });

    const totalHours = entries.reduce((sum, entry) => sum + Number(entry.hours), 0);
    const billableHours = entries
      .filter((e) => e.billable)
      .reduce((sum, entry) => sum + Number(entry.hours), 0);

    const byDay = entries.reduce((acc, entry) => {
      const dateKey = entry.date.toISOString().split('T')[0];
      if (!acc[dateKey]) {
        acc[dateKey] = {
          date: dateKey,
          totalHours: 0,
          billableHours: 0,
          entries: [],
        };
      }

      acc[dateKey].totalHours += Number(entry.hours);
      if (entry.billable) {
        acc[dateKey].billableHours += Number(entry.hours);
      }
      acc[dateKey].entries.push(entry);

      return acc;
    }, {} as Record<string, any>);

    return {
      weekStart: weekStartDate.toISOString().split('T')[0],
      weekEnd: weekEndDate.toISOString().split('T')[0],
      totalHours,
      billableHours,
      nonBillableHours: totalHours - billableHours,
      totalEntries: entries.length,
      byDay: Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date)),
    };
  }

  async exportTimesheet(
    filters: {
      projectId?: string;
      userId?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<string> {
    const entries = await this.prisma.timeEntry.findMany({
      where: {
        ...(filters.projectId && { projectId: filters.projectId }),
        ...(filters.userId && { userId: filters.userId }),
        ...(filters.startDate || filters.endDate ? {
          date: {
            ...(filters.startDate && { gte: filters.startDate }),
            ...(filters.endDate && { lte: filters.endDate }),
          },
        } : {}),
      },
      include: {
        project: true,
        task: true,
        user: true,
      },
      orderBy: [
        { date: 'asc' },
        { userId: 'asc' },
      ],
    });

    let csv = 'Date,User,Project,Task,Description,Hours,Billable\n';

    for (const entry of entries) {
      const row = [
        entry.date.toISOString().split('T')[0],
        `${entry.user.firstName} ${entry.user.lastName}`,
        entry.project?.name || 'N/A',
        entry.task?.title || 'N/A',
        entry.description || '',
        entry.hours,
        entry.billable ? 'Yes' : 'No',
      ];

      csv += row.map(v => `"${v}"`).join(',') + '\n';
    }

    return csv;
  }
}
