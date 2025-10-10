import { PrismaClient, FileCategory } from '../../generated/prisma';
import { WebSocketService } from '../websocket.service';

export type ProjectFileCreateInput = {
  projectId: string;
  category: FileCategory;
  filename: string;
  fileUrl: string;
  mimeType: string;
  size: number;
  tags?: string[];
  location?: {
    latitude: number;
    longitude: number;
    altitude?: number;
  };
  takenAt?: Date;
  description?: string;
};

export type ProjectFileUpdateInput = {
  tags?: string[];
  description?: string;
  category?: FileCategory;
};

export type ProjectFileFilter = {
  category?: FileCategory;
  tags?: string[];
  uploadedBy?: string;
  startDate?: Date;
  endDate?: Date;
  searchTerm?: string;
};

export class ProjectFileService {
  constructor(
    private prisma: PrismaClient,
    private wsService?: WebSocketService
  ) {}

  async uploadFile(
    input: ProjectFileCreateInput,
    uploadedBy: string
  ) {
    // Get project for WebSocket broadcast
    const project = await this.prisma.project.findUnique({
      where: { id: input.projectId },
      select: { companyId: true, name: true },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    // Create file record
    const file = await this.prisma.projectFile.create({
      data: {
        projectId: input.projectId,
        category: input.category,
        filename: input.filename,
        fileUrl: input.fileUrl,
        mimeType: input.mimeType,
        size: input.size,
        tags: input.tags || [],
        location: input.location ? JSON.stringify(input.location) : null,
        takenAt: input.takenAt,
        description: input.description,
        uploadedBy,
      },
      include: {
        uploader: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Emit WebSocket event
    if (this.wsService) {
      this.wsService.broadcastToCompany(project.companyId, 'file:uploaded', {
        fileId: file.id,
        projectId: input.projectId,
        projectName: project.name,
        filename: file.filename,
        category: file.category,
        uploadedBy: file.uploader,
        timestamp: new Date(),
      });
    }

    return file;
  }

  async getFile(id: string) {
    const file = await this.prisma.projectFile.findUnique({
      where: { id },
      include: {
        uploader: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
            companyId: true,
          },
        },
      },
    });

    if (!file) {
      throw new Error('File not found');
    }

    return file;
  }

  async updateFile(
    id: string,
    input: ProjectFileUpdateInput
  ) {
    const existing = await this.getFile(id);

    const updated = await this.prisma.projectFile.update({
      where: { id },
      data: {
        tags: input.tags,
        description: input.description,
        category: input.category,
      },
      include: {
        uploader: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Emit WebSocket event
    if (this.wsService) {
      this.wsService.broadcastToCompany(
        existing.project.companyId,
        'file:updated',
        {
          fileId: updated.id,
          projectId: existing.project.id,
          filename: updated.filename,
          timestamp: new Date(),
        }
      );
    }

    return updated;
  }

  async deleteFile(id: string) {
    const existing = await this.getFile(id);

    await this.prisma.projectFile.delete({
      where: { id },
    });

    // Emit WebSocket event
    if (this.wsService) {
      this.wsService.broadcastToCompany(
        existing.project.companyId,
        'file:deleted',
        {
          fileId: id,
          projectId: existing.project.id,
          filename: existing.filename,
          timestamp: new Date(),
        }
      );
    }

    return { success: true };
  }

  async getProjectFiles(
    projectId: string,
    filter?: ProjectFileFilter
  ) {
    const where: any = { projectId };

    // Apply category filter
    if (filter?.category) {
      where.category = filter.category;
    }

    // Apply uploader filter
    if (filter?.uploadedBy) {
      where.uploadedBy = filter.uploadedBy;
    }

    // Apply date range filter
    if (filter?.startDate || filter?.endDate) {
      where.createdAt = {};
      if (filter.startDate) {
        where.createdAt.gte = filter.startDate;
      }
      if (filter.endDate) {
        where.createdAt.lte = filter.endDate;
      }
    }

    // Fetch files
    let files = await this.prisma.projectFile.findMany({
      where,
      include: {
        uploader: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Apply tag filter (array intersection)
    if (filter?.tags && filter.tags.length > 0) {
      files = files.filter((file) =>
        filter.tags!.some((tag) => file.tags.includes(tag))
      );
    }

    // Apply search term (filename or description)
    if (filter?.searchTerm) {
      const term = filter.searchTerm.toLowerCase();
      files = files.filter(
        (file) =>
          file.filename.toLowerCase().includes(term) ||
          (file.description?.toLowerCase().includes(term) ?? false)
      );
    }

    return files;
  }

  async getFilesByCategory(projectId: string, category: FileCategory) {
    return this.getProjectFiles(projectId, { category });
  }

  async getFilesByTags(projectId: string, tags: string[]) {
    return this.getProjectFiles(projectId, { tags });
  }

  async addTags(id: string, newTags: string[]) {
    const file = await this.getFile(id);

    const uniqueTags = Array.from(new Set([...file.tags, ...newTags]));

    return this.updateFile(id, { tags: uniqueTags });
  }

  async removeTags(id: string, tagsToRemove: string[]) {
    const file = await this.getFile(id);

    const filteredTags = file.tags.filter((tag) => !tagsToRemove.includes(tag));

    return this.updateFile(id, { tags: filteredTags });
  }

  async bulkDelete(fileIds: string[]) {
    const files = await this.prisma.projectFile.findMany({
      where: { id: { in: fileIds } },
      include: {
        project: {
          select: { companyId: true },
        },
      },
    });

    if (files.length === 0) {
      return { success: true, deletedCount: 0 };
    }

    await this.prisma.projectFile.deleteMany({
      where: { id: { in: fileIds } },
    });

    // Emit WebSocket event for bulk delete
    if (this.wsService && files.length > 0) {
      const companyId = files[0].project.companyId;
      this.wsService.broadcastToCompany(companyId, 'files:bulk-deleted', {
        fileIds,
        count: files.length,
        timestamp: new Date(),
      });
    }

    return { success: true, deletedCount: files.length };
  }

  async getProjectFileStats(projectId: string) {
    const files = await this.prisma.projectFile.findMany({
      where: { projectId },
      select: {
        category: true,
        size: true,
        mimeType: true,
      },
    });

    const stats = {
      totalFiles: files.length,
      totalSize: files.reduce((sum, f) => sum + f.size, 0),
      byCategory: {} as Record<string, number>,
      byMimeType: {} as Record<string, number>,
    };

    for (const file of files) {
      // Count by category
      stats.byCategory[file.category] =
        (stats.byCategory[file.category] || 0) + 1;

      // Count by mime type
      stats.byMimeType[file.mimeType] =
        (stats.byMimeType[file.mimeType] || 0) + 1;
    }

    return stats;
  }

  async getRecentFiles(projectId: string, limit: number = 10) {
    return this.prisma.projectFile.findMany({
      where: { projectId },
      include: {
        uploader: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });
  }

  async searchFiles(projectId: string, searchTerm: string) {
    return this.getProjectFiles(projectId, { searchTerm });
  }
}
