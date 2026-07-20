import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  FileText, 
  Search, 
  Briefcase, 
  MessageSquare, 
  Settings,
  LogOut
} from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/cv', label: 'CV Profile', icon: FileText },
    { href: '/applications', label: 'Applications', icon: Briefcase },
    { href: '/interview', label: 'Interview Prep', icon: MessageSquare },
    { href: '/settings', label: 'Settings', icon: Settings },
  ];

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  return (
    <aside className="w-64 fixed inset-y-0 left-0 z-40 bg-white border-r border-slate-200/60 flex flex-col transition-all duration-300 hidden md:flex">
      <div className="h-20 flex items-center px-4 border-b border-slate-100 overflow-hidden justify-center">
        <img src="/logo.png" alt="HireOracle" className="h-32 w-auto object-contain -my-4" />
      </div>

      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href));
          
          return (
            <Link 
              key={item.href} 
              href={item.href}
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
  );
}
