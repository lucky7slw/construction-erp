# WebSocket Integration Guide

## Overview

The Construction ERP system includes a real-time WebSocket engine built on Socket.io that enables live collaboration, instant notifications, and synchronized data updates across web and mobile clients.

## Connection Setup

### Web Client (React/Next.js)

```typescript
import { io, Socket } from 'socket.io-client';

// Initialize connection
const socket: Socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001', {
  auth: {
    token: accessToken // JWT token from login
  },
  transports: ['websocket', 'polling'], // Fallback to polling if WebSocket unavailable
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5
});

// Connection events
socket.on('connect', () => {
  console.log('Connected to WebSocket server');
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error.message);
});

socket.on('reconnect', (attemptNumber) => {
  console.log('Reconnected after', attemptNumber, 'attempts');
});
```

### Mobile Client (iOS)

```swift
import SocketIO

class WebSocketManager {
    private var manager: SocketManager!
    private var socket: SocketIOClient!

    func connect(token: String) {
        manager = SocketManager(
            socketURL: URL(string: "http://localhost:3001")!,
            config: [
                .log(true),
                .compress,
                .reconnects(true),
                .reconnectWait(1),
                .auth(["token": token])
            ]
        )

        socket = manager.defaultSocket

        socket.on(clientEvent: .connect) { data, ack in
            print("Socket connected")
        }

        socket.on(clientEvent: .disconnect) { data, ack in
            print("Socket disconnected")
        }

        socket.on(clientEvent: .error) { data, ack in
            print("Socket error: \(data)")
        }

        socket.connect()
    }

    func disconnect() {
        socket.disconnect()
    }
}
```

## Event Types

### Project Events

#### `project:created`
Emitted when a new project is created.

```typescript
socket.on('project:created', (data: {
  id: string;
  name: string;
  companyId: string;
  status: 'planning' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
  createdAt: string;
}) => {
  // Update local state
  addProject(data);
});
```

#### `project:updated`
Emitted when a project is updated.

```typescript
socket.on('project:updated', (data: {
  id: string;
  name: string;
  companyId: string;
  status: 'planning' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
  updatedAt: string;
}) => {
  // Update local state
  updateProject(data);
});
```

#### `project:deleted`
Emitted when a project is deleted.

```typescript
socket.on('project:deleted', (data: {
  id: string;
  companyId: string;
}) => {
  // Remove from local state
  removeProject(data.id);
});
```

#### `task:assigned`
Emitted when a task is assigned to a user.

```typescript
socket.on('task:assigned', (data: {
  taskId: string;
  taskName: string;
  assignedTo: string;
  assignedBy: string;
  projectId: string;
  dueDate?: string;
}) => {
  // Show notification
  showNotification(`New task assigned: ${data.taskName}`);
});
```

### Financial Events

#### `invoice:paid`
Emitted when an invoice is paid.

```typescript
socket.on('invoice:paid', (data: {
  id: string;
  invoiceNumber: string;
  amount: number;
  paidAt: string;
  paidBy: string;
}) => {
  // Update invoice status
  updateInvoiceStatus(data.id, 'paid');
});
```

#### `expense:approved`
Emitted when an expense is approved.

```typescript
socket.on('expense:approved', (data: {
  id: string;
  amount: number;
  status: 'approved';
  approvedAt: string;
}) => {
  // Update expense status
  updateExpenseStatus(data.id, 'approved');
  showNotification('Your expense has been approved');
});
```

#### `expense:rejected`
Emitted when an expense is rejected.

```typescript
socket.on('expense:rejected', (data: {
  id: string;
  amount: number;
  status: 'rejected';
  rejectedAt: string;
  reason?: string;
}) => {
  // Update expense status
  updateExpenseStatus(data.id, 'rejected');
  showNotification(`Expense rejected: ${data.reason}`);
});
```

#### `payment:processed`
Emitted when a payment is processed.

```typescript
socket.on('payment:processed', (data: {
  id: string;
  amount: number;
  method: string;
  status: 'pending' | 'completed' | 'failed';
  processedAt: string;
}) => {
  // Update payment status
  updatePayment(data);
});
```

### Inventory Events

#### `stock:updated`
Emitted when inventory levels change.

```typescript
socket.on('stock:updated', (data: {
  id: string;
  itemName: string;
  quantity: number;
  location?: string;
  updatedAt: string;
}) => {
  // Update inventory display
  updateInventoryItem(data);
});
```

#### `item:added`
Emitted when a new inventory item is added.

```typescript
socket.on('item:added', (data: {
  id: string;
  itemName: string;
  quantity: number;
  location?: string;
  addedAt: string;
}) => {
  // Add to inventory list
  addInventoryItem(data);
});
```

#### `reorder:triggered`
Emitted when inventory drops below reorder level.

```typescript
socket.on('reorder:triggered', (data: {
  itemId: string;
  itemName: string;
  currentStock: number;
  reorderLevel: number;
  suggestedQuantity: number;
}) => {
  // Show reorder notification
  showReorderAlert(data);
});
```

