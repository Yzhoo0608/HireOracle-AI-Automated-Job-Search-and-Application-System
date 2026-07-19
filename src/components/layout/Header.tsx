import React from 'react';
import { usePathname } from 'next/navigation';
import { Bell, Search as SearchIcon, Menu } from 'lucide-react';

export function Header() {
  const pathname = usePathname();
  
  const getPageTitle = () => {
    switch (pathname) {
      case '/': return 'Dashboard Overview';
      case '/cv': return 'CV Profile Analysis';
      case '/jobs': return 'AI Job Discovery';
      case '/applications': return 'Application Pipeline';
      case '/interview': return 'AI Interview Prep';
      case '/settings': return 'System Settings';
      default: return 'AI Job Agent';
    }
  };

  return (
    <header className="h-16 sticky top-0 z-30 bg-[#0f172a]/80 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <button className="md:hidden text-slate-400 hover:text-white">
          <Menu size={20} />
        </button>
        <h1 className="text-lg font-semibold text-white tracking-tight">{getPageTitle()}</h1>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="relative hidden md:block">
          <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input 
            type="text" 
            placeholder="Search jobs, applications..." 
            className="pl-9 pr-4 py-1.5 bg-slate-900 border border-slate-800 rounded-full text-sm text-slate-300 focus:outline-none focus:border-slate-600 focus:ring-1 focus:ring-slate-600 w-64 transition-all"
          />
        </div>
        
        <button className="relative p-2 text-slate-400 hover:text-white transition-colors rounded-full hover:bg-slate-800">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full ring-2 ring-background"></span>
        </button>
        
        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-accent to-secondary p-[2px] cursor-pointer">
          <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center">
            <span className="text-xs font-bold text-white">ME</span>
          </div>
        </div>
      </div>
    </header>
  );
}
