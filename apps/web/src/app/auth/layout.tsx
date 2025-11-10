'use client';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // AuthGuard in the root layout handles all authentication redirects
  // This layout just provides styling for auth pages
  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  );
}