### User Presence Events

#### `user:online`
Emitted when a user comes online.

```typescript
socket.on('user:online', (data: {
  userId: string;
  status: 'online';
  timestamp: string;
}) => {
  // Update user presence indicator
  setUserOnline(data.userId);
});
```

#### `user:offline`
Emitted when a user goes offline.

```typescript
socket.on('user:offline', (data: {
  userId: string;
  status: 'offline';
  timestamp: string;
}) => {
  // Update user presence indicator
  setUserOffline(data.userId);
});
```

#### `user:typing`
Emitted when a user is typing in a shared document.

```typescript
socket.on('user:typing', (data: {
  userId: string;
  userName: string;
  resourceId: string;
  resourceType: string;
}) => {
  // Show typing indicator
  showTypingIndicator(data);
});
```

### Document Collaboration Events

#### `document:updated`
Emitted when a shared document is updated.

```typescript
socket.on('document:updated', (data: {
  documentId: string;
  version: number;
  data: any;
  updatedBy: string;
  updatedAt: string;
}) => {
  // Update document
  updateDocument(data);
});
```

#### `document:conflict`
Emitted when a version conflict is detected.

```typescript
socket.on('document:conflict', (data: {
  documentId: string;
  strategy: 'last-write-wins' | 'merge' | 'manual';
  conflictedFields: string[];
  originalValue: any;
  incomingValue: any;
  timestamp: string;
}) => {
  // Show conflict resolution UI
  showConflictDialog(data);
});
```

#### `conflict:resolved`
Emitted when a conflict is resolved.

```typescript
socket.on('conflict:resolved', (data: {
  documentId?: string;
  resourceId?: string;
  strategy: 'last-write-wins' | 'merge' | 'manual';
  conflictedFields: string[];
  originalValue: any;
  incomingValue: any;
  resolvedValue: any;
  timestamp: string;
}) => {
  // Apply resolved value
  applyResolvedValue(data);
  showNotification('Conflict resolved');
});
```

### Notification Events

#### `notification:new`
Emitted when a new notification is created.

```typescript
socket.on('notification:new', (data: {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  userId: string;
  createdAt: string;
  actionUrl?: string;
}) => {
  // Show notification toast
  showToast(data);

  // Add to notification list
  addNotification(data);
});
```

## React Integration Example

### Custom Hook for WebSocket

```typescript
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/hooks/useAuth';

export function useWebSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const { accessToken } = useAuth();

  useEffect(() => {
    if (!accessToken) return;

    const socketInstance = io(process.env.NEXT_PUBLIC_API_URL!, {
      auth: { token: accessToken },
      transports: ['websocket', 'polling']
    });

    socketInstance.on('connect', () => {
      setConnected(true);
      console.log('WebSocket connected');
    });

    socketInstance.on('disconnect', () => {
      setConnected(false);
      console.log('WebSocket disconnected');
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [accessToken]);

  return { socket, connected };
}
```

### Project List Component with Real-time Updates

```typescript
import { useEffect } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useProjects } from '@/hooks/useProjects';

export function ProjectList() {
  const { socket } = useWebSocket();
  const { projects, addProject, updateProject, removeProject } = useProjects();

  useEffect(() => {
    if (!socket) return;

    // Listen for project events
    socket.on('project:created', (data) => {
      addProject(data);
    });

    socket.on('project:updated', (data) => {
      updateProject(data);
    });

    socket.on('project:deleted', (data) => {
      removeProject(data.id);
    });

    // Cleanup
    return () => {
      socket.off('project:created');
      socket.off('project:updated');
      socket.off('project:deleted');
    };
  }, [socket, addProject, updateProject, removeProject]);

  return (
    <div>
      {projects.map(project => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </div>
  );
}
```

### Notification Toast System

```typescript
import { useEffect } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { toast } from '@/components/ui/toast';

export function NotificationListener() {
  const { socket } = useWebSocket();

  useEffect(() => {
    if (!socket) return;

    socket.on('notification:new', (data) => {
      toast({
        title: data.title,
        description: data.message,
        variant: data.type,
        action: data.actionUrl ? {
          label: 'View',
          onClick: () => window.location.href = data.actionUrl!
        } : undefined
      });
    });

    return () => {
      socket.off('notification:new');
    };
  }, [socket]);

  return null;
}
```

## Emitting Events to Server

### Document Update

```typescript
// Client sends document update
socket.emit('document:update', {
  documentId: 'doc-123',
  version: currentVersion,
  data: updatedContent,
  userId: currentUserId
});

// Server will broadcast to other users and handle conflicts
```

### Resource Update

```typescript
// Client sends resource update
socket.emit('resource:update', {
  resourceId: 'resource-456',
  version: currentVersion,
  data: updatedData,
  timestamp: new Date().toISOString()
});
```

## Error Handling

### Connection Errors

