import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { authService } from '../../modules/auth/services/auth.service';
import type { MeResponse } from '../../modules/auth/services/auth.service';
import { workspaceUtils } from '../../shared/lib/workspace';
import type { Workspace } from '../../shared/lib/workspace';

interface AuthContextType {
  token: string | null;
  user: MeResponse['data'] | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  activeWorkspace: Workspace | null;
  login: (token: string) => Promise<void>;
  logout: () => void;
  refreshHydration: (overrideToken?: string) => Promise<void>;
  setActiveWorkspace: (workspace: Workspace | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const clearWorkspaceState = () => {
  workspaceUtils.clearStoredWorkspace();
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('samanvay_token'));
  const [user, setUser] = useState<MeResponse['data'] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [activeWorkspace, setActiveWorkspaceState] = useState<Workspace | null>(() => {
    return workspaceUtils.getStoredWorkspace();
  });

  const setActiveWorkspace = (workspace: Workspace | null) => {
    if (workspace) {
      workspaceUtils.setStoredWorkspace(workspace);
    } else {
      clearWorkspaceState();
    }
    setActiveWorkspaceState(workspace);
  };

  const logout = () => {
    localStorage.removeItem('samanvay_token');
    clearWorkspaceState();
    // Note: queryClient.clear() skipped as @tanstack/react-query is not used.
    setToken(null);
    setUser(null);
    setActiveWorkspaceState(null);
  };

  const refreshHydration = async (overrideToken?: string) => {
    const authToken = overrideToken ?? token;

    let validToken = false;

    if (authToken) {
      try {
        const payload = JSON.parse(atob(authToken.split('.')[1]));

        if (!payload.exp || payload.exp * 1000 > Date.now()) {
          validToken = true;
        }
      } catch (e) {
        validToken = false;
      }
    }

    if (!validToken) {
      setUser(null);
      setIsLoading(false);
      if (authToken) {
        logout(); // token is malformed or expired
      }
      return;
    }

    try {
      setIsLoading(true);
      const res = await authService.getMe();
      if (res.success) {
        const fetchedUser = res.data;
        setUser(fetchedUser);

        // Validate workspace against hydrated user
        if (!workspaceUtils.isValidWorkspace(activeWorkspace, fetchedUser)) {
          clearWorkspaceState();

          let fallbackWorkspace: Workspace | null = null;

          const activeOrgs = (fetchedUser.memberships || []).filter((m: any) => m.status === 'ACTIVE');
          if (activeOrgs.length > 0) {
            fallbackWorkspace = { type: 'organization', organizationId: activeOrgs[0].organization.id };
          } else if (fetchedUser.volunteer) {
            fallbackWorkspace = { type: 'volunteer' };
          } else if ((fetchedUser.memberships || []).length > 0) {
            fallbackWorkspace = { type: 'organization', organizationId: fetchedUser.memberships[0].organization.id };
          }

          setActiveWorkspaceState(fallbackWorkspace);
          if (fallbackWorkspace) {
            workspaceUtils.setStoredWorkspace(fallbackWorkspace);
          }
        }
      } else {
        logout();
      }
    } catch (error) {
      console.error("Failed to hydrate session", error);
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshHydration();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Multi-tab synchronization
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'samanvay_token') {
        if (!e.newValue) {
          logout();
        } else if (e.newValue !== token) {
          setToken(e.newValue);
        }
      }
      if (e.key === 'samanvay_active_workspace') {
        setActiveWorkspaceState(workspaceUtils.getStoredWorkspace());
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [token]);

  const login = async (newToken: string) => {
    localStorage.setItem('samanvay_token', newToken);

    setIsLoading(true);

    setToken(newToken);

    await refreshHydration(newToken);
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isLoading,
        isAuthenticated: !!token,
        activeWorkspace,
        login,
        logout,
        refreshHydration,
        setActiveWorkspace
      }}
    >
      {/* Hydration Gate: Suspend rendering of children until hydration is complete to prevent stale requests. */}
      {isLoading ? null : children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
