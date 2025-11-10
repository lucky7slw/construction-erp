'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth-store';

interface AuthGuardProps {
  children: React.ReactNode;
}

// Routes that don't require authentication
const PUBLIC_ROUTES = ['/auth/login', '/auth/register'];

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading, _hasHydrated } = useAuthStore();

  // Check if current route is public
  const isPublicRoute = PUBLIC_ROUTES.some(route => pathname.startsWith(route));

  useEffect(() => {
    console.log('[AuthGuard] State check:', {
      pathname,
      _hasHydrated,
      isAuthenticated,
      isLoading,
      isPublicRoute
    });

    // Don't do anything until store has rehydrated
    if (!_hasHydrated) {
      console.log('[AuthGuard] Waiting for rehydration...');
      return;
    }

    // Don't do anything while loading
    if (isLoading) {
      console.log('[AuthGuard] Auth is loading, waiting...');
      return;
    }

    // Redirect to login if not authenticated and trying to access protected route
    if (!isAuthenticated && !isPublicRoute) {
      console.log('[AuthGuard] Not authenticated, redirecting to login');
      router.push(`/auth/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    // Redirect to dashboard if authenticated and trying to access auth pages
    if (isAuthenticated && isPublicRoute) {
      console.log('[AuthGuard] Authenticated on auth page, redirecting to dashboard');
      router.push('/dashboard');
      return;
    }

    console.log('[AuthGuard] All checks passed, rendering page');
  }, [_hasHydrated, isAuthenticated, isLoading, isPublicRoute, pathname, router]);

  // Show loading while hydrating
  if (!_hasHydrated) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Just render children - let the redirects handle navigation
  return <>{children}</>;
}
