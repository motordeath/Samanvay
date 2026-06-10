import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../app/providers/AuthProvider';
import { workspaceUtils } from '../../../shared/lib/workspace';
import { OverviewStatsGrid } from '../components/OverviewStatsGrid';
import type { OverviewMetrics } from '../components/OverviewStatsGrid';
import { RecentActivityPanel } from '../components/RecentActivityPanel';
import type { ActivityData } from '../components/ActivityItem';
import { api } from '../../../shared/lib/api';
import { MembershipRequestsPanel } from '../components/MembershipRequestsPanel';

export const OverviewPage: React.FC = () => {
  const { activeWorkspace } = useAuth();

  const [metrics, setMetrics] = useState<OverviewMetrics>({
    inventoryItems: 0,
    activeTransfers: 0,
    pendingRequests: 0,
    activeVolunteers: 0
  });

  const [activities, setActivities] = useState<ActivityData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchOverviewData = async () => {
      setIsLoading(true);

      const orgId = workspaceUtils.getOrganizationWorkspaceId(activeWorkspace);

      try {
        let inventoryCount = 0;
        let transfersCount = 0;
        let auditData: ActivityData[] = [];

        if (orgId) {
          // Fetch real data for organization context
          const [lotsRes, transfersRes, needsRes, auditRes] = await Promise.all([
            api<{ success: boolean; data: any[] }>(`/api/resource-lots?organizationId=${orgId}`),
            api<{ success: boolean; data: any[] }>(`/api/transfers?organizationId=${orgId}`),
            api<{ success: boolean; data: any[] }>(`/api/needs?organizationId=${orgId}`),
            api<{ success: boolean; data: any[] }>(`/api/audit`) // Phase 3.4 says OWNER/ADMIN only. We'll try fetching.
          ]);

          if (lotsRes.success && lotsRes.data) {
            inventoryCount = lotsRes.data.length;
          }

          if (transfersRes.success && transfersRes.data) {
            // Filter pending/in-transit transfers for this org
            transfersCount = transfersRes.data.filter(t =>
              (t.fromOrganizationId === orgId || t.toOrganizationId === orgId) &&
              ['PENDING', 'IN_TRANSIT'].includes(t.status)
            ).length;
          }

          let requestsCount = 0;
          if (needsRes.success && needsRes.data) {
            requestsCount = needsRes.data.filter(n => n.status === 'OPEN').length;
          }

          if (auditRes.success && auditRes.data) {
            auditData = auditRes.data.slice(0, 10).map(log => ({
              id: log.id,
              action: log.action.replace(/_/g, ' ').toLowerCase(),
              actorName: log.user?.name || 'System',
              entityName: log.entityType,
              timestamp: log.createdAt
            }));
          }

          if (isMounted) {
            setMetrics({
              inventoryItems: inventoryCount,
              activeTransfers: transfersCount,
              pendingRequests: requestsCount,
              activeVolunteers: 12 // Fake count for now
            });
            setActivities(auditData);
          }
        } else {
          if (isMounted) {
            setMetrics({
              inventoryItems: 0,
              activeTransfers: 0,
              pendingRequests: 0,
              activeVolunteers: 0
            });
            setActivities([]);
          }
        }
      } catch (error) {
        console.error('Failed to fetch overview data:', error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchOverviewData();

    return () => {
      isMounted = false;
    };
  }, [activeWorkspace]);

  return (
    <div className="h-full flex flex-col gap-6">
      <MembershipRequestsPanel />
      <div>
        <h1 className="text-2xl font-semibold text-[var(--color-text-primary)] mb-2">Operational Overview</h1>
        <p className="text-[var(--color-text-secondary)]">High-level metrics and recent activity for the current context.</p>
      </div>

      <OverviewStatsGrid metrics={metrics} />

      <div className="flex-1 grid grid-cols-1 xl:grid-cols-3 gap-6 min-h-0">
        <div className="xl:col-span-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-xl bg-[var(--color-surface-muted)] flex items-center justify-center text-[var(--color-text-secondary)] mb-4">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h2 className="text-xl font-medium text-[var(--color-text-primary)] mb-2">Coordination Map Placeholder</h2>
          <p className="text-[var(--color-text-secondary)] max-w-sm text-sm">
            Geospatial visualization of operations, inventory distribution, and active assignments will appear here.
          </p>
        </div>

        <div className="xl:col-span-1 min-h-[400px]">
          <RecentActivityPanel activities={activities} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
};
