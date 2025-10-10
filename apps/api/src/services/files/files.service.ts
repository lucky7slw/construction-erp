import { PrismaClient, FileCategory } from '../../generated/prisma';

// ============================================================================
// INPUT TYPES
// ============================================================================

type FileUploadInput = {
  projectId: string;
  category: FileCategory;
  filename: string;
  fileUrl: string;
  mimeType: string;
  size: number;
  tags?: string[];
  location?: string;
  takenAt?: Date;
  uploadedBy: string;
  description?: string;
};

type FileSearchFilters = {
  category?: FileCategory;
  tags?: string[];
  uploadedBy?: string;
  startDate?: Date;
  endDate?: Date;
};

type FileMetadataUpdate = {
  filename?: string;
  category?: FileCategory;
  tags?: string[];
  description?: string;
  location?: string;
  takenAt?: Date;
};

// ============================================================================
// SERVICE
// ============================================================================

export class FilesService {
  constructor(private prisma: PrismaClient) {}

  // ========================================
  // FILE UPLOAD & MANAGEMENT
  // ========================================

  async uploadFile(input: FileUploadInput): Promise<any> {
    return this.prisma.projectFile.create({
      data: {
        projectId: input.projectId,
        category: input.category,
        filename: input.filename,
        fileUrl: input.fileUrl,
        mimeType: input.mimeType,
        size: input.size,
        tags: input.tags || [],
        location: input.location,
        takenAt: input.takenAt,
        uploadedBy: input.uploadedBy,
        description: input.description,
      },
      include: {
        project: true,
        uploader: true,
      },
    });
  }

  async getFile(fileId: string): Promise<any> {
    return this.prisma.projectFile.findUniqueOrThrow({
      where: { id: fileId },
      include: {
        project: true,
        uploader: true,
      },
    });
  }

