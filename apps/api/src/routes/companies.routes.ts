import { FastifyInstance } from 'fastify';

export async function companiesRoutes(fastify: FastifyInstance) {
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
      const companyUser = await fastify.prisma.companyUser.findFirst({
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

      const updatedCompany = await fastify.prisma.company.update({
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
}
