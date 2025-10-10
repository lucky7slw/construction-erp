import { z } from 'zod';

// WebSocket event schemas
export const projectEventSchema = z.object({
  id: z.string(),
  name: z.string(),
  companyId: z.string(),
  status: z.enum(['planning', 'in_progress', 'on_hold', 'completed', 'cancelled']),
  updatedAt: z.string()
});

export const expenseEventSchema = z.object({
  id: z.string(),
  amount: z.number(),
  status: z.enum(['pending', 'approved', 'rejected', 'paid']),
  approvedAt: z.string().optional()
});

export const inventoryEventSchema = z.object({
  id: z.string(),
  itemName: z.string(),
  quantity: z.number(),
  location: z.string().optional(),
  updatedAt: z.string()
});

export const documentUpdateSchema = z.object({
  documentId: z.string(),
  version: z.number(),
  data: z.any(),
  userId: z.string(),
  timestamp: z.string().optional()
});

export const resourceUpdateSchema = z.object({
  resourceId: z.string(),
  version: z.number(),
  data: z.any(),
  timestamp: z.string()
});

// Type inference from schemas
export type ProjectEvent = z.infer<typeof projectEventSchema>;
export type ExpenseEvent = z.infer<typeof expenseEventSchema>;
export type InventoryEvent = z.infer<typeof inventoryEventSchema>;
export type DocumentUpdate = z.infer<typeof documentUpdateSchema>;
export type ResourceUpdate = z.infer<typeof resourceUpdateSchema>;

// WebSocket event types
export type WebSocketEventMap = {
  // Connection events
  'connect': void;
  'disconnect': void;
  'error': Error;

  // User presence events
  'user:online': UserPresenceEvent;
  'user:offline': UserPresenceEvent;
  'user:typing': TypingEvent;
  'user:idle': IdleEvent;

  // Project events
  'project:created': ProjectEvent;
  'project:updated': ProjectEvent;
  'project:deleted': { id: string; companyId: string };
  'task:assigned': TaskAssignedEvent;

  // Financial events
  'invoice:paid': InvoiceEvent;
  'expense:approved': ExpenseEvent;
  'expense:rejected': ExpenseEvent;
  'payment:processed': PaymentEvent;

  // Inventory events
  'stock:updated': InventoryEvent;
  'item:added': InventoryEvent;
  'reorder:triggered': ReorderEvent;

  // Document events
  'document:updated': DocumentEvent;
  'document:conflict': ConflictEvent;

  // Conflict resolution events
  'conflict:resolved': ConflictResolutionEvent;

  // Notification events
  'notification:new': NotificationEvent;

  // Room verification (for testing)
  'room:verified': { inRoom: boolean };
};

// Event payload types
export interface UserPresenceEvent {
  userId: string;
  status: 'online' | 'offline';
  timestamp: string;
}

export interface TypingEvent {
  userId: string;
  userName: string;
  resourceId: string;
  resourceType: string;
}

export interface IdleEvent {
  userId: string;
  lastActivity: string;
}

export interface TaskAssignedEvent {
  taskId: string;
  taskName: string;
  assignedTo: string;
  assignedBy: string;
  projectId: string;
  dueDate?: string;
}

export interface InvoiceEvent {
  id: string;
  invoiceNumber: string;
  amount: number;
  paidAt: string;
  paidBy: string;
}

export interface PaymentEvent {
  id: string;
  amount: number;
  method: string;
  status: 'pending' | 'completed' | 'failed';
  processedAt: string;
}

export interface ReorderEvent {
  itemId: string;
  itemName: string;
  currentStock: number;
  reorderLevel: number;
  suggestedQuantity: number;
}

export interface DocumentEvent {
  documentId: string;
  version: number;
  data: any;
  updatedBy: string;
  updatedAt: string;
}

export interface ConflictEvent {
  documentId?: string;
  resourceId?: string;
  strategy: 'last-write-wins' | 'merge' | 'manual';
  conflictedFields: string[];
  originalValue: any;
  incomingValue: any;
  timestamp: string;
}

export interface ConflictResolutionEvent {
  documentId?: string;
  resourceId?: string;
  strategy: 'last-write-wins' | 'merge' | 'manual';
  conflictedFields: string[];
  originalValue: any;
  incomingValue: any;
  resolvedValue: any;
  timestamp: string;
}

export interface NotificationEvent {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  userId: string;
  createdAt: string;
  actionUrl?: string;
}

// Connection configuration
export interface WebSocketConfig {
  url: string;
  path?: string;
  transports?: ('websocket' | 'polling')[];
  reconnection?: boolean;
  reconnectionDelay?: number;
  reconnectionAttempts?: number;
  timeout?: number;
}

// Client-side socket interface
export interface WebSocketClient {
  connect(): void;
  disconnect(): void;
  emit<K extends keyof WebSocketEventMap>(event: K, data: WebSocketEventMap[K]): void;
  on<K extends keyof WebSocketEventMap>(event: K, callback: (data: WebSocketEventMap[K]) => void): void;
  off<K extends keyof WebSocketEventMap>(event: K): void;
  isConnected(): boolean;
}