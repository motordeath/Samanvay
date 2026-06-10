import React, { useState, useEffect } from 'react';
import { api } from '../../../shared/lib/api';
import { NotificationPanel } from './NotificationPanel';
import { Bell, Sun, Moon, PanelLeftClose, PanelLeftOpen, Menu } from 'lucide-react';

interface DashboardTopbarProps {
  workspaceLabel: string;
  workspaceType: string;
  userName: string;
  onLogout: () => void;
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  onToggleMobileSidebar: () => void;
}

export const DashboardTopbar: React.FC<DashboardTopbarProps> = ({
  workspaceLabel,
  workspaceType,
  userName,
  onLogout,
  isSidebarCollapsed,
  onToggleSidebar,
  onToggleMobileSidebar
}) => {
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('samanvay_theme') || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('samanvay_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  useEffect(() => {
    let isMounted = true;
    const fetchUnreadCount = async () => {
      try {
        const res = await api<{ success: boolean; data: { unreadCount: number } }>('/api/notifications/unread-count');
        if (res.success && isMounted) {
          setUnreadCount(res.data.unreadCount);
        }
      } catch (err) {
        console.error('Failed to fetch unread count', err);
      }
    };

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <header className="h-14 bg-[var(--color-canvas)] border-b border-[var(--color-border)] flex items-center justify-between px-4 lg:px-6 sticky top-0 z-20">
      <div className="flex items-center gap-4">
        {/* Mobile Sidebar Toggle */}
        <button 
          onClick={onToggleMobileSidebar}
          className="lg:hidden text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors p-1"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Desktop Sidebar Toggle */}
        <button 
          onClick={onToggleSidebar}
          className="hidden lg:flex text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors p-1"
          aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isSidebarCollapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
        </button>

        {/* Workspace Identifier */}
        <div className="pl-2 lg:pl-0 border-l lg:border-0 border-[var(--color-border)]">
          <h2 className="text-[var(--color-text-primary)] font-medium text-sm leading-tight">{workspaceLabel}</h2>
          <p className="text-[10px] text-[var(--color-text-secondary)] tracking-wider uppercase leading-tight">{workspaceType}</p>
        </div>
      </div>

      <div className="flex items-center gap-4 lg:gap-6 relative">
        {/* Theme Toggle */}
        <button 
          onClick={toggleTheme}
          className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors p-1"
          aria-label="Toggle theme"
        >
          {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
        </button>

        {/* Notifications */}
        <button 
          onClick={() => setIsNotificationPanelOpen(!isNotificationPanelOpen)}
          className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors relative p-1"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-0.5 right-0 w-2.5 h-2.5 bg-[var(--color-warning)] rounded-full border-2 border-[var(--color-canvas)]"></span>
          )}
        </button>

        {isNotificationPanelOpen && (
          <NotificationPanel onClose={() => setIsNotificationPanelOpen(false)} />
        )}

        {/* User Identity & Actions */}
        <div className="hidden sm:flex items-center gap-4 border-l border-[var(--color-border)] pl-6">
          <span className="text-sm text-[var(--color-text-secondary)] font-medium truncate max-w-[150px]">{userName}</span>
          <button 
            onClick={onLogout}
            className="text-xs font-medium px-3 py-1.5 rounded-md border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface)] transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};
