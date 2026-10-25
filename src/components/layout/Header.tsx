'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Search as SearchIcon, Menu } from 'lucide-react';

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fetch user details on mount
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(res => {
        if (res.success && res.data) {
          setUser(res.data);
        }
      })
      .catch(err => console.error('[Header] Failed to load user details:', err));

    // Handle clicks outside of user dropdown to close it
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }
    setPasswordLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      });
      const data = await res.json();
      if (data.success) {
        alert('Password updated successfully!');
        setNewPassword('');
        setDropdownOpen(false);
      } else {
        alert(data.error || 'Failed to update password');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm('Are you absolutely sure you want to delete your account and all associated records? This action is permanent and cannot be undone.')) {
      return;
    }
    setDeleteLoading(true);
    try {
      const res = await fetch('/api/auth/delete-account', {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        alert('Account deleted successfully.');
        router.push('/register');
      } else {
        alert(data.error || 'Failed to delete account');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

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
    <header className="h-20 sticky top-0 z-30 bg-slate-50/80 backdrop-blur-md border-b border-slate-200/60 flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <button className="md:hidden text-slate-500 hover:text-slate-800">
          <Menu size={20} />
        </button>
        <h1 className="text-lg font-semibold text-slate-800 tracking-tight">{getPageTitle()}</h1>
      </div>
      
      <div className="flex items-center gap-4 relative" ref={dropdownRef}>
        <div className="relative hidden md:block">
          <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search jobs, applications..." 
            className="pl-9 pr-4 py-1.5 bg-white border border-slate-200 rounded-full text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 w-64 transition-all"
          />
        </div>
        
        <div 
          onClick={() => setDropdownOpen(!dropdownOpen)} 
          className="w-8 h-8 rounded-full bg-blue-600 p-[2px] cursor-pointer hover:scale-105 transition-transform"
        >
          <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
            <span className="text-xs font-bold text-blue-600">
              {user?.name ? user.name.substring(0, 2).toUpperCase() : 'ME'}
            </span>
          </div>
        </div>

        {dropdownOpen && (
          <div className="absolute right-0 top-12 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl p-5 z-50 animate-slide-up text-slate-700">
            <div className="border-b border-slate-100 pb-3 mb-3">
              <h4 className="font-bold text-slate-800 text-base">{user?.name || 'Loading name...'}</h4>
              <p className="text-xs text-slate-500">{user?.email || 'Loading email...'}</p>
            </div>

            <form onSubmit={handlePasswordChange} className="space-y-3 mb-4">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Change Password</label>
              <div className="flex gap-2">
                <input 
                  type="password" 
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="New password" 
                  className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                />
                <button 
                  type="submit" 
                  disabled={passwordLoading || !newPassword}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-500 disabled:opacity-50 transition-colors"
                >
                  {passwordLoading ? 'Saving...' : 'Update'}
                </button>
              </div>
            </form>

            <div className="border-t border-slate-100 pt-3">
              <button 
                onClick={handleDeleteAccount}
                disabled={deleteLoading}
                className="w-full text-left px-3 py-2 bg-red-50 text-red-600 rounded-xl text-xs font-bold hover:bg-red-100 transition-colors flex items-center justify-center gap-1.5"
              >
                {deleteLoading ? 'Deleting...' : '⚠️ Delete Account & Records'}
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
