import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Server as SocketIOServer } from 'socket.io';
import { createServer } from 'http';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import { WebSocketService } from './websocket.service';
import { AuthService } from './auth.service';
import { prisma } from '../lib/database';
import { redis } from '../lib/redis';

describe('WebSocketService', () => {
  let httpServer: ReturnType<typeof createServer>;
  let wsService: WebSocketService;
  let authService: AuthService;
  let port: number;
  const testUsers: string[] = [];

  beforeEach(async () => {
    // Initialize auth service with existing database and redis instances
    authService = new AuthService(
      prisma,
      redis,
      process.env.JWT_SECRET!,
      process.env.JWT_REFRESH_SECRET!
    );

    // Create HTTP server for Socket.io
    httpServer = createServer();
    port = 3002 + Math.floor(Math.random() * 1000); // Random port to avoid conflicts

    await new Promise<void>((resolve) => {
      httpServer.listen(port, () => resolve());
    });

    // Initialize WebSocket service
    wsService = new WebSocketService(httpServer, authService, redis);
  });

  afterEach(async () => {
    // Cleanup test users
    if (testUsers.length > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: testUsers } }
      });
      testUsers.length = 0;
    }

    // Close WebSocket service and HTTP server
    if (wsService) {
      await wsService.close();
    }
    if (httpServer) {
      await new Promise<void>((resolve) => {
        httpServer.close(() => resolve());
      });
    }
  });

  describe('Connection Authentication', () => {
    it('should reject connection without valid JWT token', async () => {
      const client = ioClient(`http://localhost:${port}`, {
        auth: {},
        transports: ['websocket']
      });

      const connectError = await new Promise<Error>((resolve) => {
        client.on('connect_error', (error) => resolve(error));
        setTimeout(() => resolve(new Error('timeout')), 2000);
      });

      expect(connectError).toBeDefined();
      expect(connectError.message).toContain('authentication');
      client.close();
    });

    it('should reject connection with invalid JWT token', async () => {
      const client = ioClient(`http://localhost:${port}`, {
        auth: { token: 'invalid-token-here' },
        transports: ['websocket']
      });

      const connectError = await new Promise<Error>((resolve) => {
        client.on('connect_error', (error) => resolve(error));
        setTimeout(() => resolve(new Error('timeout')), 2000);
      });

      expect(connectError).toBeDefined();
      expect(connectError.message).toContain('authentication');
      client.close();
    });

    it('should accept connection with valid JWT token', async () => {
      // Create test user and generate token
      const testUser = await prisma.user.create({
        data: {
          email: `ws-test-${Date.now()}@example.com`,
          password: 'hashed-password',
          firstName: 'WebSocket',
          lastName: 'Tester',
          isEmailVerified: true
        }
      });
      testUsers.push(testUser.id);

      const { accessToken } = await authService.generateTokenPair(testUser.id);

      const client = ioClient(`http://localhost:${port}`, {
        auth: { token: accessToken },
        transports: ['websocket']
      });

      const connected = await new Promise<boolean>((resolve) => {
        client.on('connect', () => resolve(true));
        client.on('connect_error', () => resolve(false));
        setTimeout(() => resolve(false), 2000);
      });

      expect(connected).toBe(true);
      expect(client.connected).toBe(true);

      client.close();
    });

    it('should join user-specific room on connection', async () => {
      const testUser = await prisma.user.create({
        data: {
          email: `ws-room-test-${Date.now()}@example.com`,
          password: 'hashed-password',
          firstName: 'Room',
          lastName: 'Tester',
          isEmailVerified: true
        }
      });
      testUsers.push(testUser.id);

      const { accessToken } = await authService.generateTokenPair(testUser.id);

      const client = ioClient(`http://localhost:${port}`, {
        auth: { token: accessToken },
        transports: ['websocket']
      });

      await new Promise<void>((resolve) => {
        client.on('connect', () => resolve());
        setTimeout(() => resolve(), 2000);
      });

      // Emit event to verify room membership
      const roomJoined = await new Promise<boolean>((resolve) => {
        client.emit('verify:room', `user_${testUser.id}`);
        client.on('room:verified', (data) => {
          resolve(data.inRoom);
        });
        setTimeout(() => resolve(false), 1000);
      });

      expect(roomJoined).toBe(true);

      client.close();
    });
  });

  describe('Real-time Event Broadcasting', () => {
    it('should broadcast project:updated event to all users in company room', async () => {
      // Create test company and users
      const company = await prisma.company.create({
        data: {
          name: `Test Construction Co ${Date.now()}`,
          ownerId: 'temp-owner-id'
        }
      });

      const user1 = await prisma.user.create({
        data: {
          email: `user1-${Date.now()}@testco.com`,
          password: 'hashed',
          firstName: 'User',
          lastName: 'One',
          isEmailVerified: true
        }
      });
      testUsers.push(user1.id);

      const user2 = await prisma.user.create({
        data: {
          email: `user2-${Date.now()}@testco.com`,
          password: 'hashed',
          firstName: 'User',
          lastName: 'Two',
          isEmailVerified: true
        }
      });
      testUsers.push(user2.id);

      // Get role for assignment
      const adminRole = await prisma.role.findFirst({
        where: { name: 'admin', companyId: null }
      });

      if (!adminRole) {
        throw new Error('Admin role not found in database');
      }

      // Assign users to company
      await prisma.userRole.createMany({
        data: [
          { userId: user1.id, roleId: adminRole.id, companyId: company.id },
          { userId: user2.id, roleId: adminRole.id, companyId: company.id }
        ]
      });

      const token1 = (await authService.generateTokenPair(user1.id)).accessToken;
      const token2 = (await authService.generateTokenPair(user2.id)).accessToken;

      // Connect both clients
      const client1 = ioClient(`http://localhost:${port}`, {
        auth: { token: token1 },
        transports: ['websocket']
      });

      const client2 = ioClient(`http://localhost:${port}`, {
        auth: { token: token2 },
        transports: ['websocket']
      });

      await Promise.all([
        new Promise<void>((resolve) => {
          client1.on('connect', () => resolve());
          setTimeout(() => resolve(), 2000);
        }),
        new Promise<void>((resolve) => {
          client2.on('connect', () => resolve());
          setTimeout(() => resolve(), 2000);
        })
      ]);

      // Set up listener on client2
      const receivedEvent = new Promise<any>((resolve) => {
        client2.on('project:updated', (data) => resolve(data));
        setTimeout(() => resolve(null), 2000);
      });

      // Emit project update from server
      const projectData = {
        id: 'project-123',
        name: 'Updated Project',
        companyId: company.id,
        status: 'in_progress',
        updatedAt: new Date().toISOString()
      };

      wsService.broadcastToCompany(company.id, 'project:updated', projectData);

      const received = await receivedEvent;
      expect(received).toEqual(projectData);

      // Cleanup
      client1.close();
      client2.close();
      await prisma.userRole.deleteMany({ where: { companyId: company.id } });
      await prisma.company.delete({ where: { id: company.id } });
    });

    it('should broadcast expense:approved event to specific user', async () => {
      const user = await prisma.user.create({
        data: {
          email: `expense-user-${Date.now()}@test.com`,
          password: 'hashed',
          firstName: 'Expense',
          lastName: 'User',
          isEmailVerified: true
        }
      });
      testUsers.push(user.id);

      const { accessToken } = await authService.generateTokenPair(user.id);

      const client = ioClient(`http://localhost:${port}`, {
        auth: { token: accessToken },
        transports: ['websocket']
      });

      await new Promise<void>((resolve) => {
        client.on('connect', () => resolve());
        setTimeout(() => resolve(), 2000);
      });

      const expenseData = {
        id: 'expense-456',
        amount: 250.00,
        status: 'approved',
        approvedAt: new Date().toISOString()
      };

      const receivedEvent = new Promise<any>((resolve) => {
        client.on('expense:approved', (data) => resolve(data));
        setTimeout(() => resolve(null), 2000);
      });

      wsService.emitToUser(user.id, 'expense:approved', expenseData);

      const received = await receivedEvent;
      expect(received).toEqual(expenseData);

      client.close();
    });

    it('should track user presence and emit online/offline events', async () => {
      const user = await prisma.user.create({
        data: {
          email: `presence-test-${Date.now()}@test.com`,
          password: 'hashed',
          firstName: 'Presence',
          lastName: 'Test',
          isEmailVerified: true
        }
      });
      testUsers.push(user.id);

      const { accessToken } = await authService.generateTokenPair(user.id);

      const client = ioClient(`http://localhost:${port}`, {
        auth: { token: accessToken },
        transports: ['websocket']
      });

      // Listen for presence events
      const onlineEvent = new Promise<any>((resolve) => {
        client.on('user:online', (data) => {
          if (data.userId === user.id) {
            resolve(data);
          }
        });
        setTimeout(() => resolve(null), 2000);
      });

      await new Promise<void>((resolve) => {
        client.on('connect', () => resolve());
        setTimeout(() => resolve(), 2000);
      });

      const online = await onlineEvent;
      expect(online).not.toBeNull();
      expect(online.userId).toBe(user.id);
      expect(online.status).toBe('online');

      client.close();
    });
  });

  describe('Conflict Resolution', () => {
    it('should detect and resolve version conflicts for document updates', async () => {
      const user = await prisma.user.create({
        data: {
          email: `conflict-test-${Date.now()}@test.com`,
          password: 'hashed',
          firstName: 'Conflict',
          lastName: 'Test',
          isEmailVerified: true
        }
      });
      testUsers.push(user.id);

      const { accessToken } = await authService.generateTokenPair(user.id);

      const client = ioClient(`http://localhost:${port}`, {
        auth: { token: accessToken },
        transports: ['websocket']
      });

      await new Promise<void>((resolve) => {
        client.on('connect', () => resolve());
        setTimeout(() => resolve(), 2000);
      });

      // Simulate concurrent updates
      const documentId = `doc-${Date.now()}`;
      const version1 = 1;
      const version2 = 1; // Same version = conflict

      const update1 = {
        documentId,
        version: version1,
        data: { field: 'value1' },
        userId: user.id
      };

      const update2 = {
        documentId,
        version: version2,
        data: { field: 'value2' },
        userId: user.id
      };

      // Listen for conflict events
      const conflictEvent = new Promise<any>((resolve) => {
        client.on('document:conflict', (data) => resolve(data));
        setTimeout(() => resolve(null), 2000);
      });

      // Emit first update (should succeed)
      client.emit('document:update', update1);

      // Wait briefly
      await new Promise(resolve => setTimeout(resolve, 100));

      // Emit second update with same version (should trigger conflict)
      client.emit('document:update', update2);

      const conflict = await conflictEvent;
      expect(conflict).not.toBeNull();
      expect(conflict.documentId).toBe(documentId);
      expect(conflict.strategy).toBe('last-write-wins');
      expect(conflict.conflictedFields).toContain('field');

      client.close();
    });

    it('should apply last-write-wins strategy for concurrent edits', async () => {
      const user = await prisma.user.create({
        data: {
          email: `lww-test-${Date.now()}@test.com`,
          password: 'hashed',
          firstName: 'LastWrite',
          lastName: 'Wins',
          isEmailVerified: true
        }
      });
      testUsers.push(user.id);

      const { accessToken } = await authService.generateTokenPair(user.id);

      const client = ioClient(`http://localhost:${port}`, {
        auth: { token: accessToken },
        transports: ['websocket']
      });

      await new Promise<void>((resolve) => {
        client.on('connect', () => resolve());
        setTimeout(() => resolve(), 2000);
      });

      const resourceId = `resource-${Date.now()}`;

      // Listen for resolution
      const resolutionEvent = new Promise<any>((resolve) => {
        client.on('conflict:resolved', (data) => resolve(data));
        setTimeout(() => resolve(null), 2000);
      });

      // Emit conflicting updates
      client.emit('resource:update', {
        resourceId,
        version: 1,
        data: { status: 'draft' },
        timestamp: new Date(Date.now() - 1000).toISOString()
      });

      await new Promise(resolve => setTimeout(resolve, 50));

      client.emit('resource:update', {
        resourceId,
        version: 1,
        data: { status: 'published' },
        timestamp: new Date().toISOString()
      });

      const resolution = await resolutionEvent;
      expect(resolution).not.toBeNull();
      expect(resolution.strategy).toBe('last-write-wins');
      expect(resolution.resolvedValue.status).toBe('published');
      expect(resolution.originalValue.status).toBe('draft');

      client.close();
    });
  });

  describe('Connection Management', () => {
    it('should handle auto-reconnection gracefully', async () => {
      const user = await prisma.user.create({
        data: {
          email: `reconnect-test-${Date.now()}@test.com`,
          password: 'hashed',
          firstName: 'Reconnect',
          lastName: 'Test',
          isEmailVerified: true
        }
      });
      testUsers.push(user.id);

      const { accessToken } = await authService.generateTokenPair(user.id);

      const client = ioClient(`http://localhost:${port}`, {
        auth: { token: accessToken },
        transports: ['websocket'],
        reconnection: true,
        reconnectionDelay: 100
      });

      await new Promise<void>((resolve) => {
        client.on('connect', () => resolve());
        setTimeout(() => resolve(), 2000);
      });

      // Force disconnect
      const reconnectEvent = new Promise<boolean>((resolve) => {
        let reconnected = false;
        client.on('reconnect', () => {
          reconnected = true;
          resolve(true);
        });
        setTimeout(() => !reconnected && resolve(false), 3000);
      });

      client.io.engine.close();

      const didReconnect = await reconnectEvent;
      expect(didReconnect).toBe(true);
      expect(client.connected).toBe(true);

      client.close();
    });

    it('should queue messages for offline users and deliver on reconnect', async () => {
      const user = await prisma.user.create({
        data: {
          email: `queue-test-${Date.now()}@test.com`,
          password: 'hashed',
          firstName: 'Queue',
          lastName: 'Test',
          isEmailVerified: true
        }
      });
      testUsers.push(user.id);

      const { accessToken } = await authService.generateTokenPair(user.id);

      const client = ioClient(`http://localhost:${port}`, {
        auth: { token: accessToken },
        transports: ['websocket']
      });

      await new Promise<void>((resolve) => {
        client.on('connect', () => resolve());
        setTimeout(() => resolve(), 2000);
      });

      // Disconnect client
      client.close();
      await new Promise(resolve => setTimeout(resolve, 200));

      // Queue messages while offline
      const message1 = { id: 'msg1', content: 'Message 1' };
      const message2 = { id: 'msg2', content: 'Message 2' };

      await wsService.queueMessageForUser(user.id, 'notification:new', message1);
      await wsService.queueMessageForUser(user.id, 'notification:new', message2);

      // Reconnect and verify messages are delivered
      const client2 = ioClient(`http://localhost:${port}`, {
        auth: { token: accessToken },
        transports: ['websocket']
      });

      const receivedMessages: any[] = [];
      const messagesReceived = new Promise<void>((resolve) => {
        let count = 0;
        client2.on('notification:new', (data) => {
          receivedMessages.push(data);
          count++;
          if (count === 2) resolve();
        });
        setTimeout(() => resolve(), 3000);
      });

      await new Promise<void>((resolve) => {
        client2.on('connect', () => resolve());
        setTimeout(() => resolve(), 2000);
      });

      await messagesReceived;

      expect(receivedMessages.length).toBeGreaterThanOrEqual(2);
      expect(receivedMessages).toContainEqual(message1);
      expect(receivedMessages).toContainEqual(message2);

      client2.close();
    });
  });

  describe('Performance and Reliability', () => {
    it('should handle multiple concurrent connections', async () => {
      const connectionCount = 10;
      const users: any[] = [];
      const clients: ClientSocket[] = [];

      // Create test users
      for (let i = 0; i < connectionCount; i++) {
        const user = await prisma.user.create({
          data: {
            email: `perf-test-${Date.now()}-${i}@test.com`,
            password: 'hashed',
            firstName: `User${i}`,
            lastName: 'Test',
            isEmailVerified: true
          }
        });
        users.push(user);
        testUsers.push(user.id);
      }

      // Connect all clients
      const startTime = Date.now();

      for (const user of users) {
        const { accessToken } = await authService.generateTokenPair(user.id);
        const client = ioClient(`http://localhost:${port}`, {
          auth: { token: accessToken },
          transports: ['websocket']
        });
        clients.push(client);
      }

      // Wait for all connections
      await Promise.all(
        clients.map(client =>
          new Promise<void>((resolve) => {
            client.on('connect', () => resolve());
            setTimeout(() => resolve(), 2000);
          })
        )
      );

      const connectionTime = Date.now() - startTime;
      const allConnected = clients.every(client => client.connected);

      expect(allConnected).toBe(true);
      expect(connectionTime).toBeLessThan(10000); // Should connect within 10 seconds

      // Cleanup
      clients.forEach(client => client.close());
    });

    it('should maintain memory stability under continuous operation', async () => {
      const user = await prisma.user.create({
        data: {
          email: `memory-test-${Date.now()}@test.com`,
          password: 'hashed',
          firstName: 'Memory',
          lastName: 'Test',
          isEmailVerified: true
        }
      });
      testUsers.push(user.id);

      const { accessToken } = await authService.generateTokenPair(user.id);

      const client = ioClient(`http://localhost:${port}`, {
        auth: { token: accessToken },
        transports: ['websocket']
      });

      await new Promise<void>((resolve) => {
        client.on('connect', () => resolve());
        setTimeout(() => resolve(), 2000);
      });

      const initialMemory = process.memoryUsage().heapUsed;

      // Send 100 events (reduced from 1000 for faster test)
      for (let i = 0; i < 100; i++) {
        client.emit('test:event', { iteration: i, data: 'test' });
        if (i % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }

      await new Promise(resolve => setTimeout(resolve, 100));

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      const memoryIncreaseMB = memoryIncrease / 1024 / 1024;

      expect(memoryIncreaseMB).toBeLessThan(50); // Less than 50MB increase

      client.close();
    });
  });
});