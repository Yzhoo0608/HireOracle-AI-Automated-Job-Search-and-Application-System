'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from '@/frontend/components/layout/Sidebar';
import { Header } from '@/frontend/components/layout/Header';
import { ToastProvider } from '@/frontend/components/ui/Toast';

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  const isAuthPage = pathname === '/login' || pathname === '/register' || pathname === '/forgot-password' || pathname === '/change-password' || pathname === '/reset-password';

  // Close mobile drawer on route navigation
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const toggleSidebar = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setMobileMenuOpen(prev => !prev);
    } else {
      setIsSidebarOpen(prev => !prev);
    }
  };

  useEffect(() => {
    // Check auth status
    fetch('/api/auth/me')
      .then(async res => {
        if (res.ok) {
          const json = await res.json().catch(() => null);
          const forceChange = json?.data?.force_password_change === true;

          if (forceChange) {
            setIsAuthenticated(false);
            if (!isAuthPage && pathname !== '/change-password') {
              router.push('/change-password');
            }
            return;
          }

          setIsAuthenticated(true);
          if (isAuthPage && pathname !== '/change-password') {
            router.push('/');
          }
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
        <Sidebar 
          isOpen={isSidebarOpen}
          mobileOpen={mobileMenuOpen} 
          onClose={() => setMobileMenuOpen(false)} 
          onToggle={toggleSidebar}
        />
        <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${
          isSidebarOpen ? 'md:ml-64' : 'md:ml-0'
        }`}>
          <Header onToggleSidebar={toggleSidebar} isSidebarOpen={isSidebarOpen} />
          <main className="flex-1 p-6 overflow-x-hidden">
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
