import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  FileText, 
  Sparkles, 
  Briefcase, 
  MessageSquare, 
  Settings,
  LogOut,
  X,
  Menu
} from 'lucide-react';

const LinkedinIcon = ({ size = 18, className = '' }: { size?: number; className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
    <rect x="2" y="9" width="4" height="12"/>
    <circle cx="4" cy="4" r="2"/>
  </svg>
);

import { Logo } from '@/frontend/components/ui/Logo';

interface SidebarProps {
  isOpen?: boolean;
  mobileOpen?: boolean;
  onClose?: () => void;
  onToggle?: () => void;
}

export function Sidebar({ isOpen = true, mobileOpen = false, onClose, onToggle }: SidebarProps = {}) {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/jobs', label: 'Job Matches', icon: Sparkles },
    { href: '/cv', label: 'CV Profile', icon: FileText },
    { href: '/applications', label: 'Applications', icon: Briefcase },
    { href: '/interview', label: 'Interview Preparation', icon: MessageSquare },
    { href: '/linkedin', label: 'LinkedIn Analyzer', icon: LinkedinIcon },
    { href: '/settings', label: 'Settings', icon: Settings },
  ];

  const handleLogout = async () => {
    if (onClose) onClose();
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 md:hidden transition-opacity duration-200"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside className={`w-64 fixed inset-y-0 left-0 bg-white border-r border-slate-200/60 flex flex-col transition-all duration-300 ease-in-out z-50 md:z-40 ${
        mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
      } ${
        isOpen ? 'md:translate-x-0' : 'md:-translate-x-full'
      }`}>
        <div className="h-20 flex items-center justify-between px-3.5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <button 
              type="button"
              onClick={onToggle}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors shrink-0"
              aria-label="Toggle sidebar"
              title="Toggle sidebar"
            >
              <Menu size={20} />
            </button>
            <Link href="/" className="hover:opacity-90 transition-opacity" onClick={onClose}>
              <Logo size="md" />
            </Link>
          </div>
          {onClose && (
            <button 
              type="button"
              onClick={onClose}
              className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="Close menu"
            >
              <X size={20} />
            </button>
          )}
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href));
            
            return (
              <Link 
                key={item.href} 
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative ${
                  isActive 
                    ? 'text-blue-600 bg-blue-50/60 font-semibold' 
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-600 rounded-r-full" />
                )}
                <Icon size={18} className={isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'} />
                <span className="font-medium text-sm">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut size={18} />
            <span className="font-medium text-sm">Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
