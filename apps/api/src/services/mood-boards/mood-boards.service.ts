import { PrismaClient, MoodBoardStatus, MoodBoardItemType } from '../../generated/prisma';

// ============================================================================
// INPUT TYPES
// ============================================================================

type MoodBoardCreateInput = {
  projectId: string;
  customerId?: string;
  name: string;
  description?: string;
  room?: string;
  style?: string;
  colorPalette?: any;
};

type MoodBoardItemInput = {
  type: MoodBoardItemType;
  title: string;
  description?: string;
  imageUrl?: string;
  colorHex?: string;
  manufacturer?: string;
  model?: string;
  sku?: string;
  price?: number;
  sourceUrl?: string;
  notes?: string;
  sortOrder?: number;
};

type MoodBoardCommentInput = {
  comment: string;
  itemId?: string;
};

// ============================================================================
// SERVICE
// ============================================================================

export class MoodBoardsService {
  constructor(private prisma: PrismaClient) {}

  // ========================================
  // MOOD BOARD CRUD
  // ========================================

  async createMoodBoard(input: MoodBoardCreateInput, createdById: string): Promise<any> {
    return this.prisma.moodBoard.create({
      data: {
        ...input,
        createdById,
      },
      include: {
        project: true,
        customer: true,
        items: true,
      },
    });
  }

