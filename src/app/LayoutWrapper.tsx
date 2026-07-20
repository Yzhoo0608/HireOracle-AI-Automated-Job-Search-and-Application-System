'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { ToastProvider } from '@/components/ui/Toast';

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  
  const isAuthPage = pathname === '/login' || pathname === '/register';

  useEffect(() => {
    // Check auth status
    fetch('/api/auth/me')
      .then(res => {
        if (res.ok) {
          setIsAuthenticated(true);
          if (isAuthPage) router.push('/');
        } else {
          setIsAuthenticated(false);
          if (!isAuthPage) router.push('/login');
        }
      })
      .catch(() => {
        setIsAuthenticated(false);
        if (!isAuthPage) router.push('/login');
      });
  }, [pathname, isAuthPage, router]);

  // Render a minimal layout for auth pages
  if (isAuthPage) {
    return (
      <ToastProvider>
        <main className="min-h-screen bg-background flex flex-col">
          {children}
        </main>
      </ToastProvider>
    );
  }

  // Prevent flashing protected content before auth check completes
  if (isAuthenticated === null) {
    return <div className="min-h-screen bg-background flex flex-col" />;
  }

  if (!isAuthenticated && !isAuthPage) {
     return <div className="min-h-screen bg-background flex flex-col" />;
  }

  // Render the full dashboard layout
  return (
    <ToastProvider>
      <div className="min-h-screen flex" style={{ backgroundColor: '#f8fafc', color: '#0f172a' }}>
        <Sidebar />
        <div className="flex-1 flex flex-col md:ml-64">
          <Header />
          <main className="flex-1 p-6 overflow-x-hidden">
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
