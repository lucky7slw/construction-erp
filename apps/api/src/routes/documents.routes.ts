import { FastifyInstance } from 'fastify';
import { fileStorage } from '../lib/file-storage';

export async function documentsRoutes(fastify: FastifyInstance) {
  // Get all files for a project
  fastify.get('/projects/:projectId/files', {
    schema: {
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          projectId: { type: 'string' },
        },
        required: ['projectId'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            files: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  filename: { type: 'string' },
                  fileUrl: { type: 'string' },
                  mimeType: { type: 'string' },
                  size: { type: 'number' },
                  category: { type: 'string' },
                  description: { type: 'string', nullable: true },
                  tags: { type: 'array', items: { type: 'string' } },
                  uploadedBy: { type: 'string' },
                  createdAt: { type: 'string' },
                },
              },
            },
          },
        },
      },
      tags: ['Documents'],
      summary: 'Get project files',
      description: 'Get all files for a specific project',
    },
  }, async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Authentication required',
        statusCode: 401,
      });
    }

    const { projectId } = request.params as { projectId: string };

    try {
      const files = await fastify.prisma.projectFile.findMany({
        where: { projectId },
        orderBy: { createdAt: 'desc' },
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

      return {
        files: files.map(file => ({
          id: file.id,
          filename: file.filename,
          fileUrl: file.fileUrl,
          mimeType: file.mimeType,
          size: file.size,
          category: file.category,
          description: file.description,
          tags: file.tags,
          uploadedBy: {
            id: file.uploader.id,
            name: `${file.uploader.firstName} ${file.uploader.lastName}`,
            email: file.uploader.email,
          },
          createdAt: file.createdAt.toISOString(),
        })),
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch files',
        statusCode: 500,
      });
    }
  });

  // Upload file
  fastify.post('/projects/:projectId/files', {
    schema: {
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          projectId: { type: 'string' },
        },
        required: ['projectId'],
      },
      response: {
        201: {
          type: 'object',
          properties: {
            file: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                filename: { type: 'string' },
                fileUrl: { type: 'string' },
              },
            },
          },
        },
      },
      tags: ['Documents'],
      summary: 'Upload file',
      description: 'Upload a file to a project',
    },
  }, async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Authentication required',
        statusCode: 401,
      });
    }

    const { projectId } = request.params as { projectId: string };

    try {
      const data = await request.file();

      if (!data) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'No file uploaded',
          statusCode: 400,
        });
      }

      // Save file to storage
      const { filename, filepath, size } = await fileStorage.saveFile(data, projectId);

      // Get category from form field or default to OTHER
      const category = (data.fields.category as any)?.value || 'OTHER';
      const description = (data.fields.description as any)?.value;
      const tagsStr = (data.fields.tags as any)?.value;
      const tags = tagsStr ? JSON.parse(tagsStr) : [];

      // Create database record
      const file = await fastify.prisma.projectFile.create({
        data: {
          projectId,
          filename,
          fileUrl: fileStorage.getFileUrl(filepath),
          mimeType: data.mimetype,
          size,
          category,
          description,
          tags,
          uploadedBy: request.user.id,
        },
      });

      return reply.status(201).send({
        file: {
          id: file.id,
          filename: file.filename,
          fileUrl: file.fileUrl,
          mimeType: file.mimeType,
          size: file.size,
          category: file.category,
        },
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to upload file',
        statusCode: 500,
      });
    }
  });

  // Delete file
  fastify.delete('/files/:fileId', {
    schema: {
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          fileId: { type: 'string' },
        },
        required: ['fileId'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
          },
        },
      },
      tags: ['Documents'],
      summary: 'Delete file',
      description: 'Delete a file from a project',
    },
  }, async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Authentication required',
        statusCode: 401,
      });
    }

    const { fileId } = request.params as { fileId: string };

    try {
      const file = await fastify.prisma.projectFile.findUnique({
        where: { id: fileId },
      });

      if (!file) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'File not found',
          statusCode: 404,
        });
      }

      // Delete from storage
      const filepath = file.fileUrl.replace('/files/', '');
      await fileStorage.deleteFile(filepath);

      // Delete from database
      await fastify.prisma.projectFile.delete({
        where: { id: fileId },
      });

      return { message: 'File deleted successfully' };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to delete file',
        statusCode: 500,
      });
    }
  });

  // Download/serve file
  fastify.get('/files/:projectId/:filename', {
    schema: {
      params: {
        type: 'object',
        properties: {
          projectId: { type: 'string' },
          filename: { type: 'string' },
        },
        required: ['projectId', 'filename'],
      },
      tags: ['Documents'],
      summary: 'Download file',
      description: 'Download a file from a project',
    },
  }, async (request, reply) => {
    const { projectId, filename } = request.params as { projectId: string; filename: string };

    try {
      const filepath = `${projectId}/${filename}`;
      const fileBuffer = await fileStorage.getFileStream(filepath);

      // Get file record for mime type
      const file = await fastify.prisma.projectFile.findFirst({
        where: {
          projectId,
          filename,
        },
      });

      if (file) {
        reply.type(file.mimeType);
      }

      return reply.send(fileBuffer);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(404).send({
        error: 'Not Found',
        message: 'File not found',
        statusCode: 404,
      });
    }
  });
}
