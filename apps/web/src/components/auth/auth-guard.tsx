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
  const { isAuthenticated, isLoading } = useAuthStore();

  // Check if current route is public
  const isPublicRoute = PUBLIC_ROUTES.some(route => pathname.startsWith(route));

  useEffect(() => {
    // Don't do anything while loading
    if (isLoading) return;

    // Redirect to login if not authenticated and trying to access protected route
    if (!isAuthenticated && !isPublicRoute) {
      router.push(`/auth/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    // Redirect to dashboard if authenticated and trying to access auth pages
    if (isAuthenticated && isPublicRoute) {
      router.push('/dashboard');
      return;
    }
  }, [isAuthenticated, isLoading, isPublicRoute, pathname, router]);

  // Just render children - let the redirects handle navigation
  return <>{children}</>;
}
