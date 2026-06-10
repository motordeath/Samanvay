import React from 'react';
import { useAuth } from '../../../app/providers/AuthProvider';
import { workspaceUtils } from '../../../shared/lib/workspace';

interface WorkspaceSwitcherProps {
  isCollapsed: boolean;
}

export const WorkspaceSwitcher: React.FC<WorkspaceSwitcherProps> = ({ isCollapsed }) => {
  const { user, activeWorkspace, setActiveWorkspace } = useAuth();

  if (!user) return null;

  const activeMemberships = (user.memberships || []).filter(m => m.status === 'ACTIVE');
  const pendingMemberships = (user.memberships || []).filter(m => m.status === 'PENDING');
  const hasVolunteer = !!user.volunteer;

  return (
    <div className={`p-4 border-b border-[var(--color-border)] ${isCollapsed ? 'px-2' : ''}`}>
      {!isCollapsed && (
        <div className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-3 px-2">
          Workspaces
        </div>
      )}
      
      <div className="space-y-1">
        {hasVolunteer && (
          <button
            onClick={() => setActiveWorkspace({ type: 'volunteer' })}
            className={`group relative w-full flex items-center transition-colors text-left ${
              isCollapsed ? 'justify-center p-2 rounded-lg' : 'gap-3 px-3 py-2 rounded-lg'
            } ${
              workspaceUtils.isVolunteerWorkspace(activeWorkspace) 
                ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-medium' 
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface)]'
            }`}
            aria-label="Volunteer Workspace"
          >
            <div className={`w-8 h-8 rounded flex items-center justify-center shrink-0 ${
              workspaceUtils.isVolunteerWorkspace(activeWorkspace) ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]' : 'bg-[var(--color-surface-elevated)]'
            }`}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            
            {!isCollapsed && (
              <span className="truncate">Volunteer</span>
            )}

            {isCollapsed && (
              <div className="absolute left-full ml-4 px-2.5 py-1.5 bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)] text-xs font-medium rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap shadow-md border border-[var(--color-border)]">
                Volunteer
              </div>
            )}
          </button>
        )}

        {activeMemberships.map(m => {
          const isActive = activeWorkspace?.type === 'organization' && activeWorkspace.organizationId === m.organization.id;
          return (
            <button
              key={m.id}
              onClick={() => setActiveWorkspace({ type: 'organization', organizationId: m.organization.id })}
              className={`group relative w-full flex items-center transition-colors text-left ${
                isCollapsed ? 'justify-center p-2 rounded-lg' : 'gap-3 px-3 py-2 rounded-lg'
              } ${
                isActive 
                  ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-medium' 
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface)]'
              }`}
              aria-label={m.organization.name}
            >
              <div className={`w-8 h-8 rounded flex items-center justify-center shrink-0 ${
                isActive ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]' : 'bg-[var(--color-surface-elevated)]'
              }`}>
                <span className="text-[12px] font-bold">{m.organization.name.substring(0, 2).toUpperCase()}</span>
              </div>
              
              {!isCollapsed && (
                <div className="truncate flex-1">
                  <div className="truncate text-sm">{m.organization.name}</div>
                  <div className="text-[10px] opacity-70 truncate font-normal text-[var(--color-text-secondary)]">{m.role}</div>
                </div>
              )}

              {isCollapsed && (
                <div className="absolute left-full ml-4 px-2.5 py-1.5 bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)] text-xs font-medium rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap shadow-md border border-[var(--color-border)]">
                  {m.organization.name}
                  <div className="text-[10px] opacity-70 text-[var(--color-text-secondary)]">{m.role}</div>
                </div>
              )}
            </button>
          );
        })}

        {pendingMemberships.length > 0 && !isCollapsed && (
          <div className="pt-2 mt-2 border-t border-[var(--color-border)]">
            {pendingMemberships.map(m => (
              <div
                key={m.id}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left opacity-50 cursor-not-allowed"
                title="Pending Approval"
              >
                <div className="w-8 h-8 rounded bg-[var(--color-surface-elevated)] flex items-center justify-center shrink-0 text-[var(--color-text-secondary)]">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="truncate flex-1 text-[var(--color-text-secondary)]">
                  <div className="truncate text-sm">{m.organization.name}</div>
                  <div className="text-[10px]">Pending</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
