import { PrismaClient } from '../../generated/prisma';
import { WebSocketService } from '../websocket.service';

export type ChecklistItemCreateInput = {
  taskId: string;
  content: string;
  sortOrder?: number;
};

export type ChecklistItemUpdateInput = {
  content?: string;
  completed?: boolean;
  sortOrder?: number;
};

export class TaskChecklistService {
  constructor(
    private prisma: PrismaClient,
    private wsService?: WebSocketService
  ) {}

  async addChecklistItem(
    input: ChecklistItemCreateInput,
    createdBy: string
  ) {
    // Verify task exists and get project info
    const task = await this.prisma.task.findUnique({
      where: { id: input.taskId },
      include: {
        project: {
          select: {
            id: true,
            companyId: true,
            name: true,
          },
        },
      },
    });

    if (!task) {
      throw new Error('Task not found');
    }

    // Get current max sortOrder
    const maxOrder = await this.prisma.taskChecklistItem.aggregate({
      where: { taskId: input.taskId },
      _max: { sortOrder: true },
    });

    const sortOrder = input.sortOrder ?? (maxOrder._max.sortOrder ?? -1) + 1;

    const item = await this.prisma.taskChecklistItem.create({
      data: {
        taskId: input.taskId,
        content: input.content,
        sortOrder,
      },
    });

    // Emit WebSocket event
    if (this.wsService) {
      this.wsService.broadcastToCompany(
        task.project.companyId,
        'checklist:item-added',
        {
          itemId: item.id,
          taskId: input.taskId,
          projectId: task.project.id,
          content: item.content,
          timestamp: new Date(),
        }
      );
    }

    return item;
  }

  async getChecklistItem(id: string) {
    const item = await this.prisma.taskChecklistItem.findUnique({
      where: { id },
      include: {
        task: {
          select: {
            id: true,
            title: true,
            project: {
              select: {
                id: true,
                companyId: true,
              },
            },
          },
        },
      },
    });

    if (!item) {
      throw new Error('Checklist item not found');
    }

    return item;
  }

  async updateChecklistItem(
    id: string,
    input: ChecklistItemUpdateInput,
    completedBy?: string
  ) {
    const existing = await this.getChecklistItem(id);

    const data: any = {
      content: input.content,
      sortOrder: input.sortOrder,
    };

    // Handle completion status
    if (input.completed !== undefined) {
      data.completed = input.completed;
      data.completedAt = input.completed ? new Date() : null;
      data.completedBy = input.completed ? completedBy : null;
    }

    const updated = await this.prisma.taskChecklistItem.update({
      where: { id },
      data,
    });

    // Emit WebSocket event
    if (this.wsService) {
      this.wsService.broadcastToCompany(
        existing.task.project.companyId,
        'checklist:item-updated',
        {
          itemId: updated.id,
          taskId: existing.taskId,
          projectId: existing.task.project.id,
          completed: updated.completed,
          timestamp: new Date(),
        }
      );
    }

    return updated;
  }

  async deleteChecklistItem(id: string) {
    const existing = await this.getChecklistItem(id);

    await this.prisma.taskChecklistItem.delete({
      where: { id },
    });

    // Emit WebSocket event
    if (this.wsService) {
      this.wsService.broadcastToCompany(
        existing.task.project.companyId,
        'checklist:item-deleted',
        {
          itemId: id,
          taskId: existing.taskId,
          projectId: existing.task.project.id,
          timestamp: new Date(),
        }
      );
    }

    return { success: true };
  }

  async getTaskChecklist(taskId: string) {
    return this.prisma.taskChecklistItem.findMany({
      where: { taskId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async toggleChecklistItem(id: string, userId: string) {
    const item = await this.getChecklistItem(id);

    return this.updateChecklistItem(
      id,
      { completed: !item.completed },
      userId
    );
  }

  async reorderChecklistItems(taskId: string, itemIds: string[]) {
    // Verify all items belong to this task
    const items = await this.prisma.taskChecklistItem.findMany({
      where: {
        id: { in: itemIds },
        taskId,
      },
    });

    if (items.length !== itemIds.length) {
      throw new Error('Some checklist items not found or do not belong to this task');
    }

    // Update sort orders
    const updates = itemIds.map((id, index) =>
      this.prisma.taskChecklistItem.update({
        where: { id },
        data: { sortOrder: index },
      })
    );

    await this.prisma.$transaction(updates);

    return this.getTaskChecklist(taskId);
  }

  async getChecklistProgress(taskId: string) {
    const items = await this.getTaskChecklist(taskId);

    const total = items.length;
    const completed = items.filter((item) => item.completed).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      total,
      completed,
      remaining: total - completed,
      percentage,
    };
  }

  async bulkAddChecklistItems(
    taskId: string,
    contents: string[],
    createdBy: string
  ) {
    // Verify task exists
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        project: {
          select: {
            companyId: true,
          },
        },
      },
    });

    if (!task) {
      throw new Error('Task not found');
    }

    // Get current max sortOrder
    const maxOrder = await this.prisma.taskChecklistItem.aggregate({
      where: { taskId },
      _max: { sortOrder: true },
    });

    const startOrder = (maxOrder._max.sortOrder ?? -1) + 1;

    // Create items
    const creates = contents.map((content, index) =>
      this.prisma.taskChecklistItem.create({
        data: {
          taskId,
          content,
          sortOrder: startOrder + index,
        },
      })
    );

    const items = await this.prisma.$transaction(creates);

    // Emit WebSocket event
    if (this.wsService) {
      this.wsService.broadcastToCompany(
        task.project.companyId,
        'checklist:items-added',
        {
          taskId,
          count: items.length,
          timestamp: new Date(),
        }
      );
    }

    return items;
  }

  async clearCompletedItems(taskId: string) {
    const result = await this.prisma.taskChecklistItem.deleteMany({
      where: {
        taskId,
        completed: true,
      },
    });

    return {
      success: true,
      deletedCount: result.count,
    };
  }

  async duplicateChecklist(sourceTaskId: string, targetTaskId: string) {
    // Verify both tasks exist
    const sourceTasks = await this.prisma.task.findMany({
      where: {
        id: { in: [sourceTaskId, targetTaskId] },
      },
    });

    if (sourceTasks.length !== 2) {
      throw new Error('Source or target task not found');
    }

    // Get source checklist
    const sourceItems = await this.getTaskChecklist(sourceTaskId);

    if (sourceItems.length === 0) {
      return [];
    }

    // Create duplicates
    const creates = sourceItems.map((item) =>
      this.prisma.taskChecklistItem.create({
        data: {
          taskId: targetTaskId,
          content: item.content,
          sortOrder: item.sortOrder,
          completed: false, // Reset completion status
          completedAt: null,
          completedBy: null,
        },
      })
    );

    return this.prisma.$transaction(creates);
  }
}