  async getMoodBoard(moodBoardId: string): Promise<any> {
    return this.prisma.moodBoard.findUniqueOrThrow({
      where: { id: moodBoardId },
      include: {
        project: true,
        customer: true,
        createdBy: true,
        approvedBy: true,
        items: {
          orderBy: { sortOrder: 'asc' },
        },
        comments: {
          include: {
            user: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async listMoodBoards(
    projectId: string,
    filters?: {
      status?: MoodBoardStatus;
      customerId?: string;
      room?: string;
    }
  ): Promise<any[]> {
    return this.prisma.moodBoard.findMany({
      where: {
        projectId,
        ...(filters?.status && { status: filters.status }),
        ...(filters?.customerId && { customerId: filters.customerId }),
        ...(filters?.room && { room: filters.room }),
      },
      include: {
        customer: true,
        _count: {
          select: { items: true, comments: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateMoodBoard(
    moodBoardId: string,
    updates: Partial<MoodBoardCreateInput>
  ): Promise<any> {
    return this.prisma.moodBoard.update({
      where: { id: moodBoardId },
      data: updates,
      include: {
        items: true,
        comments: { include: { user: true } },
      },
    });
  }

  async deleteMoodBoard(moodBoardId: string): Promise<void> {
    await this.prisma.moodBoard.delete({
      where: { id: moodBoardId },
    });
  }

  // ========================================
  // MOOD BOARD ITEMS
  // ========================================

  async addItem(moodBoardId: string, input: MoodBoardItemInput): Promise<any> {
    return this.prisma.moodBoardItem.create({
      data: {
        moodBoardId,
        ...input,
      },
    });
  }

  async updateItem(itemId: string, updates: Partial<MoodBoardItemInput>): Promise<any> {
    return this.prisma.moodBoardItem.update({
      where: { id: itemId },
      data: updates,
    });
  }

  async deleteItem(itemId: string): Promise<void> {
    await this.prisma.moodBoardItem.delete({
      where: { id: itemId },
    });
  }

  async reorderItems(itemIds: string[]): Promise<void> {
    await this.prisma.$transaction(
      itemIds.map((itemId, index) =>
        this.prisma.moodBoardItem.update({
          where: { id: itemId },
          data: { sortOrder: index },
        })
      )
    );
  }

  // ========================================
  // COMMENTS
  // ========================================

  async addComment(
    moodBoardId: string,
    userId: string,
    input: MoodBoardCommentInput
  ): Promise<any> {
    return this.prisma.moodBoardComment.create({
      data: {
        moodBoardId,
        userId,
        ...input,
      },
      include: {
        user: true,
      },
    });
  }

  async deleteComment(commentId: string): Promise<void> {
    await this.prisma.moodBoardComment.delete({
      where: { id: commentId },
    });
  }

  // ========================================
  // STATUS MANAGEMENT
  // ========================================

  async shareMoodBoard(moodBoardId: string): Promise<any> {
    return this.prisma.moodBoard.update({
      where: { id: moodBoardId },
      data: {
        status: 'SHARED',
        sharedDate: new Date(),
      },
    });
  }

  async approveMoodBoard(moodBoardId: string, approvedByUserId: string): Promise<any> {
    return this.prisma.moodBoard.update({
      where: { id: moodBoardId },
      data: {
        status: 'APPROVED',
        approvedDate: new Date(),
        approvedByUserId,
      },
      include: {
        approvedBy: true,
      },
    });
  }

  async rejectMoodBoard(moodBoardId: string): Promise<any> {
    return this.prisma.moodBoard.update({
      where: { id: moodBoardId },
      data: {
        status: 'REJECTED',
      },
    });
  }

  async archiveMoodBoard(moodBoardId: string): Promise<any> {
    return this.prisma.moodBoard.update({
      where: { id: moodBoardId },
      data: {
        status: 'ARCHIVED',
      },
    });
  }

  // ========================================
  // ANALYTICS
  // ========================================

  async getMoodBoardsSummary(projectId: string): Promise<any> {
    const boards = await this.prisma.moodBoard.findMany({
      where: { projectId },
      include: {
        items: true,
        comments: true,
      },
    });

    const byStatus = boards.reduce((acc, board) => {
      acc[board.status] = (acc[board.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byRoom = boards.reduce((acc, board) => {
      if (board.room) {
        acc[board.room] = (acc[board.room] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const totalItems = boards.reduce((sum, b) => sum + b.items.length, 0);
    const totalComments = boards.reduce((sum, b) => sum + b.comments.length, 0);

    return {
      totalBoards: boards.length,
      totalItems,
      totalComments,
      byStatus,
      byRoom,
      averageItemsPerBoard: boards.length > 0 ? totalItems / boards.length : 0,
      averageCommentsPerBoard: boards.length > 0 ? totalComments / boards.length : 0,
    };
  }

  async getPendingApprovals(projectId: string): Promise<any[]> {
    return this.prisma.moodBoard.findMany({
      where: {
        projectId,
        status: 'SHARED',
      },
      include: {
        customer: true,
        _count: {
          select: { items: true, comments: true },
        },
      },
      orderBy: { sharedDate: 'asc' },
    });
  }

  async duplicateMoodBoard(moodBoardId: string, createdById: string): Promise<any> {
    const original = await this.prisma.moodBoard.findUniqueOrThrow({
      where: { id: moodBoardId },
      include: { items: true },
    });

    const duplicate = await this.prisma.moodBoard.create({
      data: {
        projectId: original.projectId,
        customerId: original.customerId,
        name: `${original.name} (Copy)`,
        description: original.description,
        room: original.room,
        style: original.style,
        colorPalette: original.colorPalette,
        createdById,
      },
    });

    await this.prisma.moodBoardItem.createMany({
      data: original.items.map(item => ({
        moodBoardId: duplicate.id,
        type: item.type,
        title: item.title,
        description: item.description,
        imageUrl: item.imageUrl,
        colorHex: item.colorHex,
        manufacturer: item.manufacturer,
        model: item.model,
        sku: item.sku,
        price: item.price,
        sourceUrl: item.sourceUrl,
        notes: item.notes,
        sortOrder: item.sortOrder,
      })),
    });

    return this.getMoodBoard(duplicate.id);
  }

  async getItemsByType(moodBoardId: string): Promise<any> {
    const items = await this.prisma.moodBoardItem.findMany({
      where: { moodBoardId },
      orderBy: { sortOrder: 'asc' },
    });

    return items.reduce((acc, item) => {
      if (!acc[item.type]) {
        acc[item.type] = [];
      }
      acc[item.type].push(item);
      return acc;
    }, {} as Record<string, any[]>);
  }

  async getColorPalette(moodBoardId: string): Promise<string[]> {
    const board = await this.prisma.moodBoard.findUniqueOrThrow({
      where: { id: moodBoardId },
      include: {
        items: {
          where: {
            type: 'COLOR',
            colorHex: { not: null },
          },
        },
      },
    });

    const colors = board.items
      .map(item => item.colorHex)
      .filter((color): color is string => color !== null);

    return Array.from(new Set(colors));
  }
}
