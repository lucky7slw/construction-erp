'use client';

import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useAuthStore } from '@/lib/store/auth-store';
import { apiClient } from '@/lib/api/client';
import { WebSocketProvider } from '@/lib/websocket/provider';
import { ThemeProvider } from '@/components/theme-provider';
import { ThemeProvider as BrandingThemeProvider } from '@/lib/theme-provider';

interface ProvidersProps {
  children: React.ReactNode;
}

function AuthInitializer({ children }: { children: React.ReactNode }) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const refreshToken = useAuthStore((state) => state.refreshToken);

  // Set tokens IMMEDIATELY (before render completes) using useLayoutEffect
  React.useLayoutEffect(() => {
    if (accessToken && refreshToken) {
      apiClient.setAccessToken(accessToken);
      apiClient.setRefreshToken(refreshToken);
    } else {
      apiClient.setAccessToken(null);
      apiClient.setRefreshToken(null);
    }
  }, [accessToken, refreshToken]);

  return <>{children}</>;
}

export function Providers({ children }: ProvidersProps) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Stale time: how long data is considered fresh
            staleTime: 5 * 60 * 1000, // 5 minutes
            // Cache time: how long data stays in cache after component unmounts
            gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
            // Retry failed requests
            retry: (failureCount, error) => {
              // Don't retry for authentication errors
              if (error instanceof Error && error.message.includes('401')) {
                return false;
              }
              // Retry up to 2 times for other errors
              return failureCount < 2;
            },
            // Refetch on window focus
            refetchOnWindowFocus: true,
            // Refetch on reconnect
            refetchOnReconnect: true,
          },
          mutations: {
            // Retry failed mutations once
            retry: 1,
          },
        },
      })
  );

  return (
    <BrandingThemeProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem
        disableTransitionOnChange
      >
        <QueryClientProvider client={queryClient}>
          <AuthInitializer>
            <WebSocketProvider>
              {children}
            </WebSocketProvider>
          </AuthInitializer>
          <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
      </ThemeProvider>
    </BrandingThemeProvider>
  );
}