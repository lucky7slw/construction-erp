'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth-store';

interface AuthGuardProps {
  children: React.ReactNode;
}

// Routes that don't require authentication
const PUBLIC_ROUTES = ['/auth/login', '/auth/register', '/auth/forgot-password', '/auth/reset-password'];

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading, refreshAuth } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      // Skip auth check for public routes
      if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
        setIsChecking(false);
        return;
      }

      // If not authenticated, try to refresh from stored tokens
      if (!isAuthenticated && !isLoading) {
        try {
          await refreshAuth();
        } catch (error) {
          // Refresh failed, redirect to login
          console.log('[AuthGuard] Session expired, redirecting to login');
          router.push(`/auth/login?redirect=${encodeURIComponent(pathname)}`);
          return;
        }
      }

      setIsChecking(false);
    };

    checkAuth();
  }, [pathname, isAuthenticated, isLoading, refreshAuth, router]);

  // Redirect to login if not authenticated (and not already on a public route)
  useEffect(() => {
    if (!isChecking && !isAuthenticated && !isLoading) {
      if (!PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
        console.log('[AuthGuard] Not authenticated, redirecting to login');
        router.push(`/auth/login?redirect=${encodeURIComponent(pathname)}`);
      }
    }
  }, [isChecking, isAuthenticated, isLoading, pathname, router]);

  // Redirect authenticated users away from auth pages
  useEffect(() => {
    if (!isChecking && isAuthenticated && PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
      console.log('[AuthGuard] Already authenticated, redirecting to dashboard');
      router.push('/dashboard');
    }
  }, [isChecking, isAuthenticated, pathname, router]);

  // Show loading state while checking authentication
  if (isChecking || isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Don't render protected content if not authenticated
  if (!isAuthenticated && !PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    return null;
  }

  return <>{children}</>;
}
