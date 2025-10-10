import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { fastify, type FastifyInstance } from 'fastify';
import { prisma } from '../lib/database';
import { AuthService } from '../services/auth.service';
import { redis } from '../lib/redis';
import { createAuthMiddleware } from '../middleware/auth.middleware';
import { projectsRoutes } from './projects.routes';

describe('Projects Routes', () => {
  let server: FastifyInstance;
  let authService: AuthService;
  let testUserId: string;
  let testCompanyId: string;
  let testToken: string;
  let testProjectId: string;

  beforeAll(async () => {
    // Initialize auth service
    authService = new AuthService(
      prisma,
      redis,
      process.env.JWT_SECRET!,
      process.env.JWT_REFRESH_SECRET!
    );

    // Create test user
    const testUser = await prisma.user.create({
      data: {
        email: `test-projects-${Date.now()}@example.com`,
        password: 'hashedpassword123',
        firstName: 'Test',
        lastName: 'User',
        isActive: true,
        isEmailVerified: true,
      },
    });
    testUserId = testUser.id;

    // Create test company
    const testCompany = await prisma.company.create({
      data: {
        name: 'Test Company',
        isActive: true,
      },
    });
    testCompanyId = testCompany.id;

    // Link user to company
    await prisma.companyUser.create({
      data: {
        userId: testUserId,
        companyId: testCompanyId,
        isOwner: true,
      },
    });

    // Generate test token
    const tokens = await authService.generateTokens(testUser);
    testToken = tokens.accessToken;

    // Initialize Fastify server
    server = fastify();

    // Register JWT plugin
    await server.register(import('@fastify/jwt'), {
      secret: process.env.JWT_SECRET!,
    });

    // Register auth middleware
    const authMiddleware = createAuthMiddleware({ authService });
    server.addHook('preHandler', authMiddleware.authenticate);

    // Register routes
    await server.register(projectsRoutes, {
      prefix: '/api/v1/projects',
      prisma,
    });

    await server.ready();
  });

  afterAll(async () => {
    // Cleanup test data
    if (testProjectId) {
      await prisma.project.deleteMany({
        where: { id: testProjectId },
      });
    }

    await prisma.project.deleteMany({
      where: { companyId: testCompanyId },
    });

    await prisma.companyUser.deleteMany({
      where: { userId: testUserId },
    });

    await prisma.company.deleteMany({
      where: { id: testCompanyId },
    });

    await prisma.user.deleteMany({
      where: { id: testUserId },
    });

    await server.close();
  });

  beforeEach(async () => {
    // Clean up any projects created in previous tests
    await prisma.project.deleteMany({
      where: {
        companyId: testCompanyId,
      },
    });
  });

  describe('POST /api/v1/projects', () => {
    it('should create a new project successfully', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/projects',
        headers: {
          authorization: `Bearer ${testToken}`,
        },
        payload: {
          name: 'New Construction Project',
          description: 'Building a new house',
          status: 'ACTIVE',
          companyId: testCompanyId,
          budget: 100000,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.project).toBeDefined();
      expect(body.project.name).toBe('New Construction Project');
      expect(body.project.status).toBe('ACTIVE');
      expect(body.project.budget).toBe('100000');

      testProjectId = body.project.id;
    });

    it('should reject project creation without authentication', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/projects',
        payload: {
          name: 'Unauthorized Project',
          companyId: testCompanyId,
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should create project with default DRAFT status', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/projects',
        headers: {
          authorization: `Bearer ${testToken}`,
        },
        payload: {
          name: 'Draft Project',
          companyId: testCompanyId,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.project.status).toBe('DRAFT');
    });
  });

  describe('GET /api/v1/projects', () => {
    beforeEach(async () => {
      // Create test projects
      await prisma.project.create({
        data: {
          name: 'Project 1',
          companyId: testCompanyId,
          createdById: testUserId,
          status: 'ACTIVE',
        },
      });

      await prisma.project.create({
        data: {
          name: 'Project 2',
          companyId: testCompanyId,
          createdById: testUserId,
          status: 'DRAFT',
        },
      });
    });

    it('should list all accessible projects', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/projects',
        headers: {
          authorization: `Bearer ${testToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.projects).toBeDefined();
      expect(Array.isArray(body.projects)).toBe(true);
      expect(body.projects.length).toBeGreaterThanOrEqual(2);
    });

    it('should require authentication', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/projects',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /api/v1/projects/:id', () => {
    let projectId: string;

    beforeEach(async () => {
      const project = await prisma.project.create({
        data: {
          name: 'Specific Project',
          description: 'Project details',
          companyId: testCompanyId,
          createdById: testUserId,
          status: 'ACTIVE',
        },
      });
      projectId = project.id;
    });

    it('should get project by ID with all details', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/projects/${projectId}`,
        headers: {
          authorization: `Bearer ${testToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.project).toBeDefined();
      expect(body.project.id).toBe(projectId);
      expect(body.project.name).toBe('Specific Project');
      expect(body.project.company).toBeDefined();
      expect(body.project.createdBy).toBeDefined();
      expect(body.project.tasks).toBeDefined();
    });

    it('should return 404 for non-existent project', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/projects/non-existent-id',
        headers: {
          authorization: `Bearer ${testToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('PATCH /api/v1/projects/:id', () => {
    let projectId: string;

    beforeEach(async () => {
      const project = await prisma.project.create({
        data: {
          name: 'Project to Update',
          companyId: testCompanyId,
          createdById: testUserId,
          status: 'DRAFT',
        },
      });
      projectId = project.id;
    });

    it('should update project successfully', async () => {
      const response = await server.inject({
        method: 'PATCH',
        url: `/api/v1/projects/${projectId}`,
        headers: {
          authorization: `Bearer ${testToken}`,
        },
        payload: {
          name: 'Updated Project Name',
          status: 'ACTIVE',
          budget: 250000,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.project.name).toBe('Updated Project Name');
      expect(body.project.status).toBe('ACTIVE');
      expect(body.project.budget).toBe('250000');
    });

    it('should allow partial updates', async () => {
      const response = await server.inject({
        method: 'PATCH',
        url: `/api/v1/projects/${projectId}`,
        headers: {
          authorization: `Bearer ${testToken}`,
        },
        payload: {
          description: 'New description only',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.project.description).toBe('New description only');
      expect(body.project.name).toBe('Project to Update'); // Original name unchanged
    });

    it('should return 404 for unauthorized project update', async () => {
      const response = await server.inject({
        method: 'PATCH',
        url: '/api/v1/projects/non-existent-id',
        headers: {
          authorization: `Bearer ${testToken}`,
        },
        payload: {
          name: 'Should Fail',
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('DELETE /api/v1/projects/:id', () => {
    let projectId: string;

    beforeEach(async () => {
      const project = await prisma.project.create({
        data: {
          name: 'Project to Delete',
          companyId: testCompanyId,
          createdById: testUserId,
          status: 'DRAFT',
        },
      });
      projectId = project.id;
    });

    it('should delete project successfully', async () => {
      const response = await server.inject({
        method: 'DELETE',
        url: `/api/v1/projects/${projectId}`,
        headers: {
          authorization: `Bearer ${testToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('Project deleted successfully');

      // Verify deletion
      const deletedProject = await prisma.project.findUnique({
        where: { id: projectId },
      });
      expect(deletedProject).toBeNull();
    });

    it('should return 404 for non-existent project deletion', async () => {
      const response = await server.inject({
        method: 'DELETE',
        url: '/api/v1/projects/non-existent-id',
        headers: {
          authorization: `Bearer ${testToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should only allow creator to delete project', async () => {
      // Create another user
      const anotherUser = await prisma.user.create({
        data: {
          email: `another-user-${Date.now()}@example.com`,
          password: 'hashedpassword123',
          firstName: 'Another',
          lastName: 'User',
          isActive: true,
        },
      });

      const anotherTokens = await authService.generateTokens(anotherUser);

      const response = await server.inject({
        method: 'DELETE',
        url: `/api/v1/projects/${projectId}`,
        headers: {
          authorization: `Bearer ${anotherTokens.accessToken}`,
        },
      });

      expect(response.statusCode).toBe(404);

      // Cleanup
      await prisma.user.delete({
        where: { id: anotherUser.id },
      });
    });
  });
});