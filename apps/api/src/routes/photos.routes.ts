import type { FastifyPluginAsync } from 'fastify';
import type { PrismaClient } from '../generated/prisma';

type PhotosRoutesOptions = {
  prisma: PrismaClient;
};

export const photosRoutes: FastifyPluginAsync<PhotosRoutesOptions> = async (
  fastify,
  options
) => {
  const { prisma } = options;

  // GET /api/v1/photos - List photos for a project
  fastify.get<{
    Querystring: {
      projectId: string;
      tag?: string;
    };
  }>('/', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['Photos'],
      summary: 'List project photos',
      querystring: {
        type: 'object',
        required: ['projectId'],
        properties: {
          projectId: { type: 'string' },
          tag: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    // Verify project access
    const project = await prisma.project.findFirst({
      where: {
        id: request.query.projectId,
        OR: [
          { createdById: request.user.id },
          { users: { some: { userId: request.user.id } } },
        ],
      },
    });

    if (!project) {
      return reply.code(404).send({ error: 'Project not found' });
    }

    const where: any = {
      projectId: request.query.projectId,
      category: 'PHOTO',
    };

    if (request.query.tag) {
      where.tags = {
        has: request.query.tag,
      };
    }

    const photos = await prisma.projectFile.findMany({
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
        takenAt: 'desc',
      },
    });

    return reply.send({ photos });
  });

  // GET /api/v1/photos/:id - Get single photo
  fastify.get<{
    Params: {
      id: string;
    };
  }>('/:id', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['Photos'],
      summary: 'Get photo',
    },
  }, async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    const photo = await prisma.projectFile.findUnique({
      where: {
        id: request.params.id,
      },
      include: {
        uploader: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!photo || photo.category !== 'PHOTO') {
      return reply.code(404).send({ error: 'Photo not found' });
    }

    // Verify project access
    const project = await prisma.project.findFirst({
      where: {
        id: photo.projectId,
        OR: [
          { createdById: request.user.id },
          { users: { some: { userId: request.user.id } } },
        ],
      },
    });

    if (!project) {
      return reply.code(404).send({ error: 'Project not found' });
    }

    return reply.send({ photo });
  });

  // POST /api/v1/photos - Upload photo
  fastify.post<{
    Body: {
      projectId: string;
      filename: string;
      fileUrl: string;
      mimeType: string;
      size: number;
      tags?: string[];
      location?: string;
      description?: string;
      takenAt?: string;
    };
  }>('/', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['Photos'],
      summary: 'Upload photo',
      body: {
        type: 'object',
        required: ['projectId', 'filename', 'fileUrl', 'mimeType', 'size'],
        properties: {
          projectId: { type: 'string' },
          filename: { type: 'string' },
          fileUrl: { type: 'string' },
          mimeType: { type: 'string' },
          size: { type: 'number' },
          tags: { type: 'array', items: { type: 'string' } },
          location: { type: 'string' },
          description: { type: 'string' },
          takenAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  }, async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    // Verify project access
    const project = await prisma.project.findFirst({
      where: {
        id: request.body.projectId,
        OR: [
          { createdById: request.user.id },
          { users: { some: { userId: request.user.id } } },
        ],
      },
    });

    if (!project) {
      return reply.code(404).send({ error: 'Project not found' });
    }

    const photo = await prisma.projectFile.create({
      data: {
        projectId: request.body.projectId,
        category: 'PHOTO',
        filename: request.body.filename,
        fileUrl: request.body.fileUrl,
        mimeType: request.body.mimeType,
        size: request.body.size,
        tags: request.body.tags || [],
        location: request.body.location,
        description: request.body.description,
        takenAt: request.body.takenAt ? new Date(request.body.takenAt) : new Date(),
        uploadedBy: request.user.id,
      },
      include: {
        uploader: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return reply.code(201).send({ photo });
  });

  // PATCH /api/v1/photos/:id - Update photo metadata
  fastify.patch<{
    Params: {
      id: string;
    };
    Body: {
      description?: string;
      tags?: string[];
      location?: string;
    };
  }>('/:id', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['Photos'],
      summary: 'Update photo metadata',
    },
  }, async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    const existing = await prisma.projectFile.findUnique({
      where: {
        id: request.params.id,
      },
    });

    if (!existing || existing.category !== 'PHOTO') {
      return reply.code(404).send({ error: 'Photo not found' });
    }

    // Verify project access
    const project = await prisma.project.findFirst({
      where: {
        id: existing.projectId,
        OR: [
          { createdById: request.user.id },
          { users: { some: { userId: request.user.id } } },
        ],
      },
    });

    if (!project) {
      return reply.code(404).send({ error: 'Project not found' });
    }

    const updateData: any = {};
    if (request.body.description !== undefined) updateData.description = request.body.description;
    if (request.body.tags !== undefined) updateData.tags = request.body.tags;
    if (request.body.location !== undefined) updateData.location = request.body.location;

    const photo = await prisma.projectFile.update({
      where: {
        id: request.params.id,
      },
      data: updateData,
      include: {
        uploader: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return reply.send({ photo });
  });

  // DELETE /api/v1/photos/:id - Delete photo
  fastify.delete<{
    Params: {
      id: string;
    };
  }>('/:id', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['Photos'],
      summary: 'Delete photo',
    },
  }, async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    const existing = await prisma.projectFile.findUnique({
      where: {
        id: request.params.id,
      },
    });

    if (!existing || existing.category !== 'PHOTO') {
      return reply.code(404).send({ error: 'Photo not found' });
    }

    // Verify project access
    const project = await prisma.project.findFirst({
      where: {
        id: existing.projectId,
        OR: [
          { createdById: request.user.id },
          { users: { some: { userId: request.user.id } } },
        ],
      },
    });

    if (!project) {
      return reply.code(404).send({ error: 'Project not found' });
    }

    await prisma.projectFile.delete({
      where: {
        id: request.params.id,
      },
    });

    return reply.code(204).send();
  });
};
