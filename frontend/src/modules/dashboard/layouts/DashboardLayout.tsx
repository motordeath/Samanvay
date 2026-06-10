import React, { useMemo, useState, useEffect } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../app/providers/AuthProvider';
import { workspaceUtils } from '../../../shared/lib/workspace';
import { DashboardTopbar } from '../components/DashboardTopbar';
import { SidebarNavigation } from '../components/SidebarNavigation';

export const DashboardLayout: React.FC = () => {
  const { user, activeWorkspace, logout } = useAuth();
  const location = useLocation();

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('samanvay_sidebar_collapsed') === 'true';
  });

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('samanvay_sidebar_collapsed', String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [location.pathname]);

  // Validate active workspace before rendering layout
  const isValid = useMemo(() => workspaceUtils.isValidWorkspace(activeWorkspace, user), [activeWorkspace, user]);

  if (!user || !isValid) {
    // If somehow landed here without a valid workspace, punt back to resolver
    return <Navigate to="/dashboard" replace />;
  }

  // Compute Topbar props
  let workspaceLabel = 'Unknown Workspace';
  let workspaceTypeStr = 'Workspace';

  if (activeWorkspace?.type === 'volunteer') {
    workspaceLabel = 'Volunteer Operations';
    workspaceTypeStr = 'Volunteer';
  } else if (activeWorkspace?.type === 'organization') {
    const orgMembership = user.memberships?.find(m => m.organization.id === activeWorkspace.organizationId);
    if (orgMembership) {
      workspaceLabel = orgMembership.organization.name;
      workspaceTypeStr = 'Organization';
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-canvas)] text-[var(--color-text-primary)] flex overflow-hidden">
      
      {/* Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-[var(--color-canvas)]/80 lg:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar Region */}
      <div 
        className={`fixed inset-y-0 left-0 z-50 transform lg:relative lg:translate-x-0 transition-[width,transform] duration-200 ease-out flex-shrink-0 border-r border-[var(--color-border)] bg-[var(--color-sidebar)] flex flex-col ${
          isMobileSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'
        } ${isSidebarCollapsed ? 'lg:w-[72px]' : 'lg:w-64'}`}
      >
        <SidebarNavigation isCollapsed={isSidebarCollapsed} />
      </div>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        <DashboardTopbar 
          workspaceLabel={workspaceLabel}
          workspaceType={workspaceTypeStr}
          userName={user.name || 'User'}
          onLogout={logout}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        />

        {/* Content Outlet */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
