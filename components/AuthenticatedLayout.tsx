'use client';

import { useSession } from 'next-auth/react';
import InactivityWarning from './InactivityWarning';

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();

  return (
    <>
      {children}
      {/* Only show inactivity warning when user is authenticated */}
      {status === 'authenticated' && session && <InactivityWarning />}
    </>
  );
}