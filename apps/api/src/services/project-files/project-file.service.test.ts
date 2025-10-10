import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { PrismaClient, FileCategory } from '../../generated/prisma';
import { ProjectFileService } from './project-file.service';
import { setupTestDatabase, cleanupTestDatabase } from '../../test-helpers/database';
import { createTestCompany, createTestUser, createTestProject } from '../../test-helpers/factories';

describe('ProjectFileService', () => {
  let prisma: PrismaClient;
  let service: ProjectFileService;
  let testCompany: any;
  let testUser: any;
  let testProject: any;

  beforeAll(async () => {
    prisma = await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase(prisma);
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    testCompany = await createTestCompany(prisma, {
      name: 'Test Construction Co',
    });
    testUser = await createTestUser(prisma, {
      email: `test-${Date.now()}@test.com`,
      firstName: 'Test',
      lastName: 'User',
      companyId: testCompany.id,
    });
    testProject = await createTestProject(prisma, {
      name: 'Test Project',
      companyId: testCompany.id,
      createdById: testUser.id,
    });

    service = new ProjectFileService(prisma);
  });

  afterEach(async () => {
    await cleanupTestDatabase(prisma);
  });

  describe('uploadFile', () => {
    it('should upload a basic file', async () => {
      const file = await service.uploadFile(
        {
          projectId: testProject.id,
          category: 'PHOTO',
          filename: 'site-photo.jpg',
          fileUrl: '/files/site-photo.jpg',
          mimeType: 'image/jpeg',
          size: 1024000,
        },
        testUser.id
      );

      expect(file.id).toBeDefined();
      expect(file.filename).toBe('site-photo.jpg');
      expect(file.category).toBe('PHOTO');
      expect(file.size).toBe(1024000);
      expect(file.uploadedBy).toBe(testUser.id);
      expect(file.uploader.firstName).toBe('Test');
    });

    it('should upload file with tags and description', async () => {
      const file = await service.uploadFile(
        {
          projectId: testProject.id,
          category: 'DRAWING',
          filename: 'floor-plan.pdf',
          fileUrl: '/files/floor-plan.pdf',
          mimeType: 'application/pdf',
          size: 2048000,
          tags: ['floor-plan', 'approved', 'v2'],
          description: 'Updated floor plan with client revisions',
        },
        testUser.id
      );

      expect(file.tags).toEqual(['floor-plan', 'approved', 'v2']);
      expect(file.description).toBe('Updated floor plan with client revisions');
    });

    it('should upload file with GPS location', async () => {
      const file = await service.uploadFile(
        {
          projectId: testProject.id,
          category: 'PHOTO',
          filename: 'foundation.jpg',
          fileUrl: '/files/foundation.jpg',
          mimeType: 'image/jpeg',
          size: 1500000,
          location: {
            latitude: 40.7128,
            longitude: -74.006,
            altitude: 10,
          },
          takenAt: new Date('2025-10-01T10:30:00Z'),
        },
        testUser.id
      );

      expect(file.location).toBeDefined();
      const location = JSON.parse(file.location!);
      expect(location.latitude).toBe(40.7128);
      expect(location.longitude).toBe(-74.006);
      expect(location.altitude).toBe(10);
      expect(file.takenAt).toEqual(new Date('2025-10-01T10:30:00Z'));
    });

    it('should throw error if project not found', async () => {
      await expect(
        service.uploadFile(
          {
            projectId: 'invalid-id',
            category: 'PHOTO',
            filename: 'test.jpg',
            fileUrl: '/files/test.jpg',
            mimeType: 'image/jpeg',
            size: 1000,
          },
          testUser.id
        )
      ).rejects.toThrow('Project not found');
    });
  });

  describe('getFile', () => {
    it('should get file by id', async () => {
      const uploaded = await service.uploadFile(
        {
          projectId: testProject.id,
          category: 'CONTRACT',
          filename: 'contract.pdf',
          fileUrl: '/files/contract.pdf',
          mimeType: 'application/pdf',
          size: 500000,
        },
        testUser.id
      );

      const file = await service.getFile(uploaded.id);

      expect(file.id).toBe(uploaded.id);
      expect(file.filename).toBe('contract.pdf');
      expect(file.project.name).toBe('Test Project');
      expect(file.uploader.email).toBe(testUser.email);
    });

    it('should throw error if file not found', async () => {
      await expect(service.getFile('invalid-id')).rejects.toThrow('File not found');
    });
  });

  describe('updateFile', () => {
    it('should update file tags and description', async () => {
      const uploaded = await service.uploadFile(
        {
          projectId: testProject.id,
          category: 'REPORT',
          filename: 'progress-report.pdf',
          fileUrl: '/files/report.pdf',
          mimeType: 'application/pdf',
          size: 300000,
        },
        testUser.id
      );

      const updated = await service.updateFile(uploaded.id, {
        tags: ['weekly', 'progress', 'week-10'],
        description: 'Week 10 progress report',
      });

      expect(updated.tags).toEqual(['weekly', 'progress', 'week-10']);
      expect(updated.description).toBe('Week 10 progress report');
    });

    it('should update file category', async () => {
      const uploaded = await service.uploadFile(
        {
          projectId: testProject.id,
          category: 'OTHER',
          filename: 'document.pdf',
          fileUrl: '/files/doc.pdf',
          mimeType: 'application/pdf',
          size: 200000,
        },
        testUser.id
      );

      const updated = await service.updateFile(uploaded.id, {
        category: 'PERMIT',
      });

      expect(updated.category).toBe('PERMIT');
    });
  });

  describe('deleteFile', () => {
    it('should delete file', async () => {
      const uploaded = await service.uploadFile(
        {
          projectId: testProject.id,
          category: 'PHOTO',
          filename: 'temp-photo.jpg',
          fileUrl: '/files/temp.jpg',
          mimeType: 'image/jpeg',
          size: 100000,
        },
        testUser.id
      );

      const result = await service.deleteFile(uploaded.id);

      expect(result.success).toBe(true);

      await expect(service.getFile(uploaded.id)).rejects.toThrow('File not found');
    });
  });

  describe('getProjectFiles', () => {
    beforeEach(async () => {
      // Upload multiple files for filtering tests
      await service.uploadFile(
        {
          projectId: testProject.id,
          category: 'PHOTO',
          filename: 'photo1.jpg',
          fileUrl: '/files/photo1.jpg',
          mimeType: 'image/jpeg',
          size: 100000,
          tags: ['exterior', 'progress'],
        },
        testUser.id
      );

      await service.uploadFile(
        {
          projectId: testProject.id,
          category: 'PHOTO',
          filename: 'photo2.jpg',
          fileUrl: '/files/photo2.jpg',
          mimeType: 'image/jpeg',
          size: 150000,
          tags: ['interior', 'progress'],
        },
        testUser.id
      );

      await service.uploadFile(
        {
          projectId: testProject.id,
          category: 'DRAWING',
          filename: 'plan.pdf',
          fileUrl: '/files/plan.pdf',
          mimeType: 'application/pdf',
          size: 500000,
          tags: ['approved'],
        },
        testUser.id
      );
    });

    it('should get all project files', async () => {
      const files = await service.getProjectFiles(testProject.id);

      expect(files).toHaveLength(3);
      expect(files[0].filename).toBe('plan.pdf'); // Most recent first
    });

    it('should filter by category', async () => {
      const photos = await service.getProjectFiles(testProject.id, {
        category: 'PHOTO',
      });

      expect(photos).toHaveLength(2);
      expect(photos.every((f) => f.category === 'PHOTO')).toBe(true);
    });

    it('should filter by tags', async () => {
      const progressFiles = await service.getProjectFiles(testProject.id, {
        tags: ['progress'],
      });

      expect(progressFiles).toHaveLength(2);
      expect(progressFiles.every((f) => f.tags.includes('progress'))).toBe(true);
    });

    it('should filter by uploader', async () => {
      const files = await service.getProjectFiles(testProject.id, {
        uploadedBy: testUser.id,
      });

      expect(files).toHaveLength(3);
    });

    it('should search by filename', async () => {
      const files = await service.getProjectFiles(testProject.id, {
        searchTerm: 'photo',
      });

      expect(files).toHaveLength(2);
    });

    it('should filter by date range', async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const files = await service.getProjectFiles(testProject.id, {
        startDate: yesterday,
        endDate: now,
      });

      expect(files).toHaveLength(3);
    });
  });

  describe('getFilesByCategory', () => {
    it('should get files by category', async () => {
      await service.uploadFile(
        {
          projectId: testProject.id,
          category: 'PERMIT',
          filename: 'building-permit.pdf',
          fileUrl: '/files/permit.pdf',
          mimeType: 'application/pdf',
          size: 200000,
        },
        testUser.id
      );

      const permits = await service.getFilesByCategory(testProject.id, 'PERMIT');

      expect(permits).toHaveLength(1);
      expect(permits[0].category).toBe('PERMIT');
    });
  });

  describe('getFilesByTags', () => {
    it('should get files by tags', async () => {
      await service.uploadFile(
        {
          projectId: testProject.id,
          category: 'PHOTO',
          filename: 'site1.jpg',
          fileUrl: '/files/site1.jpg',
          mimeType: 'image/jpeg',
          size: 100000,
          tags: ['foundation', 'week1'],
        },
        testUser.id
      );

      await service.uploadFile(
        {
          projectId: testProject.id,
          category: 'PHOTO',
          filename: 'site2.jpg',
          fileUrl: '/files/site2.jpg',
          mimeType: 'image/jpeg',
          size: 100000,
          tags: ['framing', 'week2'],
        },
        testUser.id
      );

      const foundationFiles = await service.getFilesByTags(testProject.id, ['foundation']);

      expect(foundationFiles).toHaveLength(1);
      expect(foundationFiles[0].filename).toBe('site1.jpg');
    });
  });

  describe('tag management', () => {
    it('should add tags to file', async () => {
      const file = await service.uploadFile(
        {
          projectId: testProject.id,
          category: 'PHOTO',
          filename: 'photo.jpg',
          fileUrl: '/files/photo.jpg',
          mimeType: 'image/jpeg',
          size: 100000,
          tags: ['initial'],
        },
        testUser.id
      );

      const updated = await service.addTags(file.id, ['new-tag', 'another-tag']);

      expect(updated.tags).toHaveLength(3);
      expect(updated.tags).toContain('initial');
      expect(updated.tags).toContain('new-tag');
      expect(updated.tags).toContain('another-tag');
    });

    it('should not add duplicate tags', async () => {
      const file = await service.uploadFile(
        {
          projectId: testProject.id,
          category: 'PHOTO',
          filename: 'photo.jpg',
          fileUrl: '/files/photo.jpg',
          mimeType: 'image/jpeg',
          size: 100000,
          tags: ['tag1', 'tag2'],
        },
        testUser.id
      );

      const updated = await service.addTags(file.id, ['tag1', 'tag3']);

      expect(updated.tags).toHaveLength(3);
      expect(updated.tags.filter((t) => t === 'tag1')).toHaveLength(1);
    });

    it('should remove tags from file', async () => {
      const file = await service.uploadFile(
        {
          projectId: testProject.id,
          category: 'PHOTO',
          filename: 'photo.jpg',
          fileUrl: '/files/photo.jpg',
          mimeType: 'image/jpeg',
          size: 100000,
          tags: ['tag1', 'tag2', 'tag3'],
        },
        testUser.id
      );

      const updated = await service.removeTags(file.id, ['tag2']);

      expect(updated.tags).toHaveLength(2);
      expect(updated.tags).toContain('tag1');
      expect(updated.tags).toContain('tag3');
      expect(updated.tags).not.toContain('tag2');
    });
  });

  describe('bulkDelete', () => {
    it('should delete multiple files', async () => {
      const file1 = await service.uploadFile(
        {
          projectId: testProject.id,
          category: 'PHOTO',
          filename: 'photo1.jpg',
          fileUrl: '/files/photo1.jpg',
          mimeType: 'image/jpeg',
          size: 100000,
        },
        testUser.id
      );

      const file2 = await service.uploadFile(
        {
          projectId: testProject.id,
          category: 'PHOTO',
          filename: 'photo2.jpg',
          fileUrl: '/files/photo2.jpg',
          mimeType: 'image/jpeg',
          size: 100000,
        },
        testUser.id
      );

      const result = await service.bulkDelete([file1.id, file2.id]);

      expect(result.success).toBe(true);
      expect(result.deletedCount).toBe(2);

      await expect(service.getFile(file1.id)).rejects.toThrow('File not found');
      await expect(service.getFile(file2.id)).rejects.toThrow('File not found');
    });

    it('should handle empty array', async () => {
      const result = await service.bulkDelete([]);

      expect(result.success).toBe(true);
      expect(result.deletedCount).toBe(0);
    });
  });

  describe('getProjectFileStats', () => {
    it('should calculate file statistics', async () => {
      await service.uploadFile(
        {
          projectId: testProject.id,
          category: 'PHOTO',
          filename: 'photo1.jpg',
          fileUrl: '/files/photo1.jpg',
          mimeType: 'image/jpeg',
          size: 100000,
        },
        testUser.id
      );

      await service.uploadFile(
        {
          projectId: testProject.id,
          category: 'PHOTO',
          filename: 'photo2.jpg',
          fileUrl: '/files/photo2.jpg',
          mimeType: 'image/jpeg',
          size: 150000,
        },
        testUser.id
      );

      await service.uploadFile(
        {
          projectId: testProject.id,
          category: 'DRAWING',
          filename: 'plan.pdf',
          fileUrl: '/files/plan.pdf',
          mimeType: 'application/pdf',
          size: 500000,
        },
        testUser.id
      );

      const stats = await service.getProjectFileStats(testProject.id);

      expect(stats.totalFiles).toBe(3);
      expect(stats.totalSize).toBe(750000);
      expect(stats.byCategory['PHOTO']).toBe(2);
      expect(stats.byCategory['DRAWING']).toBe(1);
      expect(stats.byMimeType['image/jpeg']).toBe(2);
      expect(stats.byMimeType['application/pdf']).toBe(1);
    });
  });

  describe('getRecentFiles', () => {
    it('should get recent files with limit', async () => {
      // Upload 5 files
      for (let i = 1; i <= 5; i++) {
        await service.uploadFile(
          {
            projectId: testProject.id,
            category: 'PHOTO',
            filename: `photo${i}.jpg`,
            fileUrl: `/files/photo${i}.jpg`,
            mimeType: 'image/jpeg',
            size: 100000,
          },
          testUser.id
        );
      }

      const recent = await service.getRecentFiles(testProject.id, 3);

      expect(recent).toHaveLength(3);
      expect(recent[0].filename).toBe('photo5.jpg'); // Most recent
      expect(recent[2].filename).toBe('photo3.jpg');
    });
  });

  describe('searchFiles', () => {
    it('should search files by term', async () => {
      await service.uploadFile(
        {
          projectId: testProject.id,
          category: 'PHOTO',
          filename: 'foundation-progress.jpg',
          fileUrl: '/files/foundation.jpg',
          mimeType: 'image/jpeg',
          size: 100000,
          description: 'Foundation complete',
        },
        testUser.id
      );

      await service.uploadFile(
        {
          projectId: testProject.id,
          category: 'PHOTO',
          filename: 'framing-start.jpg',
          fileUrl: '/files/framing.jpg',
          mimeType: 'image/jpeg',
          size: 100000,
          description: 'Starting framing work',
        },
        testUser.id
      );

      const foundationFiles = await service.searchFiles(testProject.id, 'foundation');

      expect(foundationFiles).toHaveLength(1);
      expect(foundationFiles[0].filename).toBe('foundation-progress.jpg');
    });

    it('should search in description', async () => {
      await service.uploadFile(
        {
          projectId: testProject.id,
          category: 'PHOTO',
          filename: 'site.jpg',
          fileUrl: '/files/site.jpg',
          mimeType: 'image/jpeg',
          size: 100000,
          description: 'Electrical rough-in complete',
        },
        testUser.id
      );

      const files = await service.searchFiles(testProject.id, 'electrical');

      expect(files).toHaveLength(1);
    });
  });
});
