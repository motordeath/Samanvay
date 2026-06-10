import type { MeResponse } from '../../modules/auth/services/auth.service';

export type Workspace = 
  | { type: 'volunteer' }
  | { type: 'organization'; organizationId: string };

const WORKSPACE_STORAGE_KEY = 'samanvay_active_workspace';

export const workspaceUtils = {
  /**
   * Reads the active workspace from local storage.
   */
  getStoredWorkspace(): Workspace | null {
    try {
      const stored = localStorage.getItem(WORKSPACE_STORAGE_KEY);
      if (!stored) return null;
      const parsed = JSON.parse(stored);
      
      if (parsed.type === 'volunteer') return parsed as Workspace;
      if (parsed.type === 'organization' && typeof parsed.organizationId === 'string') return parsed as Workspace;
      
      return null;
    } catch {
      return null;
    }
  },

  /**
   * Persists the active workspace to local storage.
   */
  setStoredWorkspace(workspace: Workspace) {
    localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(workspace));
  },

  /**
   * Clears the active workspace from local storage.
   */
  clearStoredWorkspace() {
    localStorage.removeItem(WORKSPACE_STORAGE_KEY);
  },

  /**
   * Discriminator for Volunteer workspace.
   */
  isVolunteerWorkspace(workspace: Workspace | null): boolean {
    return workspace?.type === 'volunteer';
  },

  /**
   * Discriminator for Organization workspace.
   */
  isOrganizationWorkspace(workspace: Workspace | null): boolean {
    return workspace?.type === 'organization';
  },

  /**
   * Safe getter for organizationId.
   */
  getOrganizationWorkspaceId(workspace: Workspace | null): string | null {
    if (workspace?.type === 'organization') {
      return workspace.organizationId;
    }
    return null;
  },

  /**
   * Validates if a given workspace actually exists within the hydrated user profile.
   * This is the source of truth, ignoring any invalid localStorage state.
   */
  isValidWorkspace(workspace: Workspace | null, user: MeResponse['data'] | null): boolean {
    if (!workspace || !user) return false;

    if (workspace.type === 'volunteer') {
      return !!user.volunteer;
    }

    if (workspace.type === 'organization') {
      const memberships = user.memberships || [];
      return memberships.some((m: any) => 
        m.status === 'ACTIVE' && 
        m.organization?.id === workspace.organizationId &&
        typeof m.organization?.name === 'string'
      );
    }

    return false;
  }
};
