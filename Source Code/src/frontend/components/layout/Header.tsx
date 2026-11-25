'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, KeyRound, ChevronRight, Settings as SettingsIcon, Pencil, Check } from 'lucide-react';

interface HeaderProps {
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

export function Header({ onToggleSidebar, isSidebarOpen = true }: HeaderProps = {}) {
  const pathname = usePathname();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState('');
  const [nameLoading, setNameLoading] = useState(false);
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

  const handleNameChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      alert('Name cannot be empty');
      return;
    }
    setNameLoading(true);
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setUser(prev => prev ? { ...prev, name: data.data.name } : null);
        setIsEditingName(false);
      } else {
        alert(data.error || 'Failed to update name');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update name');
    } finally {
      setNameLoading(false);
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
      case '/': return 'Dashboard';
      case '/cv': return 'CV Profile Analysis';
      case '/jobs': return 'Job Matches';
      case '/applications': return 'Application';
      case '/interview': return 'Interview Preparation';
      case '/linkedin': return 'Profile Optimization';
      case '/settings': return 'Settings';
      default: return 'AI Job Agent';
    }
  };

  return (
    <header className="h-20 sticky top-0 z-30 bg-slate-50/80 backdrop-blur-md border-b border-slate-200/60 flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <button 
          type="button"
          onClick={onToggleSidebar}
          className={`${isSidebarOpen ? 'md:hidden' : 'flex'} p-1.5 -ml-1 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors`}
          aria-label={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          title={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          <Menu size={20} />
        </button>
        <h1 className="text-lg font-semibold text-slate-800 tracking-tight">{getPageTitle()}</h1>
      </div>
      
      <div className="flex items-center gap-4 relative" ref={dropdownRef}>
        
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
          <div className="absolute right-0 top-11 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl p-4 z-50 animate-slide-up text-slate-700">
            <div className="border-b border-slate-100 pb-3 mb-3">
              {isEditingName ? (
                <form onSubmit={handleNameChange} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700">Change Name</span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingName(false);
                        setEditName(user?.name || '');
                      }}
                      className="text-slate-400 hover:text-slate-600 text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Enter your name"
                    maxLength={50}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 bg-slate-50"
                    autoFocus
                    required
                  />
                  <button
                    type="submit"
                    disabled={nameLoading}
                    className="w-full px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Check size={13} />
                    {nameLoading ? 'Saving...' : 'Save Name'}
                  </button>
                </form>
              ) : (
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="font-bold text-slate-800 text-sm truncate">{user?.name || 'Your Profile'}</h4>
                    <p className="text-xs text-slate-500 truncate">{user?.email || 'Loading email...'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditName(user?.name || '');
                      setIsEditingName(true);
                    }}
                    className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors shrink-0"
                    title="Change name"
                  >
                    <Pencil size={13} />
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-1.5 mb-3">
              <Link 
                href="/settings#security"
                onClick={() => setDropdownOpen(false)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-700 bg-slate-50 hover:bg-blue-50 hover:text-blue-600 transition-colors border border-slate-200/60"
              >
                <span className="flex items-center gap-2">
                  <KeyRound size={15} className="text-blue-600" />
                  Change Password & Security
                </span>
                <ChevronRight size={13} className="text-slate-400" />
              </Link>
            </div>

            <div className="border-t border-slate-100 pt-2.5">
              <button 
                onClick={handleDeleteAccount}
                disabled={deleteLoading}
                className="w-full text-center px-3 py-2 bg-red-50 text-red-600 rounded-xl text-xs font-bold hover:bg-red-100 transition-colors"
              >
                {deleteLoading ? 'Deleting...' : 'Delete Account & Records'}
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