```typescript
socket.on('connect_error', (error) => {
  if (error.message.includes('authentication')) {
    // Token expired, refresh and reconnect
    refreshToken().then(newToken => {
      socket.auth = { token: newToken };
      socket.connect();
    });
  } else {
    // Network error, will auto-retry
    console.error('Connection error:', error.message);
  }
});
```

### Event Errors

```typescript
socket.on('error', (error) => {
  console.error('Socket error:', error);
  showErrorNotification('Real-time updates temporarily unavailable');
});
```

## Best Practices

### 1. Always Clean Up Listeners

```typescript
useEffect(() => {
  if (!socket) return;

  const handleProjectUpdate = (data) => {
    updateProject(data);
  };

  socket.on('project:updated', handleProjectUpdate);

  return () => {
    socket.off('project:updated', handleProjectUpdate);
  };
}, [socket, updateProject]);
```

### 2. Handle Offline Scenarios

```typescript
const [isOnline, setIsOnline] = useState(navigator.onLine);

useEffect(() => {
  const handleOnline = () => {
    setIsOnline(true);
    socket?.connect();
  };

  const handleOffline = () => {
    setIsOnline(false);
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}, [socket]);
```

### 3. Implement Optimistic Updates

```typescript
async function updateProject(projectId: string, updates: Partial<Project>) {
  // Optimistically update UI
  const originalProject = getProject(projectId);
  updateProjectLocally(projectId, updates);

  try {
    // Send to server
    await api.put(`/projects/${projectId}`, updates);

    // Server will broadcast via WebSocket to all clients
  } catch (error) {
    // Revert on error
    updateProjectLocally(projectId, originalProject);
    showError('Failed to update project');
  }
}
```

### 4. Debounce Frequent Events

```typescript
import { debounce } from 'lodash';

const emitTyping = debounce((documentId: string) => {
  socket.emit('user:typing', {
    documentId,
    userId: currentUserId,
    userName: currentUserName
  });
}, 500);

// Call on every keystroke
function handleDocumentChange(documentId: string, content: string) {
  emitTyping(documentId);
  // ... update content
}
```

## Performance Considerations

### Selective Event Subscriptions

Only subscribe to events you need:

```typescript
// Bad: Subscribe to all events everywhere
socket.on('project:updated', handleUpdate);
socket.on('expense:approved', handleUpdate);
socket.on('invoice:paid', handleUpdate);
// ... 20 more listeners

// Good: Only subscribe to relevant events per component
// In ProjectList component
socket.on('project:updated', handleProjectUpdate);

// In ExpenseList component
socket.on('expense:approved', handleExpenseUpdate);
```

### Batch Updates

If receiving many rapid updates, batch them:

```typescript
const updateQueue: Update[] = [];
let timeoutId: NodeJS.Timeout;

socket.on('project:updated', (data) => {
  updateQueue.push(data);

  clearTimeout(timeoutId);
  timeoutId = setTimeout(() => {
    batchUpdateProjects(updateQueue);
    updateQueue.length = 0;
  }, 100);
});
```

## Security

### Authentication

All WebSocket connections require a valid JWT token:

```typescript
// Token is validated on connection
socket.auth = { token: accessToken };

// Server rejects connections without valid token
socket.on('connect_error', (error) => {
  if (error.message.includes('authentication')) {
    // Redirect to login
    window.location.href = '/login';
  }
});
```

### Authorization

Users only receive events they're authorized to see:

- Company-scoped events only sent to users in that company
- User-specific events only sent to that user
- Document access controlled server-side

## Troubleshooting

### Connection Fails

1. **Check token validity**: Ensure JWT token is not expired
2. **Check CORS**: Ensure frontend origin is allowed in server config
3. **Check network**: Ensure no firewall blocking WebSocket connections
4. **Fallback to polling**: Socket.io will automatically try polling if WebSocket fails

### Events Not Received

1. **Check room membership**: Ensure user is in correct rooms
2. **Check event names**: Ensure exact spelling (case-sensitive)
3. **Check console**: Look for connection or authentication errors
4. **Test with simple event**: Try `socket.on('connect')` first

### Memory Leaks

1. **Always remove listeners**: Use `socket.off()` in cleanup
2. **Don't create new listeners**: Use stable references in `useEffect`
3. **Monitor connection count**: Check for duplicate connections

## Production Deployment

### SSL/TLS

Enable secure WebSocket connections:

```typescript
const socket = io('https://api.example.com', { // wss:// automatically used
  auth: { token: accessToken },
  transports: ['websocket', 'polling']
});
```

### Load Balancing

Configure load balancer for sticky sessions OR use Redis adapter (already implemented).

### Monitoring

Track these metrics:
- Active connections
- Messages per second
- Connection failures
- Reconnection rate
- Message delivery latency

## Support

For issues or questions:
- Check server logs: `apps/api/logs`
- Check WebSocket health: `GET /health/websocket`
- Review this documentation
- Contact backend team for server-side issues