'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { LoginForm } from '@/components/auth/login-form';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const redirect = searchParams.get('redirect') || '/dashboard';

  return (
    <LoginForm
      onSuccess={() => router.push(redirect)}
    />
  );
}