  async listFiles(
    projectId: string,
    filters?: FileSearchFilters
  ): Promise<any[]> {
    return this.prisma.projectFile.findMany({
      where: {
        projectId,
        ...(filters?.category && { category: filters.category }),
        ...(filters?.uploadedBy && { uploadedBy: filters.uploadedBy }),
        ...(filters?.tags && filters.tags.length > 0 && {
          tags: {
            hasSome: filters.tags,
          },
        }),
        ...(filters?.startDate || filters?.endDate ? {
          createdAt: {
            ...(filters.startDate && { gte: filters.startDate }),
            ...(filters.endDate && { lte: filters.endDate }),
          },
        } : {}),
      },
      include: {
        uploader: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateFileMetadata(
    fileId: string,
    updates: FileMetadataUpdate
  ): Promise<any> {
    return this.prisma.projectFile.update({
      where: { id: fileId },
      data: updates,
      include: {
        uploader: true,
      },
    });
  }

  async deleteFile(fileId: string): Promise<void> {
    await this.prisma.projectFile.delete({
      where: { id: fileId },
    });
  }

  // ========================================
  // BATCH OPERATIONS
  // ========================================

  async uploadBatch(inputs: FileUploadInput[]): Promise<any[]> {
    const results = await Promise.all(
      inputs.map(input => this.uploadFile(input))
    );

    return results;
  }

  async deleteBatch(fileIds: string[]): Promise<void> {
    await this.prisma.projectFile.deleteMany({
      where: {
        id: {
          in: fileIds,
        },
      },
    });
  }

  async addTagsToFiles(fileIds: string[], tagsToAdd: string[]): Promise<void> {
    const files = await this.prisma.projectFile.findMany({
      where: {
        id: {
          in: fileIds,
        },
      },
    });

    await Promise.all(
      files.map(file => {
        const currentTags = file.tags || [];
        const newTags = Array.from(new Set([...currentTags, ...tagsToAdd]));

        return this.prisma.projectFile.update({
          where: { id: file.id },
          data: { tags: newTags },
        });
      })
    );
  }

  async removeTagsFromFiles(fileIds: string[], tagsToRemove: string[]): Promise<void> {
    const files = await this.prisma.projectFile.findMany({
      where: {
        id: {
          in: fileIds,
        },
      },
    });

    await Promise.all(
      files.map(file => {
        const currentTags = file.tags || [];
        const newTags = currentTags.filter(tag => !tagsToRemove.includes(tag));

        return this.prisma.projectFile.update({
          where: { id: file.id },
          data: { tags: newTags },
        });
      })
    );
  }

  // ========================================
  // FILE ORGANIZATION
  // ========================================

  async getFilesByCategory(projectId: string): Promise<any> {
    const files = await this.prisma.projectFile.findMany({
      where: { projectId },
      include: {
        uploader: true,
      },
    });

    const byCategory = files.reduce((acc, file) => {
      if (!acc[file.category]) {
        acc[file.category] = {
          category: file.category,
          files: [],
          totalSize: 0,
          count: 0,
        };
      }

      acc[file.category].files.push(file);
      acc[file.category].totalSize += file.size;
      acc[file.category].count++;

      return acc;
    }, {} as Record<string, any>);

    return Object.values(byCategory).sort((a, b) => b.count - a.count);
  }

  async getFilesByTag(projectId: string): Promise<any> {
    const files = await this.prisma.projectFile.findMany({
      where: { projectId },
      include: {
        uploader: true,
      },
    });

    const byTag = files.reduce((acc, file) => {
      const tags = file.tags || [];

      tags.forEach(tag => {
        if (!acc[tag]) {
          acc[tag] = {
            tag,
            files: [],
            count: 0,
          };
        }

        acc[tag].files.push(file);
        acc[tag].count++;
      });

      return acc;
    }, {} as Record<string, any>);

    return Object.values(byTag).sort((a, b) => b.count - a.count);
  }

  async getRecentFiles(projectId: string, limit: number = 10): Promise<any[]> {
    return this.prisma.projectFile.findMany({
      where: { projectId },
      include: {
        uploader: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getPhotoGallery(
    projectId: string,
    filters?: {
      startDate?: Date;
      endDate?: Date;
      location?: string;
    }
  ): Promise<any[]> {
    return this.prisma.projectFile.findMany({
      where: {
        projectId,
        category: 'PHOTO',
        ...(filters?.location && { location: filters.location }),
        ...(filters?.startDate || filters?.endDate ? {
          takenAt: {
            ...(filters.startDate && { gte: filters.startDate }),
            ...(filters.endDate && { lte: filters.endDate }),
          },
        } : {}),
      },
      include: {
        uploader: true,
      },
      orderBy: [
        { takenAt: 'desc' },
        { createdAt: 'desc' },
      ],
    });
  }

  // ========================================
  // ANALYTICS
  // ========================================

  async getProjectStorageStats(projectId: string): Promise<any> {
    const files = await this.prisma.projectFile.findMany({
      where: { projectId },
    });

    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const totalFiles = files.length;

    const byCategory = files.reduce((acc, file) => {
      if (!acc[file.category]) {
        acc[file.category] = {
          count: 0,
          size: 0,
        };
      }

      acc[file.category].count++;
      acc[file.category].size += file.size;

      return acc;
    }, {} as Record<string, any>);

    const byMimeType = files.reduce((acc, file) => {
      if (!acc[file.mimeType]) {
        acc[file.mimeType] = {
          count: 0,
          size: 0,
        };
      }

      acc[file.mimeType].count++;
      acc[file.mimeType].size += file.size;

      return acc;
    }, {} as Record<string, any>);

    const uploaders = files.reduce((acc, file) => {
      if (!acc[file.uploadedBy]) {
        acc[file.uploadedBy] = {
          userId: file.uploadedBy,
          count: 0,
          size: 0,
        };
      }

      acc[file.uploadedBy].count++;
      acc[file.uploadedBy].size += file.size;

      return acc;
    }, {} as Record<string, any>);

    return {
      totalFiles,
      totalSize,
      averageFileSize: totalFiles > 0 ? Math.round(totalSize / totalFiles) : 0,
      byCategory,
      byMimeType,
      topUploaders: Object.values(uploaders)
        .sort((a: any, b: any) => b.count - a.count)
        .slice(0, 5),
    };
  }

  async getLargestFiles(projectId: string, limit: number = 10): Promise<any[]> {
    return this.prisma.projectFile.findMany({
      where: { projectId },
      include: {
        uploader: true,
      },
      orderBy: { size: 'desc' },
      take: limit,
    });
  }

  async getFileUploadActivity(
    projectId: string,
    filters?: {
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<any> {
    const files = await this.prisma.projectFile.findMany({
      where: {
        projectId,
        ...(filters?.startDate || filters?.endDate ? {
          createdAt: {
            ...(filters.startDate && { gte: filters.startDate }),
            ...(filters.endDate && { lte: filters.endDate }),
          },
        } : {}),
      },
      include: {
        uploader: true,
      },
    });

    const byDate = files.reduce((acc, file) => {
      const dateKey = file.createdAt.toISOString().split('T')[0];

      if (!acc[dateKey]) {
        acc[dateKey] = {
          date: dateKey,
          count: 0,
          size: 0,
          files: [],
        };
      }

      acc[dateKey].count++;
      acc[dateKey].size += file.size;
      acc[dateKey].files.push(file);

      return acc;
    }, {} as Record<string, any>);

    return Object.values(byDate).sort(
      (a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }

  // ========================================
  // SEARCH
  // ========================================

  async searchFiles(
    projectId: string,
    query: string,
    filters?: FileSearchFilters
  ): Promise<any[]> {
    const searchLower = query.toLowerCase();

    const files = await this.listFiles(projectId, filters);

    return files.filter(file => {
      const filenameMatch = file.filename.toLowerCase().includes(searchLower);
      const descriptionMatch = file.description?.toLowerCase().includes(searchLower);
      const tagMatch = file.tags.some((tag: string) =>
        tag.toLowerCase().includes(searchLower)
      );

      return filenameMatch || descriptionMatch || tagMatch;
    });
  }

  async duplicateCheck(
    projectId: string,
    filename: string,
    size: number
  ): Promise<any[]> {
    return this.prisma.projectFile.findMany({
      where: {
        projectId,
        filename,
        size,
      },
      include: {
        uploader: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ========================================
  // EXPORT
  // ========================================

  async exportFileList(
    projectId: string,
    filters?: FileSearchFilters
  ): Promise<string> {
    const files = await this.listFiles(projectId, filters);

    let csv = 'Filename,Category,Size (bytes),MIME Type,Uploaded By,Upload Date,Tags,Description\n';

    for (const file of files) {
      const uploaderName = `${file.uploader.firstName} ${file.uploader.lastName}`;
      const tags = file.tags.join('; ');

      const row = [
        file.filename,
        file.category,
        file.size,
        file.mimeType,
        uploaderName,
        file.createdAt.toISOString().split('T')[0],
        tags,
        file.description || '',
      ];

      csv += row.map(v => `"${v}"`).join(',') + '\n';
    }

    return csv;
  }
}
