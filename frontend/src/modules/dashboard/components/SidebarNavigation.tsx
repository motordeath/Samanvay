import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../../app/providers/AuthProvider';
import { workspaceUtils } from '../../../shared/lib/workspace';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';
import {
  LayoutDashboard,
  Briefcase,
  Activity,
  CalendarClock,
  UserCircle,
  Package,
  Users,
  ClipboardList,
  ArrowLeftRight
} from 'lucide-react';

interface NavItem {
  label: string;
  path: string;
  icon: React.FC<{ className?: string }>;
}

const volunteerNavigation: NavItem[] = [
  { label: 'Overview', path: '/dashboard/overview', icon: LayoutDashboard },
  { label: 'Assignments', path: '/dashboard/assignments', icon: Briefcase },
  { label: 'Activity', path: '/dashboard/activity', icon: Activity },
  { label: 'Availability', path: '/dashboard/availability', icon: CalendarClock },
  { label: 'Profile', path: '/dashboard/profile', icon: UserCircle },
];

const organizationNavigation: NavItem[] = [
  { label: 'Overview', path: '/dashboard/overview', icon: LayoutDashboard },
  { label: 'Inventory', path: '/dashboard/inventory', icon: Package },
  { label: 'Volunteers', path: '/dashboard/volunteers', icon: Users },
  { label: 'Requests', path: '/dashboard/requests', icon: ClipboardList },
  { label: 'Transfers', path: '/dashboard/transfers', icon: ArrowLeftRight },
  { label: 'Activity', path: '/dashboard/activity', icon: Activity },
];

interface SidebarNavigationProps {
  isCollapsed: boolean;
}

export const SidebarNavigation: React.FC<SidebarNavigationProps> = ({ isCollapsed }) => {
  const { activeWorkspace, user } = useAuth();

  let navItems: NavItem[] = [];

  if (workspaceUtils.isVolunteerWorkspace(activeWorkspace)) {
    navItems = volunteerNavigation;
  } else if (workspaceUtils.isOrganizationWorkspace(activeWorkspace)) {
    const orgId = workspaceUtils.getOrganizationWorkspaceId(activeWorkspace);
    const orgMembership = user?.memberships?.find(m => m.organization.id === orgId);

    if (orgMembership?.status === 'ACTIVE') {
      navItems = organizationNavigation;
    }
  }

  return (
    <div className="flex flex-col h-full bg-[var(--color-sidebar)] overflow-hidden">
      <div className={`h-14 border-b border-[var(--color-border)] flex items-center shrink-0 ${isCollapsed ? 'justify-center' : 'px-6'}`}>
        <h1 className={`text-xl font-medium tracking-wide text-[var(--color-text-primary)] transition-opacity duration-200 ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>
          Samanvay
        </h1>
        {isCollapsed && (
          <span className="text-xl font-medium tracking-wide text-[var(--color-text-primary)] absolute">
            S
          </span>
        )}
      </div>

      <WorkspaceSwitcher isCollapsed={isCollapsed} />

      <nav className={`flex-1 overflow-y-auto py-6 space-y-1 ${isCollapsed ? 'px-2' : 'px-4'}`}>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `group relative flex items-center rounded-lg transition-colors text-sm font-medium ${isCollapsed ? 'justify-center py-3' : 'gap-3 px-4 py-3'
                } ${isActive
                  ? 'bg-[var(--color-surface-elevated)] text-[var(--color-primary)]'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface)]'
                }`
              }
              aria-label={item.label}
            >
              <Icon className="w-5 h-5 shrink-0" />

              {!isCollapsed && (
                <span className="truncate">{item.label}</span>
              )}

              {/* Tooltip for collapsed mode */}
              {isCollapsed && (
                <div className="absolute left-full ml-4 px-2.5 py-1.5 bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)] text-xs font-medium rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap shadow-md border border-[var(--color-border)]">
                  {item.label}
                </div>
              )}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
};
