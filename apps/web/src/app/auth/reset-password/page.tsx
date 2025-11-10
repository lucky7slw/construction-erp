'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ResetPasswordForm } from '@/components/auth/reset-password-form';
import { PageSpinner } from '@/components/ui/spinner';

function ResetPasswordPageContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  return <ResetPasswordForm token={token} />;
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<PageSpinner message="Loading..." />}>
      <ResetPasswordPageContent />
    </Suspense>
  );
}
