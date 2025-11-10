import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { AuthService } from './auth.service';
import { JwtPayload } from '../types/auth';

export interface WebSocketUser extends JwtPayload {
  socketId: string;
  connectedAt: Date;
}

export interface ConflictResolution {
  strategy: 'last-write-wins' | 'merge' | 'manual';
  timestamp: Date;
  conflictedFields: string[];
  originalValue: any;
  incomingValue: any;
  resolvedValue: any;
  documentId?: string;
  resourceId?: string;
}

export interface QueuedMessage {
  event: string;
  data: any;
  timestamp: Date;
}

export class WebSocketService {
  private io: SocketIOServer;
  private redis: Redis;
  private authService: AuthService;
  private connectedUsers: Map<string, WebSocketUser>;
  private userSockets: Map<string, Set<string>>; // userId -> Set of socketIds
  private documentVersions: Map<string, { version: number; data: any; timestamp: Date }>;
  private readonly MESSAGE_QUEUE_PREFIX = 'ws:queue:';
  private readonly PRESENCE_KEY_PREFIX = 'ws:presence:';

  constructor(httpServer: HTTPServer, authService: AuthService, redis: Redis) {
    this.authService = authService;
    this.redis = redis;
    this.connectedUsers = new Map();
    this.userSockets = new Map();
    this.documentVersions = new Map();

    // Initialize Socket.io server
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: (origin, callback) => {
          const allowedOrigins = (process.env.WEB_BASE_URL || 'http://localhost:3000')
            .split(',')
            .map(url => url.trim());

          if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
          } else {
            callback(new Error('Not allowed by CORS'), false);
          }
        },
        credentials: true
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000
    });

    // Set up Redis adapter for horizontal scaling
    this.setupRedisAdapter();

    // Set up authentication middleware
    this.io.use(this.authenticationMiddleware.bind(this));

    // Set up connection handler
    this.io.on('connection', this.handleConnection.bind(this));
  }

  private async setupRedisAdapter(): Promise<void> {
    const pubClient = this.redis.duplicate();
    const subClient = this.redis.duplicate();

    await Promise.all([pubClient.connect(), subClient.connect()]);

    this.io.adapter(createAdapter(pubClient, subClient));
  }

  private async authenticationMiddleware(socket: Socket, next: (err?: Error) => void): Promise<void> {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error('Missing authentication token'));
      }

      // Validate JWT token
      const payload = await this.authService.validateAccessToken(token);

      // Attach user data to socket
      (socket as any).user = payload;

      next();
    } catch (error) {
      next(new Error('Invalid authentication token'));
    }
  }

  private async handleConnection(socket: Socket): Promise<void> {
    const user = (socket as any).user as JwtPayload;

    if (!user) {
      socket.disconnect();
      return;
    }

    // Store connected user
    const wsUser: WebSocketUser = {
      ...user,
      socketId: socket.id,
      connectedAt: new Date()
    };

    this.connectedUsers.set(socket.id, wsUser);

    // Track multiple sockets per user
    if (!this.userSockets.has(user.userId)) {
      this.userSockets.set(user.userId, new Set());
    }
    this.userSockets.get(user.userId)!.add(socket.id);

    // Join user-specific room
    await socket.join(`user_${user.userId}`);

    // Join company room if user belongs to a company
    if (user.companyId) {
      await socket.join(`company_${user.companyId}`);
    }

    // Broadcast user online status
    this.io.emit('user:online', {
      userId: user.userId,
      status: 'online',
      timestamp: new Date().toISOString()
    });

    // Update presence in Redis
    await this.updatePresence(user.userId, 'online');

    // Deliver queued messages
    await this.deliverQueuedMessages(socket, user.userId);

    // Set up event handlers
    this.setupEventHandlers(socket);

    // Handle disconnection
    socket.on('disconnect', () => this.handleDisconnection(socket, user));
  }

  private setupEventHandlers(socket: Socket): void {
    const user = (socket as any).user as JwtPayload;

    // Room verification (for testing)
    socket.on('verify:room', async (roomName: string) => {
      const rooms = Array.from(socket.rooms);
      socket.emit('room:verified', { inRoom: rooms.includes(roomName) });
    });

    // Document update with conflict detection
    socket.on('document:update', async (data: {
      documentId: string;
      version: number;
      data: any;
      userId: string;
      timestamp?: string;
    }) => {
      await this.handleDocumentUpdate(socket, data);
    });

    // Resource update with conflict detection
    socket.on('resource:update', async (data: {
      resourceId: string;
      version: number;
      data: any;
      timestamp: string;
    }) => {
      await this.handleResourceUpdate(socket, data);
    });

    // Generic test event handler
    socket.on('test:event', (data: any) => {
      // Handle test events without processing
    });
  }

  private async handleDocumentUpdate(socket: Socket, data: {
    documentId: string;
    version: number;
    data: any;
    userId: string;
    timestamp?: string;
  }): Promise<void> {
    const docKey = `doc_${data.documentId}`;
    const currentDoc = this.documentVersions.get(docKey);

    if (currentDoc && currentDoc.version === data.version) {
      // Version conflict detected
      const conflictedFields = this.detectConflictedFields(currentDoc.data, data.data);

      const conflict: ConflictResolution = {
        strategy: 'last-write-wins',
        timestamp: new Date(),
        conflictedFields,
        originalValue: currentDoc.data,
        incomingValue: data.data,
        resolvedValue: data.data,
        documentId: data.documentId
      };

      socket.emit('document:conflict', conflict);

      // Update with new version
      this.documentVersions.set(docKey, {
        version: data.version + 1,
        data: data.data,
        timestamp: new Date()
      });
    } else {
      // No conflict, update document
      this.documentVersions.set(docKey, {
        version: data.version + 1,
        data: data.data,
        timestamp: new Date()
      });

      // Broadcast update to other users
      socket.broadcast.emit('document:updated', {
        documentId: data.documentId,
        version: data.version + 1,
        data: data.data
      });
    }
  }

  private async handleResourceUpdate(socket: Socket, data: {
    resourceId: string;
    version: number;
    data: any;
    timestamp: string;
  }): Promise<void> {
    const resourceKey = `resource_${data.resourceId}`;
    const currentResource = this.documentVersions.get(resourceKey);

    if (currentResource && currentResource.version === data.version) {
      // Conflict detected - apply last-write-wins strategy
      const conflictedFields = this.detectConflictedFields(currentResource.data, data.data);

      // Determine which update is newer
      const currentTimestamp = new Date(currentResource.timestamp);
      const incomingTimestamp = new Date(data.timestamp);

      const isIncomingNewer = incomingTimestamp > currentTimestamp;
      const resolvedValue = isIncomingNewer ? data.data : currentResource.data;

      const resolution: ConflictResolution = {
        strategy: 'last-write-wins',
        timestamp: new Date(),
        conflictedFields,
        originalValue: currentResource.data,
        incomingValue: data.data,
        resolvedValue,
        resourceId: data.resourceId
      };

      socket.emit('conflict:resolved', resolution);

      // Update with resolved version
      if (isIncomingNewer) {
        this.documentVersions.set(resourceKey, {
          version: data.version + 1,
          data: data.data,
          timestamp: incomingTimestamp
        });
      }
    } else {
      // No conflict
      this.documentVersions.set(resourceKey, {
        version: data.version + 1,
        data: data.data,
        timestamp: new Date(data.timestamp)
      });
    }
  }

  private detectConflictedFields(original: any, incoming: any): string[] {
    const conflicts: string[] = [];

    for (const key in incoming) {
      if (original[key] !== incoming[key]) {
        conflicts.push(key);
      }
    }

    return conflicts;
  }

  private async handleDisconnection(socket: Socket, user: JwtPayload): Promise<void> {
    // Remove from connected users
    this.connectedUsers.delete(socket.id);

    // Remove socket from user's socket set
    const userSocketSet = this.userSockets.get(user.userId);
    if (userSocketSet) {
      userSocketSet.delete(socket.id);

      // If user has no more connections, mark as offline
      if (userSocketSet.size === 0) {
        this.userSockets.delete(user.userId);

        // Broadcast user offline status
        this.io.emit('user:offline', {
          userId: user.userId,
          status: 'offline',
          timestamp: new Date().toISOString()
        });

        // Update presence in Redis
        await this.updatePresence(user.userId, 'offline');
      }
    }
  }

  private async updatePresence(userId: string, status: 'online' | 'offline'): Promise<void> {
    const presenceKey = `${this.PRESENCE_KEY_PREFIX}${userId}`;

    if (status === 'online') {
      await this.redis.setex(presenceKey, 300, Date.now().toString()); // 5 minute TTL
    } else {
      await this.redis.del(presenceKey);
    }
  }

  private async deliverQueuedMessages(socket: Socket, userId: string): Promise<void> {
    const queueKey = `${this.MESSAGE_QUEUE_PREFIX}${userId}`;

    // Get all queued messages
    const messages = await this.redis.lrange(queueKey, 0, -1);

    for (const messageJson of messages) {
      const message: QueuedMessage = JSON.parse(messageJson);
      socket.emit(message.event, message.data);
    }

    // Clear the queue after delivery
    if (messages.length > 0) {
      await this.redis.del(queueKey);
    }
  }

  // Public API methods

  public broadcastToCompany(companyId: string, event: string, data: any): void {
    this.io.to(`company_${companyId}`).emit(event, data);
  }

  public emitToUser(userId: string, event: string, data: any): void {
    this.io.to(`user_${userId}`).emit(event, data);
  }

  public async queueMessageForUser(userId: string, event: string, data: any): Promise<void> {
    const queueKey = `${this.MESSAGE_QUEUE_PREFIX}${userId}`;

    const message: QueuedMessage = {
      event,
      data,
      timestamp: new Date()
    };

    await this.redis.rpush(queueKey, JSON.stringify(message));
    await this.redis.expire(queueKey, 86400); // 24 hour TTL
  }

  public async isUserOnline(userId: string): Promise<boolean> {
    const presenceKey = `${this.PRESENCE_KEY_PREFIX}${userId}`;
    const presence = await this.redis.exists(presenceKey);
    return presence === 1;
  }

  public getConnectedUserCount(): number {
    return this.connectedUsers.size;
  }

  public getIO(): SocketIOServer {
    return this.io;
  }

  public async close(): Promise<void> {
    // Disconnect all clients
    this.io.disconnectSockets();

    // Close Socket.io server
    await new Promise<void>((resolve) => {
      this.io.close(() => resolve());
    });

    // Clear in-memory data
    this.connectedUsers.clear();
    this.userSockets.clear();
    this.documentVersions.clear();
  }
}