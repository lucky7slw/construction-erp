import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { PrismaClient } from '../../generated/prisma';
import { setupTestDatabase, cleanupTestDatabase } from '../../test-helpers/database';
import { FilesService } from './files.service';

describe('FilesService', () => {
  let prisma: PrismaClient;
  let service: FilesService;
  let testUser: any;
  let testUser2: any;
  let testCompany: any;
  let testProject: any;

  beforeAll(async () => {
    prisma = await setupTestDatabase();
    service = new FilesService(prisma);

    await cleanupTestDatabase(prisma);

    testCompany = await prisma.company.create({
      data: {
        name: 'Test Construction Co',
        email: 'test@construction.com',
        phone: '555-0100',
      },
    });

    testUser = await prisma.user.create({
      data: {
        email: 'uploader@test.com',
        password: 'hashedpassword',
        firstName: 'File',
        lastName: 'Uploader',
      },
    });

    testUser2 = await prisma.user.create({
      data: {
        email: 'uploader2@test.com',
        password: 'hashedpassword',
        firstName: 'Second',
        lastName: 'Uploader',
      },
    });

    await prisma.companyUser.create({
      data: {
        userId: testUser.id,
        companyId: testCompany.id,
        isOwner: true,
      },
    });

    testProject = await prisma.project.create({
      data: {
        name: 'File Management Project',
        companyId: testCompany.id,
        createdById: testUser.id,
        status: 'ACTIVE',
      },
    });
  });

  afterEach(async () => {
    await prisma.projectFile.deleteMany({});
  });

  describe('uploadFile', () => {
    it('should upload file with all metadata', async () => {
      const file = await service.uploadFile({
        projectId: testProject.id,
        category: 'PHOTO',
        filename: 'site-photo-001.jpg',
        fileUrl: 'minio://bucket/projects/site-photo-001.jpg',
        mimeType: 'image/jpeg',
        size: 2048000,
        tags: ['exterior', 'progress'],
        location: '{"lat": 40.7128, "lng": -74.0060}',
        takenAt: new Date('2025-01-15T10:30:00Z'),
        uploadedBy: testUser.id,
        description: 'Foundation progress photo',
      });

      expect(file.filename).toBe('site-photo-001.jpg');
      expect(file.category).toBe('PHOTO');
      expect(file.size).toBe(2048000);
      expect(file.tags).toEqual(['exterior', 'progress']);
      expect(file.location).toBe('{"lat": 40.7128, "lng": -74.0060}');
      expect(file.description).toBe('Foundation progress photo');
    });

    it('should upload file with minimal metadata', async () => {
      const file = await service.uploadFile({
        projectId: testProject.id,
        category: 'INVOICE',
        filename: 'invoice-2025-01.pdf',
        fileUrl: 'minio://bucket/projects/invoice-2025-01.pdf',
        mimeType: 'application/pdf',
        size: 512000,
        uploadedBy: testUser.id,
      });

      expect(file.filename).toBe('invoice-2025-01.pdf');
      expect(file.tags).toEqual([]);
      expect(file.description).toBeNull();
    });
  });

  describe('listFiles', () => {
    it('should list all files for project', async () => {
      await service.uploadFile({
        projectId: testProject.id,
        category: 'PHOTO',
        filename: 'photo1.jpg',
        fileUrl: 'minio://bucket/photo1.jpg',
        mimeType: 'image/jpeg',
        size: 1024000,
        uploadedBy: testUser.id,
      });

      await service.uploadFile({
        projectId: testProject.id,
        category: 'CONTRACT',
        filename: 'contract.pdf',
        fileUrl: 'minio://bucket/contract.pdf',
        mimeType: 'application/pdf',
        size: 2048000,
        uploadedBy: testUser.id,
      });

      const files = await service.listFiles(testProject.id);

      expect(files.length).toBe(2);
    });

    it('should filter files by category', async () => {
      await service.uploadFile({
        projectId: testProject.id,
        category: 'PHOTO',
        filename: 'photo1.jpg',
        fileUrl: 'minio://bucket/photo1.jpg',
        mimeType: 'image/jpeg',
        size: 1024000,
        uploadedBy: testUser.id,
      });

      await service.uploadFile({
        projectId: testProject.id,
        category: 'CONTRACT',
        filename: 'contract.pdf',
        fileUrl: 'minio://bucket/contract.pdf',
        mimeType: 'application/pdf',
        size: 2048000,
        uploadedBy: testUser.id,
      });

      const photos = await service.listFiles(testProject.id, {
        category: 'PHOTO',
      });

      expect(photos.length).toBe(1);
      expect(photos[0].category).toBe('PHOTO');
    });

    it('should filter files by tags', async () => {
      await service.uploadFile({
        projectId: testProject.id,
        category: 'PHOTO',
        filename: 'photo1.jpg',
        fileUrl: 'minio://bucket/photo1.jpg',
        mimeType: 'image/jpeg',
        size: 1024000,
        tags: ['exterior', 'progress'],
        uploadedBy: testUser.id,
      });

      await service.uploadFile({
        projectId: testProject.id,
        category: 'PHOTO',
        filename: 'photo2.jpg',
        fileUrl: 'minio://bucket/photo2.jpg',
        mimeType: 'image/jpeg',
        size: 1024000,
        tags: ['interior', 'finishes'],
        uploadedBy: testUser.id,
      });

      const exteriorPhotos = await service.listFiles(testProject.id, {
        tags: ['exterior'],
      });

      expect(exteriorPhotos.length).toBe(1);
      expect(exteriorPhotos[0].tags).toContain('exterior');
    });
  });

  describe('updateFileMetadata', () => {
    it('should update file metadata', async () => {
      const file = await service.uploadFile({
        projectId: testProject.id,
        category: 'PHOTO',
        filename: 'original.jpg',
        fileUrl: 'minio://bucket/original.jpg',
        mimeType: 'image/jpeg',
        size: 1024000,
        uploadedBy: testUser.id,
      });

      const updated = await service.updateFileMetadata(file.id, {
        filename: 'renamed.jpg',
        category: 'REPORT',
        tags: ['updated', 'review'],
        description: 'Updated description',
      });

      expect(updated.filename).toBe('renamed.jpg');
      expect(updated.category).toBe('REPORT');
      expect(updated.tags).toEqual(['updated', 'review']);
      expect(updated.description).toBe('Updated description');
    });
  });

  describe('uploadBatch', () => {
    it('should upload multiple files at once', async () => {
      const files = await service.uploadBatch([
        {
          projectId: testProject.id,
          category: 'PHOTO',
          filename: 'photo1.jpg',
          fileUrl: 'minio://bucket/photo1.jpg',
          mimeType: 'image/jpeg',
          size: 1024000,
          uploadedBy: testUser.id,
        },
        {
          projectId: testProject.id,
          category: 'PHOTO',
          filename: 'photo2.jpg',
          fileUrl: 'minio://bucket/photo2.jpg',
          mimeType: 'image/jpeg',
          size: 1024000,
          uploadedBy: testUser.id,
        },
        {
          projectId: testProject.id,
          category: 'PHOTO',
          filename: 'photo3.jpg',
          fileUrl: 'minio://bucket/photo3.jpg',
          mimeType: 'image/jpeg',
          size: 1024000,
          uploadedBy: testUser.id,
        },
      ]);

      expect(files.length).toBe(3);
      expect(files.every(f => f.category === 'PHOTO')).toBe(true);
    });
  });

  describe('addTagsToFiles', () => {
    it('should add tags to multiple files', async () => {
      const file1 = await service.uploadFile({
        projectId: testProject.id,
        category: 'PHOTO',
        filename: 'photo1.jpg',
        fileUrl: 'minio://bucket/photo1.jpg',
        mimeType: 'image/jpeg',
        size: 1024000,
        tags: ['existing'],
        uploadedBy: testUser.id,
      });

      const file2 = await service.uploadFile({
        projectId: testProject.id,
        category: 'PHOTO',
        filename: 'photo2.jpg',
        fileUrl: 'minio://bucket/photo2.jpg',
        mimeType: 'image/jpeg',
        size: 1024000,
        uploadedBy: testUser.id,
      });

      await service.addTagsToFiles([file1.id, file2.id], ['new-tag', 'batch']);

      const updated1 = await service.getFile(file1.id);
      const updated2 = await service.getFile(file2.id);

      expect(updated1.tags).toContain('existing');
      expect(updated1.tags).toContain('new-tag');
      expect(updated1.tags).toContain('batch');
      expect(updated2.tags).toContain('new-tag');
      expect(updated2.tags).toContain('batch');
    });
  });

  describe('removeTagsFromFiles', () => {
    it('should remove tags from multiple files', async () => {
      const file1 = await service.uploadFile({
        projectId: testProject.id,
        category: 'PHOTO',
        filename: 'photo1.jpg',
        fileUrl: 'minio://bucket/photo1.jpg',
        mimeType: 'image/jpeg',
        size: 1024000,
        tags: ['tag1', 'tag2', 'tag3'],
        uploadedBy: testUser.id,
      });

      await service.removeTagsFromFiles([file1.id], ['tag2']);

      const updated = await service.getFile(file1.id);

      expect(updated.tags).toContain('tag1');
      expect(updated.tags).not.toContain('tag2');
      expect(updated.tags).toContain('tag3');
    });
  });

  describe('getFilesByCategory', () => {
    it('should group files by category', async () => {
      await service.uploadFile({
        projectId: testProject.id,
        category: 'PHOTO',
        filename: 'photo1.jpg',
        fileUrl: 'minio://bucket/photo1.jpg',
        mimeType: 'image/jpeg',
        size: 1024000,
        uploadedBy: testUser.id,
      });

      await service.uploadFile({
        projectId: testProject.id,
        category: 'PHOTO',
        filename: 'photo2.jpg',
        fileUrl: 'minio://bucket/photo2.jpg',
        mimeType: 'image/jpeg',
        size: 2048000,
        uploadedBy: testUser.id,
      });

      await service.uploadFile({
        projectId: testProject.id,
        category: 'CONTRACT',
        filename: 'contract.pdf',
        fileUrl: 'minio://bucket/contract.pdf',
        mimeType: 'application/pdf',
        size: 512000,
        uploadedBy: testUser.id,
      });

      const byCategory = await service.getFilesByCategory(testProject.id);

      const photoCategory = byCategory.find((c: any) => c.category === 'PHOTO');
      expect(photoCategory.count).toBe(2);
      expect(photoCategory.totalSize).toBe(3072000);
    });
  });

  describe('getFilesByTag', () => {
    it('should group files by tag', async () => {
      await service.uploadFile({
        projectId: testProject.id,
        category: 'PHOTO',
        filename: 'photo1.jpg',
        fileUrl: 'minio://bucket/photo1.jpg',
        mimeType: 'image/jpeg',
        size: 1024000,
        tags: ['exterior', 'progress'],
        uploadedBy: testUser.id,
      });

      await service.uploadFile({
        projectId: testProject.id,
        category: 'PHOTO',
        filename: 'photo2.jpg',
        fileUrl: 'minio://bucket/photo2.jpg',
        mimeType: 'image/jpeg',
        size: 2048000,
        tags: ['exterior', 'final'],
        uploadedBy: testUser.id,
      });

      const byTag = await service.getFilesByTag(testProject.id);

      const exteriorTag = byTag.find((t: any) => t.tag === 'exterior');
      expect(exteriorTag.count).toBe(2);
    });
  });

  describe('getRecentFiles', () => {
    it('should get most recent files', async () => {
      await service.uploadFile({
        projectId: testProject.id,
        category: 'PHOTO',
        filename: 'old.jpg',
        fileUrl: 'minio://bucket/old.jpg',
        mimeType: 'image/jpeg',
        size: 1024000,
        uploadedBy: testUser.id,
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      await service.uploadFile({
        projectId: testProject.id,
        category: 'PHOTO',
        filename: 'new.jpg',
        fileUrl: 'minio://bucket/new.jpg',
        mimeType: 'image/jpeg',
        size: 1024000,
        uploadedBy: testUser.id,
      });

      const recent = await service.getRecentFiles(testProject.id, 5);

      expect(recent.length).toBe(2);
      expect(recent[0].filename).toBe('new.jpg');
    });
  });

  describe('getPhotoGallery', () => {
    it('should get all photos', async () => {
      await service.uploadFile({
        projectId: testProject.id,
        category: 'PHOTO',
        filename: 'photo1.jpg',
        fileUrl: 'minio://bucket/photo1.jpg',
        mimeType: 'image/jpeg',
        size: 1024000,
        takenAt: new Date('2025-01-15'),
        uploadedBy: testUser.id,
      });

      await service.uploadFile({
        projectId: testProject.id,
        category: 'CONTRACT',
        filename: 'contract.pdf',
        fileUrl: 'minio://bucket/contract.pdf',
        mimeType: 'application/pdf',
        size: 512000,
        uploadedBy: testUser.id,
      });

      const photos = await service.getPhotoGallery(testProject.id);

      expect(photos.length).toBe(1);
      expect(photos[0].category).toBe('PHOTO');
    });

    it('should filter photos by date', async () => {
      await service.uploadFile({
        projectId: testProject.id,
        category: 'PHOTO',
        filename: 'old-photo.jpg',
        fileUrl: 'minio://bucket/old-photo.jpg',
        mimeType: 'image/jpeg',
        size: 1024000,
        takenAt: new Date('2025-01-01'),
        uploadedBy: testUser.id,
      });

      await service.uploadFile({
        projectId: testProject.id,
        category: 'PHOTO',
        filename: 'new-photo.jpg',
        fileUrl: 'minio://bucket/new-photo.jpg',
        mimeType: 'image/jpeg',
        size: 1024000,
        takenAt: new Date('2025-01-20'),
        uploadedBy: testUser.id,
      });

      const photos = await service.getPhotoGallery(testProject.id, {
        startDate: new Date('2025-01-15'),
      });

      expect(photos.length).toBe(1);
      expect(photos[0].filename).toBe('new-photo.jpg');
    });
  });

  describe('getProjectStorageStats', () => {
    it('should calculate storage statistics', async () => {
      await service.uploadFile({
        projectId: testProject.id,
        category: 'PHOTO',
        filename: 'photo1.jpg',
        fileUrl: 'minio://bucket/photo1.jpg',
        mimeType: 'image/jpeg',
        size: 1024000,
        uploadedBy: testUser.id,
      });

      await service.uploadFile({
        projectId: testProject.id,
        category: 'PHOTO',
        filename: 'photo2.jpg',
        fileUrl: 'minio://bucket/photo2.jpg',
        mimeType: 'image/jpeg',
        size: 2048000,
        uploadedBy: testUser2.id,
      });

      await service.uploadFile({
        projectId: testProject.id,
        category: 'CONTRACT',
        filename: 'contract.pdf',
        fileUrl: 'minio://bucket/contract.pdf',
        mimeType: 'application/pdf',
        size: 512000,
        uploadedBy: testUser.id,
      });

      const stats = await service.getProjectStorageStats(testProject.id);

      expect(stats.totalFiles).toBe(3);
      expect(stats.totalSize).toBe(3584000);
      expect(stats.averageFileSize).toBe(1194667);
      expect(stats.byCategory.PHOTO.count).toBe(2);
      expect(stats.byCategory.CONTRACT.count).toBe(1);
      expect(stats.topUploaders.length).toBe(2);
    });
  });

  describe('getLargestFiles', () => {
    it('should get largest files', async () => {
      await service.uploadFile({
        projectId: testProject.id,
        category: 'PHOTO',
        filename: 'small.jpg',
        fileUrl: 'minio://bucket/small.jpg',
        mimeType: 'image/jpeg',
        size: 512000,
        uploadedBy: testUser.id,
      });

      await service.uploadFile({
        projectId: testProject.id,
        category: 'PHOTO',
        filename: 'large.jpg',
        fileUrl: 'minio://bucket/large.jpg',
        mimeType: 'image/jpeg',
        size: 5120000,
        uploadedBy: testUser.id,
      });

      const largest = await service.getLargestFiles(testProject.id, 5);

      expect(largest.length).toBe(2);
      expect(largest[0].filename).toBe('large.jpg');
      expect(largest[0].size).toBe(5120000);
    });
  });

  describe('searchFiles', () => {
    it('should search files by filename', async () => {
      await service.uploadFile({
        projectId: testProject.id,
        category: 'PHOTO',
        filename: 'foundation-progress.jpg',
        fileUrl: 'minio://bucket/foundation-progress.jpg',
        mimeType: 'image/jpeg',
        size: 1024000,
        uploadedBy: testUser.id,
      });

      await service.uploadFile({
        projectId: testProject.id,
        category: 'PHOTO',
        filename: 'framing-complete.jpg',
        fileUrl: 'minio://bucket/framing-complete.jpg',
        mimeType: 'image/jpeg',
        size: 1024000,
        uploadedBy: testUser.id,
      });

      const results = await service.searchFiles(testProject.id, 'foundation');

      expect(results.length).toBe(1);
      expect(results[0].filename).toBe('foundation-progress.jpg');
    });

    it('should search files by description', async () => {
      await service.uploadFile({
        projectId: testProject.id,
        category: 'PHOTO',
        filename: 'photo1.jpg',
        fileUrl: 'minio://bucket/photo1.jpg',
        mimeType: 'image/jpeg',
        size: 1024000,
        description: 'Foundation work in progress',
        uploadedBy: testUser.id,
      });

      const results = await service.searchFiles(testProject.id, 'foundation');

      expect(results.length).toBe(1);
    });

    it('should search files by tags', async () => {
      await service.uploadFile({
        projectId: testProject.id,
        category: 'PHOTO',
        filename: 'photo1.jpg',
        fileUrl: 'minio://bucket/photo1.jpg',
        mimeType: 'image/jpeg',
        size: 1024000,
        tags: ['foundation', 'progress'],
        uploadedBy: testUser.id,
      });

      const results = await service.searchFiles(testProject.id, 'foundation');

      expect(results.length).toBe(1);
    });
  });

  describe('duplicateCheck', () => {
    it('should find duplicate files', async () => {
      await service.uploadFile({
        projectId: testProject.id,
        category: 'PHOTO',
        filename: 'duplicate.jpg',
        fileUrl: 'minio://bucket/duplicate1.jpg',
        mimeType: 'image/jpeg',
        size: 1024000,
        uploadedBy: testUser.id,
      });

      await service.uploadFile({
        projectId: testProject.id,
        category: 'PHOTO',
        filename: 'duplicate.jpg',
        fileUrl: 'minio://bucket/duplicate2.jpg',
        mimeType: 'image/jpeg',
        size: 1024000,
        uploadedBy: testUser.id,
      });

      const duplicates = await service.duplicateCheck(
        testProject.id,
        'duplicate.jpg',
        1024000
      );

      expect(duplicates.length).toBe(2);
    });
  });

  describe('exportFileList', () => {
    it('should export file list as CSV', async () => {
      await service.uploadFile({
        projectId: testProject.id,
        category: 'PHOTO',
        filename: 'photo1.jpg',
        fileUrl: 'minio://bucket/photo1.jpg',
        mimeType: 'image/jpeg',
        size: 1024000,
        tags: ['exterior', 'progress'],
        description: 'Site progress',
        uploadedBy: testUser.id,
      });

      const csv = await service.exportFileList(testProject.id);

      expect(csv).toContain('Filename,Category,Size');
      expect(csv).toContain('photo1.jpg');
      expect(csv).toContain('PHOTO');
      expect(csv).toContain('exterior; progress');
    });
  });

  describe('deleteFile', () => {
    it('should delete file', async () => {
      const file = await service.uploadFile({
        projectId: testProject.id,
        category: 'PHOTO',
        filename: 'to-delete.jpg',
        fileUrl: 'minio://bucket/to-delete.jpg',
        mimeType: 'image/jpeg',
        size: 1024000,
        uploadedBy: testUser.id,
      });

      await service.deleteFile(file.id);

      const files = await service.listFiles(testProject.id);
      expect(files.length).toBe(0);
    });
  });

  describe('deleteBatch', () => {
    it('should delete multiple files', async () => {
      const file1 = await service.uploadFile({
        projectId: testProject.id,
        category: 'PHOTO',
        filename: 'file1.jpg',
        fileUrl: 'minio://bucket/file1.jpg',
        mimeType: 'image/jpeg',
        size: 1024000,
        uploadedBy: testUser.id,
      });

      const file2 = await service.uploadFile({
        projectId: testProject.id,
        category: 'PHOTO',
        filename: 'file2.jpg',
        fileUrl: 'minio://bucket/file2.jpg',
        mimeType: 'image/jpeg',
        size: 1024000,
        uploadedBy: testUser.id,
      });

      await service.deleteBatch([file1.id, file2.id]);

      const files = await service.listFiles(testProject.id);
      expect(files.length).toBe(0);
    });
  });
});
