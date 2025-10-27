'use client';

import * as React from 'react';
import { wsClient } from './client';
import { useAuthStore } from '@/lib/store/auth-store';
import { useQueryClient } from '@tanstack/react-query';
import { projectKeys } from '@/lib/query/hooks/use-projects';
import { estimateKeys } from '@/lib/query/hooks/use-estimates';

type WebSocketContextType = {
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
};

const WebSocketContext = React.createContext<WebSocketContextType | null>(null);

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = React.useState(false);
  const accessToken = useAuthStore((state) => state.accessToken);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const queryClient = useQueryClient();

  const connect = React.useCallback(() => {
    if (!accessToken) {
      console.warn('[WebSocket Provider] No access token available');
      return;
    }

    wsClient.connect(accessToken);
  }, [accessToken]);

  const disconnect = React.useCallback(() => {
    wsClient.disconnect();
    setIsConnected(false);
  }, []);

  // Auto-connect when authenticated
  React.useEffect(() => {
    if (isAuthenticated && accessToken) {
      console.log('[WebSocket Provider] Auto-connecting...');
      connect();
    } else {
      console.log('[WebSocket Provider] Disconnecting (not authenticated)');
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [isAuthenticated, accessToken, connect, disconnect]);

  // Set up event listeners
  React.useEffect(() => {
    const handleConnect = () => {
      console.log('[WebSocket Provider] Connected');
      setIsConnected(true);
    };

    const handleDisconnect = () => {
      console.log('[WebSocket Provider] Disconnected');
      setIsConnected(false);
    };

    const handleError = (error: Error) => {
      console.error('[WebSocket Provider] Error:', error);
    };

    // Project events - invalidate queries to refetch data
    const handleProjectCreated = () => {
      console.log('[WebSocket Provider] Project created, invalidating queries');
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    };

    const handleProjectUpdated = (data: any) => {
      console.log('[WebSocket Provider] Project updated:', data.project.id);
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(data.project.id) });
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    };

    const handleProjectDeleted = (data: any) => {
      console.log('[WebSocket Provider] Project deleted:', data.projectId);
      queryClient.removeQueries({ queryKey: projectKeys.detail(data.projectId) });
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    };

    // Estimate events
    const handleEstimateCreated = () => {
      console.log('[WebSocket Provider] Estimate created, invalidating queries');
      queryClient.invalidateQueries({ queryKey: estimateKeys.lists() });
    };

    const handleEstimateUpdated = (data: any) => {
      console.log('[WebSocket Provider] Estimate updated:', data.estimate.id);
      queryClient.invalidateQueries({ queryKey: estimateKeys.detail(data.estimate.id) });
      queryClient.invalidateQueries({ queryKey: estimateKeys.lists() });
    };

    const handleEstimateApproved = (data: any) => {
      console.log('[WebSocket Provider] Estimate approved:', data.estimate.id);
      queryClient.invalidateQueries({ queryKey: estimateKeys.detail(data.estimate.id) });
      queryClient.invalidateQueries({ queryKey: estimateKeys.lists() });
    };

    const handleEstimateDeleted = (data: any) => {
      console.log('[WebSocket Provider] Estimate deleted:', data.estimateId);
      queryClient.removeQueries({ queryKey: estimateKeys.detail(data.estimateId) });
      queryClient.invalidateQueries({ queryKey: estimateKeys.lists() });
    };

    // Register all event listeners
    wsClient.on('connect', handleConnect);
    wsClient.on('disconnect', handleDisconnect);
    wsClient.on('error', handleError);
    wsClient.on('project:created', handleProjectCreated);
    wsClient.on('project:updated', handleProjectUpdated);
    wsClient.on('project:deleted', handleProjectDeleted);
    wsClient.on('estimate:created', handleEstimateCreated);
    wsClient.on('estimate:updated', handleEstimateUpdated);
    wsClient.on('estimate:approved', handleEstimateApproved);
    wsClient.on('estimate:deleted', handleEstimateDeleted);

    // Cleanup
    return () => {
      wsClient.off('connect', handleConnect);
      wsClient.off('disconnect', handleDisconnect);
      wsClient.off('error', handleError);
      wsClient.off('project:created', handleProjectCreated);
      wsClient.off('project:updated', handleProjectUpdated);
      wsClient.off('project:deleted', handleProjectDeleted);
      wsClient.off('estimate:created', handleEstimateCreated);
      wsClient.off('estimate:updated', handleEstimateUpdated);
      wsClient.off('estimate:approved', handleEstimateApproved);
      wsClient.off('estimate:deleted', handleEstimateDeleted);
    };
  }, [queryClient]);

  const value = React.useMemo(
    () => ({
      isConnected,
      connect,
      disconnect,
    }),
    [isConnected, connect, disconnect]
  );

  return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>;
}

export function useWebSocket() {
  const context = React.useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}
