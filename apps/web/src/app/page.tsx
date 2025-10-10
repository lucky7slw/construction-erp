'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth-store';
import { LoginForm } from '@/components/auth/login-form';
import { PageSpinner } from '@/components/ui/spinner';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();

  React.useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return <PageSpinner message="Checking authentication..." />;
  }

  if (isAuthenticated) {
    return <PageSpinner message="Redirecting to dashboard..." />;
  }

  return (
    <LoginForm
      onSuccess={() => router.push('/dashboard')}
    />
  );
}