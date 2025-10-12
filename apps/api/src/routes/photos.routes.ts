import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { PrismaClient } from '../generated/prisma';
import { fileStorage } from '../lib/file-storage';
import sharp from 'sharp';

interface PhotoRoutesOptions {
  prisma: PrismaClient;
}

export default async function photosRoutes(fastify: FastifyInstance, options: PhotoRoutesOptions) {
  const { prisma } = options;

  // Upload photo
  fastify.post<{
    Params: { projectId: string };
  }>('/projects/:projectId/photos', async (request, reply) => {
    const { projectId } = request.params;
    const userId = (request as any).user?.userId;
    const data = await request.file();

    if (!data) {
      return reply.code(400).send({ error: 'No file uploaded' });
    }

    const buffer = await data.toBuffer();
    
    // Extract EXIF data
    const metadata = await sharp(buffer).metadata();
    
    // Upload to storage
    const filename = `${Date.now()}-${data.filename}`;
    const fileUrl = await fileStorage.uploadFile(buffer, `photos/${projectId}/${filename}`);

    // Create photo record
    const photo = await prisma.projectFile.create({
      data: {
        projectId,
        category: 'PHOTO',
        filename: data.filename,
        fileUrl,
        mimeType: data.mimetype,
        size: buffer.length,
        uploadedBy: userId,
        takenAt: new Date(),
      },
    });

    return reply.send(photo);
  });

  // Get project photos
  fastify.get<{
    Params: { projectId: string };
  }>('/projects/:projectId/photos', async (request, reply) => {
    const { projectId } = request.params;

    const photos = await prisma.projectFile.findMany({
      where: {
        projectId,
        category: 'PHOTO',
      },
      include: {
        uploader: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        annotations: true,
        comments: {
          include: {
            creator: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return reply.send(photos);
  });

  // Add annotation
  fastify.post<{
    Params: { photoId: string };
    Body: { type: string; data: any };
  }>('/photos/:photoId/annotations', async (request, reply) => {
    const { photoId } = request.params;
    const { type, data } = request.body;
    const userId = (request as any).user?.userId;

    const annotation = await prisma.photoAnnotation.create({
      data: {
        fileId: photoId,
        type,
        data,
        createdBy: userId,
      },
    });

    return reply.send(annotation);
  });

  // Add comment
  fastify.post<{
    Params: { photoId: string };
    Body: { content: string };
  }>('/photos/:photoId/comments', async (request, reply) => {
    const { photoId } = request.params;
    const { content } = request.body;
    const userId = (request as any).user?.userId;

    const comment = await prisma.photoComment.create({
      data: {
        fileId: photoId,
        content,
        createdBy: userId,
      },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return reply.send(comment);
  });

  // Search photos
  fastify.get('/photos/search', async (request, reply) => {
    const { q, projectId } = request.query as { q?: string; projectId?: string };

    const photos = await prisma.projectFile.findMany({
      where: {
        category: 'PHOTO',
        ...(projectId && { projectId }),
        ...(q && {
          OR: [
            { filename: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
            { tags: { has: q } },
          ],
        }),
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        uploader: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return reply.send(photos);
  });
}
