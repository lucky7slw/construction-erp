import { io, Socket } from 'socket.io-client';

type WebSocketEventMap = {
  // Project events
  'project:created': (data: { project: unknown }) => void;
  'project:updated': (data: { project: unknown }) => void;
  'project:deleted': (data: { projectId: string }) => void;

  // Estimate events
  'estimate:created': (data: { estimate: unknown }) => void;
  'estimate:updated': (data: { estimate: unknown }) => void;
  'estimate:approved': (data: { estimate: unknown }) => void;
  'estimate:deleted': (data: { estimateId: string }) => void;

  // Task events
  'task:created': (data: { task: unknown }) => void;
  'task:updated': (data: { task: unknown }) => void;
  'task:deleted': (data: { taskId: string }) => void;

  // Time entry events
  'timeEntry:created': (data: { timeEntry: unknown }) => void;
  'timeEntry:updated': (data: { timeEntry: unknown }) => void;
  'timeEntry:deleted': (data: { timeEntryId: string }) => void;

  // User presence
  'user:online': (data: { userId: string; timestamp: string }) => void;
  'user:offline': (data: { userId: string; timestamp: string }) => void;

  // Notifications
  'notification': (data: { type: string; message: string; data?: unknown }) => void;

  // Connection events
  'connect': () => void;
  'disconnect': () => void;
  'error': (error: Error) => void;
};

export class WebSocketClient {
  private socket: Socket | null = null;
  private accessToken: string | null = null;
  private eventListeners: Map<keyof WebSocketEventMap, Set<Function>> = new Map();

  constructor() {
    if (typeof window === 'undefined') {
      return; // Don't initialize on server-side
    }
  }

  connect(accessToken: string): void {
    if (this.socket?.connected) {
      console.log('[WebSocket] Already connected');
      return;
    }

    this.accessToken = accessToken;
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';

    console.log('[WebSocket] Connecting to', wsUrl);

    this.socket = io(wsUrl, {
      auth: {
        token: accessToken,
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('[WebSocket] Connected');
      this.emit('connect');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[WebSocket] Disconnected:', reason);
      this.emit('disconnect');
    });

    this.socket.on('error', (error: Error) => {
      console.error('[WebSocket] Error:', error);
      this.emit('error', error);
    });

    // Set up listeners for all event types
    const eventTypes: (keyof WebSocketEventMap)[] = [
      'project:created',
      'project:updated',
      'project:deleted',
      'estimate:created',
      'estimate:updated',
      'estimate:approved',
      'estimate:deleted',
      'task:created',
      'task:updated',
      'task:deleted',
      'timeEntry:created',
      'timeEntry:updated',
      'timeEntry:deleted',
      'user:online',
      'user:offline',
      'notification',
    ];

    eventTypes.forEach((eventType) => {
      this.socket?.on(eventType, (data: unknown) => {
        console.log(`[WebSocket] Received ${eventType}:`, data);
        this.emit(eventType, data);
      });
    });
  }

  disconnect(): void {
    if (this.socket) {
      console.log('[WebSocket] Disconnecting');
      this.socket.disconnect();
      this.socket = null;
    }
  }

  on<K extends keyof WebSocketEventMap>(
    event: K,
    listener: WebSocketEventMap[K]
  ): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(listener);
  }

  off<K extends keyof WebSocketEventMap>(
    event: K,
    listener: WebSocketEventMap[K]
  ): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  private emit<K extends keyof WebSocketEventMap>(
    event: K,
    ...args: Parameters<WebSocketEventMap[K]>
  ): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          (listener as Function)(...args);
        } catch (error) {
          console.error(`[WebSocket] Error in ${event} listener:`, error);
        }
      });
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

// Singleton instance
export const wsClient = new WebSocketClient();
