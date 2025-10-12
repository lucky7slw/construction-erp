import { FastifyInstance } from 'fastify';
import { fileStorage } from '../lib/file-storage';
import path from 'path';
import type { PrismaClient } from '../generated/prisma';

type CompaniesRoutesOptions = {
  prisma: PrismaClient;
};

export async function companiesRoutes(fastify: FastifyInstance, options: CompaniesRoutesOptions) {
  const { prisma } = options;
  // Update company endpoint
  fastify.patch('/companies/:id', {
    schema: {
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
        required: ['id'],
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          address: { type: 'string' },
          phone: { type: 'string' },
          email: { type: 'string' },
          website: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            company: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                address: { type: 'string', nullable: true },
                phone: { type: 'string', nullable: true },
                email: { type: 'string', nullable: true },
                website: { type: 'string', nullable: true },
              },
            },
          },
        },
      },
      tags: ['Companies'],
      summary: 'Update company',
      description: 'Update company information',
    },
  }, async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Authentication required',
        statusCode: 401,
      });
    }

    const { id } = request.params as { id: string };
    const { name, address, phone, email, website } = request.body as {
      name?: string;
      address?: string;
      phone?: string;
      email?: string;
      website?: string;
    };

    try {
      // Check if user has access to this company
      const companyUser = await prisma.companyUser.findFirst({
        where: {
          companyId: id,
          userId: request.user.id,
        },
      });

      if (!companyUser) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'You do not have access to this company',
          statusCode: 403,
        });
      }

      const updatedCompany = await prisma.company.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(address !== undefined && { address }),
          ...(phone !== undefined && { phone }),
          ...(email !== undefined && { email }),
          ...(website !== undefined && { website }),
        },
      });

      return { company: updatedCompany };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to update company',
        statusCode: 500,
      });
    }
  });

  // Upload company logo/favicon
  fastify.post('/companies/:id/upload', {
    schema: {
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
        required: ['id'],
      },
      tags: ['Companies'],
      summary: 'Upload company logo or favicon',
      description: 'Upload and update company branding assets',
      consumes: ['multipart/form-data'],
    },
  }, async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Authentication required',
        statusCode: 401,
      });
    }

    const { id } = request.params as { id: string };

    try {
      // Check if user has access to this company
      const companyUser = await prisma.companyUser.findFirst({
        where: {
          companyId: id,
          userId: request.user.id,
        },
      });

      if (!companyUser) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'You do not have access to this company',
          statusCode: 403,
        });
      }

      // Get the uploaded file
      const data = await request.file();
      
      if (!data) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'No file uploaded',
          statusCode: 400,
        });
      }

      // Validate file type (images only)
      const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/x-icon'];
      if (!allowedMimeTypes.includes(data.mimetype)) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Invalid file type. Only images are allowed.',
          statusCode: 400,
        });
      }

      // Get upload type from fields
      const fields = data.fields as any;
      const uploadType = fields?.type?.value || 'logo';

      // Validate file size
      const maxSize = uploadType === 'favicon' ? 1 * 1024 * 1024 : 5 * 1024 * 1024; // 1MB for favicon, 5MB for logo
      
      // Save file using the file storage utility
      const { filename, filepath, size } = await fileStorage.saveFile(data, `companies/${id}`);

      if (size > maxSize) {
        // Delete the file if it's too large
        await fileStorage.deleteFile(filepath);
        return reply.status(400).send({
          error: 'Bad Request',
          message: `File size exceeds limit (${uploadType === 'favicon' ? '1MB' : '5MB'})`,
          statusCode: 400,
        });
      }

      // Get the file URL
      const fileUrl = fileStorage.getFileUrl(filepath);

      // Update company with the new logo/favicon URL
      const updateData = uploadType === 'favicon' 
        ? { favicon: fileUrl }
        : { logo: fileUrl };

      const updatedCompany = await prisma.company.update({
        where: { id },
        data: updateData,
      });

      fastify.log.info(`${uploadType} uploaded for company ${id}: ${fileUrl}`);

      return {
        url: fileUrl,
        filename,
        size,
        type: uploadType,
        company: updatedCompany,
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to upload file',
        statusCode: 500,
      });
    }
  });
}
