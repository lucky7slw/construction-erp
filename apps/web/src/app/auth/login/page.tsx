'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LoginForm } from '@/components/auth/login-form';
import { PageSpinner } from '@/components/ui/spinner';

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const redirect = searchParams.get('redirect') || '/dashboard';

  return (
    <LoginForm
      onSuccess={() => router.push(redirect)}
    />
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<PageSpinner message="Loading..." />}>
      <LoginPageContent />
    </Suspense>
  );
}